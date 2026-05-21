#!/usr/bin/env node
'use strict';

const path = require('path');

const {
  buildBasePayload,
  calculateByteMetrics,
  emitPayload,
  ensureDir,
  _fileExists,
  parseArgs,
  readJsonFile,
  readStdin,
  readTextFile,
  resolveCacheDir,
  resolveProjectPath,
  safeArray,
  safeObject,
  sha256Short,
  stripHtml,
  toInt,
  truncate,
  uniqueStrings,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-sanguo-source';

function printHelp() {
  process.stdout.write(
    [
      `${TOOL_NAME}`,
      '',
      'Normalize Sanguo source intake from local wiki-style text, Koei stat blocks,',
      'or cached JSON blobs into a compact, agent-friendly payload.',
      '',
      'Usage:',
      `  node tools_node/agent-clis/${TOOL_NAME}.js --input-file <path> [--source-type auto|wiki-summary|koei-stats] [--json|--compact]`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --wiki-cache temp_workspace/wiki-cache.json --cache-id zhuge-liang --name 諸葛亮 --compact`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --text "<raw text>" --name 諸葛亮 --dry-run`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --self-test`,
      '',
      'Options:',
      '  --input-file <path>      Raw text, JSON object, JSON array, or cache-style object.',
      '  --wiki-cache <path>      Cache object keyed by id/name. Defaults to first N entries if no --cache-id.',
      '  --cache-id <id>          Repeatable cache key filter for JSON/cache-style inputs.',
      '  --text <text>            Inline raw text input.',
      '  --name <name>            Candidate name hint.',
      '  --faction <faction>      Faction hint.',
      '  --role <role>            Role hint.',
      '  --url <url>              Source reference URL.',
      '  --source-type <type>     auto | wiki-summary | koei-stats.',
      '  --limit <n>              Max records to analyze from array/cache input.',
      '  --cache-dir <dir>        Agent cache directory. Default local/agent-cli-cache/3klife-sanguo-source.',
      '  --output <path>          Write full JSON payload to disk.',
      '  --json                   Pretty JSON to stdout.',
      '  --compact                Minified compact JSON to stdout.',
      '  --dry-run                Mark payload as preview-only.',
      '  --self-test              Run deterministic local smoke tests.',
    ].join('\n'),
  );
}

function decodeInputValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return '';
}

function maybeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (_error) {
    return null;
  }
}

function coerceTextFromObject(item) {
  const objectValue = safeObject(item);
  const preferred = [
    objectValue.text,
    objectValue.summary,
    objectValue.extract,
    objectValue.description,
    objectValue.content,
    objectValue.body,
    objectValue.html,
    objectValue.rawText,
  ];
  for (const candidate of preferred) {
    const text = decodeInputValue(candidate).trim();
    if (text) {
      return text;
    }
  }
  return decodeInputValue(item);
}

function normalizeRecord(rawRecord, fallbackName, args, sourceRef) {
  const objectValue = safeObject(rawRecord);
  return {
    inputName: String(
      objectValue.name
      || objectValue.title
      || objectValue.label
      || fallbackName
      || args.name
      || ''
    ).trim(),
    text: coerceTextFromObject(rawRecord),
    factionHint: String(objectValue.faction || args.faction || '').trim(),
    roleHint: String(objectValue.role || args.role || '').trim(),
    url: String(objectValue.url || objectValue.sourceUrl || args.url || sourceRef || '').trim(),
    inputRef: String(sourceRef || objectValue.inputRef || '').trim(),
  };
}

function recordsFromParsedPayload(parsed, args, sourceRefBase) {
  const limit = Math.max(1, toInt(args.limit, 10));
  if (Array.isArray(parsed)) {
    return parsed.slice(0, limit).map((item, index) => normalizeRecord(item, `record-${index + 1}`, args, sourceRefBase));
  }
  const objectValue = safeObject(parsed);
  if (Array.isArray(objectValue.data)) {
    return objectValue.data.slice(0, limit).map((item, index) => normalizeRecord(item, `data-${index + 1}`, args, sourceRefBase));
  }
  if (Array.isArray(objectValue.results)) {
    return objectValue.results.slice(0, limit).map((item, index) => normalizeRecord(item, `result-${index + 1}`, args, sourceRefBase));
  }
  if (Array.isArray(objectValue.entries)) {
    return objectValue.entries.slice(0, limit).map((item, index) => normalizeRecord(item, `entry-${index + 1}`, args, sourceRefBase));
  }
  const stringEntries = Object.entries(objectValue).filter(([, value]) => typeof value === 'string' && value.trim());
  if (stringEntries.length > 0) {
    return stringEntries.slice(0, limit).map(([key, value]) => normalizeRecord({ name: key, text: value }, key, args, `${sourceRefBase}#${key}`));
  }
  return [normalizeRecord(parsed, args.name || 'inline', args, sourceRefBase)];
}

function buildFilterState(rawValues) {
  const values = safeArray(rawValues).map((value) => String(value).trim()).filter(Boolean);
  return {
    values,
    exact: new Set(values),
    normalized: new Set(values.map((value) => value.toLowerCase())),
  };
}

function matchesFilterState(candidate, filterState) {
  const text = String(candidate || '').trim();
  if (!text || filterState.normalized.size === 0) {
    return filterState.normalized.size === 0;
  }
  return filterState.exact.has(text) || filterState.normalized.has(text.toLowerCase());
}

function recordMatchesFilter(record, filterState) {
  if (filterState.normalized.size === 0) {
    return true;
  }
  const candidates = [
    record.inputName,
    record.name,
    record.inputRef,
    String(record.inputRef || '').split('#').pop(),
    record.url,
    String(record.url || '').split('#').pop(),
  ];
  return candidates.some((candidate) => matchesFilterState(candidate, filterState));
}

function collectJsonLikeRecords(parsed, args, sourceRefBase, filterState) {
  const limit = Math.max(1, toInt(args.limit, 10));
  const objectValue = safeObject(parsed);
  const stringEntries = Object.entries(objectValue).filter(([, value]) => typeof value === 'string' && value.trim());
  if (stringEntries.length > 0) {
    const filteredEntries = filterState.normalized.size > 0
      ? stringEntries.filter(([key]) => matchesFilterState(key, filterState))
      : stringEntries;
    return filteredEntries
      .slice(0, limit)
      .map(([key, value]) => normalizeRecord({ name: key, text: value }, key, args, `${sourceRefBase}#${key}`));
  }

  let records = [];
  if (Array.isArray(parsed)) {
    records = parsed.map((item, index) => normalizeRecord(item, `record-${index + 1}`, args, sourceRefBase));
  } else if (Array.isArray(objectValue.data)) {
    records = objectValue.data.map((item, index) => normalizeRecord(item, `data-${index + 1}`, args, sourceRefBase));
  } else if (Array.isArray(objectValue.results)) {
    records = objectValue.results.map((item, index) => normalizeRecord(item, `result-${index + 1}`, args, sourceRefBase));
  } else if (Array.isArray(objectValue.entries)) {
    records = objectValue.entries.map((item, index) => normalizeRecord(item, `entry-${index + 1}`, args, sourceRefBase));
  } else {
    records = [normalizeRecord(parsed, args.name || 'inline', args, sourceRefBase)];
  }

  return records.filter((record) => recordMatchesFilter(record, filterState)).slice(0, limit);
}

async function collectInputRecords(args) {
  const filterState = buildFilterState(args['cache-id']);
  if (args['wiki-cache'] && args['wiki-cache'] !== true) {
    const cachePath = resolveProjectPath(String(args['wiki-cache']));
    const parsed = readJsonFile(cachePath);
    return collectJsonLikeRecords(parsed, args, cachePath, filterState);
  }

  if (args['input-file'] && args['input-file'] !== true) {
    const inputPath = resolveProjectPath(String(args['input-file']));
    const rawText = readTextFile(inputPath);
    const parsed = maybeParseJson(rawText);
    if (parsed !== null) {
      return collectJsonLikeRecords(parsed, args, inputPath, filterState);
    }
    return [normalizeRecord({ name: args.name || path.basename(inputPath), text: rawText }, args.name || path.basename(inputPath), args, inputPath)];
  }

  if (args.text && args.text !== true) {
    return [normalizeRecord({ name: args.name || 'inline', text: String(args.text) }, args.name || 'inline', args, args.url || 'inline-text')];
  }

  const stdinText = await readStdin();
  if (stdinText.trim()) {
    const parsed = maybeParseJson(stdinText);
    if (parsed !== null) {
      return recordsFromParsedPayload(parsed, args, 'stdin-json');
    }
    return [normalizeRecord({ name: args.name || 'stdin', text: stdinText }, args.name || 'stdin', args, 'stdin-text')];
  }

  throw new Error('No input provided. Use --input-file, --wiki-cache, --text, or pipe stdin.');
}

function detectSourceType(rawText, explicitType) {
  if (explicitType && explicitType !== true && explicitType !== 'auto') {
    return String(explicitType);
  }
  const text = String(rawText || '');
  const koeiSignals = [
    /\u7d71\u7387[^0-9]{0,4}[0-9]{1,3}/,
    /\u6b66\u529b[^0-9]{0,4}[0-9]{1,3}/,
    /\u667a\u529b[^0-9]{0,4}[0-9]{1,3}/,
    /\u653f\u6cbb[^0-9]{0,4}[0-9]{1,3}/,
    /\u9b45\u529b[^0-9]{0,4}[0-9]{1,3}/,
  ];
  const score = koeiSignals.filter((pattern) => pattern.test(text)).length;
  return score >= 2 ? 'koei-stats' : 'wiki-summary';
}

function extractMatches(text, patterns, maxLength) {
  const found = [];
  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match) {
      const captured = String(match[1] || '').trim();
      if (captured && captured.length <= maxLength) {
        found.push(captured);
      }
      match = pattern.exec(text);
    }
  }
  return uniqueStrings(found);
}

