#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RESOURCES_ROOT = path.join(PROJECT_ROOT, 'assets', 'resources');
const DEFAULT_SCAN_ROOT = RESOURCES_ROOT;
const DEFAULT_ARCHIVE_ROOT = path.resolve(PROJECT_ROOT, '..', `${path.basename(PROJECT_ROOT)}_resource_archive`);
const DEFAULT_REPORT = path.join(PROJECT_ROOT, 'artifacts', 'resource-cleanup', 'history-asset-audit.json');
const DEFAULT_REGISTRY = path.join(PROJECT_ROOT, 'artifacts', 'resource-cleanup', 'ui-asset-registry.json');
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);
const TEXT_EXTS = new Set([
    '.ts', '.tsx', '.js', '.jsx', '.json', '.prefab', '.scene', '.anim',
    '.effect', '.material', '.mtl', '.txt', '.yaml', '.yml', '.csv', '.fnt',
]);
const HISTORY_SEGMENTS = new Set([
    'proof', 'compare', 'draft', 'temp', 'tmp', 'backup', 'bak',
    'wash_candidates', 'candidate', 'candidates', 'generated', 'user_ref',
    'legacy', 'deprecated', 'old',
]);
const HISTORY_BASENAME_RE = /(?:^|[_-])(proof|compare|draft|temp|tmp|backup|bak|wash|candidate|generated|userref|legacy|deprecated|old|trimmed)(?:[_-]|$)/i;
const VERSION_SUFFIX_RE = /^(.*?)(?:[_-]v(\d+))$/i;
const STRING_BINDING_RE = /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]*?)\2/g;
const THIS_BINDING_RE = /\bthis\.([A-Za-z_$][\w$]*)\s*=\s*(['"`])([^'"`]*?)\2/g;
const LOAD_CALL_RE = /\b(?:resources|bundle)\.(load|loadDir)\(\s*([^,\r\n)]+?)\s*(?=,|\))/g;

function parseArgs(argv) {
    const opts = {
        root: DEFAULT_SCAN_ROOT,
        archiveRoot: DEFAULT_ARCHIVE_ROOT,
        report: DEFAULT_REPORT,
        registry: DEFAULT_REGISTRY,
        rebuildRegistry: false,
        includeAllImages: false,
        move: false,
        verbose: false,
        help: false,
    };

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];
        const next = argv[index + 1];
        switch (token) {
            case '--root':
                opts.root = path.resolve(next);
                index += 1;
                break;
            case '--archive-root':
                opts.archiveRoot = path.resolve(next);
                index += 1;
                break;
            case '--report':
                opts.report = path.resolve(next);
                index += 1;
                break;
            case '--registry':
                opts.registry = path.resolve(next);
                index += 1;
                break;
            case '--rebuild-registry':
                opts.rebuildRegistry = true;
                break;
            case '--include-all-images':
                opts.includeAllImages = true;
                break;
            case '--move':
                opts.move = true;
                break;
            case '--verbose':
                opts.verbose = true;
                break;
            case '--help':
            case '-h':
                opts.help = true;
                break;
            default:
                break;
        }
    }

    return opts;
}

function printHelp() {
    console.log(`
Usage: node tools_node/archive-unused-history-assets.js [options]

Options:
  --root <path>            掃描根目錄（預設: assets/resources）
  --archive-root <path>    搬移目的地（預設: repo 外層的 <repo>_resource_archive）
  --report <path>          審計報告 JSON（預設: artifacts/resource-cleanup/history-asset-audit.json）
  --registry <path>        UI asset registry 路徑（預設: artifacts/resource-cleanup/ui-asset-registry.json）
  --rebuild-registry       先重建 UI asset registry
  --include-all-images     不只掃歷史圖，連一般圖片也納入審計
  --move                   實際搬移；未帶時為 dry-run
  --verbose                顯示詳細證據
  --help, -h               顯示說明

說明:
  這支工具會先找出帶有歷史/候選特徵，或屬於舊版本組的圖片，
  再用三層證據保留仍在使用中的資產：
    1. UI screen/skin/layout/fragment 靜態 registry
    2. assets/ 與 tools_node/ 等程式或 spec 的字串路徑引用
    3. Cocos .meta UUID 在 prefab/scene/json 等序列化檔中的引用

  只有「帶歷史特徵且完全無證據」的圖片才會列入可搬移名單。
  預設只輸出報告，不搬檔；要實際搬移請加 --move。
`);
}

