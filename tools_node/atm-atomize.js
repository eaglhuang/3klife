#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_REPORT = path.join(ROOT, 'artifacts', 'atm-atomize', 'candidates.json');
const DEFAULT_SCAFFOLD_REPORT = path.join(ROOT, 'artifacts', 'atm-atomize', 'scaffold.report.json');
const DEFAULT_VALIDATE_REPORT = path.join(ROOT, 'artifacts', 'atm-atomize', 'validate.report.json');
const DEFAULT_DEMAND_POLICE_REPORT = path.join(ROOT, 'artifacts', 'atm-atomize', 'demand-police.report.json');
const DEFAULT_PROMOTION_REPORT = path.join(ROOT, 'artifacts', 'atm-atomize', 'promotion.report.json');
const DEFAULT_WORKBENCH_ROOT = path.join(ROOT, 'atomic_workbench');
const DEFAULT_POLICY_PATH = path.join(ROOT, 'tools_node', 'atomic-framework', 'policies', 'capsule-governance.default.json');
const DEFAULT_REGISTRY_PATH = path.join(ROOT, 'atomic-registry.json');
const VERB_PATTERN = /^(parse|normalize|resolve|infer|collect|build|apply|compute|extract|ensure|map|pick|guard|merge|dedupe|stabilize)/;
const SIDE_EFFECT_PATTERN = /\b(fs\.|writeFile|mkdir|rmSync|spawn|exec|process\.env|process\.argv|require\(['"]node:fs|require\(['"]fs|child_process|Date\.now|new Date\()/;
const CAPSULE_ID_PREFIX = 'H2U-CAPSULE';

function parseArgs(argv) {
  const initial = argv[0] || 'help';
  const command = initial === '--help' || initial === '-h' ? 'help' : initial;
  const args = {
    command,
    files: [],
    changed: false,
    report: DEFAULT_REPORT,
    candidateReport: DEFAULT_REPORT,
    workbenchRoot: DEFAULT_WORKBENCH_ROOT,
    strict: false,
    json: false,
    help: false,
    policy: null,
    policyHook: null,
    registryPath: null,
    usageRefFile: null,
    capsuleId: '',
    targetTier: '',
  };

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === '--file') {
      args.files.push(path.resolve(ROOT, argv[index + 1] || ''));
      index += 1;
      continue;
    }
    if (token === '--changed') {
      args.changed = true;
      continue;
    }
    if (token === '--report') {
      args.report = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--candidate-report') {
      args.candidateReport = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--workbench-root') {
      args.workbenchRoot = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--policy') {
      args.policy = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--policy-hook') {
      args.policyHook = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--registry') {
      args.registryPath = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--usage-ref-file') {
      args.usageRefFile = path.resolve(ROOT, argv[index + 1] || '');
      index += 1;
      continue;
    }
    if (token === '--capsule') {
      args.capsuleId = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--to') {
      args.targetTier = String(argv[index + 1] || '').trim();
      index += 1;
      continue;
    }
    if (token === '--strict') {
      args.strict = true;
      continue;
    }
    if (token === '--json') {
      args.json = true;
      continue;
    }
    if (token === '--help' || token === '-h') {
      args.help = true;
      continue;
    }
    throw new Error(`unknown arg: ${token}`);
  }

  return args;
}

function printHelp() {
  console.log('Usage: node tools_node/atm-atomize.js <scan|scaffold|validate|demand-police|promote> [options]');
  console.log('');
  console.log('scan --changed');
  console.log('scan --file tools_node/lib/dom-to-ui/draft-builder-core.js');
  console.log('scaffold --candidate-report artifacts/atm-atomize/candidates.json');
  console.log('validate --strict');
  console.log('demand-police --strict');
  console.log('scan --file tools_node/lib/dom-to-ui/draft-builder-core.js --usage-ref-file artifacts/atm-atomize/usage-refs.json');
  console.log('promote --capsule H2U-CAPSULE-PARSE-COLOR --to governed-atom');
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/');
}

function rel(filePath) {
  return normalizeSlashes(path.relative(ROOT, path.resolve(filePath)));
}

function sourceRef(filePath) {
  const relative = rel(filePath);
  if (relative === '' || relative.startsWith('..')) {
    return normalizeSlashes(path.resolve(filePath));
  }
  return relative;
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, 'utf8');
}

function stableHash(value) {
  return `sf:sha256:${crypto.createHash('sha256').update(String(value || '').replace(/\s+/g, ' ').trim()).digest('hex')}`;
}

function shortHash(value, length = 8) {
  return crypto.createHash('sha1').update(String(value || '')).digest('hex').slice(0, length);
}

function slug(value) {
  return String(value || '')
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'capsule';
}

function dedupeStrings(list) {
  return [...new Set((Array.isArray(list) ? list : []).map((item) => String(item || '').trim()).filter(Boolean))];
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) {
    return override === undefined ? (Array.isArray(base) ? [...base] : base) : structuredCloneCompat(override);
  }
  if (isObject(base) && isObject(override)) {
    const merged = { ...base };
    for (const key of Object.keys(override)) {
      merged[key] = key in merged ? deepMerge(merged[key], override[key]) : structuredCloneCompat(override[key]);
    }
    return merged;
  }
  return override === undefined ? structuredCloneCompat(base) : structuredCloneCompat(override);
}

function structuredCloneCompat(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(structuredCloneCompat);
  if (!isObject(value)) return value;
  const output = {};
  for (const [key, inner] of Object.entries(value)) {
    output[key] = structuredCloneCompat(inner);
  }
  return output;
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toRegExp(value) {
  if (!value) return null;
  return new RegExp(String(value));
}

function runGitChangedFiles() {
  const proc = cp.spawnSync('git', ['status', '--short'], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (proc.error || proc.status !== 0) {
    return [];
  }
  return String(proc.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.length > 3 ? line.slice(3).trim() : '')
    .filter(Boolean)
    .map((filePath) => filePath.includes(' -> ') ? filePath.split(' -> ').pop().trim() : filePath)
    .filter((filePath) => /\.(js|mjs|ts)$/i.test(filePath))
    .map((filePath) => path.resolve(ROOT, filePath))
    .filter((filePath) => fs.existsSync(filePath));
}

function getInputFiles(args) {
  const files = new Set(args.files.filter(Boolean));
  if (args.changed) {
    for (const filePath of runGitChangedFiles()) files.add(filePath);
  }
  if (files.size === 0) {
    files.add(path.join(ROOT, 'tools_node', 'lib', 'dom-to-ui', 'draft-builder-core.js'));
  }
  return [...files].filter((filePath) => fs.existsSync(filePath));
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_) {
    return false;
  }
}

function isSupportedUsageFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ['.js', '.mjs', '.ts', '.json', '.md'].includes(ext);
}

function runRipgrepFileList(includeGlobs, excludeGlobs) {
  const args = ['--files'];
  for (const item of includeGlobs) {
    args.push('-g', item);
  }
  for (const item of excludeGlobs) {
    args.push('-g', `!${item}`);
  }
  const proc = cp.spawnSync('rg', args, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (proc.error || proc.status !== 0) {
    return null;
  }
  return String(proc.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((item) => path.resolve(ROOT, item))
    .filter((filePath) => fileExists(filePath) && isSupportedUsageFile(filePath));
}

function walkFiles(rootDir, maxDepth, output) {
  if (!fileExists(rootDir)) return;
  const stack = [{ dir: rootDir, depth: 0 }];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current.dir, { withFileTypes: true });
    } catch (_) {
      continue;
    }
    for (const entry of entries) {
      const entryPath = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth < maxDepth) {
          stack.push({ dir: entryPath, depth: current.depth + 1 });
        }
        continue;
      }
      if (entry.isFile() && isSupportedUsageFile(entryPath)) {
        output.add(path.resolve(entryPath));
      }
    }
  }
}