function extractCourtesyAliases(text) {
  return extractMatches(
    text,
    [
      /(?:\u5b57|\u8868\u5b57)\s*([^\s,\u3001\uff0c\u3002\uff1b\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09()]{1,6})/g,
      /(?:\u865f|\u53f7|\u5225\u865f|\u522b\u53f7)\s*([^\s,\u3001\uff0c\u3002\uff1b\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09()]{1,8})/g,
    ],
    8,
  );
}

function extractTitleCandidates(text) {
  return extractMatches(
    text,
    [
      /([\u3400-\u9fff]{1,10}(?:\u4e1e\u76f8|\u5927\u90fd\u7763|\u592a\u5b88|\u5c07\u8ecd|\u5c06\u8ecd|\u8ecd\u5e2b|\u519b\u5e08|\u8b00\u58eb|\u8c0b\u58eb|\u540d\u5c07|\u540d\u5c06))/g,
    ],
    18,
  );
}

function inferFaction(text, fallback) {
  if (fallback) {
    return fallback;
  }
  const hints = [
    { key: 'shu', patterns: [/\u8700\u6f22/, /\u8700\u6c49/, /\u5289\u5099/, /\u5218\u5907/] },
    { key: 'wei', patterns: [/\u66f9\u9b4f/, /\u66f9\u64cd/, /\u66f9\u4e1e/] },
    { key: 'wu', patterns: [/\u5b6b\u5433/, /\u5b59\u5434/, /\u5b6b\u6b0a/, /\u5b59\u6743/] },
    { key: 'neutral', patterns: [/\u6771\u6f22/, /\u4e1c\u6c49/] },
  ];
  for (const hint of hints) {
    if (hint.patterns.some((pattern) => pattern.test(text))) {
      return hint.key;
    }
  }
  return '';
}

