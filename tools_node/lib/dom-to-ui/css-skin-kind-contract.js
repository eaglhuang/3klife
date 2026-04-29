// doc_id: doc_other_0009 - CSS capability to skin-kind contract checks.
'use strict';

const { classifyCssProperty } = require('./css-capability-matrix');

function runtimeSkinKindForCssProperty(property, value) {
  const prop = String(property || '').toLowerCase();
  const raw = String(value || '').toLowerCase();
  if (prop === 'background-color') return 'color-rect';
  if (prop === 'background' || prop === 'background-image') {
    if (/linear-gradient\s*\(/.test(raw)) return 'gradient-rect';
    if (/url\s*\(/.test(raw)) return 'sprite-frame';
    return 'color-rect';
  }
  if (prop === 'box-shadow' || prop === 'drop-shadow' || prop === 'text-shadow' || prop === 'filter') return 'shadow-set';
  if (prop === 'clip-path' || prop === 'mask' || prop === 'mask-image') return 'mask-and-clip';
  if (prop === 'mix-blend-mode' || prop === 'opacity') return 'opacity-and-blend';
  if (prop === 'transform') return 'transform-stack';
  if (prop === 'border' || /^border-/.test(prop)) return 'border-style';
  if (/^text-decoration($|-)/.test(prop)) return 'text-decoration';
  return null;
}

function assetizeSkinSlotKindForCssProperty(property) {
  const prop = String(property || '').toLowerCase();
  if (prop === 'box-shadow' || prop === 'drop-shadow' || prop === 'text-shadow' || prop === 'filter' || prop === 'backdrop-filter') return 'shadow-set';
  if (prop === 'clip-path' || prop === 'mask' || prop === 'mask-image') return 'mask-set';
  return 'background-set';
}

function expectedSkinKindForCssProperty(property, value) {
  const capability = classifyCssProperty(property, value);
  if (capability === 'supported' || capability === 'partial-supported') return runtimeSkinKindForCssProperty(property, value);
  if (capability === 'assetize') return assetizeSkinSlotKindForCssProperty(property);
  return null;
}

function buildCssSkinKindContractReport(samples) {
  const entries = (samples || []).map(sample => {
    const capability = classifyCssProperty(sample.property, sample.value);
    const skinKind = expectedSkinKindForCssProperty(sample.property, sample.value);
    const errors = [];
    if (sample.expectedCapability && sample.expectedCapability !== capability) {
      errors.push(`capability expected ${sample.expectedCapability}, got ${capability}`);
    }
    if (sample.expectedSkinKind && sample.expectedSkinKind !== skinKind) {
      errors.push(`skinKind expected ${sample.expectedSkinKind}, got ${skinKind}`);
    }
    if ((capability === 'supported' || capability === 'partial-supported' || capability === 'assetize') && !skinKind) {
      errors.push(`missing skinKind for ${sample.property}:${capability}`);
    }
    return Object.assign({}, sample, { capability, skinKind, ok: errors.length === 0, errors });
  });
  return {
    schemaVersion: '1.0.0',
    ok: entries.every(entry => entry.ok),
    entries,
    errors: entries.flatMap(entry => entry.errors.map(error => `${entry.property}: ${error}`)),
  };
}

module.exports = {
  runtimeSkinKindForCssProperty,
  assetizeSkinSlotKindForCssProperty,
  expectedSkinKindForCssProperty,
  buildCssSkinKindContractReport,
};