function listUsageFilesFallback(policy) {
  const include = Array.isArray(policy?.usageReferencePolicy?.includeGlobs)
    ? policy.usageReferencePolicy.includeGlobs
    : [];
  const output = new Set();
  if (include.length === 0) {
    walkFiles(path.join(ROOT, 'tools_node'), 16, output);
    walkFiles(path.join(ROOT, 'assets', 'scripts'), 16, output);
    walkFiles(path.join(ROOT, 'docs', 'case-studies'), 16, output);
    walkFiles(path.join(ROOT, 'atomic_workbench', 'maps'), 16, output);
    walkFiles(path.join(ROOT, 'specs'), 8, output);
    return [...output];
  }
  for (const pattern of include) {
    const base = String(pattern || '').split('**')[0].replace(/[/*]+$/g, '');
    if (!base) continue;
    const absolute = path.resolve(ROOT, base);
    walkFiles(absolute, 16, output);
  }
  return [...output];
}

function resolveUsageReferenceFiles(args, candidates, policy) {
  const usagePolicy = policy.usageReferencePolicy || {};
  if (usagePolicy.enabled === false) {
    return [];
  }
  const includeGlobs = dedupeStrings(usagePolicy.includeGlobs || []);
  const excludeGlobs = dedupeStrings(usagePolicy.excludeGlobs || []);
  const fromRipgrep = runRipgrepFileList(includeGlobs, excludeGlobs);
  const files = new Set(fromRipgrep || listUsageFilesFallback(policy));
  const maxDepth = Number(usagePolicy.externalScanMaxDepth || 2);
  for (const candidate of candidates) {
    const candidateAbs = path.resolve(ROOT, candidate.file);
    if (candidateAbs.startsWith(ROOT)) continue;
    walkFiles(path.dirname(candidateAbs), maxDepth, files);
  }
  return [...files]
    .filter((filePath) => fileExists(filePath) && isSupportedUsageFile(filePath))
    .sort((a, b) => a.localeCompare(b));
}

function inferUsageRefKind(fileRef) {
  const normalized = normalizeSlashes(fileRef).toLowerCase();
  const basename = path.basename(normalized);
  if (normalized.includes('atomic_workbench/maps/') || basename.endsWith('map.spec.json')) return 'map';
  if (normalized.includes('docs/case-studies/')) return 'case-study';
  if (normalized.includes('/workflow') || basename.includes('workflow')) return 'workflow';
  if (normalized.includes('assets/scripts/')) return 'runtime';
  if (normalized.includes('/test/') || basename.includes('.test.')) return 'test';
  if (normalized.includes('tools_node/')) return 'tooling';
  if (basename.endsWith('.md')) return 'docs';
  return 'other';
}

function parseUsageRef(ref) {
  const text = String(ref || '').trim();
  const match = text.match(/^([a-z-]+):(.*)#L(\d+)$/i);
  if (!match) {
    return { kind: 'other', file: text, line: null };
  }
  return {
    kind: String(match[1] || 'other').toLowerCase(),
    file: String(match[2] || ''),
    line: Number(match[3] || 0),
  };
}

function buildUsageRefStats(usageRefs, candidateFile) {
  const parsed = usageRefs.map((item) => parseUsageRef(item));
  const files = new Set(parsed.map((item) => item.file).filter(Boolean));
  const kinds = new Set(parsed.map((item) => item.kind).filter(Boolean));
  const externalRefs = parsed.filter((item) => item.file && normalizeSlashes(item.file) !== normalizeSlashes(candidateFile)).length;
  return {
    totalRefs: usageRefs.length,
    distinctFiles: files.size,
    distinctKinds: kinds.size,
    externalRefs,
    kinds: [...kinds].sort(),
  };
}

function loadManualUsageRefMap(usageRefFile) {
  if (!usageRefFile || !fileExists(usageRefFile)) {
    return {
      bySymbol: {},
      byCapsuleId: {},
    };
  }
  const source = readJson(usageRefFile, {});
  return {
    bySymbol: isObject(source.bySymbol) ? source.bySymbol : {},
    byCapsuleId: isObject(source.byCapsuleId) ? source.byCapsuleId : {},
  };
}

function collectUsageRefs(args, candidates, policy) {
  const symbols = [...new Set(candidates.map((item) => item.symbolName).filter(Boolean))];
  if (symbols.length === 0) {
    return {
      bySymbol: new Map(),
      filesScanned: [],
    };
  }
  const files = resolveUsageReferenceFiles(args, candidates, policy);
  const alternation = symbols
    .map((item) => escapeRegExp(item))
    .sort((a, b) => b.length - a.length)
    .join('|');
  const tokenPattern = new RegExp(`\\b(${alternation})\\b`, 'g');
  const bySymbol = new Map(symbols.map((item) => [item, []]));
  for (const filePath of files) {
    let source = '';
    try {
      source = readText(filePath);
    } catch (_) {
      continue;
    }
    const fileRef = sourceRef(filePath);
    const kind = inferUsageRefKind(fileRef);
    const lines = source.split(/\r?\n/);
    for (let lineNumber = 1; lineNumber <= lines.length; lineNumber += 1) {
      const line = lines[lineNumber - 1];
      tokenPattern.lastIndex = 0;
      let match;
      while ((match = tokenPattern.exec(line))) {
        const symbolName = String(match[1] || '');
        const refs = bySymbol.get(symbolName);
        if (!refs) continue;
        refs.push(`${kind}:${fileRef}#L${lineNumber}`);
      }
    }
  }
  return {
    bySymbol,
    filesScanned: files.map((item) => sourceRef(item)),
  };
}

function attachUsageRefsToCandidates(args, candidates, policy) {
  const usagePolicy = policy.usageReferencePolicy || {};
  const maxRefs = Number(usagePolicy.maxRefsPerSymbol || 24);
  const manualMap = loadManualUsageRefMap(args.usageRefFile);
  const collected = collectUsageRefs(args, candidates, policy);
  for (const candidate of candidates) {
    const capsuleId = buildCapsuleId(candidate.symbolName);
    const autoRefs = collected.bySymbol.get(candidate.symbolName) || [];
    const manualSymbolRefs = Array.isArray(manualMap.bySymbol[candidate.symbolName]) ? manualMap.bySymbol[candidate.symbolName] : [];
    const manualCapsuleRefs = Array.isArray(manualMap.byCapsuleId[capsuleId]) ? manualMap.byCapsuleId[capsuleId] : [];
    const merged = dedupeStrings([
      ...(candidate.usageRefs || []),
      ...autoRefs,
      ...manualSymbolRefs,
      ...manualCapsuleRefs,
    ]);
    const filtered = merged.filter((ref) => {
      const parsed = parseUsageRef(ref);
      if (!parsed.file) return false;
      if (normalizeSlashes(parsed.file) !== normalizeSlashes(candidate.file)) {
        return true;
      }
      if (!Number.isInteger(parsed.line) || parsed.line <= 0) {
        return true;
      }
      const range = candidate.sourceRange || {};
      if (!Number.isInteger(range.startLine) || !Number.isInteger(range.endLine)) {
        return true;
      }
      return parsed.line < range.startLine || parsed.line > range.endLine;
    });
    candidate.usageRefs = filtered.slice(0, maxRefs);
    candidate.usageRefStats = buildUsageRefStats(candidate.usageRefs, candidate.file);
  }
  return {
    filesScanned: collected.filesScanned,
  };
}

function lineNumberAt(source, offset) {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source.charCodeAt(index) === 10) line += 1;
  }
  return line;
}

function findMatchingBrace(source, openIndex) {
  let depth = 0;
  let inString = null;
  let escaped = false;
  for (let index = openIndex; index < source.length; index += 1) {
    const ch = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = ch;
      continue;
    }
    if (ch === '{') depth += 1;
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function listExportedNames(source) {
  const names = new Set();
  const moduleMatch = source.match(/module\.exports\s*=\s*\{([\s\S]*?)\};?/m);
  if (moduleMatch) {
    for (const part of moduleMatch[1].split(',')) {
      const name = part.trim().split(':')[0].trim();
      if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
    }
  }
  const exportRegex = /export\s+(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/g;
  let match;
  while ((match = exportRegex.exec(source))) {
    names.add(match[1]);
  }
  return names;
}

function extractFunctions(filePath) {
  const source = readText(filePath);
  const exportedNames = listExportedNames(source);
  const functions = [];
  const regex = /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/g;
  let match;
  while ((match = regex.exec(source))) {
    const name = match[1];
    let startIndex = match.index;
    if (source[startIndex] === '\n') startIndex += 1;
    while (/\s/.test(source[startIndex] || '') && source[startIndex] !== '\n') startIndex += 1;
    const openIndex = match.index + match[0].lastIndexOf('{');
    const closeIndex = findMatchingBrace(source, openIndex);
    if (closeIndex < 0) continue;
    const startLine = lineNumberAt(source, startIndex);
    const endLine = lineNumberAt(source, closeIndex);
    const body = source.slice(startIndex, closeIndex + 1);
    functions.push({
      symbolName: name,
      file: sourceRef(filePath),
      absoluteFile: filePath,
      sourceRange: { startLine, endLine },
      lineCount: endLine - startLine + 1,
      exported: exportedNames.has(name),
      body,
    });
  }
  return functions;
}

function ensurePolicyShape(policy) {
  const merged = deepMerge({
    thresholds: {
      functionLinesWarn: 80,
      functionLinesBlockRelease: 250,
      familyPromotionMinCount: 3,
      duplicateFingerprintAction: 'reuse-or-merge',
    },
    tiers: {
      localCapsule: 'local-capsule',
      localCapsuleCandidate: 'local-capsule-candidate',
      governedAtom: 'governed-atom',
      sharedAtom: 'shared-atom',
    },
    testRequirements: {
      candidate: ['base', 'boundary', 'invalid'],
      blockRelease: ['base', 'boundary', 'invalid', 'regression'],
      sideEffectRisk: ['boundary', 'invalid'],
      oracleMode: 'template-contract',
    },
    sealedPolicy: {
      rules: [],
    },
    promotionPolicy: {
      candidateToGoverned: {
        requireStrictValidation: true,
        requiredCaseSets: ['base', 'boundary', 'invalid'],
      },
      governedToShared: {
        requireSharedSuggestion: true,
        minUsageRefs: 2,
        minDistinctFiles: 2,
        minDistinctKinds: 2,
        requireCrossWorkflowEvidence: true,
        crossWorkflowKinds: ['map', 'workflow', 'case-study', 'runtime', 'tooling'],
      },
    },
    usageReferencePolicy: {
      enabled: true,
      includeGlobs: [
        'tools_node/**/*.js',
        'tools_node/**/*.mjs',
        'assets/scripts/**/*.ts',
        'docs/case-studies/**/*.md',
        'atomic_workbench/maps/**/*.json',
        'specs/**/*.json',
      ],
      excludeGlobs: [
        'node_modules/**',
        'artifacts/**',
        'atomic_workbench/capsules/**',
        'library/**',
        'temp/**',
        'server/dist/**',
        '.git/**',
      ],
      maxRefsPerSymbol: 24,
      externalScanMaxDepth: 2,
    },
    anchorPolicy: {
      required: true,
      idPrefix: 'H2U-ANCHOR',
      kind: 'core-anchor',
      role: 'semantic-parent',
      allowSharedPromotion: false,
    },
  }, policy || {});
  merged.testRequirements.candidate = dedupeStrings(merged.testRequirements.candidate);
  merged.testRequirements.blockRelease = dedupeStrings(merged.testRequirements.blockRelease);
  merged.testRequirements.sideEffectRisk = dedupeStrings(merged.testRequirements.sideEffectRisk);
  merged.sealedPolicy.rules = Array.isArray(merged.sealedPolicy.rules) ? merged.sealedPolicy.rules : [];
  merged.promotionPolicy.governedToShared.crossWorkflowKinds = dedupeStrings(merged.promotionPolicy.governedToShared.crossWorkflowKinds);
  merged.usageReferencePolicy.includeGlobs = dedupeStrings(merged.usageReferencePolicy.includeGlobs);
  merged.usageReferencePolicy.excludeGlobs = dedupeStrings(merged.usageReferencePolicy.excludeGlobs);
  return merged;
}

function loadPolicyStack(args) {
  const defaultPolicy = ensurePolicyShape(readJson(DEFAULT_POLICY_PATH, {}));
  const defaultProjectPolicyPath = path.join(args.workbenchRoot, 'policies', 'capsule-governance.policy.json');
  const defaultProjectHookPath = path.join(args.workbenchRoot, 'policies', 'capsule-governance.hook.cjs');
  const projectPolicyPath = args.policy || defaultProjectPolicyPath;
  const projectPolicy = ensurePolicyShape(readJson(projectPolicyPath, {}));
  const policy = ensurePolicyShape(deepMerge(defaultPolicy, projectPolicy));
  const hookPath = args.policyHook || defaultProjectHookPath;
  return {
    policy,
    defaultPolicy,
    projectPolicy,
    policyPaths: {
      default: rel(DEFAULT_POLICY_PATH),
      project: fs.existsSync(projectPolicyPath) ? rel(projectPolicyPath) : null,
      hook: fs.existsSync(hookPath) ? rel(hookPath) : null,
    },
    hookPath: fs.existsSync(hookPath) ? hookPath : null,
  };
}