function parseSingleStat(text, patterns) {
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }
    const value = Number.parseInt(String(match[1]), 10);
    if (Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

function extractStats(text) {
  const spec = {
    lea: [/(?:\u7d71\u7387|\u7edf\u7387|LEA|Leadership)[^0-9]{0,6}([0-9]{1,3})/i],
    str: [/(?:\u6b66\u529b|STR|Force)[^0-9]{0,6}([0-9]{1,3})/i],
    int: [/(?:\u667a\u529b|INT|Intel(?:ligence)?)[^0-9]{0,6}([0-9]{1,3})/i],
    pol: [/(?:\u653f\u6cbb|POL|Politics)[^0-9]{0,6}([0-9]{1,3})/i],
    cha: [/(?:\u9b45\u529b|CHA|Charm)[^0-9]{0,6}([0-9]{1,3})/i],
    luk: [/(?:\u904b\u6c23|\u8fd0\u6c14|\u5e78\u904b|\u5e78\u8fd0|LUK|Luck)[^0-9]{0,6}([0-9]{1,3})/i],
  };
  const stats = {};
  for (const [key, patterns] of Object.entries(spec)) {
    const value = parseSingleStat(text, patterns);
    if (value !== null) {
      stats[key] = value;
    }
  }
  return stats;
}

function extractTroopAptitude(text) {
  const spec = {
    cavalry: [/(?:\u9a0e\u5175|Cavalry)[^SABCDE]{0,4}([SABCDE])/i],
    infantry: [/(?:\u6b65\u5175|Infantry)[^SABCDE]{0,4}([SABCDE])/i],
    archer: [/(?:\u5f13\u5175|Archer)[^SABCDE]{0,4}([SABCDE])/i],
    navy: [/(?:\u6c34\u8ecd|\u6c34\u519b|Navy)[^SABCDE]{0,4}([SABCDE])/i],
    siege: [/(?:\u653b\u57ce|\u5668\u68b0|Siege)[^SABCDE]{0,4}([SABCDE])/i],
  };
  const aptitude = {};
  for (const [key, patterns] of Object.entries(spec)) {
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        aptitude[key] = String(match[1]).toUpperCase();
        break;
      }
    }
  }
  return aptitude;
}

