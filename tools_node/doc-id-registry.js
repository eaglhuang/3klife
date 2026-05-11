/**
 * doc-id-registry.js — 文件代號 Registry 建構 / 驗證 / 新增指定文件
 *
 * Usage:
 *   node tools_node/doc-id-registry.js                    # 掃描、分類、輸出 registry
 *   node tools_node/doc-id-registry.js --verify           # 驗證 registry 完整性
 *   node tools_node/doc-id-registry.js --reshard-current  # 依現有 registry 安全重建 shards，不重掃 repo
 *   node tools_node/doc-id-registry.js --assign <path>    # 為新文件分配 doc_id
 *
 * 輸出:
 *   docs/doc-id-registry.json            — machine-readable index stub
 *   docs/doc-id-registry-shards/*.json   — machine-readable registry shards
 *   docs/doc-id-registry.md              — human-readable index table
 */
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const registryStore = require('./lib/doc-id-registry-loader');
const registryQueue = require('./lib/doc-id-registry-queue');
const { createDocumentIndexAdapter } = require('./adapters/atm-3klife/document-index-adapter');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY_JSON = registryStore.REGISTRY_JSON;
const REGISTRY_MD = registryStore.REGISTRY_MD;
const REGISTRY_SHARD_DIR = registryStore.SHARD_DIR;
const SERVER_REF_MD = path.join(ROOT, 'server', 'server_docs_reference.md');

const STANDARD_DOC_ID_RE = /^doc_(tech|ui|art|data|spec|index|task|ai|agentskill|other)_(\d{4})$/i;
const SERVER_DOC_ID_RE = /^doc_server_(service|pipeline|data|ops|other)_(\d{4})$/i;

const CATEGORIES = [
  ['tech', 'doc_tech', '技術類'],
  ['ui', 'doc_ui', '畫面UI類'],
  ['art', 'doc_art', '美術非UI類'],
  ['data', 'doc_data', '數值類'],
  ['spec', 'doc_spec', '遊戲規格類'],
  ['index', 'doc_index', '索引類'],
  ['task', 'doc_task', '任務卡類'],
  ['ai', 'doc_ai', 'AI Agent 專用'],
  ['agentskill', 'doc_agentskill', 'Agent Skill 專用'],
  ['server', 'doc_server', 'Server 文件類'],
  ['other', 'doc_other', '其它類'],
];

const SERVER_SUBTYPES = ['service', 'pipeline', 'data', 'ops', 'other'];

const CAT_PREFIX = Object.fromEntries(CATEGORIES.map(([category, prefix]) => [category, prefix]));
const CAT_LABEL = Object.fromEntries(CATEGORIES.map(([category, , label]) => [category, label]));
const documentIndexAdapter = createDocumentIndexAdapter({
  profilePath: path.join(ROOT, 'tools_node', 'adapters', 'atm-3klife', 'doc-index-profile.json'),
});

