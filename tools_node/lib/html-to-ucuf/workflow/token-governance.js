'use strict';

const fs = require('fs');
const path = require('path');

function deriveTokenSuggestionPathFromLayout(layoutPath) {
  if (!layoutPath) return null;
  return path.resolve(layoutPath).replace(/\.json$/i, '.token-suggestions.json');
}

function normalizeColorValue(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const body = hexMatch[1];
    const normalized = body.length === 3
      ? body.split('').map((ch) => ch + ch).join('')
      : body;
    const hex = `#${normalized.toUpperCase()}`;
    return { key: hex.toLowerCase(), hex, raw };
  }
  const rgbMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    const toHex = (n) => Math.max(0, Math.min(255, parseInt(n, 10) || 0)).toString(16).padStart(2, '0').toUpperCase();
    const hex = `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
    return { key: hex.toLowerCase(), hex, raw };
  }
  return { key: raw.toLowerCase(), hex: null, raw };
}

function collectTokenSuggestionFiles(paths) {
  const files = [];
  const mainSuggestion = deriveTokenSuggestionPathFromLayout(paths.finalLayout);
  if (mainSuggestion && fs.existsSync(mainSuggestion)) files.push(mainSuggestion);

  if (paths.tabReplayDir && fs.existsSync(paths.tabReplayDir)) {
    for (const name of fs.readdirSync(paths.tabReplayDir)) {
      if (!/\.token-suggestions\.json$/i.test(name)) continue;
      const full = path.join(paths.tabReplayDir, name);
      if (fs.existsSync(full)) files.push(full);
    }
  }

  return [...new Set(files.map((file) => path.resolve(file)))];
}

function buildScreenLocalTokenPayload(screenId, suggestionFiles, helpers) {
  const colorMap = new Map();

  for (const file of suggestionFiles) {
    const json = helpers.readJsonIfExists(file);
    const list = json && Array.isArray(json.colorSuggestions) ? json.colorSuggestions : [];
    for (const item of list) {
      const normalized = normalizeColorValue(item && item.value);
      if (!normalized) continue;
      const current = colorMap.get(normalized.key) || {
        value: normalized.raw,
        normalized: normalized.key,
        hex: normalized.hex,
        occurrences: 0,
        nearestExisting: item && item.nearestExisting ? item.nearestExisting : null,
        sources: [],
      };
      current.occurrences += Number(item && item.occurrences) > 0 ? Number(item.occurrences) : 1;
      const relFile = helpers.rel(file);
      if (!current.sources.includes(relFile)) current.sources.push(relFile);
      if (!current.nearestExisting && item && item.nearestExisting) current.nearestExisting = item.nearestExisting;
      colorMap.set(normalized.key, current);
    }
  }

  const sorted = [...colorMap.values()].sort((a, b) => b.occurrences - a.occurrences || a.normalized.localeCompare(b.normalized));
  const safeScreenKey = String(screenId || 'screen').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'screen';
  const colors = {};
  const unresolvedColors = [];
  sorted.forEach((item, index) => {
    const token = `${safeScreenKey}_local_color_${String(index + 1).padStart(2, '0')}`;
    colors[token] = item.hex || item.value;
    unresolvedColors.push({
      token,
      value: item.value,
      normalized: item.normalized,
      hex: item.hex,
      occurrences: item.occurrences,
      nearestExisting: item.nearestExisting,
      sources: item.sources,
    });
  });

  return {
    schemaVersion: '1.0.0',
    screenId,
    generatedAt: new Date().toISOString(),
    _sourceAuthority: 'html-to-ucuf',
    policy: {
      mode: 'replace-all-per-run',
      source: 'token-suggestions sidecars',
      note: 'Always regenerate full screen-local tokens from current conversion to avoid stale residue.',
    },
    sourceSuggestionFiles: suggestionFiles.map((file) => helpers.rel(file)),
    stats: {
      unresolvedColorCount: unresolvedColors.length,
      tokenCount: Object.keys(colors).length,
    },
    colors,
    unresolvedColors,
  };
}

function buildLocalTokenDiff(previousPayload, nextPayload) {
  const previousSet = new Set(((previousPayload && previousPayload.unresolvedColors) || []).map((item) => String(item.normalized || '').toLowerCase()).filter(Boolean));
  const nextSet = new Set(((nextPayload && nextPayload.unresolvedColors) || []).map((item) => String(item.normalized || '').toLowerCase()).filter(Boolean));
  const added = [...nextSet].filter((key) => !previousSet.has(key)).sort();
  const removed = [...previousSet].filter((key) => !nextSet.has(key)).sort();
  const persisted = [...nextSet].filter((key) => previousSet.has(key)).sort();
  return {
    added,
    removed,
    persisted,
    addedCount: added.length,
    removedCount: removed.length,
    persistedCount: persisted.length,
    previousCount: previousSet.size,
    currentCount: nextSet.size,
  };
}

function buildLocalColorTokenLookup(payload) {
  const lookup = new Map();
  const list = Array.isArray(payload && payload.unresolvedColors) ? payload.unresolvedColors : [];
  for (const item of list) {
    if (!item || !item.token) continue;
    for (const value of [item.value, item.hex, item.normalized]) {
      const normalized = normalizeColorValue(value);
      if (normalized && normalized.key && !lookup.has(normalized.key)) {
        lookup.set(normalized.key, item.token);
      }
    }
  }
  return lookup;
}

function applyScreenLocalColorTokensToSkin(skinPath, localTokenPayload, helpers) {
  const skin = helpers.readJsonIfExists(skinPath);
  if (!skin || typeof skin !== 'object') return { applied: 0, path: null };

  const colorLookup = buildLocalColorTokenLookup(localTokenPayload);
  if (colorLookup.size === 0) return { applied: 0, path: helpers.rel(skinPath) };

  const colorKeys = new Set([
    'color',
    'borderColor',
    'outlineColor',
    'shadowColor',
    'strokeColor',
    'fillColor',
    'backgroundColor',
  ]);
  let applied = 0;

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const item of node) visit(item);
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      if (typeof value === 'string' && colorKeys.has(key)) {
        const normalized = normalizeColorValue(value);
        const token = normalized ? colorLookup.get(normalized.key) : null;
        if (token) {
          node[key] = token;
          applied += 1;
        }
        continue;
      }
      visit(value);
    }
  };

  visit(skin);
  if (applied > 0) helpers.writeJson(skinPath, skin);
  return { applied, path: helpers.rel(skinPath) };
}

function regenerateScreenLocalTokens(args) {
  const { paths, opts, helpers } = args;
  const runtimePaths = helpers.resolveCanonicalRuntimePaths(opts.screenId);
  const suggestionFiles = collectTokenSuggestionFiles(paths);
  const previous = helpers.readJsonIfExists(runtimePaths.screenLocalTokenPath);
  const payload = buildScreenLocalTokenPayload(opts.screenId, suggestionFiles, helpers);
  const diff = buildLocalTokenDiff(previous, payload);
  const skinTokenApply = applyScreenLocalColorTokensToSkin(paths.finalSkin, payload, helpers);

  const isUpdateModeWipe = opts && opts.updateMode
    && previous && previous._sourceAuthority === 'html-to-ucuf'
    && previous.stats && previous.stats.tokenCount > 0
    && payload.stats.tokenCount === 0;
  helpers.ensureDir(path.dirname(runtimePaths.screenLocalTokenPath));
  if (!isUpdateModeWipe) {
    helpers.writeJson(runtimePaths.screenLocalTokenPath, payload);
  }
  helpers.writeJson(paths.localTokenDiffReport, {
    schemaVersion: '1.0.0',
    screenId: opts.screenId,
    generatedAt: new Date().toISOString(),
    sourceSuggestionFiles: payload.sourceSuggestionFiles,
    policy: payload.policy,
    diff,
  });

  return {
    status: 'pass',
    mode: payload.policy.mode,
    sourceSuggestionFiles: payload.sourceSuggestionFiles,
    localTokenPath: helpers.rel(runtimePaths.screenLocalTokenPath),
    diffReportPath: helpers.rel(paths.localTokenDiffReport),
    unresolvedColorCount: payload.stats.unresolvedColorCount,
    tokenCount: payload.stats.tokenCount,
    preservedByUpdateModeGuard: isUpdateModeWipe || false,
    skinTokenApply,
    diff,
  };
}

module.exports = {
  regenerateScreenLocalTokens,
};
