#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const {
  PROJECT_ROOT,
  buildBasePayload,
  calculateByteMetrics,
  emitPayload,
  ensureDir,
  fileExists,
  normalizeLabel,
  parseArgs,
  readJsonFile,
  resolveCacheDir,
  resolveProjectPath,
  safeArray,
  safeObject,
  sha256Short,
  toInt,
  uniqueStrings,
  writeJsonFile,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-sanguo-term-lookup';
const INDEX_VERSION = '1.0.0';
const GENERIC_NOISE_LABELS = new Set([
  '\u4e3b\u516c',
  '\u5c07\u8ecd',
  '\u5c06\u519b',
  '\u4e1e\u76f8',
  '\u5148\u751f',
  '\u5927\u4eba',
  '\u592b\u4eba',
  '\u965b\u4e0b',
  '\u7687\u53d4',
]);

function resolveNpcBrainRepo() {
  if (process.env.NPC_BRAIN_REPO) {
    return path.resolve(process.env.NPC_BRAIN_REPO);
  }
  return path.resolve(PROJECT_ROOT, '..', '3klife-npc-brain');
}

function npcBrainPath(...segments) {
  return path.join(resolveNpcBrainRepo(), ...segments);
}

const PATHS = {
  generals: path.join(PROJECT_ROOT, 'assets', 'resources', 'data', 'generals.json'),
  personRegistry: path.join(PROJECT_ROOT, 'assets', 'resources', 'data', 'person-registry.json'),
  manualRoster: npcBrainPath('pipelines', 'sanguo-rag', 'config', 'manual-roster-seeds.json'),
  aliasOverrides: npcBrainPath('pipelines', 'sanguo-rag', 'config', 'general-alias-overrides.json'),
  courtesyAliases: path.join(PROJECT_ROOT, 'artifacts', 'data-pipeline', 'sanguo-rag', 'extracted', 'alias-dictionary', 'romance-courtesy-aliases.json'),
};

function printHelp() {
  process.stdout.write(
    [
      `${TOOL_NAME}`,
      '',
      'Resolve repeated unresolved labels against local Sanguo indexes before',
      'opening a browser or doing remote research.',
      '',
      'Usage:',
      `  node tools_node/agent-clis/${TOOL_NAME}.js --label 孔明 --compact`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --choices-json artifacts/data-pipeline/sanguo-rag/extracted/resolution-loop/unresolved-triage-choices.json --limit 20 --json`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --self-test`,
      '',
      'Options:',
      '  --label <text>           Repeatable label lookup.',
      '  --labels-file <path>     Plain text or JSON file containing labels.',
      '  --choices-json <path>    unresolved-triage-choices.json; pulls labels from questions[].',
      '  --limit <n>              Max labels from file/choices input.',
      '  --cache-dir <dir>        Agent cache directory. Default local/agent-cli-cache/3klife-sanguo-term-lookup.',
      '  --output <path>          Write full JSON payload to disk.',
      '  --json                   Pretty JSON to stdout.',
      '  --compact                Minified compact JSON to stdout.',
      '  --dry-run                Mark payload as preview-only.',
      '  --self-test              Run deterministic local smoke tests.',
    ].join('\n'),
  );
}

function readJsonIfExists(filePath, fallback) {
  return fileExists(filePath) ? readJsonFile(filePath) : fallback;
}

