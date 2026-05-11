'use strict';

const core = require('../draft-builder-core');

module.exports = {
  applyTextTransformGeneral: core.applyTextTransformGeneral,
  computeLetterSpacing: core.computeLetterSpacing,
  resolveFontFamilyToAsset: core.resolveFontFamilyToAsset,
  resolveFontAssetByConvention: core.resolveFontAssetByConvention,
  buildFontFaceRegistry: core.buildFontFaceRegistry,
  parseSimpleTextShadow: core.parseSimpleTextShadow,
  PROJECT_FONT_REGISTRY: core.PROJECT_FONT_REGISTRY,
  PROJECT_FONT_DEFAULT: core.PROJECT_FONT_DEFAULT,
};