function loadPolicyHook(hookPath) {
  if (!hookPath || !fs.existsSync(hookPath)) {
    return null;
  }
  delete require.cache[require.resolve(hookPath)];
  const hook = require(hookPath);
  if (typeof hook !== 'function') {
    throw new Error(`policy hook must export a function: ${hookPath}`);
  }
  return hook;
}

function buildAnchorDescriptor(filePath, policy) {
  const source = readText(filePath);
  const relative = sourceRef(filePath);
  const fileKey = shortHash(relative, 8).toUpperCase();
  const baseSlug = slug(path.basename(filePath, path.extname(filePath)));
  const moduleSlug = `${baseSlug}-${fileKey.toLowerCase()}`;
  const anchorId = `${policy.anchorPolicy.idPrefix}-${baseSlug.toUpperCase()}-${fileKey}`;
  return {
    anchorId,
    moduleSlug,
    file: relative,
    absoluteFile: filePath,
    semanticFingerprint: stableHash(source),
    lineCount: source.split(/\r?\n/).length,
  };
}

function scoreCandidate(fn, policy) {
  const reasons = [];
  let score = 0;
  if (fn.exported) {
    score += 35;
    reasons.push('exported');
  }
  if (VERB_PATTERN.test(fn.symbolName)) {
    score += 25;
    reasons.push('stable-behavior-name');
  }
  if (fn.lineCount > policy.thresholds.functionLinesBlockRelease) {
    score += 30;
    reasons.push('large-function');
  } else if (fn.lineCount > policy.thresholds.functionLinesWarn) {
    score += 15;
    reasons.push('medium-function');
  }
  const sideEffect = SIDE_EFFECT_PATTERN.test(fn.body);
  if (!sideEffect) {
    score += 15;
    reasons.push('pure-ish');
  } else {
    reasons.push('side-effect-risk');
  }
  if (/return\b/.test(fn.body)) {
    score += 10;
    reasons.push('return-contract');
  }

  const recommendedTier = fn.exported && !sideEffect && VERB_PATTERN.test(fn.symbolName)
    ? policy.tiers.governedAtom
    : policy.tiers.localCapsule;
  const severity = fn.lineCount > policy.thresholds.functionLinesBlockRelease
    ? 'block-release'
    : (fn.exported ? 'block-if-untested' : 'advisory');
  const testStrategy = dedupeStrings([
    'source-range-fingerprint',
    recommendedTier === policy.tiers.governedAtom ? 'behavior-template' : 'capsule-metadata',
    sideEffect ? 'side-effect-boundary' : 'edge-cases',
  ]);
  const requiredCaseSets = new Set();
  if (recommendedTier === policy.tiers.governedAtom) {
    for (const item of policy.testRequirements.candidate) requiredCaseSets.add(item);
  }
  if (severity === 'block-release') {
    for (const item of policy.testRequirements.blockRelease) requiredCaseSets.add(item);
  }
  if (sideEffect) {
    for (const item of policy.testRequirements.sideEffectRisk) requiredCaseSets.add(item);
  }
  return {
    score,
    reasons,
    recommendedTier,
    severity,
    testStrategy,
    sideEffect,
    requiredCaseSets: [...requiredCaseSets],
  };
}

function applySealedPolicy(baseCandidate, fn, policy) {
  for (const rule of policy.sealedPolicy.rules) {
    const symbolPattern = toRegExp(rule.symbolPattern);
    const filePattern = toRegExp(rule.filePattern);
    const bodyPattern = toRegExp(rule.bodyPattern);
    const lineCountGte = Number(rule.lineCountGte || 0);
    const matches = [
      symbolPattern ? symbolPattern.test(baseCandidate.symbolName) : true,
      filePattern ? filePattern.test(baseCandidate.file) : true,
      bodyPattern ? bodyPattern.test(fn.body) : true,
      lineCountGte > 0 ? baseCandidate.lineCount >= lineCountGte : true,
    ].every(Boolean);
    if (matches) {
      return {
        splitPolicy: 'sealed',
        splitPolicyReason: String(rule.reason || 'policy-sealed-rule').trim(),
      };
    }
  }
  return {
    splitPolicy: null,
    splitPolicyReason: null,
  };
}

function loadExistingCapsuleCatalog(workbenchRoot) {
  const indexPath = path.join(workbenchRoot, 'capsules', 'index.json');
  const index = readJson(indexPath, {});
  return Array.isArray(index.capsules) ? index.capsules : [];
}

function resolveRegistryPath(args) {
  if (args.registryPath) {
    return args.registryPath;
  }
  const siblingRegistry = path.join(path.dirname(args.workbenchRoot), 'atomic-registry.json');
  return siblingRegistry || DEFAULT_REGISTRY_PATH;
}

function buildCandidate(fn, options = {}) {
  const policy = ensurePolicyShape(options.policy || {});
  const scored = scoreCandidate(fn, policy);
  const tier = scored.recommendedTier === policy.tiers.governedAtom
    ? policy.tiers.localCapsuleCandidate
    : policy.tiers.localCapsule;
  const baseCandidate = {
    symbolName: fn.symbolName,
    file: fn.file,
    sourceRange: fn.sourceRange,
    lineCount: fn.lineCount,
    exported: fn.exported,
    recommendedTier: scored.recommendedTier,
    tier,
    targetWorkbenchRoot: 'atomic_workbench',
    riskScore: scored.score,
    severity: scored.severity,
    reasons: scored.reasons,
    testStrategy: scored.testStrategy,
    semanticFingerprint: stableHash(fn.body),
    requiredCaseSets: scored.requiredCaseSets,
    sideEffectRisk: scored.sideEffect,
    manualTestRequired: false,
    usageRefs: [],
    usageRefStats: {
      totalRefs: 0,
      distinctFiles: 0,
      distinctKinds: 0,
      externalRefs: 0,
      kinds: [],
    },
    anchorId: options.anchor?.anchorId || null,
    moduleSlug: options.anchor?.moduleSlug || null,
    splitPolicy: null,
    splitPolicyReason: null,
    policyFindings: [],
    duplicateResolution: null,
    behaviorContract: {
      oracleMode: policy.testRequirements.oracleMode || 'template-contract',
      manualTestRequired: false,
      templateCompletenessRequired: scored.requiredCaseSets.length > 0,
    },
  };
  Object.assign(baseCandidate, applySealedPolicy(baseCandidate, fn, policy));

  const hook = loadPolicyHook(options.hookPath);
  if (hook) {
    const hookResult = hook({
      candidate: structuredCloneCompat(baseCandidate),
      sourceFile: fn.file,
      projectPolicy: structuredCloneCompat(options.projectPolicy || {}),
      defaultPolicy: structuredCloneCompat(options.defaultPolicy || {}),
      existingCapsules: structuredCloneCompat(options.existingCapsules || []),
      registry: structuredCloneCompat(options.registry || {}),
      duplicateHints: structuredCloneCompat(options.duplicateHints || []),
    }) || {};
    if (isObject(hookResult.overrides)) {
      Object.assign(baseCandidate, deepMerge(baseCandidate, hookResult.overrides));
    }
    if (Array.isArray(hookResult.findings)) {
      baseCandidate.policyFindings = hookResult.findings.map((item) => isObject(item) ? item : { message: String(item) });
    }
  }

  baseCandidate.reasons = dedupeStrings(baseCandidate.reasons);
  baseCandidate.testStrategy = dedupeStrings(baseCandidate.testStrategy);
  baseCandidate.requiredCaseSets = dedupeStrings(baseCandidate.requiredCaseSets);
  baseCandidate.usageRefs = dedupeStrings(baseCandidate.usageRefs);
  baseCandidate.behaviorContract = {
    oracleMode: baseCandidate.behaviorContract?.oracleMode || policy.testRequirements.oracleMode || 'template-contract',
    manualTestRequired: Boolean(baseCandidate.behaviorContract?.manualTestRequired || baseCandidate.manualTestRequired),
    templateCompletenessRequired: baseCandidate.requiredCaseSets.length > 0,
  };
  return baseCandidate;
}

function extractFamilyName(symbolName) {
  const match = String(symbolName || '').match(VERB_PATTERN);
  if (!match) return slug(symbolName);
  return slug(String(symbolName).slice(match[0].length) || match[0]);
}

function findDuplicateHints(candidates, policy) {
  const byFingerprint = new Map();
  for (const candidate of candidates) {
    const list = byFingerprint.get(candidate.semanticFingerprint) || [];
    list.push(candidate);
    byFingerprint.set(candidate.semanticFingerprint, list);
  }
  const duplicateGroups = [];
  for (const [fingerprint, group] of byFingerprint.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        semanticFingerprint: fingerprint,
        symbols: group.map((item) => `${item.file}#${item.symbolName}`),
        recommendation: policy.thresholds.duplicateFingerprintAction || 'reuse-or-merge',
      });
    }
  }
  const nameFamilies = new Map();
  for (const candidate of candidates) {
    const family = extractFamilyName(candidate.symbolName);
    const list = nameFamilies.get(family) || [];
    list.push(candidate.symbolName);
    nameFamilies.set(family, list);
  }
  const promotionHints = [];
  for (const [family, symbols] of nameFamilies.entries()) {
    if (family && symbols.length >= Number(policy.thresholds.familyPromotionMinCount || 3)) {
      promotionHints.push({
        family,
        symbols: [...new Set(symbols)].sort(),
        recommendation: 'consider-governed-atom-family',
      });
    }
  }
  return { duplicateGroups, promotionHints };
}

function buildAnchorManifest(anchor, candidates, policy) {
  return {
    schemaId: 'atm.coreAnchorManifest',
    specVersion: '0.1.0',
    anchorId: anchor.anchorId,
    kind: policy.anchorPolicy.kind || 'core-anchor',
    role: policy.anchorPolicy.role || 'semantic-parent',
    logicalName: `anchor.${anchor.moduleSlug}`,
    source: {
      file: anchor.file,
      lineCount: anchor.lineCount,
    },
    semanticFingerprint: anchor.semanticFingerprint,
    children: candidates.map((item) => buildCapsuleId(item.symbolName)),
    lineage: {
      bornBy: 'anchorize',
      parentRefs: [`legacy://3KLife/${anchor.file}`],
    },
    splitPolicy: null,
    splitPolicyReason: null,
    promotion: {
      currentTier: 'core-anchor',
      allowSharedPromotion: Boolean(policy.anchorPolicy.allowSharedPromotion),
    },
  };
}