function ensureScanRoot(scanRoot) {
    if (!fs.existsSync(scanRoot)) {
        throw new Error(`找不到掃描根目錄: ${scanRoot}`);
    }
    const normalized = scanRoot.replace(/\\/g, '/');
    const resourcesNormalized = RESOURCES_ROOT.replace(/\\/g, '/');
    if (!normalized.startsWith(resourcesNormalized)) {
        throw new Error(`掃描根目錄必須位於 assets/resources 之下: ${scanRoot}`);
    }
}

function mkdirp(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function writeJson(filePath, payload) {
    mkdirp(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function walkFiles(dirPath, visitor) {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
        const absPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            walkFiles(absPath, visitor);
            continue;
        }
        visitor(absPath);
    }
}

function isImagePath(filePath) {
    return IMAGE_EXTS.has(path.extname(filePath).toLowerCase());
}

function isTextReferenceFile(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.includes('/node_modules/') || normalized.includes('/library/') || normalized.includes('/temp/')) {
        return false;
    }
    if (normalized.includes('/artifacts/') || normalized.includes('/docs/')) {
        return false;
    }
    return TEXT_EXTS.has(path.extname(filePath).toLowerCase());
}

function toRepoRelative(absPath) {
    return path.relative(PROJECT_ROOT, absPath).replace(/\\/g, '/');
}

function toResourceRelative(absPath) {
    return path.relative(RESOURCES_ROOT, absPath).replace(/\\/g, '/');
}

function withoutExtension(relPath) {
    return relPath.replace(/\.[^.]+$/, '');
}

function parseMetaUuids(metaPath) {
    if (!fs.existsSync(metaPath)) return [];
    try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        const uuids = new Set();
        if (typeof meta.uuid === 'string' && meta.uuid) uuids.add(meta.uuid);
        if (meta.subMetas && typeof meta.subMetas === 'object') {
            for (const subMeta of Object.values(meta.subMetas)) {
                if (subMeta && typeof subMeta.uuid === 'string' && subMeta.uuid) {
                    uuids.add(subMeta.uuid);
                }
            }
        }
        return [...uuids];
    } catch {
        return [];
    }
}

function buildImageEntries(scanRoot) {
    const images = [];
    walkFiles(scanRoot, (absPath) => {
        if (!isImagePath(absPath)) return;
        const relRepo = toRepoRelative(absPath);
        const relResources = toResourceRelative(absPath);
        const basename = path.basename(relResources, path.extname(relResources));
        const metaPath = `${absPath}.meta`;
        const entry = {
            absPath,
            relRepo,
            relResources,
            resourcePath: withoutExtension(relResources),
            basename,
            ext: path.extname(absPath).toLowerCase(),
            sizeBytes: fs.statSync(absPath).size,
            metaPath,
            metaExists: fs.existsSync(metaPath),
            metaRelRepo: fs.existsSync(metaPath) ? toRepoRelative(metaPath) : null,
            uuids: parseMetaUuids(metaPath),
            candidateReasons: [],
            evidence: [],
            status: 'unknown',
        };

        const segments = entry.resourcePath.toLowerCase().split('/');
        for (const segment of segments) {
            if (HISTORY_SEGMENTS.has(segment)) {
                entry.candidateReasons.push(`path-segment:${segment}`);
            }
        }
        if (HISTORY_BASENAME_RE.test(entry.basename)) {
            entry.candidateReasons.push('basename-history-marker');
        }

        images.push(entry);
    });
    return images;
}

