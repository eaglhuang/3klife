// doc_id: doc_other_0009 — smart merge for --sync-existing (§4.3 / §36.3 syncDelta)
// merge-mode:
//   - preserve-human (default): existing value 永遠優先；新 fields 補上；衝突列為 manual-edit
//   - html-authoritative: HTML 結果覆寫 existing
//   - dry-run: 只計算 syncDelta，不寫
'use strict';

/**
 * @typedef {object} SyncResult
 * @property {object} layout merged layout
 * @property {object} skin merged skin
 * @property {object[]} fieldChanges  per-field change records for telemetry
 * @property {string[]} conflicts     unresolved conflict descriptions
 */

/**
 * Walk both layout trees keyed by node `name`. Returns merged layout per merge-mode.
 * @param {object} draftLayout
 * @param {object} existingLayout
 * @param {object} draftSkin
 * @param {object} existingSkin
 * @param {object} options
 * @param {string} options.mergeMode
 * @param {string} options.conflictPolicy 'warn' | 'fail'
 * @returns {SyncResult}
 */
function smartMerge(draftLayout, existingLayout, draftSkin, existingSkin, options) {
  const mergeMode = (options && options.mergeMode) || 'preserve-human';
  const fieldChanges = [];
  const conflicts = [];

  const layout = mergeNode(draftLayout, existingLayout, '', mergeMode, fieldChanges, conflicts);

  const skin = mergeSkin(
    draftSkin || { slots: {} },
    existingSkin || { slots: {} },
    mergeMode,
    fieldChanges,
    conflicts,
  );

  return { layout, skin, fieldChanges, conflicts };
}

function mergeNode(draftNode, existingNode, pathStr, mergeMode, fieldChanges, conflicts) {
  if (!draftNode && !existingNode) return null;
  if (!existingNode) {
    if (draftNode) fieldChanges.push({ path: pathStr || '<root>', kind: 'added' });
    return draftNode;
  }
  if (!draftNode) {
    fieldChanges.push({ path: pathStr || '<root>', kind: 'removed-from-html' });
    return mergeMode === 'html-authoritative' ? null : existingNode;
  }

  const merged = {};
  const keys = new Set([...Object.keys(draftNode), ...Object.keys(existingNode)]);
  // M4: data-ucuf-lock — fields listed in _lockedFields are always preserved from existing
  const locked = collectLockedFields(draftNode, existingNode);
  for (const key of keys) {
    if (key === 'children') continue;
    const draftV = draftNode[key];
    const existingV = existingNode[key];
    const fieldPath = pathStr ? `${pathStr}.${key}` : `node.${key}`;
    if (locked && (locked.has('*') || locked.has(key)) && existingV !== undefined) {
      merged[key] = existingV;
      if (!deepEqual(draftV, existingV)) {
        fieldChanges.push({ path: fieldPath, kind: 'locked-preserved' });
      }
      continue;
    }
    if (draftV === undefined) {
      merged[key] = existingV;
    } else if (existingV === undefined) {
      merged[key] = draftV;
      fieldChanges.push({ path: fieldPath, kind: 'added' });
    } else if (deepEqual(draftV, existingV)) {
      merged[key] = existingV;
    } else if (key === 'root' && isPlainObject(draftV) && isPlainObject(existingV)) {
      merged[key] = mergeNode(draftV, existingV, fieldPath, mergeMode, fieldChanges, conflicts);
    } else if (key === 'widget' && isPlainObject(draftV) && isPlainObject(existingV) && mergeMode !== 'html-authoritative') {
      merged[key] = mergeWidgetPreserveHuman(draftV, existingV, fieldPath, fieldChanges, conflicts, mergeMode);
    } else {
      // conflict
      if (mergeMode === 'html-authoritative') {
        merged[key] = draftV;
        fieldChanges.push({ path: fieldPath, kind: 'overwritten-by-html' });
      } else {
        // preserve-human
        merged[key] = existingV;
        fieldChanges.push({ path: fieldPath, kind: 'manual-edit' });
        if (options_conflictFail(mergeMode)) {
          conflicts.push(`${fieldPath}: existing=${jsonShort(existingV)} html=${jsonShort(draftV)}`);
        }
      }
    }
  }

  // Recurse children, key by stable _ucufId then by node.name
  const draftChildren = Array.isArray(draftNode.children) ? draftNode.children : [];
  const existingChildren = Array.isArray(existingNode.children) ? existingNode.children : [];
  if (draftChildren.length || existingChildren.length) {
    const byId = new Map();
    const byName = new Map();
    for (const ec of existingChildren) {
      if (ec._ucufId) byId.set(ec._ucufId, ec);
      byName.set(ec.name, ec);
    }
    const usedExisting = new Set();
    const mergedChildren = [];
    for (const dc of draftChildren) {
      let existing = null;
      if (dc._ucufId && byId.has(dc._ucufId)) existing = byId.get(dc._ucufId);
      else if (byName.has(dc.name)) existing = byName.get(dc.name);
      const childPath = `${pathStr || merged.name || 'root'}.${dc._ucufId || dc.name}`;
      const childMerged = mergeNode(dc, existing, childPath, mergeMode, fieldChanges, conflicts);
      if (childMerged) mergedChildren.push(childMerged);
      if (existing) usedExisting.add(existing._ucufId || existing.name);
    }
    // existing nodes not seen in draft
    for (const ec of existingChildren) {
      const key = ec._ucufId || ec.name;
      if (!usedExisting.has(key)) {
        if (mergeMode === 'html-authoritative') {
          fieldChanges.push({ path: `${pathStr || 'root'}.${key}`, kind: 'removed-by-html' });
        } else if (isGeneratedNode(ec)) {
          fieldChanges.push({ path: `${pathStr || 'root'}.${key}`, kind: generatedRemovalKind(ec) });
        } else {
          mergedChildren.push(ec);
          fieldChanges.push({ path: `${pathStr || 'root'}.${key}`, kind: 'preserved-existing' });
        }
      }
    }
    merged.children = mergedChildren;
  }

  return merged;
}

