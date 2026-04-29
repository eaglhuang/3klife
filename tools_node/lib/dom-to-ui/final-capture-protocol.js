// doc_id: doc_other_0009 - Final capture protocol for HTML source vs Cocos Editor gates.
'use strict';

const fs = require('fs');
const path = require('path');

const DEFAULT_CAPTURE_PROTOCOL = {
  schemaVersion: '1.0.0',
  viewport: { width: 1920, height: 1080, dpr: 1 },
  safeArea: null,
  sourceCrop: null,
  editorCrop: null,
  settleMs: 250,
  threshold: 0.95,
  tolerance: 12,
  artAuthorityWaivers: null,
};

function findFinalCaptureProtocolPath(args) {
  args = args || {};
  if (args.explicitPath) return path.resolve(args.explicitPath);
  const screenId = args.screenId;
  if (!screenId) return null;
  const repoRoot = args.repoRoot || path.resolve(__dirname, '..', '..', '..');
  const candidates = [];
  if (args.outputDir) candidates.push(path.join(args.outputDir, `${screenId}.final-capture-protocol.json`));
  if (args.sourceDir) candidates.push(path.join(args.sourceDir, `${screenId}.final-capture-protocol.json`));
  candidates.push(path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'screens', `${screenId}.final-capture-protocol.json`));
  candidates.push(path.join(repoRoot, 'assets', 'resources', 'ui-spec', 'layouts', `${screenId}.final-capture-protocol.json`));
  for (const candidate of candidates) {
    if (candidate && fs.existsSync(path.resolve(candidate))) return path.resolve(candidate);
  }
  return null;
}

function readFinalCaptureProtocol(filePath) {
  if (!filePath) return null;
  const full = path.resolve(filePath);
  if (!fs.existsSync(full)) return null;
  return JSON.parse(fs.readFileSync(full, 'utf8').replace(/^\uFEFF/, ''));
}

function normalizeFinalCaptureProtocol(raw, opts) {
  opts = opts || {};
  raw = raw || {};
  const errors = [];
  const warnings = [];
  if (raw.schemaVersion != null && !/^1\./.test(String(raw.schemaVersion))) {
    errors.push(`unsupported schemaVersion: ${raw.schemaVersion}`);
  }
  if (opts.screenId && raw.screenId && raw.screenId !== opts.screenId) {
    errors.push(`screenId mismatch: expected ${opts.screenId}, got ${raw.screenId}`);
  }
  const viewport = normalizeViewport(raw.viewport || raw, DEFAULT_CAPTURE_PROTOCOL.viewport);
  if (!viewport) errors.push('viewport.width and viewport.height are required');
  const safeArea = raw.safeArea == null ? null : normalizeRect(raw.safeArea);
  const sourceCrop = raw.sourceCrop == null ? null : normalizeRect(raw.sourceCrop);
  const editorCrop = raw.editorCrop == null ? null : normalizeRect(raw.editorCrop);
  if (raw.safeArea != null && !safeArea) errors.push('safeArea must be {x,y,width,height}');
  if (raw.sourceCrop != null && !sourceCrop) errors.push('sourceCrop must be {x,y,width,height}');
  if (raw.editorCrop != null && !editorCrop) errors.push('editorCrop must be {x,y,width,height}');
  const settleMs = finiteOr(raw.settleMs, DEFAULT_CAPTURE_PROTOCOL.settleMs);
  const threshold = finiteOr(raw.threshold, DEFAULT_CAPTURE_PROTOCOL.threshold);
  const tolerance = finiteOr(raw.tolerance, DEFAULT_CAPTURE_PROTOCOL.tolerance);
  if (settleMs < 0) errors.push('settleMs must be >= 0');
  if (threshold <= 0 || threshold > 1) errors.push('threshold must be in (0,1]');
  if (tolerance < 0) errors.push('tolerance must be >= 0');
  if (viewport && safeArea && !rectInsideViewport(safeArea, viewport)) warnings.push('safeArea is outside viewport');

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    schemaVersion: raw.schemaVersion || DEFAULT_CAPTURE_PROTOCOL.schemaVersion,
    screenId: raw.screenId || opts.screenId || null,
    sourcePackageId: raw.sourcePackageId || null,
    viewport,
    safeArea,
    sourceCrop,
    editorCrop,
    settleMs,
    threshold,
    tolerance,
    artAuthorityWaivers: raw.artAuthorityWaivers || null,
    notes: Array.isArray(raw.notes) ? raw.notes : [],
  };
}

function applyFinalCaptureProtocol(opts, protocol, provided) {
  if (!protocol || !protocol.ok) return opts;
  provided = provided || {};
  if (!provided.viewport && protocol.viewport) opts.viewport = `${protocol.viewport.width}x${protocol.viewport.height}`;
  if (!provided.editorCrop && protocol.editorCrop) opts.editorCrop = rectToCompare(protocol.editorCrop);
  if (!provided.sourceCrop && protocol.sourceCrop) opts.sourceCrop = rectToCompare(protocol.sourceCrop);
  if (!provided.settleMs) opts.settleMs = protocol.settleMs;
  if (!provided.threshold) opts.threshold = protocol.threshold;
  if (!provided.tolerance) opts.tolerance = protocol.tolerance;
  if (!provided.artAuthorityWaivers && protocol.artAuthorityWaivers) opts.artAuthorityWaivers = protocol.artAuthorityWaivers;
  return opts;
}

function protocolViewportForPuppeteer(protocol, fallbackViewport) {
  const viewport = (protocol && protocol.viewport) || fallbackViewport;
  if (!viewport) return fallbackViewport;
  return {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.dpr || 1,
  };
}

function normalizeViewport(value, fallback) {
  if (!value) return fallback || null;
  const width = Number(value.width);
  const height = Number(value.height);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  return { width, height, dpr: finiteOr(value.dpr, fallback && fallback.dpr || 1) };
}

function normalizeRect(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const width = Number(value.width != null ? value.width : value.w);
  const height = Number(value.height != null ? value.height : value.h);
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { x, y, width, height };
}

function rectToCompare(rect) {
  return rect ? { x: rect.x, y: rect.y, w: rect.width, h: rect.height } : null;
}

function rectInsideViewport(rect, viewport) {
  return rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width && rect.y + rect.height <= viewport.height;
}

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  DEFAULT_CAPTURE_PROTOCOL,
  findFinalCaptureProtocolPath,
  readFinalCaptureProtocol,
  normalizeFinalCaptureProtocol,
  applyFinalCaptureProtocol,
  protocolViewportForPuppeteer,
};