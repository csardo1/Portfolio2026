import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const siteRoot = path.resolve(import.meta.dirname, "..");
const port = 3000;
const url = `http://localhost:${port}/`;
const nextBinary = path.join(siteRoot, "node_modules", "next", "dist", "bin", "next");
const stopRequest = path.join(siteRoot, ".stop-request");
const launcherState = path.join(siteRoot, ".local-launcher.json");
let server;

function run(command, args, shell = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: siteRoot, stdio: "inherit", shell });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}.`)));
  });
}

async function ensureDependencies() {
  const installed = path.join(siteRoot, "node_modules", ".package-lock.json");
  if (existsSync(nextBinary) && existsSync(installed) &&
      statSync(path.join(siteRoot, "package-lock.json")).mtimeMs <= statSync(installed).mtimeMs) return;
  console.log("Installing portfolio dependencies...");
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"], process.platform === "win32");
}

function ensurePortAvailable() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", (error) => reject(error.code === "EADDRINUSE"
      ? new Error("Port 3000 is already in use. Stop the existing portfolio preview or other server, then try again.")
      : error));
    probe.listen(port, "127.0.0.1", () => probe.close(resolve));
  });
}

async function waitForSite() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("The portfolio server stopped before it was ready.");
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch { /* The local server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("The portfolio did not become ready in time.");
}

function openBrowser() {
  const command = process.platform === "win32" ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const browser = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  browser.once("error", (error) => console.warn(`Open ${url} manually: ${error.message}`));
  browser.unref();
}

function stop() {
  if (server && server.exitCode === null) server.kill("SIGTERM");
  clearLauncherState();
}

function clearLauncherState() {
  try {
    const current = JSON.parse(readFileSync(launcherState, "utf8"));
    if (current.launcherPid === process.pid) rmSync(launcherState, { force: true });
  } catch { /* The state file may already be gone or replaced. */ }
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

try {
  rmSync(stopRequest, { force: true });
  await ensurePortAvailable();
  await ensureDependencies();
  await run(process.execPath, [path.join(siteRoot, "scripts", "sync-content.mjs")]);
  server = spawn(process.execPath, [nextBinary, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: siteRoot,
    stdio: "inherit",
  });
  writeFileSync(launcherState, `${JSON.stringify({ launcherPid: process.pid, serverPids: [server.pid] })}\n`);
  server.once("error", (error) => { console.error(error); process.exitCode = 1; });
  server.once("exit", (code) => {
    clearLauncherState();
    const requested = existsSync(stopRequest);
    if (requested) rmSync(stopRequest, { force: true });
    if (!requested && code !== 0) process.exitCode = 1;
  });
  await waitForSite();
  console.log(`Portfolio: ${url}`);
  console.log("Press Ctrl+C to stop the local server.");
  if (process.env.PORTFOLIO_SKIP_BROWSER !== "1") openBrowser();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  stop();
  clearLauncherState();
  process.exitCode = 1;
}