function summarizeText(text) {
  return truncate(stripHtml(text).replace(/\s+/g, ' '), 220);
}

function analyzeRecord(record, args) {
  const cleanedText = String(record.text || '').trim();
  const sourceType = detectSourceType(cleanedText, args['source-type']);
  const courtesyAliases = extractCourtesyAliases(cleanedText);
  const titleCandidates = extractTitleCandidates(cleanedText);
  const stats = extractStats(cleanedText);
  const troopAptitude = extractTroopAptitude(cleanedText);
  const faction = inferFaction(cleanedText, record.factionHint);
  const qualityFlags = uniqueStrings([
    `source-type:${sourceType}`,
    courtesyAliases.length > 0 ? 'courtesy-alias-found' : '',
    titleCandidates.length > 0 ? 'title-candidate-found' : '',
    Object.keys(stats).length > 0 ? 'stat-block-found' : '',
    Object.keys(troopAptitude).length > 0 ? 'troop-aptitude-found' : '',
    faction ? 'faction-inferred' : '',
  ]);
  return {
    inputName: record.inputName,
    name: record.inputName,
    faction,
    role: record.roleHint,
    sourceType,
    sourceRefs: uniqueStrings([record.url, record.inputRef]),
    courtesyAliases,
    titleCandidates,
    summary: summarizeText(cleanedText),
    stats,
    troopAptitude,
    qualityFlags,
    hash: sha256Short(`${record.inputName}\n${cleanedText}`),
  };
}

