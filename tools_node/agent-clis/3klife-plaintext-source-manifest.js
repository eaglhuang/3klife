#!/usr/bin/env node
'use strict';

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
  safeArray,
  safeObject,
  sha256Short,
  toInt,
  uniqueStrings,
} = require('../lib/agent-cli-common');

const TOOL_NAME = '3klife-plaintext-source-manifest';
const DEFAULT_MANIFEST_OUTPUT = path.join(
  'artifacts',
  'data-pipeline',
  'sanguo-rag',
  'extracted',
  'plaintext-source-candidates',
);

const PRESETS = {
  '8book-baihua-sanguo-120': {
    sourceId: '8book-traditional-baihua-sanguo-120',
    title: '\u4e09\u570b\u6f14\u7fa9\u767d\u8a71\u672c',
    catalogUrl: 'https://www.8book.com/novelbooks/412204/',
    languageScript: 'zh-Hant',
    plainTextStyle: 'modern-plain-chinese',
    chapterCount: 120,
    chapterIdRange: {
      firstChapterNo: 1,
      firstChapterId: 8335577,
      lastChapterNo: 120,
      lastChapterId: 8335696,
    },
    urlPatterns: {
      preferredReadUrl: 'https://www.8book.com/read/412204/?{chapterId}',
      catalogLinkUrl: 'https://sport.thepaperbooks.com/read/412204/?{chapterId}',
      notes: [
        'Use preferredReadUrl for validation; alternate catalog domains can misresolve.',
        'Do not store full chapter text in-repo without an authorized local source.',
      ],
    },
    chapterSamples: [
      { chapterNo: 1, chapterId: 8335577, title: 'Chapter 1 sample' },
      { chapterNo: 2, chapterId: 8335578, title: 'Chapter 2 sample' },
      { chapterNo: 120, chapterId: 8335696, title: 'Chapter 120 sample' },
    ],
    qualityFlags: [
      'complete-120-chapter-catalog',
      'modern-plain-language',
      'chapter-title-alignable-with-mao-120',
      'contains-site-watermark-in-body-samples',
      'direct-sport-url-can-misresolve',
    ],
    licenseNotes: [
      'Treat as metadata/source candidate only until the user provides authorized text or approves a safe ingestion path.',
      'Store metadata, URL patterns, hashes, snippets, and alignment scores by default; not full chapter text.',
    ],
    recommendedUse: [
      'Cross-check typo-prone or OCR-prone passages.',
      'Generate sidecar proposals only after authorized/local text exists.',
      'Never promote to canonical without Mao Hant sourceRef gate validation.',
    ],
  },
};

function printHelp() {
  process.stdout.write(
    [
      `${TOOL_NAME}`,
      '',
      'Normalize plaintext-source candidate manifests for 8book / baihua sidecars',
      'and other external readable sources used by the Sanguo knowledge pipeline.',
      '',
      'Usage:',
      `  node tools_node/agent-clis/${TOOL_NAME}.js --preset 8book-baihua-sanguo-120 --compact`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --input-file artifacts/.../8book-baihua-sanguo-source-manifest.json --json`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --source-id demo --title "Demo Source" --catalog-url https://example.com --chapter-count 10 --first-chapter-id 100 --last-chapter-id 109 --compact`,
      `  node tools_node/agent-clis/${TOOL_NAME}.js --self-test`,
      '',
      'Options:',
      '  --preset <id>            Built-in preset id. Current: 8book-baihua-sanguo-120',
      '  --input-file <path>      Existing manifest or loose JSON spec to normalize.',
      '  --source-id <id>         Canonical source id.',
      '  --title <text>           Human-readable source title.',
      '  --catalog-url <url>      Catalog root URL.',
      '  --preferred-read-url <url>  Preferred chapter read URL pattern.',
      '  --catalog-link-url <url> Alternate catalog-linked chapter URL pattern.',
      '  --language-script <tag>  e.g. zh-Hant / zh-Hans.',
      '  --plain-text-style <id>  e.g. modern-plain-chinese.',
      '  --chapter-count <n>      Total chapter count.',
      '  --first-chapter-no <n>   First chapter number.',
      '  --first-chapter-id <n>   First chapter id.',
      '  --last-chapter-no <n>    Last chapter number.',
      '  --last-chapter-id <n>    Last chapter id.',
      '  --chapter-sample <no:id:title> Repeatable chapter sample descriptor.',
      '  --quality-flag <text>    Repeatable quality flag.',
      '  --license-note <text>    Repeatable license note.',
      '  --recommended-use <text> Repeatable recommended-use note.',
      '  --cache-dir <dir>        Agent cache directory. Default local/agent-cli-cache/3klife-plaintext-source-manifest.',
      '  --output <path>          Write full JSON payload to disk.',
      '  --json                   Pretty JSON to stdout.',
      '  --compact                Minified compact JSON to stdout.',
      '  --dry-run                Mark payload as preview-only.',
      '  --self-test              Run deterministic local smoke tests.',
    ].join('\n'),
  );
}

