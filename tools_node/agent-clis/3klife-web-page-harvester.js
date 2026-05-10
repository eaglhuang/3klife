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
  resolveCacheDir,
  resolveProjectPath,
  sha256Short,
  stripHtml,
  toInt,
  truncate,
  uniqueStrings,
  writeJsonFile,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-web-page-harvester';

const TERM_PATTERNS = [
  /\u4e09\u570b/g,
  /\u4e09\u56fd/g,
  /\u66f9\u64cd/g,
  /\u5289\u5099/g,
  /\u5218\u5907/g,
  /\u5b6b\u6b0a/g,
  /\u5b59\u6743/g,
  /\u95dc\u7fbd/g,
  /\u5173\u7fbd/g,
  /\u8af8\u845b\u4eae/g,
  /\u8bf8\u845b\u4eae/g,
  /\u53f8\u99ac\u61ff/g,
  /\u53f8\u9a6c\u61ff/g,
];

function printHelp() {
  process.stdout.write(
    [
      `${TOOL_NAME}`,
      '',
      'Discover links from an index page, fetch matching detail pages, and cache',
      'compact JSONL records for Sanguo EvidenceSeed harvesters.',
      '',
      'Usage:',
      `  node tools_node/agent-clis/${TOOL_NAME}.js --source-id lishirenwu-sanguorenwu --index-url https://www.lishirenwu.com/sanguorenwu/ --link-include "^/sanguorenwu/[^/]+\\\\.html$" --same-origin --max-pages 500 --output-root local/codex-smoke/knowledge-growth/lishirenwu-page-harvest-r1 --json`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --self-test`,
      '',
      'Options:',
      '  --source-id <id>          Source id.',
      '  --index-url <url>         List/catalog page.',
      '  --link-include <regex>    Repeatable allow regex matched against URL pathname+search.',
      '  --link-exclude <regex>    Repeatable block regex matched against URL pathname+search.',
      '  --same-origin             Keep only URLs from the same origin as index-url.',
      '  --max-pages <n>           Maximum detail pages to fetch. Default 100.',
      '  --concurrency <n>         Parallel fetches. Default 4.',
      '  --timeout-seconds <n>     Per-page timeout. Default 12.',
      '  --delay-ms <n>            Delay before each fetch worker request. Default 0.',
      '  --cache-dir <dir>         Cache directory. Default local/agent-cli-cache/3klife-web-page-harvester.',
      '  --output-root <dir>       Artifact directory. Default local/codex-smoke/knowledge-growth/<source>-page-harvest.',
      '                            Writes pages.jsonl plus page-texts/*.txt for downstream seed extraction.',
      '  --json                    Pretty JSON to stdout.',
      '  --compact                 Compact JSON to stdout.',
      '  --dry-run                 Discover links but skip detail fetches.',
      '  --self-test               Deterministic local smoke test.',
    ].join('\n'),
  );
}

function safeUrl(rawUrl, baseUrl) {
  try {
    return new URL(String(rawUrl || '').trim(), baseUrl);
  } catch (_error) {
    return null;
  }
}

function compilePatterns(values) {
  return []
    .concat(values || [])
    .filter((value) => value !== true && String(value || '').trim())
    .map((value) => new RegExp(String(value)));
}

function extractTitle(html) {
  const match = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(String(html || ''));
  return match ? truncate(stripHtml(match[1]), 180) : '';
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
  if (text.includes('\u6b77\u53f2') || text.includes('\u5386\u53f2') || text.includes('\u6f14\u7fa9') || text.includes('\u6f14\u4e49')) {
    return 'possible-relevant';
  }
  return 'unclear';
}

function extractLinks(html, indexUrl, options) {
  const index = new URL(indexUrl);
  const includePatterns = compilePatterns(options.includePatterns);
  const excludePatterns = compilePatterns(options.excludePatterns);
  const links = [];
  const seen = new Set();
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match = regex.exec(String(html || ''));
  while (match) {
    const parsed = safeUrl(match[1], indexUrl);
    match = regex.exec(String(html || ''));
    if (!parsed) {
      continue;
    }
    if (options.sameOrigin && parsed.origin !== index.origin) {
      continue;
    }
    parsed.hash = '';
    const comparable = `${parsed.pathname}${parsed.search}`;
    if (includePatterns.length > 0 && !includePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
      continue;
    }
    if (excludePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
      continue;
    }
    const href = parsed.href;
    if (seen.has(href)) {
      continue;
    }
    seen.add(href);
    links.push(href);
  }
  return links;
}

async function fetchUrl(url, timeoutSeconds) {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Math.trunc(timeoutSeconds * 1000));
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (3KLife Web Page Harvester)',
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
      charset,
      bytesRead: buffer.length,
      html: decodeHtml(buffer, charset),
    };
  } finally {
    clearTimeout(timer);
  }
}

function safeFileStem(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 120);
}

function writePageText({ outputTextRoot, pageIndex, sourceId, url, title, textHash, plainText }) {
  if (!outputTextRoot) {
    return '';
  }
  ensureDir(outputTextRoot);
  const fileName = `${String(pageIndex).padStart(4, '0')}-${safeFileStem(sha256Short(url))}.txt`;
  const filePath = path.join(outputTextRoot, fileName);
  const body = [
    `sourceId: ${sourceId}`,
    `url: ${url}`,
    `title: ${title}`,
    `textHash: ${textHash}`,
    'canonicalWrites: false',
    '',
    plainText,
    '',
  ].join('\n');
  fs.writeFileSync(filePath, body, 'utf8');
  return filePath;
}

function recordFromHtml({ sourceId, url, html, httpStatus, contentType, charset, bytesRead, discoveredFrom, pageIndex, outputTextRoot }) {
  const plainText = stripHtml(html);
  const termHitCount = countTermHits(plainText);
  const textHash = `sha256:${sha256Short(plainText)}`;
  const title = extractTitle(html);
  const textPath = writePageText({
    outputTextRoot,
    pageIndex,
    sourceId,
    url,
    title,
    textHash,
    plainText,
  });
  return {
    pageId: `page:${sourceId}:${sha256Short(url)}`,
    sourceId,
    url,
    discoveredFrom,
    pageIndex,
    httpStatus,
    liveStatus: httpStatus >= 200 && httpStatus < 400 ? 'ok' : 'http-error',
    contentType,
    charset: charset || 'utf-8',
    bytesRead,
    title,
    termHitCount,
    relevanceLevel: relevanceLevel(termHitCount, plainText),
    textHash,
    textPath: textPath ? resolveProjectPath(textPath) : '',
    snippet: truncate(plainText, 240),
    textLength: plainText.length,
    canonicalWrites: false,
  };
}

async function fetchWorker(queue, workerState, options) {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) {
      return;
    }
    if (options.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    try {
      const fetched = await fetchUrl(item.url, options.timeoutSeconds);
      workerState.pages.push(recordFromHtml({
        sourceId: options.sourceId,
        url: item.url,
        html: fetched.html,
        httpStatus: fetched.status,
        contentType: fetched.contentType,
        bytesRead: fetched.bytesRead,
        discoveredFrom: options.indexUrl,
        pageIndex: item.pageIndex,
        outputTextRoot: options.outputTextRoot,
        charset: fetched.charset,
      }));
    } catch (error) {
      workerState.errors.push({
        sourceId: options.sourceId,
        url: item.url,
        pageIndex: item.pageIndex,
        liveStatus: String(error && error.name || '').toLowerCase().includes('abort') ? 'timeout' : 'fetch-error',
        reason: String(error && error.message ? error.message : error),
        canonicalWrites: false,
      });
    }
  }
}

function writeJsonl(filePath, rows) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''), 'utf8');
}

function renderMarkdown(summary) {
  const lines = [
    '# Web Page Harvest Summary',
    '',
    `- Source: \`${summary.sourceId}\``,
    `- Index URL: ${summary.indexUrl}`,
    `- Discovered Links: \`${summary.metrics.discoveredLinkCount}\``,
    `- Fetched Pages: \`${summary.metrics.fetchedPageCount}\``,
    `- Relevant Pages: \`${summary.metrics.relevantPageCount}\``,
    `- Error Count: \`${summary.metrics.errorCount}\``,
    `- Page Text Dir: \`${summary.outputs.pageTextDir || ''}\``,
    `- canonicalWrites: \`${summary.canonicalWrites}\``,
    '',
    '## Top Pages',
    '',
    '| # | Title | Hits | URL |',
    '|---:|---|---:|---|',
  ];
  summary.topPages.forEach((page, index) => {
    lines.push(`| ${index + 1} | ${String(page.title || '-').replace(/\|/g, '\\|')} | ${page.termHitCount} | ${page.url} |`);
  });
  return lines.join('\n');
}

function outputRootFor(args, sourceId) {
  if (args['output-root'] && args['output-root'] !== true) {
    return resolveProjectPath(String(args['output-root']));
  }
  return resolveProjectPath(path.join('local', 'codex-smoke', 'knowledge-growth', `${sourceId}-page-harvest`));
}

function renderCompact(payload) {
  return {
    ok: payload.ok,
    tool: payload.tool,
    sourceId: payload.sourceId,
    discoveredLinkCount: payload.metrics.discoveredLinkCount,
    fetchedPageCount: payload.metrics.fetchedPageCount,
    relevantPageCount: payload.metrics.relevantPageCount,
    errorCount: payload.metrics.errorCount,
    pagesJsonl: payload.outputs.pagesJsonl,
  };
}

function renderText(payload) {
  return [
    `${payload.tool} ok=${payload.ok}`,
    `- sourceId=${payload.sourceId}`,
    `- discoveredLinkCount=${payload.metrics.discoveredLinkCount}`,
    `- fetchedPageCount=${payload.metrics.fetchedPageCount}`,
    `- relevantPageCount=${payload.metrics.relevantPageCount}`,
    `- errorCount=${payload.metrics.errorCount}`,
    `- pagesJsonl=${payload.outputs.pagesJsonl}`,
  ].join('\n');
}

function runSelfTest(cacheDir) {
  const html = '<a href="/sanguorenwu/caocao.html">曹操</a><a href="/other.html">Other</a>';
  const links = extractLinks(html, 'https://www.example.com/sanguorenwu/', {
    includePatterns: ['^/sanguorenwu/[^/]+\\.html$'],
    excludePatterns: [],
    sameOrigin: true,
  });
  if (links.length !== 1 || !links[0].endsWith('/sanguorenwu/caocao.html')) {
    throw new Error('self-test failed: link extraction mismatch');
  }
  const payload = buildBasePayload(TOOL_NAME, { 'dry-run': true }, {
    cacheDir,
    sourceId: 'self-test',
    indexUrl: 'https://www.example.com/sanguorenwu/',
    metrics: {
      discoveredLinkCount: links.length,
      selectedLinkCount: links.length,
      fetchedPageCount: 0,
      relevantPageCount: 0,
      errorCount: 0,
    },
    outputs: {},
    topPages: [],
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  return payload;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    repeatable: ['link-include', 'link-exclude'],
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
  const indexUrl = String(args['index-url'] || '').trim();
  if (!sourceId || !indexUrl) {
    throw new Error('Missing required args: --source-id and --index-url');
  }

  const outputRoot = outputRootFor(args, sourceId);
  ensureDir(outputRoot);
  const pagesJsonl = path.join(outputRoot, 'pages.jsonl');
  const errorsJsonl = path.join(outputRoot, 'fetch-errors.jsonl');
  const summaryJson = path.join(outputRoot, 'harvest-summary.json');
  const summaryMd = path.join(outputRoot, 'harvest-summary.zh-TW.md');
  const pageTextDir = path.join(outputRoot, 'page-texts');

  const timeoutSeconds = Number.isFinite(Number(args['timeout-seconds'])) ? Number(args['timeout-seconds']) : 12;
  const maxPages = Math.max(1, toInt(args['max-pages'], 100));
  const concurrency = Math.max(1, Math.min(16, toInt(args.concurrency, 4)));
  const delayMs = Math.max(0, toInt(args['delay-ms'], 0));
  const sameOrigin = Boolean(args['same-origin']);

  const indexFetched = await fetchUrl(indexUrl, timeoutSeconds);
  const discoveredLinks = extractLinks(indexFetched.html, indexUrl, {
    includePatterns: args['link-include'] || [],
    excludePatterns: args['link-exclude'] || [],
    sameOrigin,
  });
  const selectedLinks = uniqueStrings(discoveredLinks).slice(0, maxPages);
  const pages = [];
  const errors = [];

  if (!args['dry-run']) {
    const queue = selectedLinks.map((url, index) => ({ url, pageIndex: index + 1 }));
    const workers = [];
    for (let index = 0; index < concurrency; index += 1) {
      workers.push(fetchWorker(queue, { pages, errors }, {
        sourceId,
        indexUrl,
        timeoutSeconds,
        delayMs,
        outputTextRoot: pageTextDir,
      }));
    }
    await Promise.all(workers);
    pages.sort((left, right) => left.pageIndex - right.pageIndex);
    errors.sort((left, right) => left.pageIndex - right.pageIndex);
  }

  writeJsonl(pagesJsonl, pages);
  writeJsonl(errorsJsonl, errors);

  const relevantPages = pages.filter((page) => page.termHitCount > 0 || page.relevanceLevel !== 'unclear');
  const topPages = pages
    .slice()
    .sort((left, right) => (right.termHitCount - left.termHitCount) || (right.bytesRead - left.bytesRead))
    .slice(0, 20);
  const payload = buildBasePayload(TOOL_NAME, args, {
    cacheDir: resolveProjectPath(cacheDir),
    sourceId,
    indexUrl,
    canonicalWrites: false,
    inputs: {
      sourceId,
      indexUrl,
      linkInclude: [].concat(args['link-include'] || []),
      linkExclude: [].concat(args['link-exclude'] || []),
      sameOrigin,
      maxPages,
      concurrency,
      delayMs,
      timeoutSeconds,
    },
    metrics: {
      indexHttpStatus: indexFetched.status,
      indexBytesRead: indexFetched.bytesRead,
      discoveredLinkCount: discoveredLinks.length,
      selectedLinkCount: selectedLinks.length,
      fetchedPageCount: pages.length,
      relevantPageCount: relevantPages.length,
      errorCount: errors.length,
      totalBytesRead: pages.reduce((sum, page) => sum + Number(page.bytesRead || 0), indexFetched.bytesRead),
    },
    outputs: {
      pagesJsonl: resolveProjectPath(pagesJsonl),
      errorsJsonl: resolveProjectPath(errorsJsonl),
      summaryJson: resolveProjectPath(summaryJson),
      summaryMarkdown: resolveProjectPath(summaryMd),
      pageTextDir: resolveProjectPath(pageTextDir),
    },
    topPages,
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  writeJsonFile(summaryJson, payload);
  fs.writeFileSync(summaryMd, `${renderMarkdown(payload)}\n`, 'utf8');
  emitPayload(payload, args, renderText, renderCompact);
}

main().catch((error) => {
  process.stderr.write(`[${TOOL_NAME}] ${error.message}\n`);
  process.exit(1);
});
