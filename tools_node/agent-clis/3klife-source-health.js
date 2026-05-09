#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { TextDecoder } = require('util');

const ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_CACHE_DIR = path.join(ROOT, 'local', 'agent-cli-cache', '3klife-source-health');
const PROXY_ENV_KEYS = [
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'ALL_PROXY',
  'http_proxy',
  'https_proxy',
  'all_proxy',
];
const DEFAULT_TERMS = [
  '三國',
  '三国',
  '武將',
  '武将',
  '人物',
  '列傳',
  '列传',
  '傳',
  '传',
  '關係',
  '关系',
  '事件',
  '演義',
  '演义',
];

function parseArgs(argv) {
  const args = {
    json: false,
    compact: false,
    dryRun: false,
    limit: 1,
    cacheDir: DEFAULT_CACHE_DIR,
    output: null,
    selfTest: false,
    url: '',
    sourceId: '',
    timeoutMs: 12000,
    maxBytes: 900000,
    terms: [],
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--json':
        args.json = true;
        break;
      case '--compact':
        args.compact = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--limit':
        args.limit = Number(next() || 1);
        break;
      case '--cache-dir':
        args.cacheDir = next();
        break;
      case '--output':
        args.output = next();
        break;
      case '--self-test':
        args.selfTest = true;
        break;
      case '--url':
        args.url = next() || '';
        break;
      case '--source-id':
        args.sourceId = next() || '';
        break;
      case '--timeout-ms':
        args.timeoutMs = Number(next() || 12000);
        break;
      case '--max-bytes':
        args.maxBytes = Number(next() || 900000);
        break;
      case '--term':
        args.terms.push(next() || '');
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Usage: node tools_node/agent-clis/3klife-source-health.js [options]',
    '',
    'Required for live fetch:',
    '  --url <url>',
    '',
    'Options:',
    '  --source-id <id>',
    '  --json',
    '  --compact',
    '  --dry-run',
    '  --limit <n>',
    '  --cache-dir <path>',
    '  --output <path>',
    '  --self-test',
    '  --timeout-ms <ms>',
    '  --max-bytes <n>',
    '  --term <keyword> (repeatable)',
  ].join('\n'));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function stripHtmlToText(value) {
  return normalizeText(
    String(value || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"'),
  );
}

function pickSnippet(plainText, terms, width = 170) {
  if (!plainText) return '';
  for (const term of terms) {
    const index = plainText.indexOf(term);
    if (index >= 0) {
      const start = Math.max(0, index - Math.floor(width / 2));
      const end = Math.min(plainText.length, index + Math.floor(width / 2));
      return plainText.slice(start, end).trim();
    }
  }
  return plainText.slice(0, width).trim();
}

function relevanceCheck(plainText, terms) {
  const hitTerms = terms.filter((term) => term && plainText.includes(term));
  if (hitTerms.length >= 3) return { termHitCount: hitTerms.length, relevanceLevel: 'likely-relevant' };
  if (hitTerms.length >= 1) return { termHitCount: hitTerms.length, relevanceLevel: 'weak-relevant' };
  return { termHitCount: 0, relevanceLevel: 'unclear' };
}

function findTitle(htmlText) {
  const match = String(htmlText || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? normalizeText(match[1]) : '';
}

function normalizeUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  return parsed.toString();
}

function contentTypeParts(contentType) {
  const raw = String(contentType || '');
  const [mime, ...rest] = raw.split(';');
  let charset = '';
  for (const part of rest) {
    const match = part.match(/charset\s*=\s*("?)([^";]+)\1/i);
    if (match) {
      charset = match[2].trim().toLowerCase();
      break;
    }
  }
  return { mime: mime.trim().toLowerCase(), charset };
}

