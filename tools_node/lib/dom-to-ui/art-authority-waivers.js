// doc_id: doc_other_0009 - Art-authority waiver contract for visual diff gates.
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_POLICY = {
  maxWaiverViewportRatio: 0.08,
  maxTotalWaiverViewportRatio: 0.15,
  allowedScopes: ['chrome', 'background', 'ornament', 'approved-illustration', 'runtime-art', 'surface'],
  allowedAssetKinds: ['sprite-frame', 'button-skin', 'font', 'texture', 'material'],
};

const FORBIDDEN_SCOPES = new Set(['text', 'label', 'number', 'data', 'i18n', 'interaction', 'mount-failure', 'runtime-bug']);
const FORBIDDEN_CHANNELS = new Set(['logic', 'data', 'interaction', 'mount', 'binding', 'i18n']);
const ALLOWED_COORDINATE_SPACES = new Set(['editor-screenshot', 'source-screenshot', 'normalized-viewport']);

function readArtAuthorityWaivers(filePath) {
  if (!filePath) return null;
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
}

function findArtAuthorityWaiverPath(args) {
  args = args || {};
  if (args.explicitPath) return fs.existsSync(path.resolve(args.explicitPath)) ? path.resolve(args.explicitPath) : path.resolve(args.explicitPath);
  const screenId = args.screenId;
  if (!screenId) return null;
  const repoRoot = args.repoRoot || path.resolve(__dirname, '..', '..', '..');
  const candidates = [];
  if (args.outputDir) candidates.push(path.join(args.outputDir, `${screenId}.art-authority-waivers.json`));
  if (args.sourceDir) candidates.push(path.join(args.sourceDir, `${screenId}.art-authority-waivers.json`));
  candidates.push(path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'screens', `${screenId}.art-authority-waivers.json`));
  candidates.push(path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'layouts', `${screenId}.art-authority-waivers.json`));
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(path.resolve(candidate))) return path.resolve(candidate);
  }
  return null;
}

function validateArtAuthorityWaivers(report, opts) {
  opts = opts || {};
  const errors = [];
  const warnings = [];
  if (!report || typeof report !== 'object') {
    return invalid(['report must be an object']);
  }
  if (report.schemaVersion == null) errors.push('schemaVersion is required');
  if (report.schemaVersion != null && !/^1\./.test(String(report.schemaVersion))) {
    errors.push(`unsupported schemaVersion: ${report.schemaVersion}`);
  }
  if (opts.screenId && report.screenId && report.screenId !== opts.screenId) {
    errors.push(`screenId mismatch: expected ${opts.screenId}, got ${report.screenId}`);
  }
  const coordinateSpace = report.coordinateSpace || 'normalized-viewport';
  if (!ALLOWED_COORDINATE_SPACES.has(coordinateSpace)) {
    errors.push(`coordinateSpace ${coordinateSpace} is not allowed`);
  }

  const viewport = normalizeViewport(report.viewport, opts);
  if (!viewport) errors.push('viewport.width and viewport.height are required');
  const policy = normalizePolicy(report.policy);
  const waivers = Array.isArray(report.waivers) ? report.waivers : [];
  if (!Array.isArray(report.waivers)) errors.push('waivers must be an array');

  const normalized = [];
  let totalRectPixels = 0;
  for (let i = 0; i < waivers.length; i += 1) {
    const item = normalizeWaiver(waivers[i], i);
    normalized.push(item);
    validateWaiver(item, policy, viewport, opts, errors, warnings);
    if (item.rect) totalRectPixels += Math.max(0, item.rect.w) * Math.max(0, item.rect.h);
  }
  const viewportPixels = viewport ? viewport.width * viewport.height : 0;
  const totalCoverageRatio = viewportPixels > 0 ? totalRectPixels / viewportPixels : 0;
  if (policy.maxTotalWaiverViewportRatio != null && totalCoverageRatio > policy.maxTotalWaiverViewportRatio) {
    errors.push(`total waiver coverage ${round(totalCoverageRatio)} exceeds policy.maxTotalWaiverViewportRatio ${policy.maxTotalWaiverViewportRatio}`);
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    screenId: report.screenId || null,
    schemaVersion: report.schemaVersion || null,
    coordinateSpace,
    viewport,
    policy,
    waivers: normalized,
    waiverCount: normalized.length,
    totalRectPixels,
    totalCoverageRatio,
  };

  function invalid(messages) {
    return { ok: false, errors: messages, warnings: [], waivers: [], waiverCount: 0, totalRectPixels: 0, totalCoverageRatio: 0 };
  }
}