function renderCompact(payload) {
  return {
    ok: payload.ok,
    tool: payload.tool,
    recordCount: payload.recordCount,
    items: payload.items.map((item) => ({
      name: item.name,
      faction: item.faction || null,
      sourceType: item.sourceType,
      courtesyAliases: item.courtesyAliases,
      titleCandidates: item.titleCandidates,
      stats: item.stats,
      troopAptitude: item.troopAptitude,
      summary: item.summary,
      sourceRefs: item.sourceRefs,
      qualityFlags: item.qualityFlags,
    })),
  };
}

function renderText(payload) {
  const lines = [
    `${payload.tool} ok=${payload.ok} recordCount=${payload.recordCount}`,
  ];
  for (const item of payload.items) {
    const parts = [
      `- ${item.name || '<unknown>'}`,
      item.sourceType ? `[${item.sourceType}]` : '',
      item.faction ? `faction=${item.faction}` : '',
      item.courtesyAliases.length ? `courtesy=${item.courtesyAliases.join(',')}` : '',
      Object.keys(item.stats).length ? `stats=${JSON.stringify(item.stats)}` : '',
    ].filter(Boolean);
    lines.push(parts.join(' '));
    if (item.summary) {
      lines.push(`  ${item.summary}`);
    }
  }
  return lines.join('\n');
}

function runSelfTest(cacheDir) {
  const sampleWiki = [
    '\u8af8\u845b\u4eae\uff0c\u5b57\u5b54\u660e\uff0c\u4e09\u570b\u6642\u671f\u8700\u6f22\u4e1e\u76f8\uff0c',
    '\u4ee5\u667a\u7565\u8207\u5167\u653f\u805e\u540d\uff0c\u8f14\u4f50\u5289\u5099\u5efa\u7acb\u8700\u6f22\u3002',
  ].join('');
  const sampleKoei = '\u8af8\u845b\u4eae \u7d71\u7387 98 \u6b66\u529b 38 \u667a\u529b 100 \u653f\u6cbb 95 \u9b45\u529b 92 \u6c34\u8ecd A';

  const wikiResult = analyzeRecord(
    {
      inputName: '\u8af8\u845b\u4eae',
      text: sampleWiki,
      factionHint: '',
      roleHint: 'support',
      url: 'self-test:wiki',
      inputRef: 'self-test:wiki',
    },
    { 'source-type': 'wiki-summary' },
  );
  const koeiResult = analyzeRecord(
    {
      inputName: '\u8af8\u845b\u4eae',
      text: sampleKoei,
      factionHint: 'shu',
      roleHint: 'support',
      url: 'self-test:koei',
      inputRef: 'self-test:koei',
    },
    { 'source-type': 'koei-stats' },
  );

  if (!wikiResult.courtesyAliases.includes('\u5b54\u660e')) {
    throw new Error('self-test failed: courtesy alias extraction');
  }
  if (koeiResult.stats.int !== 100 || koeiResult.stats.lea !== 98) {
    throw new Error('self-test failed: stat extraction');
  }
  const payload = buildBasePayload(TOOL_NAME, { 'dry-run': true }, {
    cacheDir,
    recordCount: 2,
    items: [wikiResult, koeiResult],
  });
  const compactPayload = renderCompact(payload);
  return {
    ...payload,
    selfTest: 'ok',
    byteMetrics: calculateByteMetrics(payload, compactPayload),
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { repeatable: ['cache-id'] });
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

  const records = await collectInputRecords(args);
  const items = records
    .slice(0, Math.max(1, toInt(args.limit, records.length)))
    .filter((record) => String(record.text || '').trim())
    .map((record) => analyzeRecord(record, args));

  const payload = buildBasePayload(TOOL_NAME, args, {
    cacheDir,
    inputCount: records.length,
    recordCount: items.length,
    items,
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  emitPayload(payload, args, renderText, renderCompact);
}

main().catch((error) => {
  process.stderr.write(`[${TOOL_NAME}] ${error.message}\n`);
  process.exit(1);
});
