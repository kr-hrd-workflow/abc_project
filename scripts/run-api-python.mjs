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

if (!python) {
  console.error(`API virtualenv python not found. Checked: ${candidates.join(", ")}`);
  process.exit(1);
}

const result = spawnSync(python, process.argv.slice(2), {
  cwd: apiDir,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
