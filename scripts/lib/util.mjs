// Small shared utilities used across the R3F verify/optimize scripts.
// Previously these were byte-identical copies duplicated in each script.

export function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function formatBytes(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
