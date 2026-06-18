#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const apiDir = path.join(repoRoot, "apps", "api");
const securityReportPath = path.join(repoRoot, "artifacts", "r3f-security-gates.json");
const pipAuditRequirementsFile = ".pip-audit-requirements.txt";
const pipAuditRequirementsPath = path.join(apiDir, pipAuditRequirementsFile);
const npmExecPath = process.env.npm_execpath;

const results = [];
const failures = [];
const secretPatterns = [
  {
    name: "private_key_block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  },
  {
    name: "openai_secret_key",
    regex: /\b(sk-[A-Za-z0-9_-]{20,})\b/
  },
  {
    name: "assigned_secret_value",
    regex:
      /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*['"]([^'"\s]{16,})['"]/i
  }
];

runNpmCheck("root_npm_audit_moderate", [
  "audit",
  "--audit-level=moderate"
]);
runNpmCheck("web_workspace_npm_audit_moderate", [
  "--workspace",
  "apps/web",
  "audit",
  "--audit-level=moderate"
]);
runPythonDependencyAudit();
runNpmCheck("cyclonedx_sbom_generation", [
  "sbom",
  "--sbom-format",
  "cyclonedx",
  "--package-lock-only",
  "--json"
]);
runCommandCheck("r3f_manifest_license_provenance", process.execPath, [
  "scripts/verify-r3f-assets.mjs"
]);
runWorkspaceSecretScan();

const report = {
  generated_at: new Date().toISOString(),
  status: failures.length === 0 ? "passed" : "failed",
  results,
  blocked_requires_tooling: [],
  failures
};

mkdirSync(path.dirname(securityReportPath), { recursive: true });
writeFileSync(securityReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}

function runCommandCheck(name, command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    ...options
  });
  const passed = result.status === 0;

  results.push({
    name,
    command: [command, ...args].join(" "),
    status: passed ? "passed" : "failed",
    exit_code: result.status,
    error: result.error?.message ?? null,
    stdout_tail: tail(result.stdout),
    stderr_tail: tail(result.stderr)
  });

  if (!passed) {
    failures.push(`${name}: ${[command, ...args].join(" ")} exited ${result.status}`);
  }
}

function runNpmCheck(name, args) {
  if (npmExecPath) {
    runCommandCheck(name, process.execPath, [npmExecPath, ...args]);
    return;
  }

  runCommandCheck(name, process.platform === "win32" ? "npm.cmd" : "npm", args, {
    shell: process.platform === "win32"
  });
}