function mergeWidgetPreserveHuman(draftWidget, existingWidget, fieldPath, fieldChanges, conflicts, mergeMode) {
  const merged = {};
  const keys = new Set([...Object.keys(draftWidget), ...Object.keys(existingWidget)]);
  for (const key of keys) {
    const draftV = draftWidget[key];
    const existingV = existingWidget[key];
    const subPath = `${fieldPath}.${key}`;
    if (draftV === undefined) {
      merged[key] = existingV;
    } else if (existingV === undefined) {
      merged[key] = draftV;
      fieldChanges.push({ path: subPath, kind: 'added' });
    } else if (deepEqual(draftV, existingV)) {
      merged[key] = existingV;
    } else {
      merged[key] = existingV;
      fieldChanges.push({ path: subPath, kind: 'manual-edit' });
      if (options_conflictFail(mergeMode)) {
        conflicts.push(`${subPath}: existing=${jsonShort(existingV)} html=${jsonShort(draftV)}`);
      }
    }
  }
  return merged;
}

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function collectLockedFields(draftNode, existingNode) {
  const set = new Set();
  for (const node of [existingNode, draftNode]) {
    if (node && Array.isArray(node._lockedFields)) {
      for (const f of node._lockedFields) set.add(f);
    }
  }
  return set.size > 0 ? set : null;
}

function mergeSkin(draftSkin, existingSkin, mergeMode, fieldChanges, conflicts) {
  const out = { slots: {} };
  for (const key of ['id', 'version', 'specVersion']) {
    if (existingSkin[key] !== undefined) out[key] = existingSkin[key];
    else if (draftSkin[key] !== undefined) out[key] = draftSkin[key];
  }
  if (existingSkin.bundles) out.bundles = existingSkin.bundles.slice();
  if (draftSkin.bundles) {
    const set = new Set([...(out.bundles || []), ...draftSkin.bundles]);
    out.bundles = [...set];
  }
  if (existingSkin.meta) out.meta = Object.assign({}, existingSkin.meta);

  const draftSlots = draftSkin.slots || {};
  const existingSlots = existingSkin.slots || {};
  const keys = new Set([...Object.keys(draftSlots), ...Object.keys(existingSlots)]);
  for (const slotId of keys) {
    const d = draftSlots[slotId];
    const e = existingSlots[slotId];
    const path = `skin.slots.${slotId}`;
    if (!d && e) {
      if (isGeneratedSlot(slotId, e)) {
        fieldChanges.push({ path, kind: generatedSlotRemovalKind(slotId, e) });
        continue;
      }
      out.slots[slotId] = e;
      // Existing-only slot is preserved silently.
    } else if (d && !e) {
      out.slots[slotId] = d;
      fieldChanges.push({ path, kind: 'added' });
    } else if (deepEqual(d, e)) {
      out.slots[slotId] = e;
    } else {
      const preservedAsset = preserveExistingRuntimeAssetSlot(slotId, d, e, path, fieldChanges);
      if (preservedAsset) {
        out.slots[slotId] = preservedAsset;
        continue;
      }
      if (mergeMode === 'html-authoritative') {
        out.slots[slotId] = d;
        fieldChanges.push({ path, kind: 'overwritten-by-html' });
      } else {
        out.slots[slotId] = mergeSlotPreserveHuman(d, e, path, fieldChanges);
        if (options_conflictFail(mergeMode)) {
          conflicts.push(`${path}: existing vs html differ on ${diffKeys(d, e).join(',')}`);
        }
      }
    }
  }
  return out;
}

