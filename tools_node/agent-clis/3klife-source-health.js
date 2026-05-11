#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  buildBasePayload,
  calculateByteMetrics,
  emitPayload,
  ensureDir,
  parseArgs,
  readJsonFile,
  resolveCacheDir,
  resolveProjectPath,
  sha256Short,
  stripHtml,
  toInt,
  truncate,
  writeJsonFile,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-source-health';
const DEFAULT_SOURCES_CONFIG = path.resolve(
  __dirname,
  '..',
  '..',
  'server',
  'npc-brain',
  'pipelines',
  'sanguo-rag',
  'config',
  'external-evidence-sources.json',
);
const DEFAULT_TERM_HIT_KEYWORDS = [
  '\u4e09\u570b',
  '\u4e09\u56fd',
  '\u66f9\u64cd',
  '\u5289\u5099',
  '\u5218\u5907',
  '\u5b6b\u6b0a',
  '\u5b59\u6743',
  '\u95dc\u7fbd',
  '\u5173\u7fbd',
  '\u8af8\u845b\u4eae',
  '\u8bf8\u845b\u4eae',
  '\u53f8\u99ac\u61ff',
  '\u53f8\u9a6c\u61ff',
];
const DEFAULT_PRECHECK_POLICY = {
  likelyThreshold: 3,
  possibleThreshold: 1,
  minimumTermHitCount: 1,
  hintKeywords: ['\u6b77\u53f2', '\u5386\u53f2', '\u6f14\u7fa9', '\u6f14\u4e49'],
  loginPatterns: ['\u767b\u5165', '\u767b\u5f55', 'sign in', 'log in', '\u5efa\u7acb\u5e33\u865f', '\u521b\u5efa\u8d26\u53f7'],
  javascriptShellContentTypePrefixes: ['application/javascript'],
  loginGatedMaxTermHitCount: 1,
  loginGatedMaxBytesRead: 8000,
};

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
      `  --sources-config <path> External source config. Default ${DEFAULT_SOURCES_CONFIG}`,
      '  --term-hit-keyword <kw> Override term-hit keywords (repeatable).',
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

function normalizeTermHitKeywords(rawKeywords, fallback = DEFAULT_TERM_HIT_KEYWORDS) {
  const values = Array.isArray(rawKeywords)
    ? rawKeywords
    : (rawKeywords === undefined || rawKeywords === null ? [] : [rawKeywords]);
  const normalized = [];
  const seen = new Set();
  values.forEach((value) => {
    const token = String(value || '').trim();
    if (!token || seen.has(token)) {
      return;
    }
    seen.add(token);
    normalized.push(token);
  });
  if (normalized.length > 0) {
    return normalized;
  }
  if (fallback && fallback.length > 0) {
    return normalizeTermHitKeywords(fallback, []);
  }
  return [];
}

function normalizeStringList(rawValues, fallback = []) {
  const values = Array.isArray(rawValues)
    ? rawValues
    : (rawValues === undefined || rawValues === null ? [] : [rawValues]);
  const normalized = [];
  const seen = new Set();
  values.forEach((value) => {
    const token = String(value || '').trim();
    if (!token || seen.has(token)) {
      return;
    }
    seen.add(token);
    normalized.push(token);
  });
  if (normalized.length > 0) {
    return normalized;
  }
  return normalizeStringList(fallback, []);
}

function tryLoadSourceConfigContext(sourceId, sourcesConfigPath) {
  try {
    const configPath = resolveProjectPath(String(sourcesConfigPath || DEFAULT_SOURCES_CONFIG));
    if (!sourceId || !configPath || !fs.existsSync(configPath)) {
      return {
        configPath,
        sourceRow: null,
        sourceClassPolicy: {},
        defaultPrecheckPolicy: {},
      };
    }
    const payload = readJsonFile(configPath);
    const rows = Array.isArray(payload && payload.sources) ? payload.sources : [];
    const sourceRow = rows.find((row) => String(row && row.sourceId || '').trim() === sourceId) || null;
    const pipelinePolicies = payload && typeof payload === 'object' && payload.pipelinePolicies && typeof payload.pipelinePolicies === 'object'
      ? payload.pipelinePolicies
      : {};
    const sourceClass = String(sourceRow && sourceRow.sourceClass || '').trim();
    const sourceClassMap = pipelinePolicies.sourceClassPrecheck && typeof pipelinePolicies.sourceClassPrecheck === 'object'
      ? pipelinePolicies.sourceClassPrecheck
      : {};
    const sourceClassPolicy = sourceClassMap[sourceClass] && typeof sourceClassMap[sourceClass] === 'object'
      ? sourceClassMap[sourceClass]
      : {};
    const defaultPrecheckPolicy = pipelinePolicies.precheckDefaults && typeof pipelinePolicies.precheckDefaults === 'object'
      ? pipelinePolicies.precheckDefaults
      : {};
    return {
      configPath,
      sourceRow,
      sourceClassPolicy,
      defaultPrecheckPolicy,
    };
  } catch (_error) {
    return {
      configPath: resolveProjectPath(String(sourcesConfigPath || DEFAULT_SOURCES_CONFIG)),
      sourceRow: null,
      sourceClassPolicy: {},
      defaultPrecheckPolicy: {},
    };
  }
}