function maybeReadInputSpec(args) {
  if (!args['input-file'] || args['input-file'] === true) {
    return {};
  }
  return readJsonFile(resolveProjectPath(String(args['input-file'])));
}

function clonePreset(presetId) {
  const preset = PRESETS[presetId];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetId}`);
  }
  return JSON.parse(JSON.stringify(preset));
}

function parseChapterSample(value) {
  if (typeof value === 'object' && value !== null) {
    return {
      chapterNo: toInt(value.chapterNo, null),
      chapterId: toInt(value.chapterId, null),
      title: String(value.title || '').trim(),
    };
  }
  const parts = String(value || '').split(':');
  if (parts.length < 3) {
    throw new Error(`Invalid --chapter-sample value: ${value}`);
  }
  return {
    chapterNo: toInt(parts[0], null),
    chapterId: toInt(parts[1], null),
    title: parts.slice(2).join(':').trim(),
  };
}

function normalizeChapterSamples(values) {
  return safeArray(values)
    .map((value) => parseChapterSample(value))
    .filter((item) => item.chapterNo !== null && item.chapterId !== null)
    .sort((left, right) => left.chapterNo - right.chapterNo);
}

function inferSequentiality(range, chapterCount) {
  const firstNo = toInt(range.firstChapterNo, null);
  const lastNo = toInt(range.lastChapterNo, null);
  const firstId = toInt(range.firstChapterId, null);
  const lastId = toInt(range.lastChapterId, null);
  const count = toInt(chapterCount, null);
  if ([firstNo, lastNo, firstId, lastId, count].some((value) => value === null)) {
    return false;
  }
  return (lastNo - firstNo + 1) === count && (lastId - firstId + 1) === count;
}

function overlayArray(baseArray, argValues) {
  const argArray = safeArray(argValues).map((value) => String(value || '').trim()).filter(Boolean);
  return argArray.length > 0 ? uniqueStrings(argArray) : uniqueStrings(baseArray);
}

function buildManifest(args) {
  const preset = args.preset && args.preset !== true ? clonePreset(String(args.preset)) : {};
  const inputSpec = safeObject(maybeReadInputSpec(args));
  const inputUrlPatterns = safeObject(inputSpec.urlPatterns);
  const presetUrlPatterns = safeObject(preset.urlPatterns);
  const baseManifest = {
    ...preset,
    ...inputSpec,
  };

  const chapterSamples = normalizeChapterSamples(
    safeArray(args['chapter-sample']).length > 0
      ? args['chapter-sample']
      : safeArray(baseManifest.chapterSamples),
  );

  const manifest = {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    sourceId: String(args['source-id'] || baseManifest.sourceId || '').trim(),
    title: String(args.title || baseManifest.title || '').trim(),
    catalogUrl: String(args['catalog-url'] || baseManifest.catalogUrl || '').trim(),
    languageScript: String(args['language-script'] || baseManifest.languageScript || 'zh-Hant').trim(),
    plainTextStyle: String(args['plain-text-style'] || baseManifest.plainTextStyle || 'plain-text').trim(),
    chapterCount: toInt(args['chapter-count'], baseManifest.chapterCount || 0),
    chapterIdRange: {
      firstChapterNo: toInt(args['first-chapter-no'], safeObject(baseManifest.chapterIdRange).firstChapterNo || null),
      firstChapterId: toInt(args['first-chapter-id'], safeObject(baseManifest.chapterIdRange).firstChapterId || null),
      lastChapterNo: toInt(args['last-chapter-no'], safeObject(baseManifest.chapterIdRange).lastChapterNo || null),
      lastChapterId: toInt(args['last-chapter-id'], safeObject(baseManifest.chapterIdRange).lastChapterId || null),
      isSequential: false,
    },
    urlPatterns: {
      preferredReadUrl: String(args['preferred-read-url'] || inputUrlPatterns.preferredReadUrl || presetUrlPatterns.preferredReadUrl || '').trim(),
      catalogLinkUrl: String(args['catalog-link-url'] || inputUrlPatterns.catalogLinkUrl || presetUrlPatterns.catalogLinkUrl || '').trim(),
      notes: overlayArray(inputUrlPatterns.notes || presetUrlPatterns.notes, args.note),
    },
    chapterSamples,
    qualityFlags: overlayArray(baseManifest.qualityFlags, args['quality-flag']),
    licenseNotes: overlayArray(baseManifest.licenseNotes, args['license-note']),
    recommendedUse: overlayArray(baseManifest.recommendedUse, args['recommended-use']),
  };

  manifest.chapterIdRange.isSequential = inferSequentiality(manifest.chapterIdRange, manifest.chapterCount);
  if (!manifest.sourceId) {
    manifest.sourceId = `source-${sha256Short(`${manifest.title}|${manifest.catalogUrl}`)}`;
  }
  return manifest;
}

function renderCompact(payload) {
  return {
    ok: payload.ok,
    tool: payload.tool,
    sourceId: payload.manifest.sourceId,
    chapterCount: payload.manifest.chapterCount,
    isSequential: payload.manifest.chapterIdRange.isSequential,
    catalogUrl: payload.manifest.catalogUrl,
    preferredReadUrl: payload.manifest.urlPatterns.preferredReadUrl,
    qualityFlags: payload.manifest.qualityFlags,
  };
}

function renderText(payload) {
  const manifest = payload.manifest;
  return [
    `${payload.tool} ok=${payload.ok}`,
    `- sourceId=${manifest.sourceId}`,
    `- title=${manifest.title}`,
    `- chapterCount=${manifest.chapterCount}`,
    `- isSequential=${manifest.chapterIdRange.isSequential}`,
    `- catalogUrl=${manifest.catalogUrl}`,
    manifest.urlPatterns.preferredReadUrl ? `- preferredReadUrl=${manifest.urlPatterns.preferredReadUrl}` : '',
  ].filter(Boolean).join('\n');
}

function runSelfTest(cacheDir) {
  const manifest = buildManifest({
    preset: '8book-baihua-sanguo-120',
    'quality-flag': [],
    'license-note': [],
    'recommended-use': [],
    'chapter-sample': [],
    note: [],
  });
  if (manifest.sourceId !== '8book-traditional-baihua-sanguo-120') {
    throw new Error('self-test failed: sourceId mismatch');
  }
  if (manifest.chapterCount !== 120 || manifest.chapterIdRange.isSequential !== true) {
    throw new Error('self-test failed: chapter range mismatch');
  }
  if (safeArray(manifest.chapterSamples).length < 3) {
    throw new Error('self-test failed: chapter sample count mismatch');
  }
  const payload = buildBasePayload(TOOL_NAME, { 'dry-run': true }, {
    cacheDir,
    manifest,
    selfTest: 'ok',
  });
  payload.byteMetrics = calculateByteMetrics(payload, renderCompact(payload));
  return payload;
}

function main() {
  const args = parseArgs(process.argv.slice(2), {
    repeatable: ['chapter-sample', 'quality-flag', 'license-note', 'recommended-use', 'note'],
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

  const manifest = buildManifest(args);
  const payload = buildBasePayload(TOOL_NAME, args, {
    cacheDir,
    defaultOutputRoot: DEFAULT_MANIFEST_OUTPUT,
    manifest,
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
