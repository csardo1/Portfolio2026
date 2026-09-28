import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

const target = process.argv[2];
if (process.platform !== "win32" || !["portfolio", "studio"].includes(target)) {
  console.error("Use Stop Portfolio.cmd or Stop Studio.cmd on Windows.");
  process.exit(1);
}

const siteRoot = path.resolve(import.meta.dirname, "..");
const studioRoot = path.resolve(siteRoot, "..", "..", "Studio", "app");
const apps = {
  portfolio: { port: 3000, root: siteRoot, label: "Portfolio" },
  studio: { port: 3001, root: studioRoot, label: "Studio" },
};

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
  const listeners = getListeners();
  const app = apps[target];
  const current = listeners.find((row) => belongsToApp(row, app));
  if (!current) {
    const occupied = listeners.some((row) => row.port === app.port);
    if (occupied) throw new Error(`Port ${app.port} belongs to another app. Nothing was stopped.`);
    console.log(`${app.label} is not running on port ${app.port}.`);
    process.exit(0);
  }

  const other = target === "portfolio" ? "studio" : "portfolio";
  const sibling = listeners.find((row) => belongsToApp(row, apps[other]) && row.launcherPid === current.launcherPid);
  const servers = sibling ? [current, sibling] : [current];
  writeFileSync(path.join(sibling ? studioRoot : app.root, ".stop-request"), "requested\n");
  for (const server of servers) {
    if (!stillRunning(server.parentPid)) continue;
    const result = spawnSync("taskkill.exe", ["/PID", String(server.parentPid), "/T", "/F"], { encoding: "utf8" });
    if (result.status !== 0 && stillRunning(server.parentPid)) {
      throw new Error(result.stderr.trim() || result.stdout.trim() || `Could not stop process ${server.parentPid}.`);
    }
  }
  console.log(sibling ? "Stopped Portfolio and Studio." : `Stopped ${app.label}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
