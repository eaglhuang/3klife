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
  uniqueStrings,
  writeJsonFile,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-web-page-harvester';
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
};

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
      '  --link-extraction-mode <mode>  Link extraction mode: href-regex (default), table-column-links, auto-discover-primary-text, or api-json-list.',
      '  --table-class-contains <text>  Optional table class token filter for table-column-links mode (e.g. wikitable).',
      '  --table-column-index <n>   Zero-based column index used by table-column-links mode. Default 0.',
      '  --api-url <url>            API list endpoint for api-json-list mode.',
      '  --api-method <verb>        HTTP method for api-json-list mode. Default POST.',
      '  --api-headers-json <json>  JSON object headers for api-json-list mode.',
      '  --api-body-template <json> JSON payload template; supports {pageNo} replacement.',
      '  --api-list-path <path>     Dotted JSON path to the list rows, e.g. data.',
      '  --api-url-field <field>    Field name/path containing detail URL.',
      '  --api-title-field <field>  Optional field name/path containing catalog title.',
      '  --api-snippet-field <field> Optional field name/path containing catalog summary.',
      '  --api-people-field <field> Optional field name/path containing related people.',
      '  --api-start-page <n>       First API page number. Default 1.',
      '  --api-max-index-pages <n>  Maximum list pages to scan. Default 20.',
      '  --include-index-page      Always include index-url itself as first fetched page.',
      '  --same-origin             Keep only URLs from the same origin as index-url.',
      '  --max-pages <n>           Maximum detail pages to fetch. Default 100.',
      '  --concurrency <n>         Parallel fetches. Default 4.',
      '  --timeout-seconds <n>     Per-page timeout. Default 12.',
      '  --delay-ms <n>            Delay before each fetch worker request. Default 0.',
      `  --sources-config <path>   External source config. Default ${DEFAULT_SOURCES_CONFIG}`,
      '  --term-hit-keyword <kw>   Override term-hit keywords (repeatable).',
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
  return {
    likelyThreshold: Math.max(likelyThreshold, possibleThreshold),
    possibleThreshold,
    minimumTermHitCount: Math.max(
      0,
      toInt(
        sourcePolicy.minimumTermHitCount,
        toInt(classPolicy.minimumTermHitCount, toInt(defaultPolicy.minimumTermHitCount, DEFAULT_PRECHECK_POLICY.minimumTermHitCount)),
      ),
    ),
    hintKeywords: normalizeStringList(
      sourcePolicy.hintKeywords,
      normalizeStringList(classPolicy.hintKeywords, normalizeStringList(defaultPolicy.hintKeywords, DEFAULT_PRECHECK_POLICY.hintKeywords)),
    ),
  };
}