function preserveExistingRuntimeAssetSlot(slotId, draftSlot, existingSlot, path, fieldChanges) {
  if (isExplicitAssetReplace(draftSlot)) {
    fieldChanges.push({
      path,
      kind: 'explicit-runtime-asset-replace-approved',
      detail: `${runtimeAssetDescription(existingSlot)} -> ${runtimeAssetDescription(draftSlot) || ((draftSlot && draftSlot.kind) || '<generated-slot>')}`,
      approval: {
        assetPolicy: draftSlot && draftSlot.assetPolicy || null,
        assetReplaceApproved: draftSlot && draftSlot.assetReplaceApproved === true,
        replaceExistingAsset: draftSlot && draftSlot._replaceExistingAsset === true,
      },
    });
    return null;
  }

  // Hard guard: existing button-skin must not be downgraded to non-button slot kinds.
  // This prevents recurring regressions where tab/stateful buttons lose normal/selected states
  // after HTML-authoritative conversion.
  if (
    existingSlot
    && existingSlot.kind === 'button-skin'
    && draftSlot
    && draftSlot.kind !== 'button-skin'
    && hasUsableButtonSkinState(existingSlot)
  ) {
    fieldChanges.push({
      path,
      kind: 'existing-runtime-asset-preserved',
      detail: `${draftSlot.kind} -> ${runtimeAssetDescription(existingSlot)}`,
    });
    return Object.assign({}, cleanRuntimeAssetSlot(existingSlot), {
      _assetPreserveReason: 'existing-runtime-asset',
    });
  }

  if (!isExistingRuntimeAssetSlot(existingSlot)) return null;
  const draftIsUsableAsset = isExistingRuntimeAssetSlot(draftSlot);
  if (draftIsUsableAsset && runtimeAssetSignature(draftSlot) === runtimeAssetSignature(existingSlot)) return null;
  fieldChanges.push({
    path,
    kind: 'existing-runtime-asset-preserved',
    detail: `${(draftSlot && draftSlot.kind) || '<missing>'} -> ${runtimeAssetDescription(existingSlot)}`,
  });
  return Object.assign({}, cleanRuntimeAssetSlot(existingSlot), {
    _assetPreserveReason: 'existing-runtime-asset',
  });
}

function cleanRuntimeAssetSlot(slot) {
  const out = Object.assign({}, slot || {});
  if (out.color === 'unmappedColor') {
    delete out.color;
    if (out.opacity === 1) delete out.opacity;
  }
  delete out.gradient;
  return out;
}

function isExplicitAssetReplace(slot) {
  return !!(slot && (
    slot.assetPolicy === 'replace-existing' ||
    slot.assetReplaceApproved === true ||
    slot._replaceExistingAsset === true
  ));
}

function isExistingRuntimeAssetSlot(slot) {
  if (slot && slot.kind === 'button-skin') {
    // For button-skin, do not require every optional state to physically exist.
    // Keeping a valid normal-state runtime art is enough to treat it as preservable runtime asset.
    if (typeof slot.normal !== 'string' || slot.normal.length === 0) return false;
    return runtimeAssetPathExists(slot.normal);
  }

  const paths = collectRuntimeAssetPaths(slot);
  if (paths.length === 0) return false;
  return paths.every(runtimeAssetPathExists);
}

function hasUsableButtonSkinState(slot) {
  if (!slot || slot.kind !== 'button-skin') return false;
  const stateKeys = ['normal', 'pressed', 'disabled', 'selected'];
  return stateKeys.some((key) => typeof slot[key] === 'string' && slot[key].length > 0);
}

function collectRuntimeAssetPaths(slot) {
  if (!slot || typeof slot !== 'object') return [];
  if (slot.kind === 'sprite-frame' && slot.path) return [slot.path];
  if (slot.kind === 'button-skin') {
    return ['normal', 'pressed', 'disabled', 'selected']
      .map(key => slot[key])
      .filter(value => typeof value === 'string' && value.length > 0);
  }
  return [];
}

function runtimeAssetPathExists(assetPath) {
  if (!assetPath) return false;
  if (/missing_sprite$/i.test(String(assetPath))) return false;
  return assetLikelyExists(assetPath);
}

function runtimeAssetSignature(slot) {
  return collectRuntimeAssetPaths(slot).slice().sort().join('|');
}

function runtimeAssetDescription(slot) {
  const paths = collectRuntimeAssetPaths(slot);
  return paths.length ? paths.join(',') : '<asset>';
}