function parseLabelsFromText(text) {
  return uniqueStrings(
    String(text || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
  );
}

function collectLabels(args) {
  const labels = [];
  safeArray(args.label).forEach((value) => labels.push(String(value).trim()));

  if (args['labels-file'] && args['labels-file'] !== true) {
    const labelsPath = resolveProjectPath(String(args['labels-file']));
    const rawText = fs.readFileSync(labelsPath, 'utf8');
    try {
      const parsed = JSON.parse(rawText);
      if (Array.isArray(parsed)) {
        parsed.forEach((value) => labels.push(String(value).trim()));
      } else if (Array.isArray(parsed.labels)) {
        parsed.labels.forEach((value) => labels.push(String(value).trim()));
      } else {
        parseLabelsFromText(rawText).forEach((value) => labels.push(value));
      }
    } catch (_error) {
      parseLabelsFromText(rawText).forEach((value) => labels.push(value));
    }
  }

  if (args['choices-json'] && args['choices-json'] !== true) {
    const choicesPath = resolveProjectPath(String(args['choices-json']));
    const parsed = readJsonFile(choicesPath);
    safeArray(parsed.questions).forEach((question) => labels.push(String(question.label || '').trim()));
  }

  const limit = Math.max(1, toInt(args.limit, labels.length || 10));
  return uniqueStrings(labels).slice(0, limit);
}

function extractHistoricalAliases(text) {
  const found = [];
  const patterns = [
    /(?:\u5b57|\u8868\u5b57)\s*([^\s,\u3001\uff0c\u3002\uff1b\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09()]{1,6})/g,
    /(?:\u865f|\u53f7|\u5225\u865f|\u522b\u53f7)\s*([^\s,\u3001\uff0c\u3002\uff1b\u300c\u300d\u300e\u300f\u3010\u3011\uff08\uff09()]{1,8})/g,
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(String(text || ''));
    while (match) {
      const alias = String(match[1] || '').trim();
      if (alias) {
        found.push(alias);
      }
      match = pattern.exec(String(text || ''));
    }
  }
  return uniqueStrings(found);
}

function buildFingerprint(sourcePaths) {
  return sourcePaths.map((sourcePath) => {
    const stats = fs.statSync(sourcePath);
    return {
      path: sourcePath,
      size: stats.size,
      mtimeMs: Math.trunc(stats.mtimeMs),
    };
  });
}

function sameFingerprint(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergeProfile(existing, nextProfile) {
  if (!existing.name && nextProfile.name) {
    existing.name = nextProfile.name;
  }
  if (!existing.faction && nextProfile.faction) {
    existing.faction = nextProfile.faction;
  }
}

function addIndexedLabel(index, profilesByGeneralId, rawLabel, hit) {
  const label = String(rawLabel || '').trim();
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return;
  }
  const generalId = String(hit.generalId || '').trim();
  if (!generalId) {
    return;
  }
  const profile = profilesByGeneralId.get(generalId) || {
    generalId,
    name: String(hit.name || '').trim(),
    faction: String(hit.faction || '').trim(),
  };
  mergeProfile(profile, {
    name: String(hit.name || '').trim(),
    faction: String(hit.faction || '').trim(),
  });
  profilesByGeneralId.set(generalId, profile);

  if (!index.has(normalized)) {
    index.set(normalized, new Map());
  }
  const labelBucket = index.get(normalized);
  if (!labelBucket.has(generalId)) {
    labelBucket.set(generalId, {
      generalId,
      name: profile.name,
      faction: profile.faction,
      matchedLabels: [],
      sources: [],
    });
  }
  const existing = labelBucket.get(generalId);
  existing.name = existing.name || profile.name;
  existing.faction = existing.faction || profile.faction;
  existing.matchedLabels = uniqueStrings(existing.matchedLabels.concat(label));
  existing.sources = uniqueStrings(existing.sources.concat(String(hit.source || '').trim()));
}

function buildIndex(cacheDir) {
  const cachePath = path.join(cacheDir, 'term-index.json');
  const sourcePaths = Object.values(PATHS).filter((sourcePath) => fileExists(sourcePath));
  const fingerprint = buildFingerprint(sourcePaths);
  if (fileExists(cachePath)) {
    const cached = readJsonFile(cachePath);
    if (cached.version === INDEX_VERSION && sameFingerprint(cached.fingerprint, fingerprint)) {
      return cached;
    }
  }

  const index = new Map();
  const profilesByGeneralId = new Map();
  const excludedLabels = new Set();
  const suppressions = new Set();

  GENERIC_NOISE_LABELS.forEach((label) => excludedLabels.add(normalizeLabel(label)));

  const generals = safeArray(readJsonIfExists(PATHS.generals, []));
  generals.forEach((general) => {
    const generalId = String(general.id || '').trim();
    if (!generalId) {
      return;
    }
    const profile = {
      generalId,
      name: String(general.name || '').trim(),
      faction: String(general.faction || '').trim(),
    };
    profilesByGeneralId.set(generalId, profile);
    addIndexedLabel(index, profilesByGeneralId, general.name, { ...profile, source: 'generals-name' });
    safeArray(general.alias).forEach((alias) => addIndexedLabel(index, profilesByGeneralId, alias, { ...profile, source: 'generals-alias' }));
    extractHistoricalAliases(general.historicalAnecdote).forEach((alias) => {
      addIndexedLabel(index, profilesByGeneralId, alias, { ...profile, source: 'generals-historical-alias' });
    });
  });

  const personRegistry = safeObject(readJsonIfExists(PATHS.personRegistry, {}));
  safeArray(personRegistry.persons).forEach((person) => {
    if (person.is_virtual) {
      return;
    }
    const generalId = String(person.uid || '').trim();
    const profile = {
      generalId,
      name: String(person.name || '').trim(),
      faction: String(person.faction || '').trim(),
    };
    addIndexedLabel(index, profilesByGeneralId, person.name, { ...profile, source: 'person-registry-name' });
  });

  const manualRoster = safeObject(readJsonIfExists(PATHS.manualRoster, {}));
  safeArray(manualRoster.entries).forEach((entry) => {
    const generalId = String(entry.generalId || '').trim();
    if (!generalId) {
      return;
    }
    const profile = {
      generalId,
      name: String(entry.name || '').trim(),
      faction: String(entry.faction || '').trim(),
    };
    addIndexedLabel(index, profilesByGeneralId, entry.name, { ...profile, source: 'manual-roster-name' });
    safeArray(entry.alias).forEach((alias) => addIndexedLabel(index, profilesByGeneralId, alias, { ...profile, source: 'manual-roster-alias' }));
  });

  const aliasOverrides = safeObject(readJsonIfExists(PATHS.aliasOverrides, {}));
  safeArray(aliasOverrides.globalExcludedAliases).forEach((label) => excludedLabels.add(normalizeLabel(label)));
  safeArray(aliasOverrides.entries).forEach((entry) => {
    const generalId = String(entry.generalId || '').trim();
    const profile = profilesByGeneralId.get(generalId) || {
      generalId,
      name: '',
      faction: '',
    };
    safeArray(entry.add).forEach((alias) => addIndexedLabel(index, profilesByGeneralId, alias, {
      generalId,
      name: profile.name,
      faction: profile.faction,
      source: 'alias-override-add',
    }));
    safeArray(entry.remove).forEach((alias) => suppressions.add(`${normalizeLabel(alias)}::${generalId}`));
  });

  const courtesyAliases = safeObject(readJsonIfExists(PATHS.courtesyAliases, {}));
  safeArray(courtesyAliases.entries).forEach((entry) => {
    const generalId = String(entry.generalId || '').trim();
    if (!generalId) {
      return;
    }
    const profile = profilesByGeneralId.get(generalId) || {
      generalId,
      name: safeArray(entry.matchedLocalLabels)[0] || safeArray(entry.wikiNames)[0] || '',
      faction: '',
    };
    safeArray(entry.courtesyAliases).forEach((alias) => addIndexedLabel(index, profilesByGeneralId, alias, {
      generalId,
      name: profile.name,
      faction: profile.faction,
      source: 'courtesy-alias-artifact',
    }));
  });

  suppressions.forEach((suppressionKey) => {
    const [normalized, generalId] = suppressionKey.split('::');
    const bucket = index.get(normalized);
    if (bucket) {
      bucket.delete(generalId);
      if (bucket.size === 0) {
        index.delete(normalized);
      }
    }
  });

  const serializedIndex = {};
  Array.from(index.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .forEach(([label, bucket]) => {
      serializedIndex[label] = Array.from(bucket.values())
        .map((item) => ({
          generalId: item.generalId,
          name: item.name,
          faction: item.faction,
          matchedLabels: item.matchedLabels,
          sources: item.sources,
        }))
        .sort((left, right) => left.generalId.localeCompare(right.generalId));
    });

  const payload = {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    fingerprint,
    sourcePaths,
    labelCount: Object.keys(serializedIndex).length,
    excludedLabels: Array.from(excludedLabels).sort(),
    profilesByGeneralId: Array.from(profilesByGeneralId.values()).sort((left, right) => left.generalId.localeCompare(right.generalId)),
    hitsByLabel: serializedIndex,
  };
  writeJsonFile(cachePath, payload);
  return payload;
}

function lookupLabel(indexPayload, rawLabel) {
  const label = String(rawLabel || '').trim();
  const normalized = normalizeLabel(label);
  const hits = safeArray(indexPayload.hitsByLabel[normalized]);
  const excluded = safeArray(indexPayload.excludedLabels).includes(normalized);
  let decision = 'D';
  let confidence = 'low';
  let personRecord = null;
  let reasons = [];

  if (excluded) {
    decision = 'B';
    confidence = 'high';
    reasons = ['label is in excluded/generic noise set'];
  } else if (hits.length === 1) {
    decision = 'A';
    confidence = hits[0].sources.length >= 2 ? 'high' : 'medium';
    personRecord = {
      generalId: hits[0].generalId,
      name: hits[0].name,
      faction: hits[0].faction || '',
      alias: hits[0].matchedLabels,
    };
    reasons = [`unique local hit: ${hits[0].generalId}`];
  } else if (hits.length > 1) {
    decision = 'C';
    confidence = 'medium';
    reasons = [`multiple local hits: ${hits.map((item) => item.generalId).join(', ')}`];
  } else {
    reasons = ['no local deterministic match found'];
  }

  return {
    label,
    normalized,
    decision,
    confidence,
    personRecord,
    excluded,
    hitCount: hits.length,
    hits,
    reasons,
    hash: sha256Short(label),
  };
}

function renderCompact(payload) {
  return {
    ok: payload.ok,
    tool: payload.tool,
    queryCount: payload.queryCount,
    results: payload.results.map((result) => ({
      label: result.label,
      decision: result.decision,
      confidence: result.confidence,
      generalId: result.personRecord ? result.personRecord.generalId : null,
      faction: result.personRecord ? result.personRecord.faction : null,
      hitCount: result.hitCount,
    })),
  };
}

function renderText(payload) {
  const lines = [`${payload.tool} ok=${payload.ok} queryCount=${payload.queryCount}`];
  payload.results.forEach((result) => {
    const parts = [
      `- ${result.label}`,
      `decision=${result.decision}`,
      `confidence=${result.confidence}`,
    ];
    if (result.personRecord && result.personRecord.generalId) {
      parts.push(`generalId=${result.personRecord.generalId}`);
      if (result.personRecord.faction) {
        parts.push(`faction=${result.personRecord.faction}`);
      }
    }
    lines.push(parts.join(' '));
    if (result.reasons.length) {
      lines.push(`  ${result.reasons[0]}`);
    }
  });
  return lines.join('\n');
}

function runSelfTest(indexPayload, cacheDir) {
  const labels = [
    '\u5b54\u660e',
    '\u7384\u5fb7',
    '\u5b50\u656c',
    '\u4e3b\u516c',
  ];
  const results = labels.map((label) => lookupLabel(indexPayload, label));
  const expectations = {
    '\u5b54\u660e': 'A',
    '\u7384\u5fb7': 'A',
    '\u5b50\u656c': 'C',
    '\u4e3b\u516c': 'B',
  };
  results.forEach((result) => {
    if (expectations[result.label] !== result.decision) {
      throw new Error(`self-test failed for ${result.label}: expected ${expectations[result.label]}, got ${result.decision}`);
    }
  });
  const payload = buildBasePayload(TOOL_NAME, { 'dry-run': true }, {
    cacheDir,
    indexLabelCount: indexPayload.labelCount,
    queryCount: results.length,
    results,
    selfTest: 'ok',
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  return payload;
}

function main() {
  const args = parseArgs(process.argv.slice(2), { repeatable: ['label'] });
  if (args.help) {
    printHelp();
    return;
  }

  const cacheDir = resolveCacheDir(TOOL_NAME, args['cache-dir']);
  ensureDir(cacheDir);
  const indexPayload = buildIndex(cacheDir);

  if (args['self-test']) {
    const payload = runSelfTest(indexPayload, cacheDir);
    emitPayload(payload, args, renderText, renderCompact);
    return;
  }

  const labels = collectLabels(args);
  if (labels.length === 0) {
    throw new Error('No labels provided. Use --label, --labels-file, or --choices-json.');
  }

  const results = labels.map((label) => lookupLabel(indexPayload, label));
  const payload = buildBasePayload(TOOL_NAME, args, {
    cacheDir,
    indexLabelCount: indexPayload.labelCount,
    queryCount: results.length,
    results,
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  emitPayload(payload, args, renderText, renderCompact);
}

try {
  main();
} catch (error) {
  process.stderr.write(`[${TOOL_NAME}] ${error.message}\n`);
  process.exit(1);
}
