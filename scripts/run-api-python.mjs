import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const apiDir = path.join(root, "apps", "api");

const candidates = process.platform === "win32"
  ? [
      path.join(apiDir, ".venv", "Scripts", "python.exe"),
      path.join(apiDir, ".venv", "bin", "python"),
    ]
  : [
      path.join(apiDir, ".venv", "bin", "python"),
      path.join(apiDir, ".venv", "Scripts", "python.exe"),
    ];

const python = candidates.find((candidate) => existsSync(candidate));
let command = python;
let commandArgs = process.argv.slice(2);

function quoteShell(value) {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

function toWslPath(windowsPath) {
  const resolved = path.resolve(windowsPath);
  const drive = resolved[0].toLowerCase();
  const rest = resolved.slice(2).replaceAll("\\", "/");
  return `/mnt/${drive}${rest}`;
}

if (!command && process.platform === "win32") {
  const posixVenvPython = path.join(apiDir, ".venv", "bin", "python");
  const wslProbe = spawnSync("wsl.exe", ["-e", "true"], { stdio: "ignore" });
  if (wslProbe.status === 0) {
    const wslApiDir = toWslPath(apiDir);
    const shellCommand = [
      "cd",
      quoteShell(wslApiDir),
      "&&",
      ".venv/bin/python",
      ...process.argv.slice(2).map(quoteShell),
    ].join(" ");
    command = "wsl.exe";
    commandArgs = ["-e", "bash", "-lc", shellCommand];
  } else if (existsSync(posixVenvPython)) {
    console.error("API virtualenv is POSIX-style, but WSL is not available to run it.");
    process.exit(1);
  }
}

if (!command) {
  console.error(`API virtualenv python not found. Checked: ${candidates.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(command, commandArgs, {
  cwd: command === "wsl.exe" ? root : apiDir,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
