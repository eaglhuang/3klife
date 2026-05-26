import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { randomBytes } from "node:crypto";
import { join } from "node:path";

const workspaceRoot = "C:\\Users\\User\\3KLife";
const repoRoot = "C:\\Users\\User\\3klife-npc-brain";
const envPath = `${repoRoot}\\.env`;
const backendPort = 8765;
const proxyPort = 8790;
const backendUrl = `http://127.0.0.1:${backendPort}`;
const backendApiKey = randomBytes(24).toString("hex");
const uvicornExe = "C:\\Users\\User\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\uvicorn.exe";
const cmdExe = "C:\\WINDOWS\\system32\\cmd.exe";
const tunnelStatePath = join(workspaceRoot, ".tmp", "npc-brain-public-url.txt");
const launcherLogPath = join(workspaceRoot, ".tmp", "npc-brain-public-launcher.log");
const demoHtmlPath = join(workspaceRoot, "temp_workspace", "AI-learning-notes", "demo", "liu-bei-memory-intent-game", "index.html");
const demoPortraitPath = join(workspaceRoot, "temp_workspace", "AI-learning-notes", "assets", "resources", "sprites", "generals", "liu_bei_portrait.png");

const allowedOrigins = new Set([
  "https://eaglhuang.github.io",
  "http://localhost:7456",
  "http://127.0.0.1:7456",
]);

const allowedPaths = new Set([
  "/healthz",
  "/v1/npc/context-options",
  "/v1/npc/keyword-options",
  "/v1/npc/narrative-profile",
  "/v1/npc/dialogue",
  "/v1/npc/scene-director",
  "/v1/npc/scene-illustration",
]);
const demoPath = "/demo/liu-bei-memory-intent-game/index.html";
const demoPortraitUrlPath = "/assets/resources/sprites/generals/liu_bei_portrait.png";

appendLog(`launcher starting`);

spawn(
  uvicornExe,
  ["--env-file", envPath, "app.main:app", "--host", "127.0.0.1", "--port", String(backendPort)],
  {
    cwd: repoRoot,
    env: {
      ...process.env,
      NPC_BRAIN_DEPLOY_API_KEY: backendApiKey,
      NPC_BRAIN_DEPLOY_IDENTITY: "npc-brain-public-proxy",
    },
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  },
).unref();
appendLog(`backend spawn requested on ${backendUrl}`);

const server = createServer((req, res) => {
  const origin = typeof req.headers.origin === "string" ? req.headers.origin : "";
  appendLog(`proxy request ${req.method ?? "GET"} ${req.url ?? ""}`);
  if (req.method === "GET" && req.url) {
    const target = new URL(req.url, backendUrl);
    if (target.pathname === demoPath) {
      serveFile(res, demoHtmlPath, "text/html; charset=utf-8");
      return;
    }
    if (target.pathname === demoPortraitUrlPath) {
      serveFile(res, demoPortraitPath, "image/png");
      return;
    }
  }
  if (req.method === "OPTIONS") {
    writeCors(res, origin);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!req.url) {
    res.statusCode = 400;
    res.end("Missing request URL");
    return;
  }

  const target = new URL(req.url, backendUrl);
  if (!allowedPaths.has(target.pathname)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = Buffer.concat(chunks);
    const upstreamHeaders = {};
    const contentType = req.headers["content-type"];
    if (typeof contentType === "string") {
      upstreamHeaders["content-type"] = contentType;
    }
    const accept = req.headers.accept;
    if (typeof accept === "string") {
      upstreamHeaders.accept = accept;
    }
    upstreamHeaders["x-api-key"] = backendApiKey;

    const upstream = new URL(target.toString());
    const upstreamRequest = spawnRequest(upstream, req.method ?? "GET", upstreamHeaders, body);
    upstreamRequest.on("response", (upstreamRes) => {
      appendLog(`proxy upstream ${req.method ?? "GET"} ${target.pathname} -> ${upstreamRes.statusCode ?? 0}`);
      writeCors(res, origin);
      res.statusCode = upstreamRes.statusCode ?? 502;
      for (const [key, value] of Object.entries(upstreamRes.headers)) {
        if (value !== undefined && key.toLowerCase() !== "transfer-encoding" && key.toLowerCase() !== "content-encoding") {
          res.setHeader(key, value);
        }
      }
      upstreamRes.pipe(res);
    });
    upstreamRequest.on("error", (error) => {
      appendLog(`upstream error: ${error.message}`);
      writeCors(res, origin);
      res.statusCode = 502;
      res.end(JSON.stringify({ detail: "Proxy upstream error", error: error.message }));
    });
    upstreamRequest.end(body);
  });
});

server.on("error", (error) => {
  appendLog(`proxy server error: ${error.message}`);
});

server.listen(proxyPort, "127.0.0.1", () => {
  appendLog(`proxy listening on http://127.0.0.1:${proxyPort}`);
});

const tunnel = spawn(
  cmdExe,
  ["/d", "/s", "/c", `npx -y localtunnel --port ${proxyPort} --host https://localtunnel.me`],
  {
    cwd: workspaceRoot,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  },
);

let tunnelBuffer = "";
tunnel.stdout.on("data", (chunk) => {
  const text = chunk.toString("utf8");
  tunnelBuffer += text;
  appendLog(`[tunnel:out] ${text.trimEnd()}`);
  const match = tunnelBuffer.match(/https:\/\/[^\s]+/);
  if (match) {
    writeFileSync(tunnelStatePath, `${match[0]}\n`, "utf8");
    appendLog(`tunnel url ${match[0]}`);
  }
});
tunnel.stderr.on("data", (chunk) => {
  const text = chunk.toString("utf8");
  appendLog(`[tunnel:err] ${text.trimEnd()}`);
});
tunnel.on("error", (error) => {
  appendLog(`tunnel spawn error: ${error.message}`);
});
tunnel.on("exit", (code) => {
  appendLog(`tunnel exit ${code ?? "unknown"}`);
});

process.on("SIGINT", () => {
  appendLog("launcher received SIGINT");
  server.close();
  process.exit(0);
});

function spawnRequest(url, method, headers, body) {
  const isHttps = url.protocol === "https:";
  const request = isHttps ? httpsRequest : httpRequest;
  return request(
    url,
    {
      method,
      headers,
    },
  );
}

function readEnvValue(filePath, key) {
  if (!existsSync(filePath)) {
    return "";
  }
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }
    const [rawKey, ...rest] = line.split("=");
    if (rawKey.trim() !== key) {
      continue;
    }
    return rest.join("=").trim().replace(/^["']|["']$/g, "");
  }
  return "";
}

function writeCors(res, origin) {
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-api-key");
  res.setHeader("Access-Control-Expose-Headers", "content-type");
}

function appendLog(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  appendFileSync(launcherLogPath, line, "utf8");
}

function serveFile(res, filePath, contentType) {
  if (!existsSync(filePath)) {
    res.statusCode = 404;
    res.end("Not found");
    return;
  }

  const data = readFileSync(filePath);
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);
  res.setHeader("Content-Length", data.length);
  res.end(data);
}