function markOlderVersions(images) {
    const groups = new Map();
    for (const entry of images) {
        const versionMatch = entry.basename.match(VERSION_SUFFIX_RE);
        if (!versionMatch) continue;
        const stem = versionMatch[1].toLowerCase();
        const version = Number(versionMatch[2]);
        if (!Number.isFinite(version)) continue;
        const directory = path.posix.dirname(entry.resourcePath);
        const key = `${directory}/${stem}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push({ entry, version });
    }

    for (const versionedEntries of groups.values()) {
        if (versionedEntries.length < 2) continue;
        const maxVersion = versionedEntries.reduce((max, item) => Math.max(max, item.version), 0);
        for (const item of versionedEntries) {
            if (item.version < maxVersion) {
                item.entry.candidateReasons.push(`older-version:v${item.version}<v${maxVersion}`);
            }
        }
    }
}

function uniqueStrings(items) {
    return [...new Set(items.filter(Boolean))];
}

function maybeBuildUiRegistry(opts) {
    if (!opts.rebuildRegistry && fs.existsSync(opts.registry)) {
        return loadJson(opts.registry);
    }

    mkdirp(path.dirname(opts.registry));
    const result = cp.spawnSync(process.execPath, [
        path.join(PROJECT_ROOT, 'tools_node', 'collect-asset-registry.js'),
        '--report',
        opts.registry,
    ], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status !== 0) {
        throw new Error(`collect-asset-registry.js 失敗:\n${result.stderr || result.stdout}`);
    }
    return loadJson(opts.registry);
}

function loadJson(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function addEvidence(entry, type, source, detail) {
    if (entry.status === 'keep') return;
    entry.evidence.push({ type, source, detail });
    entry.status = 'keep';
}

function applyRegistryEvidence(entries, registry) {
    if (!registry || !Array.isArray(registry.entries)) return;
    const entryByPath = new Map(entries.map((entry) => [entry.resourcePath, entry]));
    for (const screenEntry of registry.entries) {
        if (!Array.isArray(screenEntry.assets)) continue;
        for (const assetRef of screenEntry.assets) {
            if (assetRef.type !== 'spriteFrame' || typeof assetRef.path !== 'string') continue;
            const target = entryByPath.get(assetRef.path);
            if (!target) continue;
            addEvidence(target, 'ui-registry', screenEntry.screenId || 'unknown-screen', assetRef.registeredIn || 'registry');
        }
    }
}

function collectReferenceFiles() {
    const roots = ['assets', 'tools_node', 'tests', 'server', 'shared', 'extensions'];
    const files = [];
    for (const relRoot of roots) {
        const absRoot = path.join(PROJECT_ROOT, relRoot);
        if (!fs.existsSync(absRoot)) continue;
        walkFiles(absRoot, (absPath) => {
            if (isTextReferenceFile(absPath)) {
                files.push(absPath);
            }
        });
    }
    return files;
}

function extractStringBindings(content) {
    const localBindings = new Map();
    const thisBindings = new Map();

    let match;
    while ((match = STRING_BINDING_RE.exec(content)) !== null) {
        localBindings.set(match[1], match[3]);
    }

    while ((match = THIS_BINDING_RE.exec(content)) !== null) {
        thisBindings.set(match[1], match[3]);
    }

    return { localBindings, thisBindings };
}

function resolveBindingToken(token, bindings) {
    const normalized = token.trim();
    if (normalized.startsWith('this.')) {
        const key = normalized.slice(5);
        return bindings.thisBindings.get(key) || null;
    }
    if (/^[A-Za-z_$][\w$]*$/.test(normalized)) {
        return bindings.localBindings.get(normalized) || null;
    }
    return null;
}

function inferTemplateRef(templateText, bindings) {
    const pieces = [];
    const literalSegments = templateText.split(/\$\{([^}]+)\}/g);

    for (let index = 0; index < literalSegments.length; index += 1) {
        const segment = literalSegments[index];
        if (index % 2 === 0) {
            pieces.push(segment);
            continue;
        }

        const resolved = resolveBindingToken(segment, bindings);
        if (resolved == null) {
            return null;
        }
        pieces.push(resolved);
    }

    return pieces.join('');
}

function normalizeLoadTarget(rawTarget, bindings) {
    const target = rawTarget.trim();
    if (!target) return [];

    const stripResourceSuffix = (value) => value.replace(/\/(spriteFrame|texture)$/i, '').replace(/\/+$/, '');
    const refs = [];

    if ((target.startsWith('`') && target.endsWith('`')) || (target.startsWith('"') && target.endsWith('"')) || (target.startsWith("'") && target.endsWith("'"))) {
        const quote = target[0];
        const inner = target.slice(1, -1);
        if (quote === '`') {
            const resolved = inferTemplateRef(inner, bindings);
            if (resolved) {
                refs.push(stripResourceSuffix(resolved));
                return refs;
            }

            const prefix = inner.split('${', 1)[0].trim();
            if (prefix) refs.push(stripResourceSuffix(prefix));
            return refs;
        }

        refs.push(stripResourceSuffix(inner));
        return refs;
    }

    const resolved = resolveBindingToken(target.replace(/[,)]*$/, ''), bindings);
    if (resolved) {
        refs.push(stripResourceSuffix(resolved));
    }

    return refs;
}