function normalizePolicy(policy) {
  const merged = Object.assign({}, DEFAULT_POLICY, policy || {});
  merged.allowedScopes = Array.isArray(merged.allowedScopes) && merged.allowedScopes.length ? merged.allowedScopes : DEFAULT_POLICY.allowedScopes;
  merged.allowedAssetKinds = Array.isArray(merged.allowedAssetKinds) && merged.allowedAssetKinds.length ? merged.allowedAssetKinds : DEFAULT_POLICY.allowedAssetKinds;
  if (typeof merged.maxWaiverViewportRatio !== 'number') merged.maxWaiverViewportRatio = DEFAULT_POLICY.maxWaiverViewportRatio;
  if (typeof merged.maxTotalWaiverViewportRatio !== 'number') merged.maxTotalWaiverViewportRatio = DEFAULT_POLICY.maxTotalWaiverViewportRatio;
  return merged;
}

function normalizeViewport(viewport, opts) {
  const width = Number((viewport && viewport.width) || opts.targetWidth || opts.width);
  const height = Number((viewport && viewport.height) || opts.targetHeight || opts.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return {
    width,
    height,
    dpr: Number((viewport && viewport.dpr) || 1),
  };
}

function normalizeWaiver(raw, index) {
  raw = raw || {};
  const authority = raw.authority || {};
  const scoreImpact = raw.scoreImpact || {};
  return {
    raw,
    index,
    id: raw.id || `waiver-${index + 1}`,
    zoneId: raw.zoneId || raw.id || `waiver-${index + 1}`,
    rect: normalizeRect(raw.rect || raw.rectInCanvas),
    scope: raw.scope || 'runtime-art',
    assetRefs: normalizeAssetRefs(raw.assetRefs || raw.assets || raw.assetRef || raw),
    authority: {
      approvedBy: authority.approvedBy || raw.approvedBy || null,
      approvedAt: authority.approvedAt || raw.approvedAt || null,
      source: authority.source || raw.authoritySource || null,
      decisionId: authority.decisionId || raw.decisionId || null,
    },
    reason: raw.reason || null,
    expectation: raw.expectation || {
      sourceHtmlExpectation: raw.sourceHtmlExpectation || null,
      runtimeExpectation: raw.runtimeExpectation || null,
    },
    scoreImpact: {
      mayAffectScore: scoreImpact.mayAffectScore !== false && raw.mayAffectScore !== false,
      channel: scoreImpact.channel || raw.channel || 'visual',
      notes: scoreImpact.notes || raw.notes || null,
    },
    flags: {
      coversText: raw.coversText === true,
      coversData: raw.coversData === true,
      coversInteraction: raw.coversInteraction === true,
      coversMountFailure: raw.coversMountFailure === true,
    },
  };
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== 'object') return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const w = Number(rect.w != null ? rect.w : rect.width);
  const h = Number(rect.h != null ? rect.h : rect.height);
  if (![x, y, w, h].every(Number.isFinite)) return null;
  return { x, y, w, h, unit: rect.unit || 'px' };
}

function normalizeAssetRefs(value) {
  const refs = Array.isArray(value) ? value : (value && Array.isArray(value.assetRefs) ? value.assetRefs : null);
  if (refs) return refs.map(normalizeAssetRef).filter(Boolean);
  const kind = value && (value.assetKind || value.kind);
  const assetPath = value && (value.assetPath || value.path);
  if (!kind && !assetPath) return [];
  return [normalizeAssetRef({ kind, assetKind: kind, path: assetPath, assetPath })].filter(Boolean);
}

