import { spawn } from "node:child_process";
import { existsSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const studioRoot = path.resolve(import.meta.dirname, "..");
const siteRoot = path.resolve(studioRoot, "..", "..", "Portfolio", "Site");
const studioUrl = "http://localhost:3001/";
const previewUrl = "http://localhost:3000/";
const stopRequest = path.join(studioRoot, ".stop-request");
const children = [];
let closing = false;

function nextBinary(root) {
  return path.join(root, "node_modules", "next", "dist", "bin", "next");
}

function needsInstall(root) {
  const installed = path.join(root, "node_modules", ".package-lock.json");
  if (!existsSync(nextBinary(root)) || !existsSync(installed)) return true;
  return statSync(path.join(root, "package-lock.json")).mtimeMs > statSync(installed).mtimeMs;
}

function run(command, args, cwd, shell = false) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: "inherit", shell });
    child.once("error", reject);
    child.once("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited with code ${code}.`)));
  });
}

async function ensureDependencies(root, label) {
  if (!needsInstall(root)) return;
  console.log(`Installing ${label} dependencies...`);
  await run(process.platform === "win32" ? "npm.cmd" : "npm", ["ci"], root, process.platform === "win32");
}

function stop() {
  if (closing) return;
  closing = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGTERM");
  }
}

function startNext(root, port, label) {
  const child = spawn(process.execPath, [nextBinary(root), "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: root,
    stdio: "inherit",
  });
  children.push(child);
  child.once("error", (error) => { console.error(`${label}:`, error); stop(); process.exitCode = 1; });
  child.once("exit", (code) => {
    if (!closing) {
      const requested = existsSync(stopRequest);
      if (requested) rmSync(stopRequest, { force: true });
      if (requested) console.log(`${label} stopped.`);
      else console.error(`${label} stopped unexpectedly (${code}).`);
      stop();
      if (!requested) process.exitCode = 1;
    }
  });
}

async function waitFor(url) {
  const deadline = Date.now() + 120_000;
  while (!closing && Date.now() < deadline) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch { /* The local server may still be starting. */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${url} did not become ready.`);
}

function openBrowser(url) {
  const command = process.platform === "win32" ? "rundll32.exe" : process.platform === "darwin" ? "open" : "xdg-open";
  const args = process.platform === "win32" ? ["url.dll,FileProtocolHandler", url] : [url];
  const browser = spawn(command, args, { detached: true, stdio: "ignore", windowsHide: true });
  browser.once("error", (error) => console.warn(`Open ${url} manually: ${error.message}`));
  browser.unref();
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

try {
  rmSync(stopRequest, { force: true });
  await ensureDependencies(siteRoot, "portfolio");
  await ensureDependencies(studioRoot, "Studio");
  await run(process.execPath, [path.join(siteRoot, "scripts", "sync-content.mjs")], siteRoot);
  startNext(siteRoot, 3000, "Portfolio preview");
  startNext(studioRoot, 3001, "Portfolio Studio");
  await Promise.all([waitFor(previewUrl), waitFor(studioUrl)]);
  console.log(`Studio: ${studioUrl}`);
  console.log(`Portfolio preview: ${previewUrl}`);
  console.log("Press Ctrl+C to stop both local servers.");
  if (process.env.PORTFOLIO_SKIP_BROWSER !== "1") openBrowser(studioUrl);
} catch (error) {
  console.error(error);
  stop();
  process.exitCode = 1;
}