function runPythonDependencyAudit() {
  const freeze = spawnSync(process.execPath, [
    "scripts/run-api-python.mjs",
    "-m",
    "pip",
    "freeze",
    "--exclude-editable"
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  if (freeze.status !== 0) {
    results.push({
      name: "python_dependency_audit",
      command: `${process.execPath} scripts/run-api-python.mjs -m pip freeze --exclude-editable`,
      status: "failed",
      exit_code: freeze.status,
      error: freeze.error?.message ?? null,
      stdout_tail: tail(freeze.stdout),
      stderr_tail: tail(freeze.stderr)
    });
    failures.push(`python_dependency_audit: pip freeze exited ${freeze.status}`);
    return;
  }

  writeFileSync(pipAuditRequirementsPath, freeze.stdout, "utf8");
  const audit = spawnSync(process.execPath, [
    "scripts/run-api-python.mjs",
    "-m",
    "pip_audit",
    "-r",
    pipAuditRequirementsFile,
    "--format",
    "json"
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
  rmSync(pipAuditRequirementsPath, { force: true });

  const output = `${audit.stdout ?? ""}\n${audit.stderr ?? ""}`;
  const hasSkippedDependency = /\bskip_reason\b|Skip Reason/.test(output);
  const passed = audit.status === 0 && !hasSkippedDependency;

  results.push({
    name: "python_dependency_audit",
    command: [
      `${process.execPath} scripts/run-api-python.mjs -m pip freeze --exclude-editable`,
      `${process.execPath} scripts/run-api-python.mjs -m pip_audit -r ${pipAuditRequirementsFile} --format json`
    ].join(" && "),
    status: passed ? "passed" : "failed",
    exit_code: audit.status,
    error: audit.error?.message ?? null,
    dependency_source: "pip freeze --exclude-editable",
    skipped_dependencies: hasSkippedDependency ? "present" : "none",
    stdout_tail: tail(audit.stdout),
    stderr_tail: tail(audit.stderr)
  });

  if (!passed) {
    const reason = hasSkippedDependency ? "reported skipped dependencies" : `exited ${audit.status}`;
    failures.push(`python_dependency_audit: ${reason}`);
  }
}

function runWorkspaceSecretScan() {
  const scanRoots = [
    "apps",
    "docs",
    "scripts",
    ".github",
    "artifacts",
    "package.json",
    "package-lock.json"
  ];
  const trackedFiles = gitFileList(["ls-files", ...scanRoots]);
  const untrackedFiles = gitFileList([
    "ls-files",
    "--others",
    "--exclude-standard",
    ...scanRoots
  ]);

  if (trackedFiles.status !== 0 || untrackedFiles.status !== 0) {
    const failedCommand =
      trackedFiles.status !== 0 ? "git ls-files" : "git ls-files --others";
    const failedResult =
      trackedFiles.status !== 0 ? trackedFiles : untrackedFiles;
    failures.push(`workspace_secret_scan: ${failedCommand} exited ${failedResult.status}`);
    results.push({
      name: "workspace_secret_scan",
      status: "failed",
      stderr_tail: tail(failedResult.stderr)
    });
    return;
  }

  const tracked = splitGitFiles(trackedFiles.stdout);
  const untracked = splitGitFiles(untrackedFiles.stdout);
  const files = [...new Set([...tracked, ...untracked])]
    .filter(Boolean)
    .filter(isScannableTextPath);
  const scannableUntracked = untracked
    .filter(Boolean)
    .filter(isScannableTextPath);
  const findings = [];

  for (const file of files) {
    const absolutePath = path.join(repoRoot, file);
    const text = readFileSync(absolutePath, "utf8");
    const lines = text.split(/\r?\n/);

    lines.forEach((line, index) => {
      for (const pattern of secretPatterns) {
        const match = line.match(pattern.regex);
        if (!match) continue;

        const value = match[1] ?? match[0];
        if (isAllowedPlaceholder(value, line)) continue;

        findings.push({
          file,
          line: index + 1,
          pattern: pattern.name
        });
      }
    });
  }

  results.push({
    name: "workspace_secret_scan",
    status: findings.length === 0 ? "passed" : "failed",
    scanned_files: files.length,
    scanned_untracked_files: scannableUntracked.length,
    tracked_files: tracked.filter(isScannableTextPath).length,
    findings
  });

  if (findings.length > 0) {
    failures.push(`workspace_secret_scan: ${findings.length} possible secret(s) found`);
  }
}

function gitFileList(args) {
  return spawnSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });
}

function splitGitFiles(stdout) {
  return String(stdout ?? "").split(/\r?\n/).filter(Boolean);
}

function isScannableTextPath(file) {
  if (file.startsWith("archive/")) return false;

  return /\.(?:css|html|ini|js|json|jsx|md|mjs|ps1|py|sh|ts|tsx|txt|toml|ya?ml)$/i.test(
    file
  );
}

function isAllowedPlaceholder(value, line) {
  const lowered = `${value} ${line}`.toLowerCase();

  return (
    lowered.includes("sk-...") ||
    lowered.includes("sk-test") ||
    lowered.includes("example") ||
    lowered.includes("placeholder") ||
    lowered.includes("dummy") ||
    lowered.includes("missing") ||
    lowered.includes("presence only") ||
    lowered.includes("your_")
  );
}

function tail(value) {
  return String(value ?? "").trim().split(/\r?\n/).slice(-20);
}