function classify(relPath) {
  const normalizedPath = relPath.replace(/\\/g, '/');
  const fileName = path.basename(normalizedPath);

  if (normalizedPath === 'docs/RAG_ETL_管線應用分析.md') return 'server:data';

  if (/^server\//.test(normalizedPath)) {
    return `server:${classifyServerSubtype(normalizedPath)}`;
  }

  if (/(^\.github\/skills\/|^\.agents\/skills\/)/.test(normalizedPath)) return 'agentskill';
  if (/^\.agents\/(workflows|rules)\//.test(normalizedPath)) return 'ai';

  if (/^\.github\/instructions\//.test(normalizedPath)) return 'ai';
  if (fileName === 'copilot-instructions.md' || fileName === 'AGENTS.md') return 'ai';

  if (/agent-briefs\/tasks\//.test(normalizedPath)) return 'task';

  if (/agent-briefs\/[^/]+$/.test(normalizedPath)) {
    if (/task-card-template|tasks_index/i.test(fileName)) return 'task';
    return 'ai';
  }

  if (/(^\/docs\/tasks\/|^docs\/tasks\/)/.test(normalizedPath)) {
    if (fileName === 'README.md') return 'index';
    return 'task';
  }

  if (/^agent-collaboration-protocol\.md$|^agent-context-budget\.md$/.test(fileName)) return 'ai';

  if (fileName === 'cross-reference-index.md') return 'index';
  if (/(\/|^)cross-ref\//.test(normalizedPath)) return 'index';
  if (/(\/|^)keep-shards\//.test(normalizedPath)) return 'index';
  if (fileName === 'keep.md' || fileName === 'keep.summary.md') return 'index';
  if (fileName === 'README.md') return 'index';

  if (/美術素材規劃|外部美術搬移|美術風格規格書/.test(fileName)) return 'art';

  if (/^數值系統\.md$|^AI武將強度系統\.md$/.test(fileName)) return 'data';

  if (/(\/|^)[^/]*討論來源\//.test(normalizedPath)) return 'spec';

  if (testUi(fileName, normalizedPath)) return 'ui';
  if (testTech(fileName, normalizedPath)) return 'tech';

  if (/(\/|^)[^/]*遊戲規格文件\//.test(normalizedPath)) return 'spec';
  if (fileName === 'demo_playbook.md') return 'spec';

  return 'other';
}

function classifyServerSubtype(normalizedPath) {
  const fileName = path.basename(normalizedPath);

  if (/\/pipelines\//.test(normalizedPath)) return 'pipeline';
  if (normalizedPath === 'docs/RAG_ETL_管線應用分析.md') return 'data';
  if (/分析|報告|metrics|profile|dataset/i.test(fileName)) return 'data';
  if (/reference|索引|index|維運|部署|runbook|playbook|ops/i.test(fileName)) return 'ops';
  if (/^server\/npc-brain\/README\.md$/i.test(normalizedPath) || /\/app\//.test(normalizedPath)) return 'service';
  return 'other';
}

function parseCategoryToken(token) {
  if (String(token || '').startsWith('server:')) {
    const subtype = String(token).split(':')[1] || 'other';
    return {
      category: 'server',
      subtype: SERVER_SUBTYPES.includes(subtype) ? subtype : 'other',
    };
  }
  return { category: token, subtype: null };
}

function testUi(fileName, normalizedPath) {
  const uiFilePatterns = [
    /^UI[ _]規格書|^UI[ _]規格補遺|^UI 規格書|^UI 規格補遺/,
    /^UCUF規範文件|^UCUF里程碑文件/,
    /^UI技術規格書\.md$|^UI品質檢核表|^UI參考圖品質分析|^ui-quality-todo/,
    /^UI-factory-agent-entry|^UI-icon|^UI-reference-source|^UI-vibe-pipeline/,
    /^universal-composite-ui-framework-plan/,
    /^主戰場UI/,
    /^武將人物介面/,
    /^血統樹.*UI|^血脈命鏡|^血脈視覺契約|^角色血脈符號|^英靈虎符.*視覺|^未持有武將標記/,
    /^UI骨架補遺|^UI Proof|^UI空白線稿|^UI線稿對照|^Figma[+＋].*補遺|^Figma母板/,
    /^fragment-composition-guide|^content-contract-framework|^component-sizing-contract/,
    /^UI-asset-slice-pipeline|^UI-factory-baseline|^layout-quality-rules/,
    /^general-detail-/,
    /^ComfyUI-Cocos-partial-asset/,
  ];

  if (uiFilePatterns.some((pattern) => pattern.test(fileName))) return true;
  if (/(\/|^)docs\/annotations\//.test(normalizedPath)) return true;
  if (/(\/|^)docs\/ui\//.test(normalizedPath) && fileName !== 'ui-system-architecture.md') return true;
  if (/UI品質參考圖\//.test(normalizedPath)) return true;
  return false;
}

function testTech(fileName, normalizedPath) {
  const techFilePatterns = [
    /^UCUF技術文件\.md$/,
    /^資料中心架構規格書\.md$/,
    /^demo_技術架構\.md$/,
    /^程式規格書\.md$/,
    /^encoding-integrity-playbook\.md$/,
    /^精簡tokens說明書\.md$/,
    /^參考官方範例短中長優化方案\.md$/,
    /^架構評估報告/,
    /^場景搭建指南\.md$/,
    /^Data Schema文件/,
    /^同步API規格書\.md$/,
    /^熱更新與版本控制規格書\.md$/,
    /^武將資料管線規格書\.md$/,
    /^ui-system-architecture\.md$/,
    /^uipreviewbuilder-split-blueprint\.md$/,
  ];

  if (techFilePatterns.some((pattern) => pattern.test(fileName))) return true;
  if (/(\/|^)[^/]*特效研究\//.test(normalizedPath)) return true;
  return false;
}

function scanMdFiles(rootDirs) {
  const files = [];
  const skipDirs = new Set(['node_modules', 'library', 'temp', '.git']);

  function walk(dirPath) {
    if (!fs.existsSync(dirPath)) return;

    let entries;
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (_) {
      return;
    }

    for (const entry of entries) {
      if (skipDirs.has(entry.name)) continue;
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  for (const rootDir of rootDirs) {
    walk(rootDir);
  }

  return files;
}

function scanAllMarkdown() {
  const scanDirs = [
    path.join(ROOT, 'docs'),
    path.join(ROOT, '.github'),
    path.join(ROOT, '.agents'),
    path.join(ROOT, 'server'),
  ];
  const rootAgents = path.join(ROOT, 'AGENTS.md');
  const allFiles = scanMdFiles(scanDirs);
  if (fs.existsSync(rootAgents)) {
    allFiles.push(rootAgents);
  }
  return allFiles;
}

function writeTextAtomicSync(filePath, content) {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  fs.writeFileSync(tempPath, content, 'utf8');
  fs.renameSync(tempPath, filePath);
}

function parseDocIdMeta(docId) {
  const normalized = String(docId || '').trim();
  let match = normalized.match(SERVER_DOC_ID_RE);
  if (match) {
    return {
      id: normalized,
      category: 'server',
      subtype: match[1],
      prefix: `doc_server_${match[1]}`,
      number: parseInt(match[2], 10),
    };
  }

  match = normalized.match(STANDARD_DOC_ID_RE);
  if (match) {
    return {
      id: normalized,
      category: match[1],
      subtype: null,
      prefix: `doc_${match[1]}`,
      number: parseInt(match[2], 10),
    };
  }

  return null;
}

function readInjectedDocId(fullPath) {
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const commentMatch = content.match(/<!--\s*doc_id:\s*(\S+)\s*-->/);
    if (commentMatch) {
      return String(commentMatch[1] || '').trim();
    }

    const yamlMatch = content.match(/^doc_id:\s*(\S+)\s*$/m);
    if (yamlMatch) {
      return String(yamlMatch[1] || '').trim();
    }
  } catch (_) {
    // Ignore read failures and fallback to non-preserve path.
  }

  return '';
}

function loadExistingRegistrySafely() {
  if (!fs.existsSync(REGISTRY_JSON)) {
    return { registry: {} };
  }

  try {
    return registryStore.loadDocIdRegistryRaw();
  } catch (error) {
    console.warn(`⚠️  Failed to load existing doc-id registry, fallback to fresh numbering: ${error.message}`);
    return { registry: {} };
  }
}

function deriveEntryShape(docId, classified, existingEntry) {
  const parsed = parseDocIdMeta(docId);
  if (parsed) {
    return {
      category: parsed.category,
      subtype: parsed.subtype,
    };
  }

  if (existingEntry && existingEntry.category) {
    return {
      category: existingEntry.category,
      subtype: existingEntry.subtype || null,
    };
  }

  return {
    category: classified.category,
    subtype: classified.subtype || null,
  };
}

function initializeNextNumbers(existingRegistry, reservedIds) {
  const nextNumbers = {};

  function consume(docId) {
    const parsed = parseDocIdMeta(docId);
    if (!parsed) return;
    nextNumbers[parsed.prefix] = Math.max(nextNumbers[parsed.prefix] || 1, parsed.number + 1);
  }

  Object.keys(existingRegistry || {}).forEach(consume);
  Array.from(reservedIds || []).forEach(consume);

  return nextNumbers;
}

function allocateNextDocId(nextNumbers, category, subtype) {
  const prefix = category === 'server'
    ? `${CAT_PREFIX[category]}_${subtype || 'other'}`
    : CAT_PREFIX[category];
  const nextNumber = nextNumbers[prefix] || 1;
  nextNumbers[prefix] = nextNumber + 1;
  return `${prefix}_${String(nextNumber).padStart(4, '0')}`;
}

function previewAssignment(registry, relPath, classified) {
  for (const [id, entry] of Object.entries(registry || {})) {
    if (entry.path === relPath) {
      return { id, reason: 'already-registered' };
    }
  }

  const prefix = classified.category === 'server'
    ? `${CAT_PREFIX[classified.category]}_${classified.subtype || 'other'}`
    : CAT_PREFIX[classified.category];

  const numbers = Object.keys(registry || {})
    .map((docId) => parseDocIdMeta(docId))
    .filter((parsed) => parsed && parsed.prefix === prefix)
    .map((parsed) => parsed.number);

  const nextNumber = numbers.length ? Math.max(...numbers) + 1 : 1;
  return {
    id: `${prefix}_${String(nextNumber).padStart(4, '0')}`,
    reason: 'predicted-next',
  };
}

function buildRegistry() {
  const existingRegistryRaw = loadExistingRegistrySafely();
  const existingRegistry = existingRegistryRaw.registry || {};
  const existingIdsByPath = new Map(
    Object.entries(existingRegistry).map(([id, entry]) => [entry.path, id])
  );

  const candidates = [];
  const injectedIdGroups = new Map();
  const warnings = [];

  for (const fullPath of scanAllMarkdown()) {
    const relPath = path.relative(ROOT, fullPath).replace(/\\/g, '/');
    const classified = parseCategoryToken(classify(relPath));
    if (!classified.category) {
      continue;
    }

    const injectedDocId = readInjectedDocId(fullPath);
    const existingId = existingIdsByPath.get(relPath) || '';
    const injectedMeta = injectedDocId ? parseDocIdMeta(injectedDocId) : null;

    if (injectedDocId) {
      if (!injectedMeta) {
        warnings.push(`Ignored invalid injected doc_id ${injectedDocId} in ${relPath}`);
      } else {
        if (!injectedIdGroups.has(injectedDocId)) {
          injectedIdGroups.set(injectedDocId, []);
        }
        injectedIdGroups.get(injectedDocId).push({ relPath, existingId });
      }
    }

    candidates.push({
      fullPath,
      relPath,
      category: classified.category,
      subtype: classified.subtype,
      existingId,
      injectedDocId: injectedMeta ? injectedDocId : '',
      preservedId: '',
      title: readTitle(fullPath),
    });
  }

  const preferredInjectedOwnerById = new Map();
  for (const [docId, group] of injectedIdGroups.entries()) {
    const sortedGroup = [...group].sort((left, right) => left.relPath.localeCompare(right.relPath));
    const strongOwner = sortedGroup.find((candidate) => candidate.existingId === docId);
    preferredInjectedOwnerById.set(docId, (strongOwner || sortedGroup[0]).relPath);
  }

  const reservedIds = new Set();
  candidates.sort((left, right) => left.relPath.localeCompare(right.relPath));
  for (const candidate of candidates) {
    let preservedId = '';

    if (candidate.injectedDocId) {
      const preferredOwner = preferredInjectedOwnerById.get(candidate.injectedDocId);
      if (preferredOwner === candidate.relPath && !reservedIds.has(candidate.injectedDocId)) {
        preservedId = candidate.injectedDocId;
      } else if (preferredOwner && preferredOwner !== candidate.relPath) {
        warnings.push(`Duplicate injected doc_id ${candidate.injectedDocId} in ${candidate.relPath}; keeping ${preferredOwner} as owner.`);
      }
    }

    if (!preservedId && candidate.existingId && !reservedIds.has(candidate.existingId)) {
      preservedId = candidate.existingId;
    }

    candidate.preservedId = preservedId;
    if (preservedId) {
      reservedIds.add(preservedId);
    }
  }

  const nextNumbers = initializeNextNumbers(existingRegistry, reservedIds);
  const registry = {};

  for (const item of candidates) {
    const id = item.preservedId || allocateNextDocId(nextNumbers, item.category, item.subtype);
    const existingEntry = existingRegistry[id] || null;
    const entryShape = deriveEntryShape(id, item, existingEntry);
    const entry = {
      path: item.relPath,
      title: item.title,
      category: entryShape.category,
    };
    if (entryShape.category === 'server') {
      entry.subtype = entryShape.subtype || item.subtype || 'other';
    }
    registry[id] = entry;
  }

  if (warnings.length) {
    console.warn(`⚠️  doc-id preserve warnings (${warnings.length}):`);
    warnings.slice(0, 20).forEach((warning) => console.warn(`   ${warning}`));
    if (warnings.length > 20) {
      console.warn(`   ... and ${warnings.length - 20} more`);
    }
  }

  return registry;
}

function readTitle(fullPath) {
  let title = path.basename(fullPath, '.md');
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    let inFrontmatter = false;
    let pastFrontmatter = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed === '---' && !pastFrontmatter) {
        inFrontmatter = !inFrontmatter;
        if (!inFrontmatter) {
          pastFrontmatter = true;
        }
        continue;
      }
      if (!inFrontmatter && trimmed.startsWith('#')) {
        title = trimmed.replace(/^#+\s*/, '').trim();
        break;
      }
    }
  } catch (_) {
    // fallback to filename
  }
  return title;
}

function writeRegistryJsonSharded(registry, generatedDate) {
  const sourcePayload = registryStore.buildRegistrySourcePayload(registry, generatedDate);
  writeTextAtomicSync(REGISTRY_JSON, JSON.stringify(sourcePayload, null, 2));

  cp.execFileSync(
    process.execPath,
    [path.join(ROOT, 'tools_node', 'shard-manager.js'), 'shard', path.relative(ROOT, REGISTRY_SHARD_DIR)],
    {
      cwd: ROOT,
      stdio: 'inherit',
    }
  );

  console.log('✅ Written: docs/doc-id-registry.json (sharded index stub)');
  return sourcePayload;
}

function writeRegistryMarkdown(registry, generatedDate) {
  const catCounts = {};
  for (const [, data] of Object.entries(registry)) {
    catCounts[data.category] = (catCounts[data.category] || 0) + 1;
  }
  const total = Object.values(catCounts).reduce((sum, count) => sum + count, 0);

  const lines = [
    '# 文件代號 Registry (doc-id-registry)',
    '',
    `> 生成日期: ${generatedDate}`,
    '> 本檔由 `node tools_node/doc-id-registry.js` 自動生成，請勿手動編輯。',
    '> **唯一真相來源。** 文件移動後 doc_id 不變，Agent 可用 doc_id 搜尋定位文件。',
    '> `docs/doc-id-registry.json` 現在是 index stub；實際 machine-readable 內容位於 `docs/doc-id-registry-shards/registry-*.json`。',
    '> 若只是人工閱讀大 shard，優先看 auto-parts：`docs/doc-id-registry-shards/registry-spec/registry-spec-part-*.json`、`docs/doc-id-registry-shards/registry-task/registry-task-part-*.json`。',
    '> 新增文件：`node tools_node/doc-id-registry.js --assign <path>`',
    '> 只想重建 shards：`node tools_node/doc-id-registry.js --reshard-current`',
    '',
    '## 分類統計',
    '',
    '| 類別 | 前綴 | 數量 |',
    '|------|------|-----:|',
  ];

  for (const [category, prefix, label] of CATEGORIES) {
    const prefixDisplay = category === 'server' ? '`doc_server_<subtype>`' : `\`${prefix}\``;
    lines.push(`| ${label} | ${prefixDisplay} | ${catCounts[category] || 0} |`);
  }

  lines.push(`| **合計** | — | **${total}** |`);
  lines.push('', '---', '');

  for (const [category, prefix, label] of CATEGORIES) {
    const entries = Object.entries(registry).filter(([, value]) => value.category === category);
    if (!entries.length) continue;

    if (category === 'server') {
      lines.push(`## ${label} (\`doc_server_<subtype>\`)`);
      lines.push('');
      lines.push('| doc_id | 子類型 | 路徑 | 標題 |');
      lines.push('|--------|--------|------|------|');
      for (const [id, data] of entries) {
        const safeTitle = data.title.replace(/\|/g, '&#124;');
        lines.push(`| \`${id}\` | ${data.subtype || 'other'} | ${data.path} | ${safeTitle} |`);
      }
      lines.push('');
      continue;
    }

    lines.push(`## ${label} (\`${prefix}\`)`);
    lines.push('');
    lines.push('| doc_id | 路徑 | 標題 |');
    lines.push('|--------|------|------|');
    for (const [id, data] of entries) {
      const safeTitle = data.title.replace(/\|/g, '&#124;');
      lines.push(`| \`${id}\` | ${data.path} | ${safeTitle} |`);
    }
    lines.push('');
  }

  writeTextAtomicSync(REGISTRY_MD, lines.join('\n'));
  console.log('✅ Written: docs/doc-id-registry.md');
}

function writeRegistry(registry, options = {}) {
  const generatedDate = options.generatedDate || new Date().toISOString().split('T')[0];
  writeRegistryJsonSharded(registry, generatedDate);
  if (options.writeMd !== false) {
    writeRegistryMarkdown(registry, generatedDate);
  }
}

function writeServerDocsReference(registry) {
  const serverEntries = Object.entries(registry)
    .filter(([, data]) => data.category === 'server')
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId));

  if (!serverEntries.length) return;

  const selfEntry = serverEntries.find(([, data]) => data.path === 'server/server_docs_reference.md');
  const selfId = selfEntry ? selfEntry[0] : 'doc_server_ops_0001';

  const lines = [
    `<!-- doc_id: ${selfId} -->`,
    '# Server 文件索引總覽',
    '',
    '> 本檔為 server 文件索引入口，doc_id 以 `doc_server_<subtype>_<NNNN>` 為主鍵。',
    '> 子類型定義：`service` / `pipeline` / `data` / `ops` / `other`。',
    '',
    '## 使用方式',
    '',
    '1. 先看 doc_id，再跳對應路徑。',
    '2. 若要反查文件，使用：`node tools_node/resolve-doc-id.js <doc_id>`。',
    '3. 若要列出 server 類文件，使用：`node tools_node/resolve-doc-id.js --list server`。',
    '4. 若要重建本檔，使用：`node tools_node/doc-id-registry.js`。',
    '',
    '## Server 文件索引',
    '',
    '| doc_id | 子類型 | 路徑 | 標題 |',
    '|--------|--------|------|------|',
  ];

  for (const [id, data] of serverEntries) {
    const safeTitle = String(data.title || '').replace(/\|/g, '&#124;');
    lines.push(`| \`${id}\` | ${data.subtype || 'other'} | ${data.path} | ${safeTitle} |`);
  }

  lines.push('');
  fs.mkdirSync(path.dirname(SERVER_REF_MD), { recursive: true });
  writeTextAtomicSync(SERVER_REF_MD, lines.join('\n'));
  console.log('✅ Written: server/server_docs_reference.md');
}

function verifyRegistry() {
  if (!fs.existsSync(REGISTRY_JSON)) {
    console.error('Registry not found. Run without --verify first.');
    process.exit(1);
  }

  const { registry } = registryStore.loadDocIdRegistryRaw();
  const errors = [];
  const warnings = [];
  const seenIds = new Set();
  const seenPaths = new Set();

  for (const [id, data] of Object.entries(registry)) {
    if (seenIds.has(id)) errors.push(`Duplicate doc_id: ${id}`);
    if (seenPaths.has(data.path)) errors.push(`Duplicate path: ${data.path} (${id})`);
    seenIds.add(id);
    seenPaths.add(data.path);

    const fullPath = path.join(ROOT, data.path);
    if (!fs.existsSync(fullPath)) {
      errors.push(`File not found: ${data.path} (${id})`);
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const hasId = content.includes(`doc_id: ${id}`) || content.includes(`doc_id : ${id}`);
    if (!hasId) {
      warnings.push(`Missing injected doc_id in: ${data.path} (${id})`);
    }
  }

  if (errors.length) {
    console.error(`\n❌ ${errors.length} error(s):`);
    errors.forEach((error) => console.error(`   ${error}`));
  }
  if (warnings.length) {
    console.warn(`\n⚠️  ${warnings.length} warning(s) — files not yet injected:`);
    warnings.slice(0, 20).forEach((warning) => console.warn(`   ${warning}`));
    if (warnings.length > 20) {
      console.warn(`   ... and ${warnings.length - 20} more`);
    }
  }
  if (!errors.length && !warnings.length) {
    console.log(`✅ Registry OK — ${seenIds.size} entries, all files have doc_id.`);
  }

  return errors.length === 0;
}

async function assignFile(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }
  if (!fs.existsSync(REGISTRY_JSON)) {
    console.error('Registry not found. Run node tools_node/doc-id-registry.js first.');
    process.exit(1);
  }

  const relPath = path.relative(ROOT, absPath).replace(/\\/g, '/');
  const classified = parseCategoryToken(classify(relPath));
  const optimisticCurrent = registryStore.loadDocIdRegistryRaw();
  const optimistic = previewAssignment(optimisticCurrent.registry || {}, relPath, classified);

  return registryQueue.runQueuedRegistryWrite({
    action: 'assign',
    path: relPath,
    optimisticId: optimistic.id,
  }, async () => {
    const current = registryStore.loadDocIdRegistryRaw();
    const registry = { ...current.registry };

    const assignment = documentIndexAdapter.assignId(relPath, classified, registry);
    if (assignment.reason === 'already-registered') {
      console.log(`Already registered: ${relPath} → ${assignment.id}`);
      const syncResult = injectDocId(absPath, assignment.id, false);
      console.log(`   Sync:     ${syncResult}`);
      if (optimistic.id && optimistic.id !== assignment.id) {
        console.log(`   Queue:    predicted ${optimistic.id}, observed ${assignment.id} after waiting for earlier writes`);
      }
      return assignment.id;
    }

    const newId = assignment.id;
    const title = readTitle(absPath);
    const entry = {
      path: relPath,
      title,
      category: classified.category,
    };
    if (classified.category === 'server') {
      entry.subtype = classified.subtype || 'other';
    }

    registry[newId] = entry;
    writeRegistry(registry, {
      generatedDate: new Date().toISOString().split('T')[0],
      writeMd: false,
    });
    writeServerDocsReference(registry);

    const injectResult = injectDocId(absPath, newId, false);

    console.log(`✅ Assigned: ${newId}`);
    console.log(`   Path:     ${relPath}`);
    console.log(`   Title:    ${title}`);
    console.log(`   Category: ${CAT_LABEL[classified.category]}${classified.category === 'server' ? ` (${entry.subtype})` : ''}`);
    console.log(`   Inject:   ${injectResult}`);
    if (optimistic.id && optimistic.id !== newId) {
      console.log(`   Queue:    predicted ${optimistic.id}, final ${newId} after earlier writes were applied`);
    }
    console.log('');
    console.log('   Rebuild registry.md to reflect changes:');
    console.log('   node tools_node/doc-id-registry.js');
    return newId;
  });
}

async function reshardCurrentRegistry() {
  if (!fs.existsSync(REGISTRY_JSON)) {
    console.error('Registry not found. Run node tools_node/doc-id-registry.js first.');
    process.exit(1);
  }

  await registryQueue.runQueuedRegistryWrite({
    action: 'reshard-current',
  }, async () => {
    const current = registryStore.loadDocIdRegistryRaw();
    writeRegistry(current.registry, {
      generatedDate: current.generated || new Date().toISOString().split('T')[0],
      writeMd: true,
    });
    writeServerDocsReference(current.registry);
    console.log('✅ Resharded current doc-id registry without rescanning markdown files.');
  });
}

function injectDocId(fullPath, docId, dryRun) {
  const content = fs.readFileSync(fullPath, 'utf8');

  const hasFrontmatter = content.startsWith('---\n') || content.startsWith('---\r\n');
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  let nextContent;

  if (/<!--\s*doc_id:\s*\S+\s*-->/.test(content)) {
    const current = content.match(/<!--\s*doc_id:\s*(\S+)\s*-->/);
    if (current && current[1] === docId) {
      return 'kept (HTML comment already matches)';
    }
    nextContent = content.replace(/<!--\s*doc_id:\s*\S+\s*-->/, `<!-- doc_id: ${docId} -->`);
  } else if (hasFrontmatter) {
    const lines = content.split(eol);
    const frontmatterEndIndex = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
    let replaced = false;

    for (let index = 1; index < (frontmatterEndIndex === -1 ? lines.length : frontmatterEndIndex); index += 1) {
      if (/^doc_id:\s*/.test(lines[index])) {
        if (lines[index].trim() === `doc_id: ${docId}`) {
          return 'kept (YAML already matches)';
        }
        lines[index] = `doc_id: ${docId}`;
        replaced = true;
        break;
      }
    }

    if (!replaced) {
      lines.splice(1, 0, `doc_id: ${docId}`);
    }
    nextContent = lines.join(eol);
  } else if (/\bdoc_id:\s*\S/m.test(content)) {
    const current = content.match(/\bdoc_id:\s*(\S+)/m);
    if (current && current[1] === docId) {
      return 'kept (doc_id already matches)';
    }
    nextContent = content.replace(/\bdoc_id:\s*\S+/m, `doc_id: ${docId}`);
  } else {
    nextContent = `<!-- doc_id: ${docId} -->\n${content}`;
  }

  if (!dryRun) {
    writeTextAtomicSync(fullPath, nextContent);
    return `injected (${hasFrontmatter ? 'YAML' : 'HTML comment'})`;
  }

  return `would inject (${hasFrontmatter ? 'YAML' : 'HTML comment'})`;
}

async function rebuildRegistryFromScan() {
  await registryQueue.runQueuedRegistryWrite({
    action: 'full-rebuild',
    preserveExistingId: true,
  }, async () => {
    console.log('🔍 Scanning and classifying .md files...');
    console.log('');
    const registry = buildRegistry();

    const catCounts = {};
    for (const [, data] of Object.entries(registry)) {
      catCounts[data.category] = (catCounts[data.category] || 0) + 1;
    }
    const total = Object.values(catCounts).reduce((sum, count) => sum + count, 0);

    console.log('📊 Classification summary:');
    for (const [category, prefix, label] of CATEGORIES) {
      const count = catCounts[category] || 0;
      console.log(`   ${prefix.padEnd(18)} (${label}): ${count}`);
    }
    console.log(`   ${'TOTAL'.padEnd(18)}: ${total}`);
    console.log('');

    writeRegistry(registry);
    writeServerDocsReference(registry);
    console.log('');
    console.log('✅ Generated: docs/doc-id-registry.json');
    console.log('✅ Generated: docs/doc-id-registry.md');
    console.log(`✅ Entries:   ${Object.keys(registry).length}`);
  });
}

const args = process.argv.slice(2);

async function main() {
  if (args[0] === '--verify') {
    verifyRegistry();
    return;
  }

  if (args[0] === '--reshard-current') {
    await reshardCurrentRegistry();
    return;
  }

  if (args[0] === '--assign') {
    if (!args[1]) {
      console.error('Usage: node tools_node/doc-id-registry.js --assign <path>');
      process.exit(1);
    }
    await assignFile(args[1]);
    return;
  }

  await rebuildRegistryFromScan();
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  });
}

module.exports = {
  classify,
  buildRegistry,
  injectDocId,
  assignFile,
  verifyRegistry,
  reshardCurrentRegistry,
  parseDocIdMeta,
  main,
};
