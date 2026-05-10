#!/usr/bin/env node
'use strict';

const path = require('path');

const {
  buildBasePayload,
  calculateByteMetrics,
  emitPayload,
  ensureDir,
  parseArgs,
  resolveCacheDir,
  resolveProjectPath,
  sha256Short,
  stripHtml,
  toInt,
  truncate,
  writeJsonFile,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-source-health';

const TERM_PATTERNS = [
  /\u4e09\u570b/g, // 三國
  /\u4e09\u56fd/g, // 三国
  /\u66f9\u64cd/g, // 曹操
  /\u5289\u5099/g, // 劉備
  /\u5218\u5907/g, // 刘备
  /\u5b6b\u6b0a/g, // 孫權
  /\u5b59\u6743/g, // 孙权
  /\u95dc\u7fbd/g, // 關羽
  /\u5173\u7fbd/g, // 关羽
  /\u8af8\u845b\u4eae/g, // 諸葛亮
  /\u8bf8\u845b\u4eae/g, // 诸葛亮
  /\u53f8\u99ac\u61ff/g, // 司馬懿
  /\u53f8\u9a6c\u61ff/g, // 司马懿
];

function printHelp() {
  process.stdout.write(
    [
      `${TOOL_NAME}`,
      '',
      'Deterministic source-health probe for Sanguo external evidence.',
      '',
      'Usage:',
      `  node tools_node/agent-clis/${TOOL_NAME}.js --source-id lishirenwu-sanguorenwu --url https://www.lishirenwu.com/sanguorenwu/ --json`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --self-test`,
      '',
      'Options:',
      '  --source-id <id>        Source id in allowlist.',
      '  --url <url>             Target URL.',
      '  --timeout-seconds <n>   Network timeout. Default 12.',
      '  --cache-dir <dir>       Cache directory. Default local/agent-cli-cache/3klife-source-health.',
      '  --output <path>         Optional JSON output path.',
      '  --json                  Pretty JSON to stdout.',
      '  --compact               Compact JSON to stdout.',
      '  --dry-run               Skip live network fetch.',
      '  --self-test             Deterministic local smoke test.',
    ].join('\n'),
  );
}

function extractTitle(html) {
  const text = String(html || '');
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  if (!match) {
    return '';
  }
  return truncate(stripHtml(match[1]), 180);
}

function detectCharset(contentType, buffer) {
  const header = String(contentType || '');
  const headerMatch = /charset\s*=\s*["']?([a-zA-Z0-9._-]+)/i.exec(header);
  if (headerMatch && headerMatch[1]) {
    return normalizeCharset(headerMatch[1]);
  }
  const probe = Buffer.from(buffer || []).slice(0, 2048).toString('ascii');
  const metaMatch = /charset\s*=\s*["']?\s*([a-zA-Z0-9._-]+)/i.exec(probe);
  if (metaMatch && metaMatch[1]) {
    return normalizeCharset(metaMatch[1]);
  }
  return 'utf-8';
}

function normalizeCharset(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) {
    return 'utf-8';
  }
  if (normalized === 'utf8') {
    return 'utf-8';
  }
  if (normalized === 'gb2312' || normalized === 'gb_2312-80' || normalized === 'gb18030') {
    return 'gbk';
  }
  return normalized;
}

function decodeHtml(buffer, charset) {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch (_error) {
    return Buffer.from(buffer || []).toString('utf8');
  }
}

function countTermHits(text) {
  const body = String(text || '');
  let total = 0;
  TERM_PATTERNS.forEach((pattern) => {
    const matches = body.match(pattern);
    total += Array.isArray(matches) ? matches.length : 0;
  });
  return total;
}

function relevanceLevel(termHitCount, plainText) {
  if (termHitCount >= 3) {
    return 'likely-relevant';
  }
  if (termHitCount >= 1) {
    return 'possible-relevant';
  }
  const text = String(plainText || '');
  if (text.includes('\u6b77\u53f2') || text.includes('\u6f14\u7fa9') || text.includes('\u6f14\u4e49')) {
    return 'possible-relevant';
  }
  return 'unclear';
}

async function fetchUrl(url, timeoutSeconds) {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Math.trunc(timeoutSeconds * 1000));
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (3KLife Source Health Probe)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const contentType = String(response.headers.get('content-type') || '');
    const buffer = Buffer.from(await response.arrayBuffer());
    const charset = detectCharset(contentType, buffer);
    return {
      ok: response.ok,
      status: Number(response.status),
      contentType,
      bytesRead: buffer.length,
      charset,
      html: decodeHtml(buffer, charset),
    };
  } finally {
    clearTimeout(timer);
  }
}

function renderCompact(payload) {
  return {
    ok: payload.ok,
    tool: payload.tool,
    sourceId: payload.sourceId,
    url: payload.url,
    liveStatus: payload.liveStatus,
    httpStatus: payload.httpStatus,
    bytesRead: payload.bytesRead,
    termHitCount: payload.termHitCount,
    relevanceLevel: payload.relevanceLevel,
    reason: payload.reason,
  };
}

function renderText(payload) {
  return [
    `${payload.tool} ok=${payload.ok}`,
    `- sourceId=${payload.sourceId}`,
    `- url=${payload.url}`,
    `- liveStatus=${payload.liveStatus}`,
    `- httpStatus=${payload.httpStatus}`,
    `- bytesRead=${payload.bytesRead}`,
    `- termHitCount=${payload.termHitCount}`,
    `- relevanceLevel=${payload.relevanceLevel}`,
    payload.reason ? `- reason=${payload.reason}` : '',
  ].filter(Boolean).join('\n');
}

function runSelfTest(cacheDir) {
  const payload = buildBasePayload(TOOL_NAME, { 'dry-run': true }, {
    cacheDir,
    sourceId: 'self-test',
    url: 'https://example.com',
    fetchedAt: new Date().toISOString(),
    fetchBackend: 'node-fetch',
    liveStatus: 'manual-only',
    reason: '',
    httpStatus: 0,
    contentType: '',
    bytesRead: 0,
    charset: 'utf-8',
    title: '',
    termHitCount: 0,
    relevanceLevel: 'unclear',
    snippet: '',
    textHash: `sha256:${sha256Short('self-test')}`,
    cachePath: '',
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  const cacheDir = resolveCacheDir(TOOL_NAME, args['cache-dir']);
  ensureDir(cacheDir);

  if (args['self-test']) {
    const payload = runSelfTest(cacheDir);
    emitPayload(payload, args, renderText, renderCompact);
    return;
  }

  const sourceId = String(args['source-id'] || '').trim();
  const url = String(args.url || '').trim();
  if (!sourceId || !url) {
    throw new Error('Missing required args: --source-id and --url');
  }
  const timeoutSeconds = Number.isFinite(Number(args['timeout-seconds']))
    ? Number(args['timeout-seconds'])
    : 12;

  const cacheFile = path.join(cacheDir, `${sha256Short(`${sourceId}|${url}`)}.json`);
  const payload = buildBasePayload(TOOL_NAME, args, {
    cacheDir: resolveProjectPath(cacheDir),
    sourceId,
    url,
    fetchedAt: new Date().toISOString(),
    fetchBackend: 'node-fetch',
    liveStatus: 'pending',
    reason: '',
    httpStatus: 0,
    contentType: '',
    bytesRead: 0,
    charset: 'utf-8',
    title: '',
    termHitCount: 0,
    relevanceLevel: 'unclear',
    snippet: '',
    textHash: '',
    cachePath: resolveProjectPath(cacheFile),
  });

  if (args['dry-run']) {
    payload.liveStatus = 'manual-only';
    payload.reason = 'dry-run';
    payload.textHash = `sha256:${sha256Short(`${sourceId}|${url}|dry-run`)}`;
    writeJsonFile(cacheFile, payload);
    payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
    emitPayload(payload, args, renderText, renderCompact);
    return;
  }

  try {
    const fetched = await fetchUrl(url, timeoutSeconds);
    payload.httpStatus = fetched.status;
    payload.contentType = fetched.contentType;
    payload.bytesRead = fetched.bytesRead;
    payload.charset = fetched.charset || 'utf-8';
    const plainText = stripHtml(fetched.html);
    payload.title = extractTitle(fetched.html);
    payload.termHitCount = countTermHits(plainText);
    payload.relevanceLevel = relevanceLevel(payload.termHitCount, plainText);
    payload.snippet = truncate(plainText, 180);
    payload.textHash = `sha256:${sha256Short(plainText)}`;
    payload.liveStatus = fetched.ok ? 'ok' : 'http-error';
    payload.reason = fetched.ok ? '' : `HTTP ${fetched.status}`;
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    payload.liveStatus = message.toLowerCase().includes('abort') ? 'timeout' : 'fetch-error';
    payload.reason = message;
    payload.textHash = `sha256:${sha256Short(message)}`;
  }

  writeJsonFile(cacheFile, payload);
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  emitPayload(payload, args, renderText, renderCompact);
}

main().catch((error) => {
  process.stderr.write(`[${TOOL_NAME}] ${error.message}\n`);
  process.exit(1);
});