function inferDynamicReferences(content) {
    const bindings = extractStringBindings(content);
    const refs = new Set();

    LOAD_CALL_RE.lastIndex = 0;
    let match;
    while ((match = LOAD_CALL_RE.exec(content)) !== null) {
        const callType = match[1];
        const target = match[2];
        const normalized = normalizeLoadTarget(target, bindings);
        for (const ref of normalized) {
            if (!ref) continue;
            if (callType === 'loadDir') {
                refs.add(ref.replace(/\/(spriteFrame|texture)$/i, ''));
            } else {
                refs.add(ref);
            }
        }
    }

    return [...refs];
}

function matchesReference(resourcePath, ref) {
    if (!ref) return false;
    const normalizedRef = ref.replace(/\/+$/, '');
    return resourcePath === normalizedRef || resourcePath.startsWith(`${normalizedRef}/`);
}

function lineNumberFor(content, needle) {
    const index = content.indexOf(needle);
    if (index < 0) return null;
    return content.slice(0, index).split(/\r?\n/).length;
}

function classifySource(fileRel) {
    if (fileRel.startsWith('assets/')) return 'project';
    if (fileRel.startsWith('tools_node/')) return 'tooling';
    if (fileRel.startsWith('tests/')) return 'test';
    if (fileRel.startsWith('server/')) return 'server';
    if (fileRel.startsWith('shared/')) return 'shared';
    if (fileRel.startsWith('extensions/')) return 'extension';
    return 'other';
}

function scanReferences(entries, opts) {
    const candidates = entries.filter((entry) => entry.status !== 'keep');
    if (candidates.length === 0) return;

    const referenceFiles = collectReferenceFiles();
    for (const absFile of referenceFiles) {
        const fileRel = toRepoRelative(absFile);
        let content;
        try {
            content = fs.readFileSync(absFile, 'utf8');
        } catch {
            continue;
        }

        const dynamicRefs = inferDynamicReferences(content);

        for (const entry of candidates) {
            if (entry.status === 'keep') continue;

            for (const ref of dynamicRefs) {
                if (matchesReference(entry.resourcePath, ref)) {
                    const line = lineNumberFor(content, ref);
                    addEvidence(entry, 'dynamic-path', classifySource(fileRel), `${fileRel}${line ? `:${line}` : ''}`);
                    break;
                }
            }
            if (entry.status === 'keep') continue;

            if (
                content.includes(entry.resourcePath) ||
                content.includes(`${entry.resourcePath}/spriteFrame`) ||
                content.includes(`${entry.resourcePath}/texture`) ||
                content.includes(`assets/resources/${entry.resourcePath}`)
            ) {
                const line = lineNumberFor(content, entry.resourcePath);
                addEvidence(entry, 'string-path', classifySource(fileRel), `${fileRel}${line ? `:${line}` : ''}`);
                continue;
            }

            let matchedUuid = null;
            for (const uuid of entry.uuids) {
                if (content.includes(uuid)) {
                    matchedUuid = uuid;
                    break;
                }
            }
            if (matchedUuid) {
                const line = lineNumberFor(content, matchedUuid);
                addEvidence(entry, 'uuid', classifySource(fileRel), `${fileRel}${line ? `:${line}` : ''}`);
                continue;
            }

        }
    }

    if (opts.verbose) {
        for (const entry of entries) {
            if (entry.evidence.length === 0) continue;
            console.log(`[keep] ${entry.resourcePath}`);
            for (const evidence of entry.evidence) {
                console.log(`  - ${evidence.type} @ ${evidence.detail}`);
            }
        }
    }
}

function finalizeStatuses(entries, opts) {
    for (const entry of entries) {
        if (entry.status === 'keep') continue;
        if (opts.includeAllImages) {
            entry.status = 'movable';
        } else {
            entry.status = entry.candidateReasons.length > 0 ? 'movable' : 'ignored';
        }
    }
}