function buildCapsuleId(symbolName) {
  return `${CAPSULE_ID_PREFIX}-${slug(symbolName).toUpperCase()}`;
}

function buildCapsuleManifest(candidate) {
  return {
    schemaId: 'atm.localCapsuleManifest',
    specVersion: '0.2.0',
    capsuleId: buildCapsuleId(candidate.symbolName),
    symbolName: candidate.symbolName,
    anchorId: candidate.anchorId,
    moduleSlug: candidate.moduleSlug,
    source: {
      file: candidate.file,
      sourceRange: candidate.sourceRange,
      semanticFingerprint: candidate.semanticFingerprint,
    },
    tier: candidate.tier,
    recommendedTier: candidate.recommendedTier,
    targetWorkbenchRoot: candidate.targetWorkbenchRoot,
    reasons: candidate.reasons,
    testStrategy: candidate.testStrategy,
    requiredCaseSets: candidate.requiredCaseSets,
    classification: {
      exported: Boolean(candidate.exported),
      lineCount: candidate.lineCount,
      severity: candidate.severity,
      riskScore: candidate.riskScore,
      sideEffectRisk: Boolean(candidate.sideEffectRisk),
    },
    behaviorContract: candidate.behaviorContract,
    splitPolicy: candidate.splitPolicy || null,
    splitPolicyReason: candidate.splitPolicyReason || null,
    usageRefs: candidate.usageRefs || [],
    usageRefStats: candidate.usageRefStats || {
      totalRefs: 0,
      distinctFiles: 0,
      distinctKinds: 0,
      externalRefs: 0,
      kinds: [],
    },
    duplicateResolution: candidate.duplicateResolution || null,
    policyFindings: candidate.policyFindings || [],
    lineage: {
      bornBy: 'authoring-time-auto-atomization',
      parentRefs: [`legacy://3KLife/${candidate.file}#L${candidate.sourceRange.startLine}-L${candidate.sourceRange.endLine}`],
    },
    promotion: {
      currentTier: candidate.tier,
      history: [],
      sourceIdentityStable: true,
      semanticFingerprint: candidate.semanticFingerprint,
    },
  };
}

function buildCapsuleTest(manifestFileName) {
  return [
    "import assert from 'node:assert/strict';",
    "import { createHash } from 'node:crypto';",
    "import { readFileSync } from 'node:fs';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    `const manifest = JSON.parse(readFileSync(new URL('./${manifestFileName}', import.meta.url), 'utf8'));`,
    "const capsuleRoot = path.dirname(fileURLToPath(import.meta.url));",
    "const repoRoot = path.resolve(capsuleRoot, '../../..');",
    "const sourcePath = path.resolve(repoRoot, manifest.source.file);",
    "const source = readFileSync(sourcePath, 'utf8');",
    "const lines = source.split(/\\r?\\n/);",
    "const slice = lines.slice(manifest.source.sourceRange.startLine - 1, manifest.source.sourceRange.endLine).join('\\n');",
    "const actual = `sf:sha256:${createHash('sha256').update(String(slice || '').replace(/\\s+/g, ' ').trim()).digest('hex')}`;",
    "assert.equal(actual, manifest.source.semanticFingerprint, 'source range semantic fingerprint');",
    "assert.ok(Array.isArray(manifest.lineage.parentRefs) && manifest.lineage.parentRefs.length > 0, 'lineage parent refs');",
    "assert.ok(typeof manifest.anchorId === 'string' && manifest.anchorId.length > 0, 'anchorId present');",
    "console.log(`${manifest.capsuleId} capsule metadata self-check ok`);",
    '',
  ].join('\n');
}

function buildBehaviorTest(manifestFileName) {
  return [
    "import assert from 'node:assert/strict';",
    "import { readFileSync } from 'node:fs';",
    '',
    `const manifest = JSON.parse(readFileSync(new URL('./${manifestFileName}', import.meta.url), 'utf8'));`,
    "for (const kind of manifest.requiredCaseSets || []) {",
    "  const fileName = `./tests/${kind}.cases.json`;",
    "  const cases = JSON.parse(readFileSync(new URL(fileName, import.meta.url), 'utf8'));",
    "  assert.ok(Array.isArray(cases) && cases.length > 0, `${kind} cases present`);",
    "  for (const item of cases) {",
    "    assert.equal(item.kind, kind, `${kind} case kind matches`);",
    "    assert.ok(typeof item.id === 'string' && item.id.length > 0, `${kind} case id`);",
    "    assert.ok(typeof item.title === 'string' && item.title.length > 0, `${kind} case title`);",
    "    assert.ok(Object.prototype.hasOwnProperty.call(item, 'inputSample'), `${kind} input sample`);",
    "    assert.ok(item.expectation && typeof item.expectation === 'object', `${kind} expectation`);",
    "  }",
    "}",
    "console.log(`${manifest.capsuleId} behavior template contract ok`);",
    '',
  ].join('\n');
}

function buildAnchorTest(manifestFileName) {
  return [
    "import assert from 'node:assert/strict';",
    "import { createHash } from 'node:crypto';",
    "import { readFileSync } from 'node:fs';",
    "import path from 'node:path';",
    "import { fileURLToPath } from 'node:url';",
    '',
    `const manifest = JSON.parse(readFileSync(new URL('./${manifestFileName}', import.meta.url), 'utf8'));`,
    "const anchorRoot = path.dirname(fileURLToPath(import.meta.url));",
    "const repoRoot = path.resolve(anchorRoot, '../../..');",
    "const sourcePath = path.resolve(repoRoot, manifest.source.file);",
    "const source = readFileSync(sourcePath, 'utf8');",
    "const actual = `sf:sha256:${createHash('sha256').update(String(source || '').replace(/\\s+/g, ' ').trim()).digest('hex')}`;",
    "assert.equal(actual, manifest.semanticFingerprint, 'module fingerprint');",
    "assert.ok(Array.isArray(manifest.children) && manifest.children.length > 0, 'anchor children');",
    "console.log(`${manifest.anchorId} anchor self-check ok`);",
    '',
  ].join('\n');
}

function buildBehaviorCaseSet(kind, manifest) {
  const baseId = manifest.capsuleId;
  const sharedExpectation = {
    mode: manifest.behaviorContract?.oracleMode || 'template-contract',
    semanticFingerprint: manifest.source.semanticFingerprint,
  };
  const parentRef = manifest.lineage?.parentRefs?.[0] || null;
  if (kind === 'base') {
    return [{
      id: `${baseId}:base:nominal`,
      kind,
      title: `${manifest.symbolName} 正常主路徑`,
      inputSample: {
        mode: manifest.classification?.sideEffectRisk ? 'dry-run' : 'nominal',
        raw: 'alpha, beta',
      },
      expectation: {
        ...sharedExpectation,
        claim: 'covers the most common path with stable input/output expectations',
      },
      notes: [`Auto scaffolded from ${parentRef}`],
    }];
  }
  if (kind === 'boundary') {
    return [
      {
        id: `${baseId}:boundary:empty`,
        kind,
        title: `${manifest.symbolName} 空值邊界`,
        inputSample: '',
        expectation: {
          ...sharedExpectation,
          claim: 'handles empty or whitespace-only input without crashing',
        },
      },
      {
        id: `${baseId}:boundary:formatted`,
        kind,
        title: `${manifest.symbolName} 格式邊界`,
        inputSample: '  ALPHA , beta  ',
        expectation: {
          ...sharedExpectation,
          claim: 'handles trimming/casing/format boundary deterministically',
        },
      },
    ];
  }
  if (kind === 'invalid') {
    return [
      {
        id: `${baseId}:invalid:null`,
        kind,
        title: `${manifest.symbolName} null 輸入`,
        inputSample: null,
        expectation: {
          ...sharedExpectation,
          claim: 'rejects or safely normalizes null-like input',
        },
      },
      {
        id: `${baseId}:invalid:type`,
        kind,
        title: `${manifest.symbolName} 錯誤型別`,
        inputSample: { unsupported: true },
        expectation: {
          ...sharedExpectation,
          claim: 'rejects unsupported input types predictably',
        },
      },
    ];
  }
  if (kind === 'regression') {
    return [{
      id: `${baseId}:regression:legacy`,
      kind,
      title: `${manifest.symbolName} legacy regression`,
      inputSample: {
        sourceRef: parentRef,
        mode: 'legacy-case-study',
      },
      expectation: {
        ...sharedExpectation,
        claim: 'preserves known legacy behavior for the guarded release-block path',
      },
      notes: ['Seeded for block-release capsule convergence.'],
    }];
  }
  return [];
}

function ensureCaseFiles(capsuleDir, manifest) {
  const created = [];
  if (!Array.isArray(manifest.requiredCaseSets) || manifest.requiredCaseSets.length === 0) {
    return created;
  }
  const testsDir = path.join(capsuleDir, 'tests');
  for (const kind of manifest.requiredCaseSets) {
    const casePath = path.join(testsDir, `${kind}.cases.json`);
    writeJson(casePath, buildBehaviorCaseSet(kind, manifest));
    created.push(rel(casePath));
  }
  return created;
}

function loadOrInitRegistry(registryPath) {
  const registry = readJson(registryPath, null) || {
    schemaId: 'atm.registry',
    specVersion: '0.1.0',
    registryId: 'local.capsule.registry',
    generatedAt: new Date().toISOString(),
    role: 'adopter-local-workbench',
    entries: [],
  };
  registry.entries = Array.isArray(registry.entries) ? registry.entries : [];
  registry.anchors = Array.isArray(registry.anchors) ? registry.anchors : [];
  registry.capsules = Array.isArray(registry.capsules) ? registry.capsules : [];
  registry.generatedAt = new Date().toISOString();
  return registry;
}

function syncAnchorsToRegistry(registryPath, anchorRecords) {
  const registry = loadOrInitRegistry(registryPath);
  const existing = new Map((registry.anchors || []).map((item) => [item.anchorId, item]));
  for (const record of anchorRecords) {
    existing.set(record.manifest.anchorId, {
      id: record.manifest.anchorId,
      anchorId: record.manifest.anchorId,
      logicalName: record.manifest.logicalName,
      kind: record.manifest.kind,
      role: record.manifest.role,
      status: 'active',
      governance: {
        tier: 'core-anchor',
      },
      source: record.manifest.source,
      semanticFingerprint: record.manifest.semanticFingerprint,
      children: record.manifest.children,
      location: {
        manifestPath: rel(record.manifestPath),
        testPath: rel(record.testPath),
        workbenchPath: rel(record.anchorDir),
      },
    });
  }
  registry.anchors = [...existing.values()].sort((a, b) => String(a.anchorId).localeCompare(String(b.anchorId)));
  writeJson(registryPath, registry);
  return registry;
}