function sniffMetaCharset(buffer) {
  const ascii = buffer.toString('ascii', 0, Math.min(buffer.length, 4096));
  const match = ascii.match(/<meta[^>]+charset=["']?\s*([a-zA-Z0-9._-]+)/i);
  return match ? match[1].toLowerCase() : '';
}

function decodeBuffer(buffer, declaredCharset) {
  const encodings = [];
  if (declaredCharset) encodings.push(declaredCharset);
  encodings.push('utf-8', 'utf-8-sig', 'big5', 'gb18030');
  const tried = new Set();
  for (const encoding of encodings) {
    if (!encoding || tried.has(encoding)) continue;
    tried.add(encoding);
    try {
      return { text: new TextDecoder(encoding).decode(buffer), charset: encoding };
    } catch (error) {
      // try next
    }
  }
  return { text: buffer.toString('utf8'), charset: 'utf-8' };
}

function sha256(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`;
}

function sanitizeProxyEnv() {
  for (const key of PROXY_ENV_KEYS) {
    delete process.env[key];
  }
}

function classifyFailure(status, message, extra = {}) {
  return {
    ok: false,
    liveStatus: status,
    reason: message,
    canonicalWrites: false,
    ...extra,
  };
}

async function fetchSource(args) {
  const sourceId = normalizeText(args.sourceId || 'unknown-source');
  const url = normalizeText(args.url);
  const terms = args.terms.length > 0 ? args.terms.filter(Boolean) : DEFAULT_TERMS;

  if (!url) {
    return { payload: classifyFailure('invalid-url', 'empty-url', { sourceId, url }), exitCode: 3 };
  }
  if (url.startsWith('about:pending-url')) {
    return { payload: classifyFailure('pending-url', 'pending-url-placeholder', { sourceId, url }), exitCode: 3 };
  }
  if (url.startsWith('about:manual')) {
    return { payload: classifyFailure('manual-only', 'manual-quote-source', { sourceId, url }), exitCode: 3 };
  }

  let normalized;
  try {
    normalized = normalizeUrl(url);
  } catch (error) {
    return { payload: classifyFailure('invalid-url', String(error.message || error), { sourceId, url }), exitCode: 3 };
  }

  if (args.dryRun) {
    return {
      payload: {
        ok: true,
        liveStatus: 'dry-run',
        sourceId,
        url: normalized,
        fetchBackend: 'node-fetch',
        canonicalWrites: false,
      },
      exitCode: 0,
    };
  }

  sanitizeProxyEnv();
  const timeoutMs = Number.isFinite(args.timeoutMs) ? Math.max(1000, Math.floor(args.timeoutMs)) : 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(`timeout ${timeoutMs}ms`)), timeoutMs);

  try {
    const response = await fetch(normalized, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': '3KLife-3klife-source-health/1.0 (+agent-cli-factory)',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    const fullBuffer = Buffer.from(arrayBuffer);
    const buffer = fullBuffer.length > args.maxBytes ? fullBuffer.subarray(0, args.maxBytes) : fullBuffer;
    const typeInfo = contentTypeParts(response.headers.get('content-type'));
    const metaCharset = typeInfo.charset || sniffMetaCharset(buffer);
    const decoded = decodeBuffer(buffer, metaCharset);
    const htmlText = decoded.text;
    const plainText = stripHtmlToText(htmlText);
    const relevance = relevanceCheck(plainText, terms);
    const textHash = sha256(plainText);
    const cacheKey = sha256(`${sourceId}|${normalized}`).replace('sha256:', '');
    const cachePath = path.join(path.resolve(args.cacheDir), `${cacheKey}.json`);

    const payload = {
      ok: response.ok,
      sourceId,
      url: normalized,
      fetchedAt: new Date().toISOString(),
      fetchBackend: 'node-fetch',
      liveStatus: response.ok ? 'ok' : 'http-error',
      reason: response.ok ? '' : `HTTP ${response.status}`,
      httpStatus: response.status,
      contentType: response.headers.get('content-type') || '',
      bytesRead: buffer.length,
      charset: decoded.charset,
      title: findTitle(htmlText),
      termHitCount: relevance.termHitCount,
      relevanceLevel: relevance.relevanceLevel,
      snippet: pickSnippet(plainText, terms),
      textHash,
      cachePath: path.relative(ROOT, cachePath).replace(/\\/g, '/'),
      canonicalWrites: false,
    };
    writeJson(cachePath, payload);
    return { payload, exitCode: response.ok ? 0 : 3 };
  } catch (error) {
    const message = String(error && error.message ? error.message : error);
    const isAbort = String(error && error.name || '').toLowerCase().includes('abort');
    return {
      payload: classifyFailure(isAbort ? 'timeout' : 'network-blocked', message, {
        sourceId,
        url: normalized,
        fetchBackend: 'node-fetch',
        error: {
          name: String((error && error.name) || 'Error'),
          message,
        },
      }),
      exitCode: isAbort ? 4 : 4,
    };
  } finally {
    clearTimeout(timer);
  }
}

function emitPayload(payload, args) {
  if (args.output) {
    writeJson(path.resolve(ROOT, args.output), payload);
  }

  if (args.json) {
    process.stdout.write(args.compact ? JSON.stringify(payload) : `${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  const lines = [
    `sourceId=${payload.sourceId || ''}`,
    `url=${payload.url || ''}`,
    `liveStatus=${payload.liveStatus || ''}`,
    `httpStatus=${payload.httpStatus || ''}`,
    `relevance=${payload.relevanceLevel || ''}`,
    `bytesRead=${payload.bytesRead || 0}`,
  ];
  if (payload.title) lines.push(`title=${payload.title}`);
  if (payload.reason) lines.push(`reason=${payload.reason}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

async function main() {
  let args;
  try {
    args = parseArgs(process.argv);
  } catch (error) {
    const payload = classifyFailure('output-contract-error', String(error.message || error), {
      fetchBackend: 'node-fetch',
    });
    emitPayload(payload, { json: true, compact: false, output: null });
    process.exit(5);
    return;
  }

  if (args.selfTest) {
    const payload = {
      ok: true,
      liveStatus: 'self-test-ok',
      tool: '3klife-source-health',
      fetchBackend: 'node-fetch',
      cacheDir: path.relative(ROOT, path.resolve(args.cacheDir)).replace(/\\/g, '/'),
      supports: ['--help', '--json', '--compact', '--dry-run', '--limit', '--cache-dir', '--output', '--self-test'],
      canonicalWrites: false,
    };
    emitPayload(payload, args);
    process.exit(0);
    return;
  }

  const result = await fetchSource(args);
  emitPayload(result.payload, args);
  process.exit(result.exitCode);
}

main().catch((error) => {
  const payload = classifyFailure('output-contract-error', String(error && error.message ? error.message : error), {
    fetchBackend: 'node-fetch',
  });
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  process.exit(5);
});