function assetLikelyExists(cleanPath) {
  const path = require('path');
  const fs = require('fs');
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const normalized = String(cleanPath || '').split(String.fromCharCode(92)).join('/').replace(/\/spriteFrame$/, '');
  const base = path.join(repoRoot, 'assets', 'resources', normalized);
  return fs.existsSync(base)
    || ['.png', '.jpg', '.jpeg', '.webp', '.json'].some(ext => fs.existsSync(base + ext));
}

function isGeneratedPseudoNode(node) {
  return !!(node && typeof node._cssPseudo === 'string');
}

function isGeneratedEffectNode(node) {
  return !!(node && typeof node._cssEffect === 'string');
}

function isGeneratedNode(node) {
  return isGeneratedPseudoNode(node) || isGeneratedEffectNode(node);
}

function generatedRemovalKind(node) {
  return isGeneratedEffectNode(node) ? 'removed-generated-css-effect' : 'removed-generated-pseudo';
}

function isGeneratedPseudoSlot(slotId, slot) {
  if (!slot || !slotId) return false;
  return /[._-]pseudo(before|after)$/i.test(String(slotId));
}

function isGeneratedEffectSlot(slotId, slot) {
  if (!slot || !slotId) return false;
  return /[._-]cssshadow$/i.test(String(slotId));
}

function isGeneratedSlot(slotId, slot) {
  return isGeneratedPseudoSlot(slotId, slot) || isGeneratedEffectSlot(slotId, slot);
}

function generatedSlotRemovalKind(slotId, slot) {
  return isGeneratedEffectSlot(slotId, slot) ? 'removed-generated-css-effect-slot' : 'removed-generated-pseudo-slot';
}

function mergeSlotPreserveHuman(draftSlot, existingSlot, path, fieldChanges) {
  const promotedGradient = promoteAutoColorToGradient(draftSlot, existingSlot, path);
  if (promotedGradient) {
    fieldChanges.push({ path, kind: 'auto-color-promoted-to-gradient' });
    return promotedGradient;
  }
  const merged = Object.assign({}, draftSlot, existingSlot);
  if (canPromotePlaceholderColor(draftSlot, existingSlot)) {
    merged.color = draftSlot.color;
    if (draftSlot.opacity != null) merged.opacity = draftSlot.opacity;
    fieldChanges.push({ path: `${path}.color`, kind: 'placeholder-promoted' });
  }
  // For each key that differs, mark as manual-edit
  for (const k of new Set([...Object.keys(draftSlot || {}), ...Object.keys(existingSlot || {})])) {
    if (!deepEqual(draftSlot[k], existingSlot[k])) {
      fieldChanges.push({ path: `${path}.${k}`, kind: 'manual-edit' });
    }
  }
  return merged;
}

function promoteAutoColorToGradient(draftSlot, existingSlot, path) {
  if (!draftSlot || !existingSlot) return false;
  if (draftSlot.kind !== 'gradient-rect' || existingSlot.kind !== 'color-rect') return false;
  if (!/^skin\.slots\.auto\./.test(String(path || ''))) return false;
  const safeExistingKeys = new Set(['kind', 'color', 'alpha', 'opacity', 'gradient', 'borderColor', 'borderWidth', 'cornerRadius', 'strokeColor', 'strokeWidth']);
  if (!Object.keys(existingSlot).every(key => safeExistingKeys.has(key))) return null;
  const merged = Object.assign({}, existingSlot, draftSlot, { kind: 'gradient-rect', gradient: draftSlot.gradient });
  for (const key of ['borderColor', 'borderWidth', 'cornerRadius', 'strokeColor', 'strokeWidth']) {
    if (existingSlot[key] !== undefined && draftSlot[key] === undefined) merged[key] = existingSlot[key];
  }
  if (existingSlot.opacity !== undefined && draftSlot.opacity === undefined) merged.opacity = existingSlot.opacity;
  if (existingSlot.alpha !== undefined && draftSlot.alpha === undefined) merged.alpha = existingSlot.alpha;
  return merged;
}

function canPromotePlaceholderColor(draftSlot, existingSlot) {
  if (!draftSlot || !existingSlot) return false;
  if (draftSlot.kind !== existingSlot.kind) return false;
  if (existingSlot.color !== 'unmappedColor') return false;
  return !!(draftSlot.color && draftSlot.color !== 'unmappedColor');
}

function options_conflictFail(_) { return false; }

function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i += 1) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!deepEqual(a[k], b[k])) return false;
  return true;
}

function diffKeys(a, b) {
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  const out = [];
  for (const k of keys) if (!deepEqual((a || {})[k], (b || {})[k])) out.push(k);
  return out;
}

function jsonShort(v) {
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + '...' : s;
  } catch (_) { return String(v); }
}

module.exports = { smartMerge };