function syncPromotedCapsuleToRegistry(registryPath, manifest, capsuleDir) {
  const registry = loadOrInitRegistry(registryPath);
  const existing = new Map((registry.capsules || []).map((item) => [item.capsuleId, item]));
  existing.set(manifest.capsuleId, {
    id: manifest.capsuleId,
    capsuleId: manifest.capsuleId,
    symbolName: manifest.symbolName,
    status: 'active',
    governance: {
      tier: manifest.promotion?.currentTier || manifest.tier,
    },
    anchorId: manifest.anchorId,
    source: manifest.source,
    semanticFingerprint: manifest.source.semanticFingerprint,
    location: {
      manifestPath: rel(path.join(capsuleDir, 'capsule.manifest.json')),
      capsuleDir: rel(capsuleDir),
      testPath: rel(path.join(capsuleDir, 'capsule.test.mjs')),
      behaviorTestPath: fs.existsSync(path.join(capsuleDir, 'capsule.behavior.test.mjs'))
        ? rel(path.join(capsuleDir, 'capsule.behavior.test.mjs'))
        : null,
    },
    lineage: manifest.lineage,
  });
  registry.capsules = [...existing.values()].sort((a, b) => String(a.capsuleId).localeCompare(String(b.capsuleId)));
  writeJson(registryPath, registry);
  return registry;
}

