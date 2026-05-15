#!/usr/bin/env node
/*
 * Safe npc-brain launcher for Windows/Codex shell sessions.
 *
 * Do not run `python -m uvicorn ...` directly from shell_command. Uvicorn is a
 * foreground server and can keep the tool session alive even when timeout_ms is
 * set. This launcher starts the service as a detached child with ignored stdio,
 * then polls health with its own timeout.
 */

const { execFileSync, spawn } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const REPO_ROOT = path.resolve(__dirname, '..');
const WORK_DIR = path.join(REPO_ROOT, 'server', 'npc-brain');
const PYTHON = path.join(REPO_ROOT, '.venv', 'Scripts', 'python.exe');
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8000;
const DEFAULT_TIMEOUT_MS = 10000;

function parseArgs(argv) {
  const args = {
    command: 'restart',
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (['status', 'health', 'start', 'stop', 'restart'].includes(arg)) {
      args.command = arg;
    } else if (arg === '--host') {
      args.host = argv[++i] || args.host;
    } else if (arg === '--port') {
      args.port = Number(argv[++i] || args.port);
    } else if (arg === '--timeout-ms') {
      args.timeoutMs = Number(argv[++i] || args.timeoutMs);
    }
  }
  return args;
}

function netstatLines(port) {
  const output = execFileSync('netstat', ['-ano'], {
    encoding: 'utf8',
    timeout: 3000,
    windowsHide: true,
  });
  return output
    .split(/\r?\n/)
    .filter((line) => line.includes(`:${port}`));
}

function listeningPid(port) {
  for (const line of netstatLines(port)) {
    if (!/\bLISTENING\b/i.test(line)) {
      continue;
    }
    const parts = line.trim().split(/\s+/);
    const pid = Number(parts[parts.length - 1]);
    if (Number.isInteger(pid) && pid > 0) {
      return pid;
    }
  }
  return null;
}

function stopPid(pid) {
  if (!pid) {
    return false;
  }
  execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
    encoding: 'utf8',
    timeout: 5000,
    windowsHide: true,
  });
  return true;
}

function sanitizedEnv() {
  const env = { ...process.env };
  if (env.Path && env.PATH) {
    delete env.PATH;
  }
  return env;
}

function startDetached(host, port) {
  if (!fs.existsSync(PYTHON)) {
    throw new Error(`Python runtime not found: ${PYTHON}`);
  }
  if (!fs.existsSync(WORK_DIR)) {
    throw new Error(`npc-brain work directory not found: ${WORK_DIR}`);
  }
  const child = spawn(PYTHON, [
    '-m',
    'uvicorn',
    'app.main:app',
    '--host',
    host,
    '--port',
    String(port),
  ], {
    cwd: WORK_DIR,
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    env: sanitizedEnv(),
  });
  child.unref();
  return child.pid;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requestHealth(host, port, timeoutMs = 1000) {
  return new Promise((resolve) => {
    const req = http.get({
      hostname: host,
      port,
      path: '/healthz',
      timeout: timeoutMs,
    }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.on('error', () => resolve(false));
  });
}

async function waitForHealth(host, port, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await requestHealth(host, port, Math.min(1000, timeoutMs))) {
      return true;
    }
    await sleep(300);
  }
  return false;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.command === 'health') {
    const healthy = await requestHealth(args.host, args.port, Math.min(2000, args.timeoutMs));
    console.log(JSON.stringify({ healthy }, null, 2));
    process.exit(healthy ? 0 : 1);
  }

  const currentPid = listeningPid(args.port);

  if (args.command === 'status') {
    console.log(JSON.stringify({
      port: args.port,
      listeningPid: currentPid,
      lines: netstatLines(args.port),
    }, null, 2));
    return;
  }

  if (args.command === 'stop' || args.command === 'restart') {
    if (currentPid) {
      console.log(`Stopping npc-brain on port ${args.port}: PID ${currentPid}`);
      stopPid(currentPid);
      await sleep(700);
    } else {
      console.log(`No listener found on port ${args.port}.`);
    }
  }

  if (args.command === 'start' || args.command === 'restart') {
    const pid = startDetached(args.host, args.port);
    console.log(`Started detached npc-brain candidate PID ${pid}.`);
    const healthy = await waitForHealth(args.host, args.port, args.timeoutMs);
    const activePid = listeningPid(args.port);
    console.log(JSON.stringify({ healthy, listeningPid: activePid }, null, 2));
    process.exit(healthy ? 0 : 1);
  }
}

main().catch((error) => {
  console.error(error && error.stack ? error.stack : String(error));
  process.exit(1);
});