function resolveTermHitKeywords(args, sourceContext) {
  const cliKeywords = normalizeTermHitKeywords(args['term-hit-keyword'], []);
  if (cliKeywords.length > 0) {
    return { keywords: cliKeywords, source: 'cli-override' };
  }
  const sourceRow = sourceContext.sourceRow;
  const rowKeywords = normalizeTermHitKeywords(sourceRow && sourceRow.termHitKeywords, []);
  if (rowKeywords.length > 0) {
    return { keywords: rowKeywords, source: 'source-row' };
  }
  return { keywords: normalizeTermHitKeywords(DEFAULT_TERM_HIT_KEYWORDS, []), source: 'default' };
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

function extractPrimaryTextLinks(html, indexUrl, options) {
  const index = new URL(indexUrl);
  const includePatterns = compilePatterns(options.includePatterns);
  const excludePatterns = compilePatterns(options.excludePatterns);
  const rows = [];
  const seen = new Set();
  const anchorRegex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match = anchorRegex.exec(String(html || ''));
  while (match) {
    const hrefRaw = match[1];
    const anchorHtml = match[2];
    const parsed = safeUrl(hrefRaw, indexUrl);
    match = anchorRegex.exec(String(html || ''));
    if (!parsed) {
      continue;
    }
    if (options.sameOrigin && parsed.origin !== index.origin) {
      continue;
    }
    parsed.hash = '';
    const comparable = `${parsed.pathname}${parsed.search}`;
    if (excludePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
      continue;
    }
    if (includePatterns.length > 0 && !includePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
      continue;
    }
    const href = parsed.href;
    if (seen.has(href)) {
      continue;
    }
    seen.add(href);

    const anchorText = stripHtml(anchorHtml || '');
    const fullText = `${href} ${anchorText}`.toLowerCase();
    const pathname = `${parsed.pathname}${parsed.search}`.toLowerCase();
    let score = 0;

    if (pathname.includes('.txt')) score += 7;
    if (pathname.includes('txt.utf-8')) score += 7;
    if (pathname.includes('.utf-8')) score += 4;
    if (fullText.includes('plain text')) score += 4;
    if (fullText.includes('utf-8')) score += 3;
    if (fullText.includes('text')) score += 2;
    if (fullText.includes('download')) score += 1;
    if (pathname.includes('/ebooks/')) score += 1;
    if (/\.(html?|xhtml?|xml)(\b|$)/i.test(pathname)) score -= 2;
    if (/\/wiki\//i.test(pathname)) score -= 1;
    if (/image|jpg|jpeg|png|gif|svg|css|js/i.test(pathname)) score -= 5;

    rows.push({
      href,
      score,
      anchorText: truncate(anchorText, 120),
      comparable,
    });
  }

  rows.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.href.localeCompare(right.href);
  });
  return rows;
}

function extractTableColumnLinks(html, indexUrl, options) {
  const index = new URL(indexUrl);
  const includePatterns = compilePatterns(options.includePatterns);
  const excludePatterns = compilePatterns(options.excludePatterns);
  const classToken = String(options.tableClassContains || '').trim().toLowerCase();
  const columnIndex = Number.isFinite(Number(options.tableColumnIndex))
    ? Math.max(0, Math.trunc(Number(options.tableColumnIndex)))
    : 0;
  const links = [];
  const seen = new Set();
  const tableRegex = /<table\b([^>]*)>([\s\S]*?)<\/table>/gi;
  let tableMatch = tableRegex.exec(String(html || ''));
  while (tableMatch) {
    const tableAttrs = String(tableMatch[1] || '');
    const tableBody = String(tableMatch[2] || '');
    if (classToken) {
      const classMatch = /class\s*=\s*["']([^"']+)["']/i.exec(tableAttrs);
      const classText = String(classMatch && classMatch[1] || '').toLowerCase();
      if (!classText.includes(classToken)) {
        tableMatch = tableRegex.exec(String(html || ''));
        continue;
      }
    }

    const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
    let rowMatch = rowRegex.exec(tableBody);
    while (rowMatch) {
      const rowBody = String(rowMatch[1] || '');
      const cellRegex = /<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi;
      const cells = [];
      let cellMatch = cellRegex.exec(rowBody);
      while (cellMatch) {
        cells.push({
          tag: String(cellMatch[1] || '').toLowerCase(),
          html: String(cellMatch[2] || ''),
        });
        cellMatch = cellRegex.exec(rowBody);
      }
      if (cells.length > columnIndex) {
        const targetCell = cells[columnIndex];
        if (targetCell.tag === 'td') {
          const hrefMatch = /href\s*=\s*["']([^"']+)["']/i.exec(targetCell.html);
          if (hrefMatch && hrefMatch[1]) {
            const parsed = safeUrl(hrefMatch[1], indexUrl);
            if (parsed) {
              if (options.sameOrigin && parsed.origin !== index.origin) {
                rowMatch = rowRegex.exec(tableBody);
                continue;
              }
              parsed.hash = '';
              const comparable = `${parsed.pathname}${parsed.search}`;
              if (includePatterns.length > 0 && !includePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
                rowMatch = rowRegex.exec(tableBody);
                continue;
              }
              if (excludePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
                rowMatch = rowRegex.exec(tableBody);
                continue;
              }
              const href = parsed.href;
              if (!seen.has(href)) {
                seen.add(href);
                links.push(href);
              }
            }
          }
        }
      }
      rowMatch = rowRegex.exec(tableBody);
    }

    tableMatch = tableRegex.exec(String(html || ''));
  }
  return links;
}

