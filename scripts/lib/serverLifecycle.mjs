// Shared server + process lifecycle helpers for the R3F render scripts
// (render-traffic-photoreal.mjs, render-plate-guides.mjs). These were
// byte-identical copies previously duplicated in each render script.

import { spawn } from "node:child_process";
import { createServer } from "node:net";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (!address || typeof address === "string") {
          reject(new Error("Could not allocate a local TCP port"));
          return;
        }
        resolve(address.port);
      });
    });
  });
}

export async function waitForHttpOk(url, timeoutMs) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }
  throw new Error(
    `Timed out waiting for ${url}. Last error: ${lastError?.message ?? "none"}.`
  );
}

export async function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const waitForExit = (ms) =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve(true);
        return;
      }
      const onExit = () => {
        clearTimeout(t);
        resolve(true);
      };
      const t = setTimeout(() => {
        child.off("exit", onExit);
        resolve(false);
      }, ms);
      child.once("exit", onExit);
    });
  if (process.platform === "win32") {
    await new Promise((resolve) => {
      const killer = spawn(
        "taskkill.exe",
        ["/PID", String(child.pid), "/T", "/F"],
        { stdio: "ignore" }
      );
      killer.on("error", () => {
        child.kill();
        resolve();
      });
      killer.on("exit", resolve);
    });
    return;
  }
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch {
    child.kill("SIGTERM");
  }
  if (await waitForExit(5000)) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {
    child.kill("SIGKILL");
  }
  await waitForExit(5000);
}

export async function runCommand({ command, args, env, cwd, label, timeoutMs }) {
  const logs = [];
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const remember = (chunk) => {
    logs.push(String(chunk));
    while (logs.length > 120) logs.shift();
  };
  const timer = setTimeout(() => stopProcessTree(child).catch(() => {}), timeoutMs);
  child.stdout.on("data", remember);
  child.stderr.on("data", remember);
  await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${label} failed code=${code} signal=${signal}.\n${logs.join("")}`));
    });
  });
}

export async function probeServer(baseUrl, routePath) {
  try {
    const r = await fetch(`${baseUrl}${routePath}`, {
      signal: AbortSignal.timeout(1500)
    });
    return r.ok;
  } catch {
    return false;
  }
}
