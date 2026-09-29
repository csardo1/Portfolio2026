import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";

const target = process.argv[2];
if (!["portfolio", "studio"].includes(target)) {
  console.error("Choose either portfolio or studio.");
  process.exit(1);
}

const siteRoot = path.resolve(import.meta.dirname, "..");
const studioRoot = path.resolve(siteRoot, "..", "..", "Studio", "app");
const apps = {
  portfolio: { port: 3000, root: siteRoot, label: "Portfolio", launchScript: path.join(siteRoot, "scripts", "launch.mjs") },
  studio: { port: 3001, root: studioRoot, label: "Studio", launchScript: path.join(studioRoot, "scripts", "launch.mjs") },
};

function isListening(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(500);
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
    socket.once("timeout", () => { socket.destroy(); resolve(false); });
  });
}

function readLauncherState(app) {
  const statePath = path.join(app.root, ".local-launcher.json");
  try {
    const state = JSON.parse(readFileSync(statePath, "utf8"));
    if (!Number.isInteger(state.launcherPid) || state.launcherPid <= 0) throw new Error("Invalid launcher PID.");
    return { ...state, statePath };
  } catch {
    rmSync(statePath, { force: true });
    return null;
  }
}

function processCommand(pid) {
  const result = spawnSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : "";
}

function processExists(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

async function stopUnix() {
  const app = apps[target];
  let state = readLauncherState(app);
  if (state && !processExists(state.launcherPid)) {
    rmSync(state.statePath, { force: true });
    state = null;
  }
  if (!state) {
    if (await isListening(app.port)) {
      throw new Error(`Port ${app.port} belongs to another app or to a server started without the macOS launcher. Nothing was stopped.`);
    }
    console.log(`${app.label} is not running on port ${app.port}.`);
    return;
  }

  const command = processCommand(state.launcherPid);
  if (!command.includes(app.launchScript)) {
    rmSync(state.statePath, { force: true });
    throw new Error(`The saved ${app.label} launcher process no longer matches. Nothing was stopped.`);
  }

  writeFileSync(path.join(app.root, ".stop-request"), "requested\n");
  process.kill(state.launcherPid, "SIGTERM");

  const deadline = Date.now() + 10_000;
  while (processExists(state.launcherPid) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (processExists(state.launcherPid)) throw new Error(`${app.label} did not stop in time.`);

  rmSync(state.statePath, { force: true });
  console.log(`Stopped ${app.label}.`);
}

function getListeners() {
  const query = `
$rows = @(Get-NetTCPConnection -State Listen -LocalPort 3000,3001 -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalAddress -eq '127.0.0.1' } |
  ForEach-Object {
    $worker = Get-CimInstance Win32_Process -Filter "ProcessId = $($_.OwningProcess)" -ErrorAction SilentlyContinue
    $parent = if ($worker) { Get-CimInstance Win32_Process -Filter "ProcessId = $($worker.ParentProcessId)" -ErrorAction SilentlyContinue }
    [pscustomobject]@{
      port = $_.LocalPort
      parentPid = $parent.ProcessId
      launcherPid = $parent.ParentProcessId
      workerCommand = $worker.CommandLine
      parentCommand = $parent.CommandLine
    }
  })
ConvertTo-Json -InputObject $rows -Compress -Depth 3`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", query], { encoding: "utf8" }).trim();
  return output ? JSON.parse(output) : [];
}

function belongsToApp(row, app) {
  if (!row || row.port !== app.port || !Number.isInteger(row.parentPid) || !Number.isInteger(row.launcherPid)) return false;
  const next = path.join(app.root, "node_modules", "next", "dist");
  const parentPath = path.join(next, "bin", "next").toLowerCase();
  const workerPath = path.join(next, "server", "lib", "start-server.js").toLowerCase();
  return String(row.parentCommand).toLowerCase().includes(parentPath) &&
    String(row.workerCommand).toLowerCase().includes(workerPath);
}

function stillRunning(pid) {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

try {
  if (process.platform !== "win32") {
    await stopUnix();
    process.exit(0);
  }

  const listeners = getListeners();
  const app = apps[target];
  const current = listeners.find((row) => belongsToApp(row, app));
  if (!current) {
    const occupied = listeners.some((row) => row.port === app.port);
    if (occupied) throw new Error(`Port ${app.port} belongs to another app. Nothing was stopped.`);
    console.log(`${app.label} is not running on port ${app.port}.`);
    process.exit(0);
  }

  writeFileSync(path.join(app.root, ".stop-request"), "requested\n");
  if (stillRunning(current.parentPid)) {
    const result = spawnSync("taskkill.exe", ["/PID", String(current.parentPid), "/T", "/F"], { encoding: "utf8" });
    if (result.status !== 0 && stillRunning(current.parentPid)) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || `Could not stop process ${current.parentPid}.`);
    }
  }
  console.log(`Stopped ${app.label}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
