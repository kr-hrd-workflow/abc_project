#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const securityReportPath = path.join(repoRoot, "artifacts", "r3f-security-gates.json");
const npmCliPath = path.join(
  path.dirname(process.execPath),
  "node_modules",
  "npm",
  "bin",
  "npm-cli.js"
);

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

runCommandCheck("root_npm_audit_high", process.execPath, [
  npmCliPath,
  "audit",
  "--audit-level=high"
]);
runCommandCheck("web_workspace_npm_audit_high", process.execPath, [
  npmCliPath,
  "--workspace",
  "apps/web",
  "audit",
  "--audit-level=high"
]);
runCommandCheck("python_dependency_audit", process.execPath, [
  "scripts/run-api-python.mjs",
  "-m",
  "pip_audit"
]);
runCommandCheck("cyclonedx_sbom_generation", process.execPath, [
  npmCliPath,
  "sbom",
  "--sbom-format",
  "cyclonedx",
  "--package-lock-only",
  "--json"
]);
runCommandCheck("r3f_manifest_license_provenance", process.execPath, [
  "scripts/verify-r3f-assets.mjs"
]);
runTrackedSecretScan();

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

function runCommandCheck(name, command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
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

function runTrackedSecretScan() {
  const trackedFiles = spawnSync("git", [
    "ls-files",
    "apps",
    "docs",
    "scripts",
    ".github",
    "package.json",
    "package-lock.json"
  ], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024
  });

  if (trackedFiles.status !== 0) {
    failures.push(`tracked_secret_scan: git ls-files exited ${trackedFiles.status}`);
    results.push({
      name: "tracked_secret_scan",
      status: "failed",
      stderr_tail: tail(trackedFiles.stderr)
    });
    return;
  }

  const findings = [];
  const files = trackedFiles.stdout
    .split(/\r?\n/)
    .filter(Boolean)
    .filter(isScannableTextPath);

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
    name: "tracked_secret_scan",
    status: findings.length === 0 ? "passed" : "failed",
    scanned_files: files.length,
    findings
  });

  if (findings.length > 0) {
    failures.push(`tracked_secret_scan: ${findings.length} possible secret(s) found`);
  }
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