function normalizeAssetRef(ref) {
  if (!ref || typeof ref !== 'object') return null;
  const kind = ref.kind || ref.assetKind || null;
  const paths = [];
  for (const key of ['path', 'assetPath', 'normal', 'pressed', 'disabled', 'selected']) {
    if (typeof ref[key] === 'string' && ref[key]) paths.push(ref[key]);
  }
  if (Array.isArray(ref.paths)) {
    for (const p of ref.paths) if (typeof p === 'string' && p) paths.push(p);
  }
  return {
    kind,
    path: paths[0] || null,
    paths: [...new Set(paths)],
    role: ref.role || null,
  };
}

function validateWaiver(item, policy, viewport, opts, errors, warnings) {
  const prefix = `waivers[${item.index}] ${item.id}`;
  if (!item.id) errors.push(`${prefix}: id is required`);
  if (!item.zoneId) errors.push(`${prefix}: zoneId is required`);
  if (!item.rect || item.rect.w <= 0 || item.rect.h <= 0) errors.push(`${prefix}: rect with positive width/height is required`);
  if (item.rect && viewport) {
    const coverage = (item.rect.w * item.rect.h) / (viewport.width * viewport.height);
    if (coverage > policy.maxWaiverViewportRatio) {
      errors.push(`${prefix}: rect coverage ${round(coverage)} exceeds policy.maxWaiverViewportRatio ${policy.maxWaiverViewportRatio}`);
    }
    if (item.rect.x < 0 || item.rect.y < 0 || item.rect.x + item.rect.w > viewport.width || item.rect.y + item.rect.h > viewport.height) {
      errors.push(`${prefix}: rect is outside viewport`);
    }
  }
  if (!policy.allowedScopes.includes(item.scope) || FORBIDDEN_SCOPES.has(item.scope)) {
    errors.push(`${prefix}: scope ${item.scope} is not allowed`);
  }
  if (!item.assetRefs.length) errors.push(`${prefix}: assetRefs are required`);
  for (const ref of item.assetRefs) {
    if (!ref.kind || !policy.allowedAssetKinds.includes(ref.kind)) {
      errors.push(`${prefix}: asset kind ${ref.kind || '<missing>'} is not allowed`);
    }
    if (!ref.paths.length) {
      errors.push(`${prefix}: asset path is required`);
      continue;
    }
    if (!ref.paths.some(p => assetRefExists(p, opts.repoRoot))) {
      errors.push(`${prefix}: asset path does not exist: ${ref.paths.join(',')}`);
    }
  }
  if (!item.authority.approvedBy) errors.push(`${prefix}: authority.approvedBy is required`);
  if (!item.authority.approvedAt) errors.push(`${prefix}: authority.approvedAt is required`);
  if (!item.reason) errors.push(`${prefix}: reason is required`);
  if (!item.expectation || !item.expectation.sourceHtmlExpectation || !item.expectation.runtimeExpectation) {
    errors.push(`${prefix}: expectation.sourceHtmlExpectation and expectation.runtimeExpectation are required`);
  }
  if (FORBIDDEN_CHANNELS.has(item.scoreImpact.channel)) {
    errors.push(`${prefix}: scoreImpact.channel ${item.scoreImpact.channel} cannot be waived`);
  }
  if (item.flags.coversText || item.flags.coversData || item.flags.coversInteraction || item.flags.coversMountFailure) {
    errors.push(`${prefix}: waiver flags indicate forbidden text/data/interaction/mount coverage`);
  }
  if (item.scoreImpact.mayAffectScore === false) warnings.push(`${prefix}: mayAffectScore=false; rect will not adjust visual score`);
}

