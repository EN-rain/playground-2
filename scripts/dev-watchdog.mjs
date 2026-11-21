#!/usr/bin/env node
// dev-watchdog.mjs
//
// Runs `npm run dev` (or any command) as a child process and kills it if the
// SYSTEM cpu usage stays at or above a threshold for a sustained period.
//
// Why system cpu: per-process cpu on Windows is awkward to read from Node, and
// the request is literally "cpu above 90% for 10s". System load is a reliable
// proxy and works identically on Windows / macOS / Linux.
//
// Usage:
//   node scripts/dev-watchdog.mjs            # spawns `npm run dev` (default)
//   npm run dev:guard                        # same, via package.json script
//   CPU_WATCH_PID=1234 node scripts/dev-watchdog.mjs   # guard an already-running dev server
//
// Config (env):
//   CPU_KILL_THRESHOLD  percent (default 90)
//   CPU_KILL_SECONDS    sustained seconds (default 10)
//   DEV_CMD             command to spawn (default "npm")
//   DEV_ARGS            space-separated args (default "run dev")
//   CPU_WATCH_PID       if set, attach to this existing PID instead of spawning

import { spawn } from "node:child_process";
import os from "node:os";

const THRESHOLD = Number(process.env.CPU_KILL_THRESHOLD ?? 90);
const SUSTAIN_MS = Number(process.env.CPU_KILL_SECONDS ?? 10) * 1000;
const SAMPLE_MS = 1000;
const ATTACH_PID = process.env.CPU_WATCH_PID ? Number(process.env.CPU_WATCH_PID) : null;

const log = (...a) => console.log("[dev-watchdog]", ...a);
const warn = (...a) => console.error("[dev-watchdog]", ...a);

// --- cpu sampling (delta over all cores) ------------------------------------
function cpuTimes() {
  let idle = 0;
  let total = 0;
  for (const c of os.cpus()) {
    for (const t of Object.values(c.times)) total += t;
    idle += c.times.idle;
  }
  return { idle, total };
}

let prev = cpuTimes();

function cpuPercent() {
  const cur = cpuTimes();
  const idleDelta = cur.idle - prev.idle;
  const totalDelta = cur.total - prev.total;
  prev = cur;
  if (totalDelta <= 0) return 0;
  return (1 - idleDelta / totalDelta) * 100;
}

// --- kill a whole process tree ----------------------------------------------
function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    // /T = terminate the tree, /F = force.
    spawn("taskkill", ["/T", "/F", "/PID", String(pid)], { stdio: "ignore" });
  } else {
    try {
      process.kill(-pid, "SIGKILL"); // negative pid == process group
    } catch {
      try {
        process.kill(pid, "SIGKILL");
      } catch {}
    }
  }
}

// --- main -------------------------------------------------------------------
let child = null;
let targetPid = ATTACH_PID;
let highSince = null;
let tripped = false;

if (ATTACH_PID) {
  log(`attaching to existing PID ${ATTACH_PID} (threshold ${THRESHOLD}%, ${SUSTAIN_MS / 1000}s)`);
} else {
  const cmd = process.env.DEV_CMD ?? "npm";
  const args = process.env.DEV_ARGS ? process.env.DEV_ARGS.split(" ") : ["run", "dev"];
  log(`spawning: ${cmd} ${args.join(" ")}`);
  child = spawn(cmd, args, { stdio: "inherit", shell: true });
  targetPid = child.pid;
  child.on("exit", (code, signal) => {
    if (tripped) return; // we already reported the kill
    clearInterval(timer);
    log(`dev server exited (code=${code}, signal=${signal})`);
    process.exit(code ?? 0);
  });
  child.on("error", (err) => {
    warn(`failed to spawn dev server: ${err.message}`);
    process.exit(1);
  });
}

function shutdown(signal) {
  if (child) killTree(child.pid);
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const timer = setInterval(() => {
  const usage = cpuPercent();
  const now = Date.now();

  if (usage >= THRESHOLD) {
    if (highSince === null) {
      highSince = now;
      warn(`cpu high: ${usage.toFixed(1)}% (>= ${THRESHOLD}%) — arming kill timer`);
    }
    const sustained = now - highSince;
    if (sustained >= SUSTAIN_MS) {
      tripped = true;
      clearInterval(timer);
      warn(
        `cpu ${usage.toFixed(1)}% >= ${THRESHOLD}% for ${SUSTAIN_MS / 1000}s — KILLING dev server (PID ${targetPid})`,
      );
      killTree(targetPid);
      // give the kill a moment to propagate, then bail.
      setTimeout(() => process.exit(1), 800);
    }
  } else {
    if (highSince !== null) {
      log(`cpu back to ${usage.toFixed(1)}% — kill timer reset`);
    }
    highSince = null;
  }
}, SAMPLE_MS);

log(`watching (threshold ${THRESHOLD}%, sustained ${SUSTAIN_MS / 1000}s). Ctrl+C to stop.`);