async function fetchUrl(url, timeoutSeconds, requestOptions = {}) {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, Math.trunc(timeoutSeconds * 1000));
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const method = String(requestOptions.method || 'GET').trim().toUpperCase() || 'GET';
    const headers = Object.assign(
      {
        'User-Agent': 'Mozilla/5.0 (3KLife Web Page Harvester)',
        'Accept': String(requestOptions.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'),
      },
      requestOptions.headers || {},
    );
    let body = undefined;
    if (requestOptions.jsonBody !== undefined && requestOptions.jsonBody !== null) {
      body = JSON.stringify(requestOptions.jsonBody);
      if (!Object.keys(headers).some((key) => String(key).toLowerCase() === 'content-type')) {
        headers['Content-Type'] = 'application/json';
      }
    } else if (requestOptions.body !== undefined && requestOptions.body !== null) {
      body = requestOptions.body;
    }
    const response = await fetch(url, {
      method,
      headers,
      body,
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

function decodeJsonArg(rawValue, fallbackValue) {
  if (rawValue === undefined || rawValue === null || rawValue === true) {
    return fallbackValue;
  }
  const text = String(rawValue || '').trim();
  if (!text) {
    return fallbackValue;
  }
  return JSON.parse(text);
}

function interpolateTemplateString(value, variables) {
  return String(value || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_full, key) => {
    if (Object.prototype.hasOwnProperty.call(variables, key)) {
      return String(variables[key]);
    }
    return '';
  });
}

function interpolateTemplateValue(value, variables) {
  if (Array.isArray(value)) {
    return value.map((item) => interpolateTemplateValue(item, variables));
  }
  if (value && typeof value === 'object') {
    const output = {};
    Object.entries(value).forEach(([key, nested]) => {
      output[key] = interpolateTemplateValue(nested, variables);
    });
    return output;
  }
  if (typeof value === 'string') {
    return interpolateTemplateString(value, variables);
  }
  return value;
}

function getValueByPath(payload, rawPath) {
  const pathText = String(rawPath || '').trim();
  if (!pathText) {
    return payload;
  }
  const segments = pathText.split('.').map((segment) => segment.trim()).filter(Boolean);
  let current = payload;
  for (const segment of segments) {
    if (current === undefined || current === null) {
      return undefined;
    }
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isFinite(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    current = current[segment];
  }
  return current;
}

async function extractApiJsonList(indexUrl, timeoutSeconds, options) {
  const includePatterns = compilePatterns(options.includePatterns);
  const excludePatterns = compilePatterns(options.excludePatterns);
  const rows = [];
  const seen = new Set();
  const discoverySamples = [];
  const apiUrl = String(options.apiUrl || '').trim();
  const apiMethod = String(options.apiMethod || 'POST').trim().toUpperCase() || 'POST';
  const apiHeaders = Object.assign({}, options.apiHeaders || {});
  const apiBodyTemplate = options.apiBodyTemplate || {};
  const apiListPath = String(options.apiListPath || 'data').trim() || 'data';
  const apiUrlField = String(options.apiUrlField || 'url').trim() || 'url';
  const apiTitleField = String(options.apiTitleField || 'title').trim();
  const apiSnippetField = String(options.apiSnippetField || 'con').trim();
  const apiPeopleField = String(options.apiPeopleField || 'ren').trim();
  const maxPages = Math.max(1, Number.isFinite(Number(options.maxPages)) ? Math.trunc(Number(options.maxPages)) : 100);
  const startPage = Math.max(1, Number.isFinite(Number(options.apiStartPage)) ? Math.trunc(Number(options.apiStartPage)) : 1);
  const maxIndexPages = Math.max(1, Number.isFinite(Number(options.apiMaxIndexPages)) ? Math.trunc(Number(options.apiMaxIndexPages)) : 20);

  if (!apiUrl) {
    throw new Error('api-json-list mode requires --api-url');
  }

  let listPageCount = 0;
  for (let pageNo = startPage; pageNo < startPage + maxIndexPages; pageNo += 1) {
    if (rows.length >= maxPages) {
      break;
    }
    const requestPayload = interpolateTemplateValue(apiBodyTemplate, { pageNo, pageNoString: String(pageNo) });
    const fetched = await fetchUrl(apiUrl, timeoutSeconds, {
      method: apiMethod,
      headers: apiHeaders,
      jsonBody: apiMethod === 'GET' ? undefined : requestPayload,
      body: apiMethod === 'GET' ? undefined : undefined,
      accept: 'application/json,text/plain;q=0.9,*/*;q=0.8',
    });
    const payload = JSON.parse(String(fetched.html || '{}'));
    const items = getValueByPath(payload, apiListPath);
    listPageCount += 1;
    if (!Array.isArray(items) || items.length === 0) {
      break;
    }
    for (let index = 0; index < items.length; index += 1) {
      if (rows.length >= maxPages) {
        break;
      }
      const item = items[index];
      const hrefRaw = getValueByPath(item, apiUrlField);
      const parsed = safeUrl(hrefRaw, indexUrl);
      if (!parsed) {
        continue;
      }
      const comparable = `${parsed.pathname}${parsed.search}`;
      if (options.sameOrigin && parsed.origin !== new URL(indexUrl).origin) {
        continue;
      }
      if (includePatterns.length > 0 && !includePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
        continue;
      }
      if (excludePatterns.some((pattern) => pattern.test(comparable) || pattern.test(parsed.href))) {
        continue;
      }
      parsed.hash = '';
      const href = parsed.href;
      if (seen.has(href)) {
        continue;
      }
      seen.add(href);
      const row = {
        href,
        discoveredFrom: `${apiUrl}#page=${pageNo}`,
        discoveryMeta: {
          catalogPageNo: pageNo,
          catalogIndex: index,
          catalogTitle: normalizeStringList(getValueByPath(item, apiTitleField), []).join(' ') || String(getValueByPath(item, apiTitleField) || '').trim(),
          catalogSnippet: normalizeStringList(getValueByPath(item, apiSnippetField), []).join(' ') || String(getValueByPath(item, apiSnippetField) || '').trim(),
          catalogPeople: normalizeStringList(getValueByPath(item, apiPeopleField), []),
        },
      };
      rows.push(row);
      if (discoverySamples.length < 20) {
        discoverySamples.push({
          href,
          catalogPageNo: pageNo,
          catalogTitle: row.discoveryMeta.catalogTitle,
          catalogSnippet: truncate(row.discoveryMeta.catalogSnippet, 160),
          catalogPeople: row.discoveryMeta.catalogPeople,
        });
      }
    }
  }

  return {
    rows,
    discoverySamples,
    listPageCount,
  };
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

function recordFromHtml({
  sourceId,
  url,
  html,
  httpStatus,
  contentType,
  charset,
  bytesRead,
  discoveredFrom,
  discoveryMeta,
  pageIndex,
  outputTextRoot,
  termHitKeywords,
  precheckPolicy,
}) {
  const plainText = stripHtml(html);
  const termHitCount = countTermHits(plainText, termHitKeywords);
  const textHash = `sha256:${sha256Short(plainText)}`;
  const title = extractTitle(html) || String((discoveryMeta && discoveryMeta.catalogTitle) || '');
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
    relevanceLevel: relevanceLevel(termHitCount, plainText, precheckPolicy),
    textHash,
    textPath: textPath ? resolveProjectPath(textPath) : '',
    snippet: truncate(plainText, 240),
    textLength: plainText.length,
    catalogTitle: String((discoveryMeta && discoveryMeta.catalogTitle) || ''),
    catalogSnippet: String((discoveryMeta && discoveryMeta.catalogSnippet) || ''),
    catalogPeople: [].concat((discoveryMeta && discoveryMeta.catalogPeople) || []),
    catalogPageNo: discoveryMeta && discoveryMeta.catalogPageNo ? Number(discoveryMeta.catalogPageNo) : null,
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
        discoveredFrom: item.discoveredFrom || options.indexUrl,
        discoveryMeta: item.discoveryMeta || null,
        pageIndex: item.pageIndex,
        outputTextRoot: options.outputTextRoot,
        charset: fetched.charset,
        termHitKeywords: options.termHitKeywords,
        precheckPolicy: options.precheckPolicy,
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
  const primaryLinks = extractPrimaryTextLinks(
    '<a href="/ebooks/25606.txt.utf-8">Plain Text UTF-8</a><a href="/ebooks/25606">Landing</a>',
    'https://www.gutenberg.org/ebooks/25606',
    {
      includePatterns: [],
      excludePatterns: [],
      sameOrigin: true,
    },
  );
  if (primaryLinks.length === 0 || !String(primaryLinks[0].href || '').includes('.txt.utf-8')) {
    throw new Error('self-test failed: primary text auto-discovery mismatch');
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
    repeatable: ['link-include', 'link-exclude', 'term-hit-keyword'],
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
  const sourceContext = tryLoadSourceConfigContext(sourceId, args['sources-config']);
  const termKeywordResolution = resolveTermHitKeywords(args, sourceContext);
  const termHitKeywords = termKeywordResolution.keywords;
  const precheckPolicy = resolvePrecheckPolicy(sourceContext);

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
  const includeIndexPage = Boolean(args['include-index-page']);
  const linkExtractionMode = String(args['link-extraction-mode'] || 'href-regex').trim().toLowerCase() || 'href-regex';
  const tableClassContains = String(args['table-class-contains'] || '').trim();
  const tableColumnIndex = Number.isFinite(Number(args['table-column-index'])) ? Math.max(0, Math.trunc(Number(args['table-column-index']))) : 0;
  const apiUrl = String(args['api-url'] || '').trim();
  const apiMethod = String(args['api-method'] || 'POST').trim().toUpperCase() || 'POST';
  const apiHeaders = decodeJsonArg(args['api-headers-json'], {});
  const apiBodyTemplate = decodeJsonArg(args['api-body-template'], {});
  const apiListPath = String(args['api-list-path'] || 'data').trim() || 'data';
  const apiUrlField = String(args['api-url-field'] || 'url').trim() || 'url';
  const apiTitleField = String(args['api-title-field'] || 'title').trim();
  const apiSnippetField = String(args['api-snippet-field'] || 'con').trim();
  const apiPeopleField = String(args['api-people-field'] || 'ren').trim();
  const apiStartPage = Number.isFinite(Number(args['api-start-page'])) ? Math.max(1, Math.trunc(Number(args['api-start-page']))) : 1;
  const apiMaxIndexPages = Number.isFinite(Number(args['api-max-index-pages'])) ? Math.max(1, Math.trunc(Number(args['api-max-index-pages']))) : 20;

  const indexFetched = await fetchUrl(indexUrl, timeoutSeconds);
  const linkOptions = {
    includePatterns: args['link-include'] || [],
    excludePatterns: args['link-exclude'] || [],
    sameOrigin,
    tableClassContains,
    tableColumnIndex,
    apiUrl,
    apiMethod,
    apiHeaders,
    apiBodyTemplate,
    apiListPath,
    apiUrlField,
    apiTitleField,
    apiSnippetField,
    apiPeopleField,
    apiStartPage,
    apiMaxIndexPages,
    maxPages,
  };
  let discoveredRows = [];
  let primaryDiscoveryCandidates = [];
  let apiDiscoveryCandidates = [];
  let apiListPageCount = 0;
  if (linkExtractionMode === 'table-column-links') {
    discoveredRows = extractTableColumnLinks(indexFetched.html, indexUrl, linkOptions).map((href) => ({
      href,
      discoveredFrom: indexUrl,
      discoveryMeta: null,
    }));
  } else if (linkExtractionMode === 'auto-discover-primary-text') {
    primaryDiscoveryCandidates = extractPrimaryTextLinks(indexFetched.html, indexUrl, linkOptions);
    discoveredRows = primaryDiscoveryCandidates.map((row) => ({
      href: row.href,
      discoveredFrom: indexUrl,
      discoveryMeta: {
        catalogTitle: row.anchorText || '',
        catalogSnippet: '',
        catalogPeople: [],
      },
    }));
  } else if (linkExtractionMode === 'api-json-list') {
    const apiDiscovery = await extractApiJsonList(indexUrl, timeoutSeconds, linkOptions);
    discoveredRows = apiDiscovery.rows;
    apiDiscoveryCandidates = apiDiscovery.discoverySamples;
    apiListPageCount = apiDiscovery.listPageCount;
  } else {
    discoveredRows = extractLinks(indexFetched.html, indexUrl, linkOptions).map((href) => ({
      href,
      discoveredFrom: indexUrl,
      discoveryMeta: null,
    }));
  }
  const selectedLinks = [];
  if (includeIndexPage) {
    selectedLinks.push({ url: indexUrl, discoveredFrom: indexUrl, discoveryMeta: null });
  }
  discoveredRows.forEach((row) => {
    if (selectedLinks.length >= maxPages) {
      return;
    }
    if (includeIndexPage && row.href === indexUrl) {
      return;
    }
    selectedLinks.push({
      url: row.href,
      discoveredFrom: row.discoveredFrom || indexUrl,
      discoveryMeta: row.discoveryMeta || null,
    });
  });
  const pages = [];
  const errors = [];

  if (!args['dry-run']) {
    const queue = selectedLinks.map((item, index) => ({
      url: item.url,
      discoveredFrom: item.discoveredFrom,
      discoveryMeta: item.discoveryMeta,
      pageIndex: index + 1,
    }));
    const workers = [];
    for (let index = 0; index < concurrency; index += 1) {
      workers.push(fetchWorker(queue, { pages, errors }, {
        sourceId,
        indexUrl,
        timeoutSeconds,
        delayMs,
        outputTextRoot: pageTextDir,
        termHitKeywords,
        precheckPolicy,
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
      linkExtractionMode,
      tableClassContains,
      tableColumnIndex,
      autoDiscoveryEnabled: linkExtractionMode === 'auto-discover-primary-text',
      apiUrl,
      apiMethod,
      apiListPath,
      apiUrlField,
      apiTitleField,
      apiSnippetField,
      apiPeopleField,
      apiStartPage,
      apiMaxIndexPages,
      includeIndexPage,
      sameOrigin,
      maxPages,
      concurrency,
      delayMs,
      timeoutSeconds,
      termHitKeywords,
      termHitKeywordSource: termKeywordResolution.source,
      precheckPolicy,
    },
    metrics: {
      indexHttpStatus: indexFetched.status,
      indexBytesRead: indexFetched.bytesRead,
      discoveredLinkCount: discoveredRows.length,
      selectedLinkCount: selectedLinks.length,
      fetchedPageCount: pages.length,
      relevantPageCount: relevantPages.length,
      errorCount: errors.length,
      apiListPageCount,
      totalBytesRead: pages.reduce((sum, page) => sum + Number(page.bytesRead || 0), indexFetched.bytesRead),
    },
    autoDiscoveryCandidates: primaryDiscoveryCandidates.slice(0, 20),
    apiDiscoveryCandidates: apiDiscoveryCandidates.slice(0, 20),
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