function collectCapsuleRoots(capsuleRoot) {
  const roots = [];
  if (!fs.existsSync(capsuleRoot)) {
    return roots;
  }
  for (const entry of fs.readdirSync(capsuleRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(capsuleRoot, entry.name, 'capsule.manifest.json');
    if (fs.existsSync(manifestPath)) {
      roots.push(path.join(capsuleRoot, entry.name));
    }
  }
  roots.sort();
  return roots;
}

function collectAnchorRoots(anchorRoot) {
  const roots = [];
  if (!fs.existsSync(anchorRoot)) {
    return roots;
  }
  for (const entry of fs.readdirSync(anchorRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(anchorRoot, entry.name, 'anchor.manifest.json');
    if (fs.existsSync(manifestPath)) {
      roots.push(path.join(anchorRoot, entry.name));
    }
  }
  roots.sort();
  return roots;
}

function summarizeState(manifests, anchors) {
  const byRecommendedTier = {};
  const byCurrentTier = {};
  const bySeverity = {};
  const governedCandidates = [];
  const releaseBlockers = [];
  for (const manifest of manifests) {
    byRecommendedTier[manifest.recommendedTier] = (byRecommendedTier[manifest.recommendedTier] || 0) + 1;
    const currentTier = manifest.promotion?.currentTier || manifest.tier;
    byCurrentTier[currentTier] = (byCurrentTier[currentTier] || 0) + 1;
    const severity = manifest.classification?.severity || 'unknown';
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    if (manifest.recommendedTier === 'governed-atom') {
      governedCandidates.push(manifest.symbolName);
    }
    if (severity === 'block-release') {
      releaseBlockers.push(manifest.symbolName);
    }
  }
  governedCandidates.sort();
  releaseBlockers.sort();
  return {
    candidateCount: manifests.length,
    anchorCount: anchors.length,
    byRecommendedTier,
    byCurrentTier,
    bySeverity,
    governedCandidates,
    releaseBlockers,
  };
}

function buildCapsuleIndexFromState(workbenchRoot, candidateReportPath) {
  const capsuleRoot = path.join(workbenchRoot, 'capsules');
  const anchorRoot = path.join(workbenchRoot, 'anchors');
  const manifests = collectCapsuleRoots(capsuleRoot).map((capsuleDir) => ({
    capsuleDir,
    manifestPath: path.join(capsuleDir, 'capsule.manifest.json'),
    testPath: path.join(capsuleDir, 'capsule.test.mjs'),
    behaviorTestPath: path.join(capsuleDir, 'capsule.behavior.test.mjs'),
    manifest: readJson(path.join(capsuleDir, 'capsule.manifest.json')),
  }));
  const anchors = collectAnchorRoots(anchorRoot).map((anchorDir) => ({
    anchorDir,
    manifestPath: path.join(anchorDir, 'anchor.manifest.json'),
    testPath: path.join(anchorDir, 'anchor.test.mjs'),
    manifest: readJson(path.join(anchorDir, 'anchor.manifest.json')),
  }));
  const summary = summarizeState(manifests.map((item) => item.manifest), anchors.map((item) => item.manifest));
  return {
    schemaId: 'atm.localCapsuleIndex',
    specVersion: '0.2.0',
    generatedAt: new Date().toISOString(),
    candidateReport: candidateReportPath ? rel(candidateReportPath) : null,
    workbenchRoot: sourceRef(workbenchRoot),
    capsuleRoot: rel(capsuleRoot),
    anchorRoot: rel(anchorRoot),
    summary,
    capsules: manifests.map((item) => ({
      capsuleId: item.manifest.capsuleId,
      symbolName: item.manifest.symbolName,
      tier: item.manifest.tier,
      currentTier: item.manifest.promotion?.currentTier || item.manifest.tier,
      recommendedTier: item.manifest.recommendedTier,
      severity: item.manifest.classification?.severity || 'unknown',
      splitPolicy: item.manifest.splitPolicy || null,
      anchorId: item.manifest.anchorId,
      source: item.manifest.source,
      usageRefStats: item.manifest.usageRefStats || null,
      requiredCaseSets: item.manifest.requiredCaseSets || [],
      capsuleDir: rel(item.capsuleDir),
      manifestPath: rel(item.manifestPath),
      testPath: rel(item.testPath),
      behaviorTestPath: fs.existsSync(item.behaviorTestPath) ? rel(item.behaviorTestPath) : null,
      reasons: item.manifest.reasons || [],
    })).sort((a, b) => a.symbolName.localeCompare(b.symbolName)),
    anchors: anchors.map((item) => ({
      anchorId: item.manifest.anchorId,
      moduleSlug: item.manifest.logicalName?.replace(/^anchor\./, '') || slug(item.manifest.anchorId),
      source: item.manifest.source,
      childCount: Array.isArray(item.manifest.children) ? item.manifest.children.length : 0,
      manifestPath: rel(item.manifestPath),
      testPath: rel(item.testPath),
    })).sort((a, b) => String(a.anchorId).localeCompare(String(b.anchorId))),
  };
}

function buildCapsuleReadme(index) {
  const summary = index.summary || {};
  const governed = summary.governedCandidates || [];
  const blockers = summary.releaseBlockers || [];
  const topGoverned = governed.map((name) => `- ${name}`).join('\n') || '- none';
  const topBlockers = blockers.map((name) => `- ${name}`).join('\n') || '- none';
  return [
    '# H2U Authoring-Time Capsules',
    '',
    'This directory is generated by `npm run atm:atomize -- scaffold --candidate-report artifacts/atm-atomize/candidates.json`.',
    'It is the project-local capsule workbench for H2U. These capsules are not upstream core atoms.',
    '',
    '## Summary',
    '',
    `- Total capsules: ${summary.candidateCount || 0}`,
    `- Anchors: ${summary.anchorCount || 0}`,
    `- Local capsules: ${summary.byCurrentTier?.['local-capsule'] || 0}`,
    `- Candidate capsules: ${summary.byCurrentTier?.['local-capsule-candidate'] || 0}`,
    `- Governed capsules: ${summary.byCurrentTier?.['governed-atom'] || 0}`,
    `- Shared capsules: ${summary.byCurrentTier?.['shared-atom'] || 0}`,
    `- Release blockers: ${summary.bySeverity?.['block-release'] || 0}`,
    '',
    '## Governed Atom Candidates',
    '',
    topGoverned,
    '',
    '## Release Blockers',
    '',
    topBlockers,
    '',
    '## How To Verify',
    '',
    '```bash',
    'npm run atm:atomize -- validate --strict',
    'npm run atm:atomize -- demand-police --strict',
    '```',
    '',
    'The machine-readable indexes are `atomic_workbench/capsules/index.json` and `artifacts/atm-atomize/*.report.json`.',
    '',
  ].join('\n');
}

function validateCapsuleCharacteristics(manifest, policy) {
  const findings = [];
  const fail = (message, details = {}) => findings.push({ severity: 'error', message, ...details });

  if (manifest.schemaId !== 'atm.localCapsuleManifest') {
    fail('schemaId must be atm.localCapsuleManifest');
  }
  if (!/^H2U-CAPSULE-[A-Z0-9-]+$/.test(String(manifest.capsuleId || ''))) {
    fail('capsuleId must use H2U-CAPSULE-* format');
  }
  if (!manifest.symbolName || typeof manifest.symbolName !== 'string') {
    fail('symbolName is required');
  }
  if (!['local-capsule', 'local-capsule-candidate'].includes(manifest.tier)) {
    fail('tier must be local-capsule or local-capsule-candidate', { actual: manifest.tier });
  }
  if (!['local-capsule', 'governed-atom', 'shared-atom'].includes(manifest.recommendedTier)) {
    fail('recommendedTier is invalid', { actual: manifest.recommendedTier });
  }
  if (!['local-capsule', 'local-capsule-candidate', 'governed-atom', 'shared-atom'].includes(manifest.promotion?.currentTier || '')) {
    fail('promotion.currentTier is invalid', { actual: manifest.promotion?.currentTier });
  }
  if (!manifest.anchorId || !/^H2U-ANCHOR-[A-Z0-9-]+$/.test(String(manifest.anchorId))) {
    fail('anchorId must use H2U-ANCHOR-* format');
  }
  if (manifest.targetWorkbenchRoot !== 'atomic_workbench') {
    fail('targetWorkbenchRoot must be atomic_workbench', { actual: manifest.targetWorkbenchRoot });
  }
  if (!manifest.source || typeof manifest.source.file !== 'string' || !manifest.source.file) {
    fail('source.file is required');
  }
  const range = manifest.source?.sourceRange || {};
  if (!Number.isInteger(range.startLine) || !Number.isInteger(range.endLine) || range.startLine < 1 || range.endLine < range.startLine) {
    fail('sourceRange must be a valid line range', { actual: range });
  }
  if (!/^sf:sha256:[a-f0-9]{64}$/.test(String(manifest.source?.semanticFingerprint || ''))) {
    fail('semanticFingerprint must use sf:sha256:<64 hex>');
  }
  if (!Array.isArray(manifest.reasons) || manifest.reasons.length === 0) {
    fail('reasons must be non-empty');
  }
  if (!Array.isArray(manifest.testStrategy) || !manifest.testStrategy.includes('source-range-fingerprint')) {
    fail('testStrategy must include source-range-fingerprint');
  }
  if (!Array.isArray(manifest.requiredCaseSets)) {
    fail('requiredCaseSets must be an array');
  }
  if (!Array.isArray(manifest.usageRefs)) {
    fail('usageRefs must be an array');
  }
  if (manifest.usageRefStats !== undefined) {
    const stats = manifest.usageRefStats || {};
    if (!Number.isInteger(Number(stats.totalRefs)) || Number(stats.totalRefs) < 0) {
      fail('usageRefStats.totalRefs must be non-negative integer', { actual: stats.totalRefs });
    }
    if (!Number.isInteger(Number(stats.distinctFiles)) || Number(stats.distinctFiles) < 0) {
      fail('usageRefStats.distinctFiles must be non-negative integer', { actual: stats.distinctFiles });
    }
    if (!Number.isInteger(Number(stats.distinctKinds)) || Number(stats.distinctKinds) < 0) {
      fail('usageRefStats.distinctKinds must be non-negative integer', { actual: stats.distinctKinds });
    }
    if (!Number.isInteger(Number(stats.externalRefs)) || Number(stats.externalRefs) < 0) {
      fail('usageRefStats.externalRefs must be non-negative integer', { actual: stats.externalRefs });
    }
    if (stats.kinds !== undefined && !Array.isArray(stats.kinds)) {
      fail('usageRefStats.kinds must be an array when present', { actual: stats.kinds });
    }
  }
  if (manifest.behaviorContract?.manualTestRequired !== undefined && typeof manifest.behaviorContract.manualTestRequired !== 'boolean') {
    fail('behaviorContract.manualTestRequired must be boolean');
  }
  if (manifest.splitPolicy !== null && manifest.splitPolicy !== 'sealed') {
    fail('splitPolicy must be null or sealed', { actual: manifest.splitPolicy });
  }
  if (manifest.splitPolicy === 'sealed' && !String(manifest.splitPolicyReason || '').trim()) {
    fail('sealed splitPolicy requires splitPolicyReason');
  }
  if (manifest.lineage?.bornBy !== 'authoring-time-auto-atomization') {
    fail('lineage.bornBy must be authoring-time-auto-atomization');
  }
  if (!Array.isArray(manifest.lineage?.parentRefs) || manifest.lineage.parentRefs.length === 0) {
    fail('lineage.parentRefs must be non-empty');
  } else if (!manifest.lineage.parentRefs.every((ref) => String(ref).startsWith('legacy://3KLife/'))) {
    fail('lineage.parentRefs must point at project-local legacy refs');
  }
  if (manifest.recommendedTier === 'governed-atom') {
    if (manifest.tier !== 'local-capsule-candidate') {
      fail('governed candidates must remain local-capsule-candidate until promoted');
    }
    for (const reason of ['exported', 'stable-behavior-name', 'pure-ish']) {
      if (!manifest.reasons.includes(reason)) {
        fail(`governed candidates must include reason: ${reason}`);
      }
    }
    if (manifest.classification?.exported !== true) {
      fail('governed candidates must be exported');
    }
  }
  const lineCount = Number(manifest.classification?.lineCount || 0);
  if (lineCount > Number(policy.thresholds.functionLinesBlockRelease || 250)
    && manifest.classification?.severity !== 'block-release') {
    fail('functions above block-release threshold must be release blockers');
  }
  const requiredSets = new Set(manifest.requiredCaseSets || []);
  const mustHaveCandidate = manifest.tier === 'local-capsule-candidate'
    || manifest.recommendedTier === 'governed-atom';
  if (mustHaveCandidate) {
    for (const item of policy.testRequirements.candidate) {
      if (!requiredSets.has(item)) {
        fail(`candidate capsules must require ${item}`);
      }
    }
  }
  if (manifest.classification?.severity === 'block-release') {
    for (const item of policy.testRequirements.blockRelease) {
      if (!requiredSets.has(item)) {
        fail(`block-release capsules must require ${item}`);
      }
    }
  }
  if (manifest.classification?.sideEffectRisk) {
    for (const item of policy.testRequirements.sideEffectRisk) {
      if (!requiredSets.has(item)) {
        fail(`side-effect-risk capsules must require ${item}`);
      }
    }
  }
  return findings;
}

function validateAnchorCharacteristics(manifest, anchorsById) {
  const findings = [];
  const fail = (message, details = {}) => findings.push({ severity: 'error', message, ...details });
  if (manifest.schemaId !== 'atm.coreAnchorManifest') {
    fail('anchor schemaId must be atm.coreAnchorManifest');
  }
  if (!/^H2U-ANCHOR-[A-Z0-9-]+$/.test(String(manifest.anchorId || ''))) {
    fail('anchorId must use H2U-ANCHOR-* format');
  }
  if (manifest.kind !== 'core-anchor') {
    fail('anchor kind must be core-anchor');
  }
  if (manifest.role !== 'semantic-parent') {
    fail('anchor role must be semantic-parent');
  }
  if (!manifest.source || typeof manifest.source.file !== 'string' || !manifest.source.file) {
    fail('anchor source.file is required');
  }
  if (!/^sf:sha256:[a-f0-9]{64}$/.test(String(manifest.semanticFingerprint || ''))) {
    fail('anchor semanticFingerprint must use sf:sha256:<64 hex>');
  }
  if (!Array.isArray(manifest.children) || manifest.children.length === 0) {
    fail('anchor children must be non-empty');
  }
  if (manifest.lineage?.bornBy !== 'anchorize') {
    fail('anchor lineage.bornBy must be anchorize');
  }
  if (!Array.isArray(manifest.lineage?.parentRefs) || manifest.lineage.parentRefs.length === 0) {
    fail('anchor lineage.parentRefs must be non-empty');
  }
  if (manifest.promotion?.allowSharedPromotion !== false) {
    fail('core anchors must not allow shared promotion');
  }
  if (anchorsById.has(manifest.anchorId) && anchorsById.get(manifest.anchorId) !== manifest.source.file) {
    fail('anchorId collision detected', { actual: anchorsById.get(manifest.anchorId), expected: manifest.source.file });
  }
  return findings;
}

function runCapsuleMetadataCheck(capsuleRoot, manifest, policy) {
  const repoRoot = path.resolve(capsuleRoot, '../../..');
  const sourcePath = path.resolve(repoRoot, manifest.source.file);
  const source = readText(sourcePath);
  const lines = source.split(/\r?\n/);
  const slice = lines
    .slice(manifest.source.sourceRange.startLine - 1, manifest.source.sourceRange.endLine)
    .join('\n');
  const actual = stableHash(slice);
  const findings = validateCapsuleCharacteristics(manifest, policy);
  if (actual !== manifest.source.semanticFingerprint) {
    findings.push({
      severity: 'error',
      message: 'source range semantic fingerprint mismatch',
      expected: manifest.source.semanticFingerprint,
      actual,
    });
  }
  return {
    ok: findings.length === 0,
    findings,
  };
}

function runCapsuleBehaviorTemplateCheck(capsuleRoot, manifest) {
  const findings = [];
  const fail = (message, details = {}) => findings.push({ severity: 'error', message, ...details });
  const required = manifest.requiredCaseSets || [];
  if (required.length === 0) {
    return { ok: true, findings };
  }
  const behaviorTestPath = path.join(capsuleRoot, 'capsule.behavior.test.mjs');
  if (!fs.existsSync(behaviorTestPath)) {
    fail('behavior test template missing', { path: rel(behaviorTestPath) });
  }
  const testsDir = path.join(capsuleRoot, 'tests');
  for (const kind of required) {
    const casePath = path.join(testsDir, `${kind}.cases.json`);
    if (!fs.existsSync(casePath)) {
      fail(`required ${kind} cases missing`, { path: rel(casePath) });
      continue;
    }
    const cases = readJson(casePath, null);
    if (!Array.isArray(cases) || cases.length === 0) {
      fail(`${kind} cases must be a non-empty array`, { path: rel(casePath) });
      continue;
    }
    const ids = new Set();
    for (const item of cases) {
      if (!item || typeof item !== 'object') {
        fail(`${kind} case must be an object`, { path: rel(casePath) });
        continue;
      }
      if (item.kind !== kind) {
        fail(`${kind} case kind mismatch`, { path: rel(casePath), actual: item.kind });
      }
      if (!String(item.id || '').trim()) {
        fail(`${kind} case id missing`, { path: rel(casePath) });
      } else if (ids.has(item.id)) {
        fail(`${kind} case id must be unique`, { path: rel(casePath), id: item.id });
      } else {
        ids.add(item.id);
      }
      if (!String(item.title || '').trim()) {
        fail(`${kind} case title missing`, { path: rel(casePath) });
      }
      if (!Object.prototype.hasOwnProperty.call(item, 'inputSample')) {
        fail(`${kind} case inputSample missing`, { path: rel(casePath), id: item.id });
      }
      if (!item.expectation || typeof item.expectation !== 'object') {
        fail(`${kind} case expectation missing`, { path: rel(casePath), id: item.id });
      }
    }
  }
  return {
    ok: findings.length === 0,
    findings,
  };
}

function runAnchorCheck(anchorRoot, manifest, anchorsById) {
  const repoRoot = path.resolve(anchorRoot, '../../..');
  const sourcePath = path.resolve(repoRoot, manifest.source.file);
  const source = readText(sourcePath);
  const actual = stableHash(source);
  const findings = validateAnchorCharacteristics(manifest, anchorsById);
  if (actual !== manifest.semanticFingerprint) {
    findings.push({
      severity: 'error',
      message: 'anchor module fingerprint mismatch',
      expected: manifest.semanticFingerprint,
      actual,
    });
  }
  return {
    ok: findings.length === 0,
    findings,
  };
}

function collectWorkbenchState(workbenchRoot) {
  const capsuleRoot = path.join(workbenchRoot, 'capsules');
  const anchorRoot = path.join(workbenchRoot, 'anchors');
  const capsules = collectCapsuleRoots(capsuleRoot).map((capsuleDir) => {
    const manifestPath = path.join(capsuleDir, 'capsule.manifest.json');
    return {
      capsuleDir,
      manifestPath,
      testPath: path.join(capsuleDir, 'capsule.test.mjs'),
      behaviorTestPath: path.join(capsuleDir, 'capsule.behavior.test.mjs'),
      testsDir: path.join(capsuleDir, 'tests'),
      manifest: readJson(manifestPath),
    };
  });
  const anchors = collectAnchorRoots(anchorRoot).map((anchorDir) => {
    const manifestPath = path.join(anchorDir, 'anchor.manifest.json');
    return {
      anchorDir,
      manifestPath,
      testPath: path.join(anchorDir, 'anchor.test.mjs'),
      manifest: readJson(manifestPath),
    };
  });
  return { capsuleRoot, anchorRoot, capsules, anchors };
}

function summarizeUsageForDemand(manifest) {
  const refs = dedupeStrings(Array.isArray(manifest.usageRefs) ? manifest.usageRefs : []);
  const parsed = refs.map((item) => parseUsageRef(item));
  const distinctFiles = new Set(parsed.map((item) => item.file).filter(Boolean));
  const distinctKinds = new Set(parsed.map((item) => item.kind).filter(Boolean));
  const sourceFile = normalizeSlashes(String(manifest.source?.file || ''));
  const externalRefs = parsed.filter((item) => item.file && normalizeSlashes(item.file) !== sourceFile).length;
  return {
    totalRefs: refs.length,
    distinctFiles: distinctFiles.size,
    distinctKinds: distinctKinds.size,
    externalRefs,
    kinds: [...distinctKinds].sort(),
    refs,
  };
}

function evaluateDemandPolice(workbenchRoot, policy) {
  const state = collectWorkbenchState(workbenchRoot);
  const findings = [];
  const anchorsById = new Map(state.anchors.map((item) => [item.manifest.anchorId, item.manifest]));
  const manifests = state.capsules.map((item) => item.manifest);
  const byFingerprint = new Map();
  const byFamily = new Map();
  const bySourceFile = new Map();

  for (const manifest of manifests) {
    const fingerprint = manifest.source?.semanticFingerprint;
    const duplicateList = byFingerprint.get(fingerprint) || [];
    duplicateList.push(manifest);
    byFingerprint.set(fingerprint, duplicateList);

    const family = extractFamilyName(manifest.symbolName);
    const familyList = byFamily.get(family) || [];
    familyList.push(manifest);
    byFamily.set(family, familyList);

    const fileList = bySourceFile.get(manifest.source?.file) || [];
    fileList.push(manifest);
    bySourceFile.set(manifest.source?.file, fileList);
  }

  for (const [fingerprint, group] of byFingerprint.entries()) {
    if (!fingerprint || group.length < 2) continue;
    const classified = group.every((item) => Boolean(item.duplicateResolution));
    findings.push({
      ruleId: 'duplicate-fingerprint',
      severity: classified ? 'warning' : 'error',
      capsuleIds: group.map((item) => item.capsuleId),
      semanticFingerprint: fingerprint,
      classified,
      recommendation: policy.thresholds.duplicateFingerprintAction || 'reuse-or-merge',
    });
  }

  for (const [family, group] of byFamily.entries()) {
    if (group.length >= Number(policy.thresholds.familyPromotionMinCount || 3)) {
      findings.push({
        ruleId: 'family-promotion-threshold',
        severity: 'warning',
        family,
        capsuleIds: group.map((item) => item.capsuleId),
        recommendation: 'consider-governed-family-or-shared-extraction',
      });
    }
  }

  for (const capsule of state.capsules) {
    const manifest = capsule.manifest;
    const behavior = runCapsuleBehaviorTemplateCheck(capsule.capsuleDir, manifest);
    if (!behavior.ok) {
      findings.push({
        ruleId: 'candidate-without-behavior-tests',
        severity: 'error',
        capsuleId: manifest.capsuleId,
        symbolName: manifest.symbolName,
        missingCaseSets: (manifest.requiredCaseSets || []).filter((kind) => !fs.existsSync(path.join(capsule.testsDir, `${kind}.cases.json`))),
      });
    }
    if (!anchorsById.has(manifest.anchorId)) {
      findings.push({
        ruleId: 'orphan-capsule',
        severity: 'error',
        capsuleId: manifest.capsuleId,
        symbolName: manifest.symbolName,
        anchorId: manifest.anchorId,
      });
    }
    const usage = summarizeUsageForDemand(manifest);
    const sharedPolicy = policy.promotionPolicy.governedToShared || {};
    const minUsageRefs = Number(sharedPolicy.minUsageRefs || 2);
    const minDistinctFiles = Number(sharedPolicy.minDistinctFiles || 2);
    const minDistinctKinds = Number(sharedPolicy.minDistinctKinds || 2);
    const crossWorkflowKinds = new Set(dedupeStrings(sharedPolicy.crossWorkflowKinds || []));
    const hasCrossWorkflow = usage.kinds.some((kind) => crossWorkflowKinds.has(kind));
    const meetsThresholds = usage.totalRefs >= minUsageRefs
      && usage.distinctFiles >= minDistinctFiles
      && usage.distinctKinds >= minDistinctKinds;
    const sharedEligible = meetsThresholds
      && (!sharedPolicy.requireCrossWorkflowEvidence || hasCrossWorkflow);
    if (sharedEligible) {
      findings.push({
        ruleId: 'high-fan-in-shared-suggestion',
        severity: 'warning',
        capsuleId: manifest.capsuleId,
        usageRefs: usage.refs,
        usageRefStats: {
          totalRefs: usage.totalRefs,
          distinctFiles: usage.distinctFiles,
          distinctKinds: usage.distinctKinds,
          externalRefs: usage.externalRefs,
          kinds: usage.kinds,
          hasCrossWorkflow,
        },
      });
    } else {
      findings.push({
        ruleId: 'single-use-stay-local',
        severity: 'info',
        capsuleId: manifest.capsuleId,
        usageRefs: usage.refs,
        usageRefStats: {
          totalRefs: usage.totalRefs,
          distinctFiles: usage.distinctFiles,
          distinctKinds: usage.distinctKinds,
          externalRefs: usage.externalRefs,
          kinds: usage.kinds,
          hasCrossWorkflow,
        },
      });
    }
  }

  for (const [sourceFile, group] of bySourceFile.entries()) {
    const hasAnchor = state.anchors.some((item) => item.manifest.source?.file === sourceFile);
    if (!hasAnchor) {
      findings.push({
        ruleId: 'large-module-anchor-missing',
        severity: 'error',
        sourceFile,
        capsuleIds: group.map((item) => item.capsuleId),
      });
    }
  }

  for (const sealed of manifests.filter((item) => item.splitPolicy === 'sealed')) {
    const sameFile = manifests.filter((item) => item.source?.file === sealed.source?.file && item.capsuleId !== sealed.capsuleId);
    for (const other of sameFile) {
      const sealedRange = sealed.source?.sourceRange || {};
      const otherRange = other.source?.sourceRange || {};
      const contained = Number.isInteger(sealedRange.startLine)
        && Number.isInteger(sealedRange.endLine)
        && Number.isInteger(otherRange.startLine)
        && Number.isInteger(otherRange.endLine)
        && otherRange.startLine >= sealedRange.startLine
        && otherRange.endLine <= sealedRange.endLine;
      if (contained) {
        findings.push({
          ruleId: 'sealed-split-attempt',
          severity: 'error',
          sealedCapsuleId: sealed.capsuleId,
          nestedCapsuleId: other.capsuleId,
        });
      }
    }
  }

  const blockingRuleIds = new Set([
    'candidate-without-behavior-tests',
    'sealed-split-attempt',
    'orphan-capsule',
    'duplicate-fingerprint',
    'large-module-anchor-missing',
  ]);
  const blockingFindings = findings.filter((item) => item.severity === 'error' && blockingRuleIds.has(item.ruleId));
  return {
    schemaId: 'atm.atomizeDemandPoliceReport',
    specVersion: '0.1.0',
    generatedAt: new Date().toISOString(),
    workbenchRoot: sourceRef(workbenchRoot),
    passed: blockingFindings.length === 0,
    blockingCount: blockingFindings.length,
    summary: {
      capsules: manifests.length,
      anchors: state.anchors.length,
      duplicateGroups: findings.filter((item) => item.ruleId === 'duplicate-fingerprint').length,
      familyPromotionGroups: findings.filter((item) => item.ruleId === 'family-promotion-threshold').length,
      sharedSuggestions: findings.filter((item) => item.ruleId === 'high-fan-in-shared-suggestion').length,
    },
    findings,
  };
}

function runScan(args) {
  const files = getInputFiles(args);
  const { policy, defaultPolicy, projectPolicy, policyPaths, hookPath } = loadPolicyStack(args);
  const registryPath = resolveRegistryPath(args);
  const registry = readJson(registryPath, {});
  const existingCapsules = loadExistingCapsuleCatalog(args.workbenchRoot);
  const anchorsByFile = new Map(files.map((filePath) => [path.resolve(filePath), buildAnchorDescriptor(filePath, policy)]));
  const candidates = [];
  for (const filePath of files) {
    const anchor = anchorsByFile.get(path.resolve(filePath));
    for (const fn of extractFunctions(filePath)) {
      candidates.push(buildCandidate(fn, {
        policy,
        defaultPolicy,
        projectPolicy,
        hookPath,
        existingCapsules,
        registry,
        anchor,
      }));
    }
  }
  const usageCollection = attachUsageRefsToCandidates(args, candidates, policy);
  candidates.sort((a, b) => b.riskScore - a.riskScore || a.file.localeCompare(b.file) || a.sourceRange.startLine - b.sourceRange.startLine);
  const demandPolice = findDuplicateHints(candidates, policy);
  const anchors = [...anchorsByFile.values()].map((anchor) => ({
    anchorId: anchor.anchorId,
    moduleSlug: anchor.moduleSlug,
    file: anchor.file,
    semanticFingerprint: anchor.semanticFingerprint,
    childCount: candidates.filter((item) => item.anchorId === anchor.anchorId).length,
  })).sort((a, b) => a.file.localeCompare(b.file));
  const report = {
    schemaId: 'atm.atomizeCandidateReport',
    specVersion: '0.2.0',
    generatedAt: new Date().toISOString(),
    mode: args.changed ? 'changed' : 'explicit',
    policyPaths,
    thresholds: policy.thresholds,
    files: files.map(rel),
    anchorPolicy: policy.anchorPolicy,
    candidateCount: candidates.length,
    anchors,
    usageReferenceCollection: {
      filesScanned: usageCollection.filesScanned,
      fileCount: usageCollection.filesScanned.length,
      usageRefFile: args.usageRefFile ? sourceRef(args.usageRefFile) : null,
    },
    candidates,
    demandPolice,
  };
  writeJson(args.report, report);
  return report;
}

function runScaffold(args) {
  const reportPath = args.candidateReport || args.report;
  const report = readJson(reportPath);
  const { policy } = loadPolicyStack(args);
  const created = [];
  const createdAnchors = [];

  for (const anchorInfo of report.anchors || []) {
    const anchorDir = path.join(args.workbenchRoot, 'anchors', anchorInfo.moduleSlug);
    const manifestPath = path.join(anchorDir, 'anchor.manifest.json');
    const testPath = path.join(anchorDir, 'anchor.test.mjs');
    const anchorCandidates = (report.candidates || []).filter((item) => item.anchorId === anchorInfo.anchorId);
    const descriptor = {
      anchorId: anchorInfo.anchorId,
      moduleSlug: anchorInfo.moduleSlug,
      file: anchorInfo.file,
      semanticFingerprint: anchorInfo.semanticFingerprint,
      lineCount: readText(path.resolve(ROOT, anchorInfo.file)).split(/\r?\n/).length,
    };
    const manifest = buildAnchorManifest(descriptor, anchorCandidates, policy);
    writeJson(manifestPath, manifest);
    writeText(testPath, buildAnchorTest('anchor.manifest.json'));
    createdAnchors.push({
      anchorId: manifest.anchorId,
      anchorDir,
      manifestPath,
      testPath,
      manifest,
    });
  }

  for (const candidate of report.candidates || []) {
    const capsuleDir = path.join(args.workbenchRoot, 'capsules', slug(candidate.symbolName));
    const manifestPath = path.join(capsuleDir, 'capsule.manifest.json');
    const testPath = path.join(capsuleDir, 'capsule.test.mjs');
    const behaviorTestPath = path.join(capsuleDir, 'capsule.behavior.test.mjs');
    const manifest = buildCapsuleManifest(candidate);
    writeJson(manifestPath, manifest);
    writeText(testPath, buildCapsuleTest('capsule.manifest.json'));
    let caseFiles = [];
    let behaviorTestWritten = false;
    if (manifest.requiredCaseSets.length > 0) {
      writeText(behaviorTestPath, buildBehaviorTest('capsule.manifest.json'));
      caseFiles = ensureCaseFiles(capsuleDir, manifest);
      behaviorTestWritten = true;
    }
    created.push({
      symbolName: candidate.symbolName,
      capsuleDir: rel(capsuleDir),
      manifestPath: rel(manifestPath),
      testPath: rel(testPath),
      behaviorTestPath: behaviorTestWritten ? rel(behaviorTestPath) : null,
      caseFiles,
    });
  }

  const registryPath = resolveRegistryPath(args);
  syncAnchorsToRegistry(registryPath, createdAnchors);

  const index = buildCapsuleIndexFromState(args.workbenchRoot, reportPath);
  const indexPath = path.join(args.workbenchRoot, 'capsules', 'index.json');
  const readmePath = path.join(args.workbenchRoot, 'capsules', 'README.md');
  writeJson(indexPath, index);
  writeText(readmePath, buildCapsuleReadme(index));

  return {
    schemaId: 'atm.atomizeScaffoldReport',
    specVersion: '0.2.0',
    generatedAt: new Date().toISOString(),
    candidateReport: rel(reportPath),
    indexPath: rel(indexPath),
    readmePath: rel(readmePath),
    registryPath: rel(registryPath),
    summary: index.summary,
    createdAnchors: createdAnchors.map((item) => ({
      anchorId: item.anchorId,
      manifestPath: rel(item.manifestPath),
      testPath: rel(item.testPath),
    })),
    created,
  };
}

function runValidate(args) {
  const { policy } = loadPolicyStack(args);
  const state = collectWorkbenchState(args.workbenchRoot);
  const anchorIds = new Map();
  const anchorResults = [];
  for (const anchor of state.anchors) {
    anchorResults.push({
      anchorId: anchor.manifest.anchorId,
      testPath: rel(anchor.testPath),
      ...runAnchorCheck(anchor.anchorDir, anchor.manifest, anchorIds),
    });
    anchorIds.set(anchor.manifest.anchorId, anchor.manifest.source?.file);
  }

  const capsuleResults = [];
  const behaviorResults = [];
  for (const capsule of state.capsules) {
    capsuleResults.push({
      capsuleId: capsule.manifest.capsuleId,
      testPath: rel(capsule.testPath),
      ...runCapsuleMetadataCheck(capsule.capsuleDir, capsule.manifest, policy),
    });
    behaviorResults.push({
      capsuleId: capsule.manifest.capsuleId,
      testPath: fs.existsSync(capsule.behaviorTestPath) ? rel(capsule.behaviorTestPath) : null,
      ...runCapsuleBehaviorTemplateCheck(capsule.capsuleDir, capsule.manifest),
    });
  }

  const demandPolice = evaluateDemandPolice(args.workbenchRoot, policy);
  const failures = [
    ...capsuleResults.filter((item) => !item.ok),
    ...behaviorResults.filter((item) => !item.ok),
    ...anchorResults.filter((item) => !item.ok),
  ];
  const report = {
    schemaId: 'atm.atomizeValidationReport',
    specVersion: '0.2.0',
    generatedAt: new Date().toISOString(),
    capsuleRoot: rel(state.capsuleRoot),
    anchorRoot: rel(state.anchorRoot),
    passed: failures.length === 0 && demandPolice.passed,
    total: state.capsules.length + state.anchors.length,
    failed: failures.length + demandPolice.blockingCount,
    summary: summarizeState(state.capsules.map((item) => item.manifest), state.anchors.map((item) => item.manifest)),
    capsuleResults,
    behaviorResults,
    anchorResults,
    demandPolice,
  };
  return report;
}

function runDemandPolice(args) {
  const { policy } = loadPolicyStack(args);
  return evaluateDemandPolice(args.workbenchRoot, policy);
}

function findCapsuleById(workbenchRoot, capsuleId) {
  const state = collectWorkbenchState(workbenchRoot);
  const match = state.capsules.find((item) => item.manifest.capsuleId === capsuleId);
  if (!match) {
    throw new Error(`capsule not found: ${capsuleId}`);
  }
  return { state, capsule: match };
}

function runPromote(args) {
  if (!args.capsuleId) {
    throw new Error('promote requires --capsule <capsule-id>');
  }
  if (!['governed-atom', 'shared-atom'].includes(args.targetTier)) {
    throw new Error('promote requires --to governed-atom|shared-atom');
  }
  const { policy } = loadPolicyStack(args);
  const validation = runValidate({ ...args, strict: true });
  if (!validation.passed) {
    throw new Error('promote requires validate --strict to pass first');
  }
  const demandPolice = runDemandPolice(args);
  const { capsule } = findCapsuleById(args.workbenchRoot, args.capsuleId);
  const manifest = structuredCloneCompat(capsule.manifest);
  const currentTier = manifest.promotion?.currentTier || manifest.tier;

  if (args.targetTier === 'governed-atom') {
    if (manifest.tier !== 'local-capsule-candidate') {
      throw new Error('only local-capsule-candidate can promote to governed-atom');
    }
  }
  if (args.targetTier === 'shared-atom') {
    if (currentTier !== 'governed-atom') {
      throw new Error('shared-atom promotion requires current governed-atom tier');
    }
    const suggestion = demandPolice.findings.find((item) => item.ruleId === 'high-fan-in-shared-suggestion' && item.capsuleId === manifest.capsuleId);
    if (policy.promotionPolicy.governedToShared.requireSharedSuggestion && !suggestion) {
      throw new Error('shared-atom promotion requires demand-police shared suggestion');
    }
  }

  manifest.promotion = manifest.promotion || {};
  manifest.promotion.currentTier = args.targetTier;
  manifest.promotion.sourceIdentityStable = true;
  manifest.promotion.semanticFingerprint = manifest.source.semanticFingerprint;
  manifest.promotion.history = Array.isArray(manifest.promotion.history) ? manifest.promotion.history : [];
  manifest.promotion.history.push({
    promotedAt: new Date().toISOString(),
    from: currentTier,
    to: args.targetTier,
    reason: args.targetTier === 'governed-atom' ? 'candidate-promotion' : 'shared-promotion',
  });
  writeJson(capsule.manifestPath, manifest);

  const registryPath = resolveRegistryPath(args);
  syncPromotedCapsuleToRegistry(registryPath, manifest, capsule.capsuleDir);
  const index = buildCapsuleIndexFromState(args.workbenchRoot, DEFAULT_REPORT);
  writeJson(path.join(args.workbenchRoot, 'capsules', 'index.json'), index);
  writeText(path.join(args.workbenchRoot, 'capsules', 'README.md'), buildCapsuleReadme(index));

  return {
    schemaId: 'atm.atomizePromotionReport',
    specVersion: '0.1.0',
    generatedAt: new Date().toISOString(),
    capsuleId: manifest.capsuleId,
    symbolName: manifest.symbolName,
    previousTier: currentTier,
    promotedTo: args.targetTier,
    registryPath: rel(registryPath),
    manifestPath: rel(capsule.manifestPath),
    semanticFingerprint: manifest.source.semanticFingerprint,
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || args.command === 'help') {
    printHelp();
    return;
  }
  let report;
  if (args.command === 'scan') {
    report = runScan(args);
  } else if (args.command === 'scaffold') {
    report = runScaffold(args);
    writeJson(DEFAULT_SCAFFOLD_REPORT, report);
  } else if (args.command === 'validate') {
    report = runValidate(args);
    writeJson(DEFAULT_VALIDATE_REPORT, report);
  } else if (args.command === 'demand-police') {
    report = runDemandPolice(args);
    writeJson(DEFAULT_DEMAND_POLICE_REPORT, report);
  } else if (args.command === 'promote') {
    report = runPromote(args);
    writeJson(DEFAULT_PROMOTION_REPORT, report);
  } else {
    throw new Error(`unknown command: ${args.command}`);
  }
  if (args.json || args.command !== 'scan') {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    console.log(`[atm-atomize] ${args.command} candidates=${report.candidateCount || 0} report=${rel(args.report)}`);
  }
  if (args.strict && report.passed === false) {
    process.exit(1);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`[atm-atomize] ${error.stack || error.message || error}`);
    process.exit(1);
  }
}

module.exports = {
  parseArgs,
  runScan,
  runScaffold,
  runValidate,
  runDemandPolice,
  runPromote,
  extractFunctions,
  buildCandidate,
  buildCapsuleManifest,
  buildAnchorManifest,
  buildAnchorDescriptor,
  loadPolicyStack,
  evaluateDemandPolice,
};
