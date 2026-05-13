'use strict';

function hasTextBindingContract(node) {
  if (!node || typeof node !== 'object') return false;
  return !!(node.bind || node.bindPath || node.dataContract || node.contract || node.i18nKey || node.contentPath || node.textKey);
}

function sanitizeKeySegment(input) {
  return String(input || '')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function isDynamicTextCandidateForContract(node) {
  const text = String(node && node.text || '').trim();
  if (!text) return false;
  if (/^[A-Z]{2,12}$/.test(text)) return false;
  if (/^[{}[\]<>_—\-+=|/\\.,:;!?'"`~@#$%^&*() ]+$/.test(text)) return false;
  return /\d|%|[A-Za-z\u4e00-\u9fff]/.test(text) && text.length >= 3;
}

function injectDynamicTextContracts(args) {
  const { layoutPath, screenId, helpers } = args;
  const layout = helpers.readJsonIfExists(layoutPath);
  if (!layout) return { updated: 0 };
  const root = layout && layout.root ? layout.root : layout;
  let updated = 0;

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if ((node.type === 'label' || node.text != null) && isDynamicTextCandidateForContract(node) && !hasTextBindingContract(node)) {
      const nodeKey = sanitizeKeySegment(node.name || node.id || `text-${updated + 1}`);
      const screenKey = sanitizeKeySegment(screenId);
      node.textKey = `auto.${screenKey}.${nodeKey}`;
      updated += 1;
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };

  walk(root);
  if (updated > 0) helpers.writeJson(layoutPath, layout);
  return { updated };
}

function normalizeInteractionTriggersFromLayout(args) {
  const { paths, helpers } = args;
  const layout = helpers.readJsonIfExists(paths.finalLayout);
  const interactionPath = helpers.sidecarPath(paths.finalLayout, '.interaction.json');
  const interaction = helpers.readJsonIfExists(interactionPath);
  if (!layout || !interaction || !Array.isArray(interaction.actions)) return { updated: 0 };
  const root = layout && layout.root ? layout.root : layout;
  const triggerByActionId = new Map();
  const triggerByActionType = new Map();

  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node._interactionId && typeof node._interactionId === 'string' && node.name) {
      triggerByActionId.set(node._interactionId, node.name);
      const typeSuffix = node._interactionId.split('.').pop();
      if (typeSuffix && !triggerByActionType.has(typeSuffix)) {
        triggerByActionType.set(typeSuffix, node.name);
      }
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child);
    }
  };
  walk(root);

  let updated = 0;
  for (const action of interaction.actions) {
    let mappedTrigger = triggerByActionId.get(action && action.id);
    if (!mappedTrigger && action && action.type) {
      const typeSuffix = action.type.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase()).replace(/^-/, '');
      mappedTrigger = triggerByActionType.get(typeSuffix);
    }
    if (!mappedTrigger) continue;
    if (action.trigger !== mappedTrigger) {
      action.trigger = mappedTrigger;
      updated += 1;
    }
  }
  if (updated > 0) helpers.writeJson(interactionPath, interaction);
  return { updated };
}

module.exports = {
  injectDynamicTextContracts,
  normalizeInteractionTriggersFromLayout,
};