function movePair(entry, archiveRoot) {
    const targets = [
        { from: entry.absPath, to: path.join(archiveRoot, entry.relRepo) },
    ];
    if (entry.metaExists) {
        targets.push({ from: entry.metaPath, to: path.join(archiveRoot, entry.metaRelRepo) });
    }

    for (const target of targets) {
        mkdirp(path.dirname(target.to));
        try {
            fs.renameSync(target.from, target.to);
        } catch (error) {
            if (error && error.code === 'EXDEV') {
                fs.copyFileSync(target.from, target.to);
                fs.unlinkSync(target.from);
                continue;
            }
            throw error;
        }
    }
}

function summarize(allImages, entries, opts) {
    const candidateCount = opts.includeAllImages
        ? allImages
        : entries.filter((entry) => entry.candidateReasons.length > 0).length;
    const keepCount = entries.filter((entry) => entry.status === 'keep').length;
    const movable = entries.filter((entry) => entry.status === 'movable');
    const ignored = opts.includeAllImages ? 0 : entries.filter((entry) => entry.status === 'ignored').length;
    const moved = opts.move ? movable.length : 0;
    return {
        timestamp: new Date().toISOString(),
        scanRoot: toRepoRelative(opts.root),
        archiveRoot: opts.archiveRoot,
        mode: opts.move ? 'move' : 'dry-run',
        summary: {
            allImages,
            candidateCount,
            keepCount,
            movableCount: movable.length,
            ignoredCount: ignored,
            movedCount: moved,
        },
        entries: entries.map((entry) => ({
            path: entry.relRepo,
            resourcePath: entry.resourcePath,
            sizeBytes: entry.sizeBytes,
            metaExists: entry.metaExists,
            candidateReasons: uniqueStrings(entry.candidateReasons),
            status: entry.status,
            evidence: entry.evidence,
        })),
    };
}

function printConsoleSummary(report) {
    console.log('[archive-unused-history-assets] 完成');
    console.log(`  mode:          ${report.mode}`);
    console.log(`  scan root:     ${report.scanRoot}`);
    console.log(`  all images:    ${report.summary.allImages}`);
    console.log(`  candidates:    ${report.summary.candidateCount}`);
    console.log(`  kept:          ${report.summary.keepCount}`);
    console.log(`  movable:       ${report.summary.movableCount}`);
    if (report.mode === 'move') {
        console.log(`  moved:         ${report.summary.movedCount}`);
    }

    const movableEntries = report.entries
        .filter((entry) => entry.status === 'movable')
        .sort((left, right) => right.sizeBytes - left.sizeBytes)
        .slice(0, 12);
    if (movableEntries.length > 0) {
        console.log('\n  top movable candidates:');
        for (const entry of movableEntries) {
            const sizeMb = (entry.sizeBytes / (1024 * 1024)).toFixed(2);
            console.log(`    - ${entry.resourcePath} (${sizeMb} MB)`);
        }
    }
}

function main() {
    const opts = parseArgs(process.argv.slice(2));
    if (opts.help) {
        printHelp();
        process.exit(0);
    }

    ensureScanRoot(opts.root);

    console.log('[archive-unused-history-assets] 掃描歷史圖與舊版本資產...');
    const images = buildImageEntries(opts.root);
    markOlderVersions(images);

    let scopedEntries = images;
    if (!opts.includeAllImages) {
        scopedEntries = images.filter((entry) => entry.candidateReasons.length > 0);
    }

    const registry = maybeBuildUiRegistry(opts);
    applyRegistryEvidence(scopedEntries, registry);
    scanReferences(scopedEntries, opts);
    finalizeStatuses(scopedEntries, opts);

    const movableEntries = scopedEntries.filter((entry) => entry.status === 'movable');
    if (opts.move) {
        for (const entry of movableEntries) {
            movePair(entry, opts.archiveRoot);
        }
    }

    const report = summarize(images.length, scopedEntries, opts);
    writeJson(opts.report, report);
    printConsoleSummary(report);
    console.log(`\n  report:        ${toRepoRelative(opts.report)}`);
    if (opts.move) {
        console.log(`  archive root:  ${opts.archiveRoot}`);
    }
}

main();