function resolvePrecheckPolicy(sourceContext) {
  const sourcePolicy = sourceContext.sourceRow && sourceContext.sourceRow.precheckPolicy && typeof sourceContext.sourceRow.precheckPolicy === 'object'
    ? sourceContext.sourceRow.precheckPolicy
    : {};
  const classPolicy = sourceContext.sourceClassPolicy || {};
  const defaultPolicy = sourceContext.defaultPrecheckPolicy || {};
  const likelyThreshold = toInt(
    sourcePolicy.likelyThreshold,
    toInt(classPolicy.likelyThreshold, toInt(defaultPolicy.likelyThreshold, DEFAULT_PRECHECK_POLICY.likelyThreshold)),
  );
  const possibleThreshold = toInt(
    sourcePolicy.possibleThreshold,
    toInt(classPolicy.possibleThreshold, toInt(defaultPolicy.possibleThreshold, DEFAULT_PRECHECK_POLICY.possibleThreshold)),
  );
  const minimumTermHitCount = Math.max(
    0,
    toInt(
      sourcePolicy.minimumTermHitCount,
      toInt(classPolicy.minimumTermHitCount, toInt(defaultPolicy.minimumTermHitCount, DEFAULT_PRECHECK_POLICY.minimumTermHitCount)),
    ),
  );
  const hintKeywords = normalizeStringList(
    sourcePolicy.hintKeywords,
    normalizeStringList(classPolicy.hintKeywords, normalizeStringList(defaultPolicy.hintKeywords, DEFAULT_PRECHECK_POLICY.hintKeywords)),
  );
  const loginPatterns = normalizeStringList(
    sourcePolicy.loginPatterns,
    normalizeStringList(classPolicy.loginPatterns, normalizeStringList(defaultPolicy.loginPatterns, DEFAULT_PRECHECK_POLICY.loginPatterns)),
  );
  const javascriptShellContentTypePrefixes = normalizeStringList(
    sourcePolicy.javascriptShellContentTypePrefixes,
    normalizeStringList(
      classPolicy.javascriptShellContentTypePrefixes,
      normalizeStringList(defaultPolicy.javascriptShellContentTypePrefixes, DEFAULT_PRECHECK_POLICY.javascriptShellContentTypePrefixes),
    ),
  );
  return {
    likelyThreshold: Math.max(possibleThreshold, likelyThreshold),
    possibleThreshold,
    minimumTermHitCount,
    hintKeywords,
    loginPatterns,
    javascriptShellContentTypePrefixes,
    loginGatedMaxTermHitCount: Math.max(
      0,
      toInt(
        sourcePolicy.loginGatedMaxTermHitCount,
        toInt(
          classPolicy.loginGatedMaxTermHitCount,
          toInt(defaultPolicy.loginGatedMaxTermHitCount, DEFAULT_PRECHECK_POLICY.loginGatedMaxTermHitCount),
        ),
      ),
    ),
    loginGatedMaxBytesRead: Math.max(
      0,
      toInt(
        sourcePolicy.loginGatedMaxBytesRead,
        toInt(classPolicy.loginGatedMaxBytesRead, toInt(defaultPolicy.loginGatedMaxBytesRead, DEFAULT_PRECHECK_POLICY.loginGatedMaxBytesRead)),
      ),
    ),
  };
}

function resolveTermHitKeywords(args, sourceContext) {
  const cliKeywords = normalizeTermHitKeywords(args['term-hit-keyword'], []);
  if (cliKeywords.length > 0) {
    return {
      keywords: cliKeywords,
      source: 'cli-override',
      configPath: '',
    };
  }
  const configPath = sourceContext.configPath || resolveProjectPath(String(args['sources-config'] || DEFAULT_SOURCES_CONFIG));
  const sourceRow = sourceContext.sourceRow;
  const rowKeywords = normalizeTermHitKeywords(sourceRow && sourceRow.termHitKeywords, []);
  if (rowKeywords.length > 0) {
    return {
      keywords: rowKeywords,
      source: 'source-row',
      configPath,
    };
  }
  return {
    keywords: normalizeTermHitKeywords(DEFAULT_TERM_HIT_KEYWORDS, []),
    source: 'default',
    configPath,
  };
}

function countTermHits(text, termHitKeywords) {
  const body = String(text || '');
  return (termHitKeywords || DEFAULT_TERM_HIT_KEYWORDS)
    .reduce((sum, keyword) => sum + body.split(String(keyword || '')).length - 1, 0);
}

function relevanceLevel(termHitCount, plainText, precheckPolicy) {
  const likelyThreshold = toInt(precheckPolicy && precheckPolicy.likelyThreshold, DEFAULT_PRECHECK_POLICY.likelyThreshold);
  const possibleThreshold = toInt(precheckPolicy && precheckPolicy.possibleThreshold, DEFAULT_PRECHECK_POLICY.possibleThreshold);
  const normalizedLikelyThreshold = Math.max(likelyThreshold, possibleThreshold);
  if (termHitCount >= normalizedLikelyThreshold) {
    return 'likely-relevant';
  }
  if (termHitCount >= possibleThreshold) {
    return 'possible-relevant';
  }
  const hints = normalizeStringList(precheckPolicy && precheckPolicy.hintKeywords, DEFAULT_PRECHECK_POLICY.hintKeywords);
  const text = String(plainText || '');
  if (hints.some((keyword) => keyword && text.includes(keyword))) {
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
  const args = parseArgs(process.argv.slice(2), {
    repeatable: ['term-hit-keyword'],
  });
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
  const sourceContext = tryLoadSourceConfigContext(sourceId, args['sources-config']);
  const termKeywordResolution = resolveTermHitKeywords(args, sourceContext);
  const termHitKeywords = termKeywordResolution.keywords;
  const precheckPolicy = resolvePrecheckPolicy(sourceContext);
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
    termHitKeywords,
    termHitKeywordSource: termKeywordResolution.source,
    sourcesConfigPath: termKeywordResolution.configPath,
    precheckPolicy,
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
    payload.termHitCount = countTermHits(plainText, termHitKeywords);
    payload.relevanceLevel = relevanceLevel(payload.termHitCount, plainText, precheckPolicy);
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