function artAuthorityRectsForPixelDiff(validation, opts) {
  opts = opts || {};
  if (!validation || validation.ok !== true) return [];
  const targetWidth = Number(opts.targetWidth || opts.width || (validation.viewport && validation.viewport.width));
  const targetHeight = Number(opts.targetHeight || opts.height || (validation.viewport && validation.viewport.height));
  const sourceWidth = validation.viewport && validation.viewport.width;
  const sourceHeight = validation.viewport && validation.viewport.height;
  if (!targetWidth || !targetHeight || !sourceWidth || !sourceHeight) return [];
  const sx = targetWidth / sourceWidth;
  const sy = targetHeight / sourceHeight;
  return validation.waivers
    .filter(w => w.rect && w.scoreImpact.mayAffectScore !== false)
    .map(w => ({
      x: Math.round(w.rect.x * sx),
      y: Math.round(w.rect.y * sy),
      w: Math.max(1, Math.round(w.rect.w * sx)),
      h: Math.max(1, Math.round(w.rect.h * sy)),
      waiverId: w.id,
      zoneId: w.zoneId,
    }));
}

function buildArtAuthorityScoreReport(args) {
  args = args || {};
  const rawDiff = args.rawDiff || {};
  const adjustedDiff = args.adjustedDiff || rawDiff;
  const validation = args.validation || null;
  const threshold = typeof args.threshold === 'number' ? args.threshold : 0.95;
  const rawScore = numberOr(rawDiff.adjustedCoverage, rawDiff.coveragePercent, 1);
  const adjustedScore = numberOr(adjustedDiff.adjustedCoverage, adjustedDiff.coveragePercent, rawScore);
  const passRaw = rawScore >= threshold;
  const hasApprovedDelta = !!(validation && validation.ok && validation.waiverCount > 0);
  const passAdjusted = hasApprovedDelta && adjustedScore >= threshold;
  const denominator = (adjustedDiff.totalPixels || 0) + (adjustedDiff.waiverPixels || 0);
  const waiverCoverageRatio = denominator > 0 ? (adjustedDiff.waiverPixels || 0) / denominator : 0;
  return {
    rawScore,
    adjustedScore,
    threshold,
    verdict: passRaw ? 'pass' : (passAdjusted ? 'pass-with-approved-art-delta' : 'fail'),
    passMode: passRaw ? 'raw-pass' : (passAdjusted ? 'pass-with-approved-art-delta' : 'fail'),
    waiverCoverageRatio,
    waiverPixels: adjustedDiff.waiverPixels || 0,
    artDeltaScore: Math.max(0, adjustedScore - rawScore),
    converterResidualScore: numberOr(adjustedDiff.coveragePercent, adjustedScore),
    approvedWaiverCount: hasApprovedDelta ? validation.waiverCount : 0,
    unwaivedDiffTopList: adjustedDiff.unwaivedDiffTopList || [],
  };
}

function assetRefExists(assetPath, repoRoot) {
  if (!assetPath) return false;
  if (/^(data|https?|blob):/i.test(assetPath)) return true;
  const root = repoRoot || path.resolve(__dirname, '..', '..', '..');
  let clean = String(assetPath).split('?')[0].split('#')[0].replace(/\\/g, '/').replace(/\/spriteFrame$/, '');
  if (clean.startsWith('db://assets/')) clean = clean.slice('db://assets/'.length);
  if (path.isAbsolute(clean) && fs.existsSync(clean)) return true;
  const candidates = [];
  candidates.push(path.resolve(root, clean.replace(/^\//, '')));
  if (clean.startsWith('assets/')) candidates.push(path.resolve(root, clean));
  if (clean.startsWith('resources/')) candidates.push(path.resolve(root, 'assets', clean));
  candidates.push(path.resolve(root, 'assets', 'resources', clean.replace(/^\//, '')));
  for (const base of candidates) {
    if (fs.existsSync(base)) return true;
    if (['.png', '.jpg', '.jpeg', '.webp', '.json'].some(ext => fs.existsSync(base + ext))) return true;
  }
  return false;
}

function numberOr() {
  for (const value of arguments) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function round(value) {
  return Math.round(value * 10000) / 10000;
}

module.exports = {
  DEFAULT_POLICY,
  readArtAuthorityWaivers,
  findArtAuthorityWaiverPath,
  validateArtAuthorityWaivers,
  artAuthorityRectsForPixelDiff,
  buildArtAuthorityScoreReport,
  assetRefExists,
};