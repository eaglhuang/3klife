// doc_id: doc_other_0009 — recursive HTML -> UCUF draft builder
// 對應 §3 / §6 / §7 / §8 / §27
'use strict';

const { parseHtml, parseStylesheets, parseInlineStyle } = require('./html-parser');
const { loadTokenRegistry, normalizeHex } = require('./token-registry');
const { extractInteraction, buildInteractionDraft } = require('./interaction-translator');
const { extractKeyframes, extractMotion, buildMotionDraft } = require('./motion-translator');
const { parseBackgroundImage, parseShadowList } = require('./snapshot-to-slots');
const { extractFontFaceMappings } = require('./css-capability-matrix');
const { draftBuilderStageRules: DRAFT_BUILDER_STAGE_RULES } = require('../html-to-ucuf/rule-registry.json');

const ANCHOR_MAP = {
  'fill': { top: 0, left: 0, right: 0, bottom: 0 },
  'center': { hCenter: 0, vCenter: 0 },
  'top-left': { top: 0, left: 0 },
  'top-right': { top: 0, right: 0 },
  'top-center': { top: 0, hCenter: 0 },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-right': { bottom: 0, right: 0 },
  'bottom-center': { bottom: 0, hCenter: 0 },
  'middle-left': { vCenter: 0, left: 0 },
  'middle-right': { vCenter: 0, right: 0 },
};

const FORBIDDEN_TYPES = new Set(['Node', 'Label', 'Sprite', 'ScrollView', 'SafeArea']);

const TEXT_TAGS = new Set(['p', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'label', 'small', 'strong', 'em', 'a']);

const NON_VISUAL_TAGS = new Set(['head', 'meta', 'link', 'title', 'style', 'script', 'noscript', 'base']);

const RICH_TEXT_INNER_TAGS = new Set(['strong', 'em', 'a', 'small']);

const NINESLICE_FAMILY_HINTS = ['parchment', 'dark_metal', 'dark-metal', 'gold_cta', 'gold-cta'];

const PLACEHOLDER_SPRITE = 'sprites/ui_common/placeholder/missing_sprite';
const TAB_BUTTON_SKIN_NORMAL = 'sprites/ui_families/general_detail/tab_active_button';
const TAB_BUTTON_SKIN_SELECTED = 'sprites/ui_families/general_detail/detail_tab_active_frame';

const SIMPLIFIED_CHINESE_HINTS = ['国', '将', '历', '战', '门', '画', '员']; // partial set; warn only

const TAB_TOKEN_ALIASES = {
  overview: ['overview', 'general', 'gen', '將'],
  stats: ['stats', 'stat', 'attributes', '屬'],
  tactics: ['tactics', 'tact', 'skill', '技'],
  bloodline: ['bloodline', 'lineage', 'fate', '命'],
  equip: ['equip', 'equipment', 'gear', '寶'],
  aptitude: ['aptitude', 'apt', '適'],
};

/**
 * Build layout + skin draft from HTML source.
 * @param {string} html
 * @param {object} opts
 * @param {string} opts.screenId
 * @param {string} [opts.bundle]
 * @param {string} [opts.defaultBundle='ui_common']
 * @param {string} [opts.rootName]
 */
function buildDraftFromHtml(html, opts) {
  if (!html || typeof html !== 'string') {
    throw new Error('buildDraftFromHtml: html string required');
  }
  if (!opts || !opts.screenId) {
    throw new Error('buildDraftFromHtml: opts.screenId required');
  }

  const ctx = {
    opts: Object.assign({ defaultBundle: 'ui_common' }, opts),
    skinSlots: {},
    warnings: [],
    nameCounters: {},
    compositeNodes: [],
    interactions: [],
    motions: [],
    // Plan 4: draft-builder 的新規則必須掛在 stage registry 上，避免零散補丁再次混進大函式。
    ruleRegistry: DRAFT_BUILDER_STAGE_RULES,
    tokenRegistry: loadTokenRegistry({
      sourcePath: opts.tokensSource || opts.tokensPath,
      runtimePath: opts.tokensRuntime,
      handoffPath: opts.tokensHandoff,
    }),
    tokenUsage: {
      colors: [],
      cssVars: [],
      spacing: [],
      typography: [],
      artWarnings: [],
    },
    computedStyleByCaptureId: normalizeFidelitySnapshotMap(opts.fidelitySnapshots),
    pseudoStyleByParentCaptureId: normalizeFidelityPseudoMap(opts.fidelitySnapshots),
  };

  const sanitizedHtml = stripNonVisualBlocksForParsing(html);
  const parsed = parseHtml(sanitizedHtml);
  for (const w of parsed.warnings) ctx.warnings.push(w);
  const { classRules, idRules, styleRules, droppedSelectors } = parseStylesheets(parsed.styleSheets || []);
  ctx.classRules = classRules;
  ctx.idRules = idRules;
  ctx.styleRules = styleRules || [];
  // R-P5-SEL-01: surface dropped complex selectors as css-selector-not-applied warnings
  for (const dropped of (droppedSelectors || [])) {
    ctx.warnings.push({ code: 'css-selector-not-applied', detail: dropped.selector, kind: dropped.kind });
  }
  ctx.droppedSelectors = droppedSelectors || [];
  ctx.keyframes = extractKeyframes(parsed.styleSheets || []);
  // R-12: build a per-conversion font registry from any `@font-face` blocks
  // in the source CSS. Each entry maps the declared family (case-insensitive
  // exact match) to a Cocos font asset path resolved by convention from the
  // url(...) target. This is layered AHEAD of `PROJECT_FONT_REGISTRY` so that
  // source CSS can introduce a new family without requiring a code change in
  // the converter. Generic: any UI whose handoff CSS declares custom fonts
  // via @font-face benefits.
  ctx.fontFaceRegistry = buildFontFaceRegistry(parsed.styleSheets || [], opts.fontFaceResolver);

  // Convert the source root itself when HTML has a single element. Older
  // behavior only walked root.children, which dropped single-node screens.
  const elementChildren = parsed.children.filter(c => c.type === 'element');
  const conversionRoots = elementChildren.length === 1 && isTransparentSourceWrapper(elementChildren[0])
    ? elementChildren[0].children.filter(c => c.type === 'element')
    : elementChildren;

  // M1: specVersion + canvas meta on layout root
  // Canvas can be hinted via <html data-canvas-width="1334" data-canvas-height="750"> or opts.canvas.
  const canvasFromHtml = readCanvasFromHtml(parsed);
  const canvas = Object.assign(
    { designWidth: 1334, designHeight: 750 },
    canvasFromHtml || {},
    opts.canvas || {},
  );

  const rootName = opts.rootName || pascal(opts.screenId);
  const rootNode = {
    specVersion: 1,
    canvas,
    type: 'container',
    name: rootName,
    widget: { top: 0, left: 0, right: 0, bottom: 0 },
    children: [],
  };

  for (const child of conversionRoots) {
    if (child.type !== 'element') continue;
    const node = processElement(child, ctx, 1);
    appendNodeWithGeneratedSiblings(rootNode.children, node);
  }

  return {
    layoutDraft: rootNode,
    skinDraft: {
      id: ctx.opts.skinId || `${ctx.opts.screenId}.skin`,
      version: 1,
      slots: ctx.skinSlots,
      bundles: ctx.opts.bundle ? [ctx.opts.bundle] : [],
      meta: {
        draftStageRules: ctx.ruleRegistry,
        tokenUsageReport: ctx.tokenUsage,
        tokenSources: ctx.tokenRegistry.sources,
        tokenConflictReport: ctx.tokenRegistry.conflicts || [],
      },
    },
    warnings: ctx.warnings,
    compositeNodes: ctx.compositeNodes,
    interactionDraft: buildInteractionDraft(ctx.opts.screenId, ctx.interactions, ctx.warnings),
    motionDraft: buildMotionDraft(ctx.opts.screenId, ctx.motions, ctx.warnings),
    canvas,
    selectorCapabilitySummary: {
      droppedCount: ctx.droppedSelectors.length,
      dropped: ctx.droppedSelectors,
    },
  };
}

function stripNonVisualBlocksForParsing(html) {
  if (!html || typeof html !== 'string') return html;
  // Parser guard: rendered snapshots may inline large transpiled scripts.
  // Strip non-visual code/template blocks before structural conversion so
  // script payload cannot be mis-tokenized into duplicate UI nodes.
  return String(html)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<template\b[^>]*>[\s\S]*?<\/template>/gi, '');
}

function readCanvasFromHtml(parsed) {
  // walk top-level for <html> attrs
  for (const c of parsed.children || []) {
    if (c.type === 'element' && (c.tag === 'html' || c.tag === 'body')) {
      const a = c.attrs || {};
      const w = numAttr(a['data-canvas-width']);
      const h = numAttr(a['data-canvas-height']);
      if (w && h) return { designWidth: w, designHeight: h };
    }
  }
  return null;
}

function isTransparentSourceWrapper(el) {
  if (!el || !Array.isArray(el.children)) return false;
  if (!el.children.some(child => child.type === 'element')) return false;
  const attrs = el.attrs || {};
  const meaningfulAttrs = Object.keys(attrs)
    .filter(key => key !== 'data-name')
    .filter(key => attrs[key] !== '');
  return meaningfulAttrs.length === 0;
}

function processElement(el, ctx, depth) {
  const tag = el.tag;
  if (NON_VISUAL_TAGS.has(tag)) return null;
  // unwrap html/body: descend into children directly
  if (tag === 'html' || tag === 'body') {
    const out = {
      type: 'container',
      name: ctx.opts.rootName ? `${ctx.opts.rootName}_${tag}` : `${pascal(ctx.opts.screenId)}_${tag}`,
      widget: { top: 0, left: 0, right: 0, bottom: 0 },
      children: [],
    };
    for (const c of el.children) {
      if (c.type !== 'element') continue;
      const sub = processElement(c, ctx, depth + 1);
      if (sub) out.children.push(sub);
    }
    // collapse single-child wrappers
    if (out.children.length === 1) return out.children[0];
    return out.children.length === 0 ? null : out;
  }
  const styleInfo = collectElementStyle(el, ctx);
  const attrs = styleInfo.attrs;
  const cls = styleInfo.cls;
  const style = styleInfo.style;
  registerTabZoneHint(attrs, cls, ctx);
  const semanticHints = inferTabSemanticHints(el, tag, attrs, cls, style, ctx);
  const storyStripHints = inferStoryStripHints(el, tag, attrs, cls, ctx);

  if (!attrs['data-slot'] && semanticHints.dataSlot) attrs['data-slot'] = semanticHints.dataSlot;
  if (!attrs['data-panel'] && semanticHints.dataPanel) attrs['data-panel'] = semanticHints.dataPanel;
  if (!attrs['data-contract'] && semanticHints.dataContract) attrs['data-contract'] = semanticHints.dataContract;
  if (!attrs['data-default-fragment'] && semanticHints.defaultFragment) attrs['data-default-fragment'] = semanticHints.defaultFragment;
  if (!attrs['data-warmup-hint'] && semanticHints.warmupHint) attrs['data-warmup-hint'] = semanticHints.warmupHint;
  if (storyStripHints) {
    attrs['data-slot'] = attrs['data-slot'] || storyStripHints.dataSlot;
    if (storyStripHints.dataContract) attrs['data-contract'] = attrs['data-contract'] || storyStripHints.dataContract;
    attrs['data-default-fragment'] = attrs['data-default-fragment'] || storyStripHints.defaultFragment;
    attrs['data-warmup-hint'] = attrs['data-warmup-hint'] || storyStripHints.warmupHint;
    attrs['data-lazy-slot'] = 'true';
    if (storyStripHints.fragments) attrs['data-fragments'] = storyStripHints.fragments.join(',');
    if (storyStripHints.deferredReason) attrs['data-deferred-fragment-reason'] = storyStripHints.deferredReason;
  }

  // ---- depth guard (RT-01) ----
  if (depth > 8) {
    ctx.warnings.push({ code: 'depth-exceeds-8-consider-fragment' });
  }

  // ---- 1. lazy slot ----
  if (attrs['data-slot'] && shouldMaterializeLazySlot(attrs, tag)) {
    const slotName = attrs['data-slot'];
    const fragments = parseFragmentList(attrs['data-fragments']);
    const node = {
      type: 'container',
      name: slotName,
      widget: anchorToWidget(attrs['data-anchor'], style),
      lazySlot: true,
      defaultFragment: attrs['data-default-fragment'] || undefined,
      warmupHint: attrs['data-warmup-hint'] || undefined,
      _contract: attrs['data-contract'] || undefined,
    };
    if (fragments.length > 0) node.fragments = fragments;
    if (attrs['data-deferred-fragment-reason']) {
      node._deferredFragmentReason = String(attrs['data-deferred-fragment-reason']);
    }
    applyCommonNodeAttrs(node, attrs);
    if (!node.defaultFragment) {
      ctx.warnings.push({ code: 'lazy-slot-missing-default-fragment', detail: slotName });
    }
    const flexValLS = String(style.flex || style.flexGrow || '').trim();
    if (parseFloat(flexValLS.split(/\s+/)[0]) > 0) node._flexFill = true;
    return node;
  }

  // ---- 2. child-panel ----
  if (attrs['data-panel'] && attrs['data-panel'] !== 'tab-button') {
    const panelNode = {
      type: 'child-panel',
      name: attrs['data-name'] || autoName(ctx, tag),
      widget: anchorToWidget(attrs['data-anchor'], style),
      panelType: attrs['data-panel'],
      dataSource: attrs['data-datasource'] || undefined,
      _contract: attrs['data-contract'] || undefined,
    };
    applyCommonNodeAttrs(panelNode, attrs);
    collectBehavior(el, panelNode, style, ctx);
    const flexValCP = String(style.flex || style.flexGrow || '').trim();
    if (parseFloat(flexValCP.split(/\s+/)[0]) > 0) panelNode._flexFill = true;
    return panelNode;
  }

  // ---- 3. infer node type ----
  const nodeType = inferNodeType(tag, cls, style, attrs, el);
  if (FORBIDDEN_TYPES.has(nodeType)) {
    ctx.warnings.push({ code: 'forbidden-node-type', detail: nodeType });
  }

  const name = attrs['data-name'] || autoName(ctx, tag);
  inspectArtDirectionRisks(style, name, ctx, el);
  const node = {
    type: nodeType,
    name,
    widget: anchorToWidget(attrs['data-anchor'], style),
  };

  applyVisibilityState(node, style, ctx, name);
  applyClipPathMetadata(node, style);

  // M4: stable identifier + lock flags
  applyCommonNodeAttrs(node, attrs);
  applyCaptureNodeAttrs(node, attrs);

  if (semanticHints.inferredLazySlot === true) {
    node.lazySlot = true;
    node.defaultFragment = attrs['data-default-fragment'] || inferDefaultTabFragment(ctx.opts.screenId);
    node.warmupHint = attrs['data-warmup-hint'] || 'first-frame';
    if (attrs['data-contract']) node._contract = attrs['data-contract'];
    if (!node.defaultFragment) {
      ctx.warnings.push({ code: 'lazy-slot-missing-default-fragment', detail: name });
    } else {
      ctx.warnings.push({ code: 'tab-semantic-inferred-lazy-slot', detail: `${name} -> ${node.defaultFragment}` });
    }
    const flexValIL = String(style.flex || style.flexGrow || '').trim();
    if (parseFloat(flexValIL.split(/\s+/)[0]) > 0) node._flexFill = true;
    const computedGeometry = deriveComputedGeometry(ctx, style, nodeType);
    if (computedGeometry && computedGeometry.widget) node.widget = computedGeometry.widget;
    const width = computedGeometry && computedGeometry.width != null
      ? computedGeometry.width
      : pickDim(style.width, attrs.width);
    const height = computedGeometry && computedGeometry.height != null
      ? computedGeometry.height
      : pickDim(style.height, attrs.height);
    if (width != null) node.width = width;
    if (height != null) node.height = height;
    const layoutSpec = inferLayout(style, ctx, name, el);
    if (layoutSpec) node.layout = layoutSpec;
    collectBehavior(el, node, style, ctx);
    if (nodeType === 'panel' && hasMeaningfulBackground(style)) {
      const skinLayers = emitSkinLayers(ctx, name, style, attrs);
      if (skinLayers && skinLayers.length > 1) {
        node.skinLayers = skinLayers;
      } else {
        const slotId = attrs['data-skin'] || autoSlotId(ctx, name);
        node.skinSlot = slotId;
        ensureSpriteOrColorSlot(ctx, slotId, style, attrs, { width, height });
      }
    }
    return node;
  }

  // M1: collect composite nodes for sidecar report
  if (nodeType === 'composite') {
    const rendererHint = inferCompositeRendererHint(tag, el, attrs);
    const svgMeta = inferCompositeGeometrySummary(tag, el, attrs);
    ctx.compositeNodes.push({
      name,
      tag,
      reason: tag === 'canvas' ? 'html-canvas' : tag === 'svg' ? 'svg' : 'class-hint',
      width: pickDim(style.width, attrs.width),
      height: pickDim(style.height, attrs.height),
      hint: rendererHint,
      svgMeta,
    });
    ctx.warnings.push({ code: 'composite-needs-manual-renderer', detail: name });
  }

  // ---- 4. dimensions ----
  const computedGeometry = deriveComputedGeometry(ctx, style, nodeType);
  if (computedGeometry && computedGeometry.widget) node.widget = computedGeometry.widget;
  const width = computedGeometry && computedGeometry.width != null
    ? computedGeometry.width
    : pickDim(style.width, attrs.width);
  const height = computedGeometry && computedGeometry.height != null
    ? computedGeometry.height
    : pickDim(style.height, attrs.height);
  if (width != null) node.width = width;
  if (height != null) node.height = height;
  if (nodeType === 'composite') {
    const rendererHint = inferCompositeRendererHint(tag, el, attrs);
    const svgMeta = inferCompositeGeometrySummary(tag, el, attrs);
    if (rendererHint) node.rendererHint = rendererHint;
    if (svgMeta) node.svgMeta = svgMeta;
  }

  // Mark flex-grow children so the parent can compute fill widths.
  const flexVal = String(style.flex || style.flexGrow || '').trim();
  const flexGrowNum = parseFloat(flexVal.split(/\s+/)[0]);
  if (flexGrowNum > 0) node._flexFill = true;

  // M10: declarative interaction + motion draft collection.
  collectBehavior(el, node, style, ctx);

  // ---- 5. layout (flex) ----
  const layoutSpec = inferLayout(style, ctx, name, el);
  if (layoutSpec) node.layout = layoutSpec;

  // ---- 6. by-type wiring ----
  if (nodeType === 'image') {
    applyImageFit(node, style);
    const slotId = attrs['data-skin'] || autoSlotId(ctx, name);
    node.skinSlot = slotId;
    ensureSpriteSlot(ctx, slotId, attrs, style, /*sizeHint*/ { width, height });
  } else if (nodeType === 'panel') {
    const skinLayers = emitSkinLayers(ctx, name, style, attrs);
    if (skinLayers && skinLayers.length > 1) {
      node.skinLayers = skinLayers;
    } else {
      const slotId = attrs['data-skin'] || autoSlotId(ctx, name);
      node.skinSlot = slotId;
      ensureSpriteOrColorSlot(ctx, slotId, style, attrs, /*sizeHint*/ { width, height });
    }
  } else if (nodeType === 'label') {
    const rawText = collectText(el);
    // R-9 (general rule): apply CSS `text-transform` offline at convert time
    // because Cocos Label has no runtime equivalent. Without this, every UI
    // source that uses `text-transform: uppercase|lowercase|capitalize` shows
    // the original casing in Cocos and a transformed casing in the browser
    // reference, producing constant pixel diff in compare gates.
    const text = applyTextTransformGeneral(rawText, style && style.textTransform);
    if (text) node.text = text;
    if (shouldPruneStandaloneStoryStripLabel(text, attrs, ctx)) {
      ctx.warnings.push({ code: 'story-strip-standalone-label-pruned', detail: name });
      return null;
    }
    const styleSlotId = attrs['data-style'] || autoSlotId(ctx, name);
    node.styleSlot = styleSlotId;
    ensureLabelStyle(ctx, styleSlotId, style, attrs, text);
    if (attrs['data-contract']) node._contract = attrs['data-contract'];
    if (containsRichInner(el)) ctx.warnings.push({ code: 'rich-text-not-supported', detail: name });
    if (looksSimplified(text)) ctx.warnings.push({ code: 'text-locale-mismatch', detail: name });
  } else if (nodeType === 'button') {
    if (attrs['data-contract']) node._contract = attrs['data-contract'];
    const slotId = attrs['data-skin'] || autoSlotId(ctx, name);
    node.skinSlot = slotId;
    if (isTabSwitchContract(node._contract)) {
      ensureTabButtonSkinSlot(ctx, slotId, attrs, style);
    } else {
      ensureSpriteOrColorSlot(ctx, slotId, style, attrs, { width, height });
    }
  }

  const generatedEffectNodes = buildEffectSiblingNodes(ctx, node, style, name, width, height);
  if (generatedEffectNodes.length > 0) node._generatedBefore = generatedEffectNodes;

  if (nodeType === 'composite') return node;

  // ---- 7. recurse children ----
  const childNodes = [];
  const hasElementChildren = (el.children || []).some(child => child.type === 'element');
  const beforePseudoNodes = buildPseudoVisualNodes(ctx, style, name, 'before', hasElementChildren);
  for (const child of el.children) {
    if (child.type !== 'element') continue;
    const sub = processElement(child, ctx, depth + 1);
    appendNodeWithGeneratedSiblings(childNodes, sub);
  }
  const afterPseudoNodes = buildPseudoVisualNodes(ctx, style, name, 'after', hasElementChildren);
  if (beforePseudoNodes.length > 0) childNodes.unshift(...beforePseudoNodes);
  if (afterPseudoNodes.length > 0) childNodes.push(...afterPseudoNodes);

  // §7.8 color-rect 濫發防護
  enforceColorRectGuard(ctx, name, childNodes);

  // §7.9 resolve flex-fill child widths for horizontal containers
  resolveFillChildWidths(node, childNodes);

  if (childNodes.length > 0) node.children = childNodes;
  normalizeTabRailAndButtonLayout(node, ctx);
  dedupeTabSwitchChildren(node, ctx);
  dedupeIdenticalLargeChildren(node, ctx);
  stabilizeGridLayout(node);
  normalizeSingleChildFill(node, ctx);
  if (nodeType === 'container' && childNodes.length === 0 && !node.width && !node.height && !node.skinSlot && !node.skinLayers && !node.compositeImageLayers && !node._flexFill) {
    return null;
  }

  return node;
}

function normalizeSingleChildFill(node, ctx) {
  if (!node || node.type !== 'container' || !Array.isArray(node.children) || node.children.length !== 1) return;
  if (!node.widget || typeof node.widget !== 'object') return;
  const fillsParent = node.widget.top != null && node.widget.left != null && node.widget.right != null && node.widget.bottom != null;
  if (!fillsParent) return;

  const child = node.children[0];
  if (!child || child.type !== 'container' || child.widget) return;
  if (child.width != null || child.height != null) return;
  if (!child.layout || typeof child.layout !== 'object') return;

  child.widget = { top: 0, left: 0, right: 0, bottom: 0 };
  delete child.x;
  delete child.y;
  if (ctx && Array.isArray(ctx.warnings)) {
    ctx.warnings.push({
      code: 'single-child-fill-recovered',
      detail: `${node.name || 'container'} -> ${child.name || 'child'}`,
    });
  }
}

/**
 * For horizontal-layout containers with a known numeric width, compute and
 * assign widths for children tagged with _flexFill=true (CSS flex:1 / flex-grow>0).
 * After assignment the _flexFill marker is removed from all children.
 */
function resolveFillChildWidths(node, childNodes) {
  // Remove the _flexFill marker from all children regardless.
  const fillChildren = [];
  for (const child of childNodes) {
    if (!child || typeof child !== 'object') continue;
    if (child._flexFill) {
      fillChildren.push(child);
      delete child._flexFill;
    }
  }
  if (fillChildren.length === 0) return;
  if (!node || !node.layout || node.layout.type !== 'horizontal') return;
  const parentWidth = typeof node.width === 'number' ? node.width : null;
  if (parentWidth == null) return;

  // Sum up widths of fixed children (those without _flexFill already removed).
  let fixedSum = 0;
  let fixedCount = 0;
  for (const child of childNodes) {
    if (!child || typeof child !== 'object') continue;
    if (typeof child.width === 'number') { fixedSum += child.width; fixedCount++; }
  }
  // Subtract fill children that might already have a width assigned.
  for (const child of fillChildren) {
    if (typeof child.width === 'number') { fixedSum -= child.width; fixedCount--; }
  }

  const spacingX = typeof node.layout.spacingX === 'number' ? node.layout.spacingX : 0;
  const paddingL = typeof node.layout.paddingLeft === 'number' ? node.layout.paddingLeft : 0;
  const paddingR = typeof node.layout.paddingRight === 'number' ? node.layout.paddingRight : 0;
  const totalChildren = childNodes.filter(c => c && typeof c === 'object').length;
  const spacingTotal = spacingX * Math.max(0, totalChildren - 1);

  const remaining = parentWidth - fixedSum - paddingL - paddingR - spacingTotal;
  if (remaining <= 0) return;
  const perChild = Math.round(remaining / fillChildren.length);
  for (const child of fillChildren) {
    child.width = perChild;
  }
}

function dedupeTabSwitchChildren(node, ctx) {
  if (!node || !Array.isArray(node.children) || node.children.length <= 1) return;
  const seen = new Set();
  const deduped = [];
  let pruned = 0;
  for (const child of node.children) {
    if (!child || typeof child !== 'object') {
      deduped.push(child);
      continue;
    }
    const contract = typeof child._contract === 'string' ? child._contract.trim().toLowerCase() : '';
    if (isTabSwitchContract(contract)) {
      if (seen.has(contract)) {
        pruned += 1;
        continue;
      }
      seen.add(contract);
    }
    deduped.push(child);
  }
  if (pruned > 0) {
    node.children = deduped;
    if (ctx && Array.isArray(ctx.warnings)) {
      ctx.warnings.push({
        code: 'tab-rail-duplicate-pruned',
        detail: `${node.name || 'unknown-parent'} pruned ${pruned} duplicated tab buttons`,
      });
    }
  }
}

function dedupeIdenticalLargeChildren(node, ctx) {
  if (!node || !Array.isArray(node.children) || node.children.length <= 1) return;

  const signatureSeen = new Map();
  const deduped = [];
  let pruned = 0;

  for (const child of node.children) {
    if (!child || typeof child !== 'object') {
      deduped.push(child);
      continue;
    }

    const labelCount = countLabelDescendants(child);
    const shouldGuard = labelCount >= 12;
    if (!shouldGuard) {
      deduped.push(child);
      continue;
    }

    const textFingerprint = buildLabelTextFingerprint(child);
    const signature = textFingerprint || buildStructuralSignature(child);
    if (signatureSeen.has(signature)) {
      pruned += 1;
      continue;
    }
    signatureSeen.set(signature, true);
    deduped.push(child);
  }

  if (pruned > 0) {
    node.children = deduped;
    if (ctx && Array.isArray(ctx.warnings)) {
      ctx.warnings.push({
        code: 'duplicate-large-subtree-pruned',
        detail: `${node.name || 'unknown-parent'} pruned ${pruned} repeated large subtree nodes`,
      });
    }
  }
}

function countLabelDescendants(node) {
  if (!node || typeof node !== 'object') return 0;
  let count = 0;
  if (node.type === 'label' && String(node.text || '').trim()) count += 1;
  for (const child of node.children || []) count += countLabelDescendants(child);
  return count;
}

function buildLabelTextFingerprint(node) {
  if (!node || typeof node !== 'object') return '';
  const labels = [];
  collectLabelTexts(node, labels);
  if (labels.length < 12) return '';
  return labels.join('||');
}

function collectLabelTexts(node, out) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'label') {
    const text = String(node.text || '').replace(/\s+/g, ' ').trim();
    if (text) out.push(text);
  }
  for (const child of node.children || []) collectLabelTexts(child, out);
}

function buildStructuralSignature(node) {
  if (!node || typeof node !== 'object') return '';
  const payload = {
    type: node.type || '',
    text: node.type === 'label' ? String(node.text || '').trim() : '',
    contract: node._contract || '',
    lazySlot: !!node.lazySlot,
    skinSlot: node.skinSlot || '',
    styleSlot: node.styleSlot || '',
    width: Number.isFinite(node.width) ? node.width : null,
    height: Number.isFinite(node.height) ? node.height : null,
    widget: node.widget || null,
    layout: node.layout || null,
    children: Array.isArray(node.children) ? node.children.map(buildStructuralSignature) : [],
  };
  return JSON.stringify(payload);
}

function isTabSwitchButtonNode(node) {
  if (!node || typeof node !== 'object') return false;
  return node.type === 'button' && isTabSwitchContract(node._contract || '');
}

function normalizeTabRailAndButtonLayout(node, ctx) {
  if (!node || typeof node !== 'object') return;

  if (isTabSwitchButtonNode(node)) {
    if (!node.layout || node.layout.type !== 'vertical') {
      node.layout = Object.assign({ type: 'vertical' }, node.layout || {});
    }
    if (!node.layout.alignItems) node.layout.alignItems = 'center';
    if (!node.layout.justifyContent || node.layout.justifyContent === 'start') {
      node.layout.justifyContent = 'center';
    }
    if (node.layout.spacingY == null) {
      // HTML tab button 的英文副標通常有 margin-top，映射到垂直間距避免擠在一起。
      node.layout.spacingY = 6;
    }
  }

  if (!Array.isArray(node.children) || node.children.length === 0) return;
  const tabChildren = node.children.filter(isTabSwitchButtonNode);
  if (tabChildren.length < 4) return;

  if (!node.layout || node.layout.type !== 'vertical') {
    node.layout = Object.assign({ type: 'vertical' }, node.layout || {});
  }
  if (!node.layout.alignItems) node.layout.alignItems = 'center';
  // Only force center if there is no padding-top providing the vertical offset.
  // When paddingTop > 0 the source CSS intends flex-start + padding offset;
  // forcing center would negate the padding intent.
  const hasPaddingOffset = node.layout.paddingTop != null && node.layout.paddingTop > 0;
  if (!hasPaddingOffset && (!node.layout.justifyContent || node.layout.justifyContent === 'start')) {
    node.layout.justifyContent = 'center';
    if (ctx && Array.isArray(ctx.warnings)) {
      ctx.warnings.push({
        code: 'tab-rail-justify-center-recovered',
        detail: `${node.name || 'unknown-tab-rail'} set justifyContent=center`,
      });
    }
  }
}

function isTabSwitchContract(contract) {
  return typeof contract === 'string' && /^tab\.switch(?:\.|$)/i.test(contract.trim());
}

function shouldMaterializeLazySlot(attrs, tag) {
  if (!attrs || !attrs['data-slot']) return false;
  const slotName = String(attrs['data-slot']).trim().toLowerCase();
  if (attrs['data-lazy-slot'] === 'true') return true;
  if (typeof attrs['data-default-fragment'] === 'string' && attrs['data-default-fragment'].trim().length > 0) return true;
  if (slotName.startsWith('slot.') || slotName.startsWith('lazy.')) return true;
  // tab/page slot markers are semantic routing hints, not lazy-slot containers.
  if (slotName.startsWith('tab.') || slotName.startsWith('page.')) return false;
  // data-slot on buttons is treated as semantic marker unless explicitly opted-in.
  if (tag === 'button') return false;
  return false;
}

function inferTabSemanticHints(el, tag, attrs, cls, style, ctx) {
  const hints = {
    dataSlot: null,
    dataPanel: null,
    dataContract: null,
    defaultFragment: null,
    warmupHint: null,
    inferredLazySlot: false,
  };

  const id = String(attrs.id || '').trim();
  const clsText = String(cls || '').trim();
  const haystack = `${id} ${clsText}`.toLowerCase();

  if (tag === 'button') {
    const tabId = inferTabIdFromElement(el, attrs);
    const isTabButton = tabId != null || /\btab\b|tab-rail|tabs?\b/.test(haystack);
    if (isTabButton) {
      hints.dataPanel = 'tab-button';
      hints.dataContract = tabId ? `tab.switch.${tabId}` : 'tab.switch';
      if (tabId) hints.dataSlot = `tab.${tabId}`;
      return hints;
    }
  }

  // Runtime portal mount containers should map to lazySlot.
  // Note: prerendered HTML often contains the *current tab snapshot* inside
  // right-content; this content must not be materialized as static layout,
  // otherwise tab switch看起來永遠不變。
  if (tag === 'div') {
    const hasElementChildren = Array.isArray(el.children) && el.children.some((c) => c && c.type === 'element');
    const role = String(attrs.role || '').trim().toLowerCase();
    const hasTabContentContract = Object.prototype.hasOwnProperty.call(attrs, 'data-ucuf-tab-content')
      || Object.prototype.hasOwnProperty.call(attrs, 'data-tab-content')
      || role === 'tabpanel';
    const explicitTabHost = hasTabContentContract || /right-content|tab-content|tab-panel|tab-body/.test(haystack);
    const emptyMountLike = /tab.*(mount|slot|host)/.test(haystack);
    if (explicitTabHost || (!hasElementChildren && emptyMountLike)) {
      // Plan 4.1：tab 內容 host 必須由 HTML contract 推導成 lazySlot，不能再靠畫面專名或舊 div 編號。
      hints.inferredLazySlot = true;
      hints.dataContract = 'tab.content.host';
      hints.defaultFragment = inferDefaultTabFragment(ctx && ctx.opts && ctx.opts.screenId);
      hints.warmupHint = 'first-frame';
      return hints;
    }
  }

  return hints;
}

function inferTabIdFromElement(el, attrs) {
  const raw = String(collectText(el) || '').replace(/\s+/g, '').toUpperCase();
  if (!raw) return null;
  const map = [
    ['將', 'overview'],
    ['GEN', 'overview'],
    ['屬', 'stats'],
    ['STAT', 'stats'],
    ['技', 'tactics'],
    ['TACT', 'tactics'],
    ['命', 'bloodline'],
    ['FATE', 'bloodline'],
    ['寶', 'equip'],
    ['GEAR', 'equip'],
    ['適', 'aptitude'],
    ['APT', 'aptitude'],
  ];
  for (const [hint, tabId] of map) {
    if (raw.includes(hint)) return tabId;
  }
  const dataTab = attrs && typeof attrs['data-tab'] === 'string' ? attrs['data-tab'].trim().toLowerCase() : '';
  return dataTab || null;
}

function inferDefaultTabFragment(screenId) {
  const base = String(screenId || '').trim();
  if (!base) return null;
  const prefix = base.replace(/-main$/i, '');
  return `fragments/layouts/${prefix}-overview-content`;
}

function inferStoryStripHints(el, tag, attrs, cls, ctx) {
  if (tag !== 'div') return null;
  const id = String((attrs && attrs.id) || '').trim();
  const zone = String((attrs && attrs['data-visual-zone']) || '').trim().toLowerCase();
  const clsText = String(cls || '').trim();
  const tokens = collectSemanticTokens(id, zone, clsText);
  if (!hasExplicitStoryStripSignal(attrs, tokens) && !hasStoryStripMultiSignal(tokens)) return null;

  const ownerTab = inferOwnerTabFromElement(attrs, cls, el, ctx) || 'unknown';
  const screenId = String((ctx && ctx.opts && ctx.opts.screenId) || '').trim();
  const prefix = screenId ? screenId.replace(/-main$/i, '') : 'screen';
  if (ctx) ctx._hasStoryStripSlot = true;

  return {
    dataSlot: 'slot.story-strip',
    dataContract: `tab.owner.${ownerTab}`,
    defaultFragment: `fragments/layouts/${prefix}-story-strip-collapsed`,
    fragments: [`fragments/layouts/${prefix}-story-strip-open`],
    warmupHint: 'manual',
    deferredReason: `${ownerTab}-tab-owned-story-strip`,
  };
}

function collectSemanticTokens(...values) {
  const tokens = new Set();
  for (const value of values) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) continue;
    for (const part of raw.split(/\s+/)) {
      if (!part) continue;
      tokens.add(part);
      const compact = part.replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
      if (compact) tokens.add(compact);
      for (const token of part.split(/[^a-z0-9\u4e00-\u9fff]+/i)) {
        if (token) tokens.add(token.toLowerCase());
      }
    }
  }
  return tokens;
}

function hasExplicitStoryStripSignal(attrs, tokens) {
  if (!attrs) return false;
  if (attrs['data-ucuf-story-strip'] != null || attrs['data-story-strip'] != null) return true;
  if (String(attrs['data-slot'] || '').trim() === 'slot.story-strip') return true;
  if (/story-strip/i.test(String(attrs['data-default-fragment'] || ''))) return true;
  return tokens.has('storystrip') || tokens.has('storydock') || tokens.has('chronicle') || tokens.has('chronicles');
}

function hasStoryStripMultiSignal(tokens) {
  // Plan 4.1: 只接受 token 組合，避免 history 這類字串因含 story 而被誤判。
  if (!tokens || tokens.has('history') || tokens.has('historical')) return false;
  const hasStory = tokens.has('story') || tokens.has('chronicle') || tokens.has('chronicles');
  const hasStrip = tokens.has('strip') || tokens.has('wrap') || tokens.has('toggle') || tokens.has('dock') || tokens.has('collapsed') || tokens.has('open');
  return hasStory && hasStrip;
}

function parseFragmentList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function shouldPruneStandaloneStoryStripLabel(text, attrs, ctx) {
  if (!ctx || !ctx._hasStoryStripSlot) return false;
  const rawText = String(text || '').replace(/\s+/g, '').toLowerCase();
  const id = String((attrs && attrs.id) || '').toLowerCase();
  const cls = String((attrs && attrs.class) || '').toLowerCase();
  const onclick = String((attrs && attrs.onclick) || '').toLowerCase();
  const hasStoryLabel = /逸事|chronicles/.test(rawText);
  const tokens = collectSemanticTokens(id, cls);
  const looksLikeStoryToggle = hasExplicitStoryStripSignal(attrs, tokens) || hasStoryStripMultiSignal(tokens) || /togglestrip/.test(onclick);
  const hasInlineAction = !!(attrs && (attrs.onclick || attrs['data-ucuf-action']));
  return hasStoryLabel && looksLikeStoryToggle && hasInlineAction;
}

function registerTabZoneHint(attrs, cls, ctx) {
  if (!ctx) return;
  const tabId = inferOwnerTabFromElement(attrs, cls, null, null);
  if (!tabId) return;
  if (!ctx._knownTabZones) ctx._knownTabZones = new Set();
  ctx._knownTabZones.add(tabId);
}

function inferOwnerTabFromElement(attrs, cls, el, ctx) {
  const candidates = [
    attrs && attrs['data-owner-tab'],
    attrs && attrs['data-tab'],
    attrs && attrs['data-visual-zone'],
    attrs && attrs['data-target'],
    attrs && attrs.id,
    cls,
  ];

  for (const value of candidates) {
    const tabId = normalizeTabToken(value);
    if (tabId) return tabId;
  }

  const text = String((el && collectText(el)) || '').replace(/\s+/g, '').toLowerCase();
  const textTab = normalizeTabToken(text);
  if (textTab) return textTab;

  if (ctx && ctx._knownTabZones && ctx._knownTabZones.size === 1) {
    for (const tabId of ctx._knownTabZones.values()) return tabId;
  }
  return null;
}

function normalizeTabToken(raw) {
  if (!raw) return null;
  const text = String(raw).trim().toLowerCase();
  if (!text) return null;
  for (const [tabId, aliases] of Object.entries(TAB_TOKEN_ALIASES)) {
    if (aliases.some(alias => text.includes(String(alias).toLowerCase()))) return tabId;
  }
  return null;
}

function deriveComputedGeometry(ctx, style, nodeType) {
  if (!ctx || !ctx.opts || !ctx.opts.useComputedStyle || !style || !style._computedRect) return null;
  const position = String(style.position || '').trim().toLowerCase();
  const hasOutOfFlowPosition = position === 'absolute' || position === 'fixed';
  const hasTransform = hasMeaningfulTransform(style.transform);
  const hasImageFit = nodeType === 'image' && hasMeaningfulObjectFit(style.objectFit);
  const hasPercentEdge = [style.left, style.right, style.top, style.bottom]
    .some(value => typeof value === 'string' && /%\s*$/.test(value.trim()));
  const shouldMap = hasOutOfFlowPosition && (hasTransform || hasImageFit || hasPercentEdge);
  if (!shouldMap) return null;

  const rect = normalizeRect(style._computedRect);
  if (!rect) return null;
  const parentRect = lookupComputedParentRect(ctx, style) || {
    x: 0,
    y: 0,
    w: ctx.canvas && ctx.canvas.designWidth ? ctx.canvas.designWidth : 1334,
    h: ctx.canvas && ctx.canvas.designHeight ? ctx.canvas.designHeight : 750,
  };
  const edges = rectToParentEdges(rect, parentRect);
  const widget = {};

  if (style.left != null || style.right == null) widget.left = edges.left;
  if (style.right != null && style.left == null) widget.right = edges.right;
  if (style.left != null && style.right != null) {
    widget.left = edges.left;
    widget.right = edges.right;
  }

  if (style.top != null || style.bottom == null) widget.top = edges.top;
  if (style.bottom != null && style.top == null) widget.bottom = edges.bottom;
  if (style.top != null && style.bottom != null) {
    widget.top = edges.top;
    widget.bottom = edges.bottom;
  }

  return {
    width: Math.max(1, Math.round(rect.w)),
    height: Math.max(1, Math.round(rect.h)),
    widget: Object.keys(widget).length > 0 ? widget : null,
  };
}

function lookupComputedParentRect(ctx, style) {
  const parentId = style && style._computedParentId;
  if (!parentId || !ctx || !ctx.computedStyleByCaptureId) return null;
  const parentSnapshot = ctx.computedStyleByCaptureId[String(parentId)];
  const parentStyles = parentSnapshot && (parentSnapshot.styles || parentSnapshot);
  return normalizeRect(parentStyles && parentStyles._rect);
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== 'object') return null;
  const x = Number(rect.x);
  const y = Number(rect.y);
  const w = Number(rect.w);
  const h = Number(rect.h);
  if (![x, y, w, h].every(Number.isFinite) || w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function rectToParentEdges(rect, parentRect) {
  const left = rect.x - parentRect.x;
  const top = rect.y - parentRect.y;
  const right = (parentRect.x + parentRect.w) - (rect.x + rect.w);
  const bottom = (parentRect.y + parentRect.h) - (rect.y + rect.h);
  return {
    left: Math.round(left),
    top: Math.round(top),
    right: Math.round(right),
    bottom: Math.round(bottom),
  };
}

function hasMeaningfulTransform(value) {
  if (!value) return false;
  const raw = String(value).trim().toLowerCase();
  return raw && raw !== 'none' && raw !== 'matrix(1, 0, 0, 1, 0, 0)';
}

function hasMeaningfulObjectFit(value) {
  if (!value) return false;
  const raw = String(value).trim().toLowerCase();
  return raw && raw !== 'fill';
}

function applyImageFit(node, style) {
  if (!node || !style) return;
  const fit = normalizeObjectFit(style.objectFit);
  if (fit && fit !== 'fill') node.objectFit = fit;
  const position = normalizeObjectPosition(style.objectPosition);
  if (position) node.objectPosition = position;
}

function normalizeObjectFit(value) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  return ['fill', 'contain', 'cover', 'none', 'scale-down'].includes(raw) ? raw : null;
}

function normalizeObjectPosition(value) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase().replace(/\s+/g, ' ');
  return raw && raw !== '50% 50%' ? raw : null;
}

function applyCommonNodeAttrs(node, attrs) {
  // M4: stable identifier + lock flags
  // Plan 4.1：保留 HTML id 作為 runtime binding id，openPanel / aria-controls 才能找到原始 target。
  if (attrs.id && !node.id) node.id = attrs.id;
  if (attrs['data-ucuf-id']) node._ucufId = attrs['data-ucuf-id'];
  if (attrs['data-ucuf-lock']) {
    const lockSpec = String(attrs['data-ucuf-lock']).trim();
    if (lockSpec === 'true' || lockSpec === '1' || lockSpec === '*') {
      node._lockedFields = ['*'];
    } else {
      node._lockedFields = lockSpec.split(/[,\s]+/).filter(Boolean);
    }
  }
  if (attrs['data-visual-zone']) node._visualZone = attrs['data-visual-zone'];
}

function applyCaptureNodeAttrs(node, attrs) {
  const captureId = attrs['data-ucuf-capture-id'];
  if (!captureId) return;
  Object.defineProperty(node, '_captureId', {
    value: String(captureId),
    enumerable: false,
    configurable: true,
  });
}

function applyVisibilityState(node, style, ctx, name) {
  if (!style) return;

  const display = String(style.display || '').trim().toLowerCase();
  const visibility = String(style.visibility || '').trim().toLowerCase();
  if (display === 'none' || visibility === 'hidden' || visibility === 'collapse') {
    node.active = false;
    ctx.warnings.push({ code: 'css-hidden-node-default-inactive', detail: name });
  }

  if (style.opacity != null) {
    const opacity = Number.parseFloat(style.opacity);
    if (Number.isFinite(opacity)) {
      node.opacity = opacity;
      if (opacity <= 0) {
        node.active = false;
        ctx.warnings.push({ code: 'css-opacity-zero-default-inactive', detail: name });
      }
    }
  }
}

function collectBehavior(el, node, style, ctx) {
  const interaction = extractInteraction(el, node, ctx.opts);
  if (interaction.actions.length > 0) {
    node._interactionId = interaction.actions[0].id;
    for (const action of interaction.actions) ctx.interactions.push(action);
  }
  for (const w of interaction.warnings) ctx.warnings.push(w);

  const motion = extractMotion(el, node, style, ctx.keyframes);
  if (motion.motions.length > 0) {
    node._motionId = motion.motions[0].id;
    for (const item of motion.motions) ctx.motions.push(item);
  }
  for (const w of motion.warnings) ctx.warnings.push(w);
}

function inferNodeType(tag, cls, style, attrs, el) {
  if (cls.includes('safe-area')) return 'safe-area';
  if (cls.includes('scroll-y') || cls.includes('scroll-view')) return 'scroll-view';
  if (tag === 'canvas' || tag === 'svg') return 'composite';
  if (cls.some(c => /chart|radar|progress-ring|gauge/.test(c))) return 'composite';
  if (tag === 'img') return 'image';
  if (tag === 'button') return 'button';

  const hasBg = hasMeaningfulBackground(style);
  if (isEmptyFlexSpacer(tag, style, attrs, el, hasBg)) return 'container';
  if (TEXT_TAGS.has(tag)) {
    if (isVisualOnlyInlinePrimitive(tag, style, attrs, el, hasBg)) return 'panel';
    return 'label';
  }
  if (hasOnlyTextContent(el)) return 'label';

  if (hasBg) return 'panel';
  return 'container';
}

function isVisualOnlyInlinePrimitive(tag, style, attrs, el, hasBg) {
  if (!TEXT_TAGS.has(tag)) return false;
  if (String(collectText(el) || '').trim()) return false;
  const width = pickDim(style && style.width, attrs && attrs.width);
  const height = pickDim(style && style.height, attrs && attrs.height);
  if (width == null || height == null) return false;
  return !!hasBg || hasRenderableBorder(style);
}

function isEmptyFlexSpacer(tag, style, attrs, el, hasBg) {
  if (!TEXT_TAGS.has(tag)) return false;
  if (String(collectText(el) || '').trim()) return false;
  if (hasBg || hasRenderableBorder(style)) return false;
  const flexVal = String((style && (style.flexGrow || style.flex)) || '').trim();
  const flexGrowNum = parseFloat(flexVal.split(/\s+/)[0]);
  if (Number.isFinite(flexGrowNum) && flexGrowNum > 0) return true;
  const width = pickDim(style && style.width, attrs && attrs.width);
  const height = pickDim(style && style.height, attrs && attrs.height);
  return width == null && height == null;
}

function hasOnlyTextContent(el) {
  if (!el || !Array.isArray(el.children)) return false;
  let hasText = false;
  for (const child of el.children) {
    if (child.type === 'element') return false;
    if (child.type === 'text' && String(child.value || '').trim()) hasText = true;
  }
  return hasText;
}

function inferCompositeRendererHint(tag, el, attrs) {
  const explicitHint = attrs && attrs['data-composite-hint'];
  if (explicitHint) return explicitHint;
  if (tag !== 'svg' || !el || !Array.isArray(el.children)) return null;
  const elementChildren = el.children.filter(child => child && child.type === 'element');
  const childTags = elementChildren.map(child => String(child.tag || '').toLowerCase());
  const polygonCount = childTags.filter(childTag => childTag === 'polygon').length;
  const lineCount = childTags.filter(childTag => childTag === 'line').length;
  const circleCount = childTags.filter(childTag => childTag === 'circle').length;
  const textCount = childTags.filter(childTag => childTag === 'text').length;
  const groupCount = childTags.filter(childTag => childTag === 'g').length;
  if (polygonCount >= 3 && lineCount >= 4 && (circleCount > 0 || groupCount > 0) && textCount + groupCount >= 4) {
    return 'svg-radar-chart';
  }
  return null;
}

function inferCompositeGeometrySummary(tag, el, attrs) {
  const rendererHint = inferCompositeRendererHint(tag, el, attrs);
  if (rendererHint !== 'svg-radar-chart') return null;
  return extractSvgRadarChartMeta(el, attrs);
}

function extractSvgRadarChartMeta(el, attrs) {
  const viewBox = parseSvgViewBox(attrs && attrs.viewBox);
  const fallbackWidth = parseSvgNumber(attrs && attrs.width) || 0;
  const fallbackHeight = parseSvgNumber(attrs && attrs.height) || fallbackWidth || 0;
  const resolvedViewBox = viewBox || { x: 0, y: 0, width: fallbackWidth, height: fallbackHeight };
  const center = {
    x: resolvedViewBox.x + (resolvedViewBox.width / 2),
    y: resolvedViewBox.y + (resolvedViewBox.height / 2),
  };
  const shapes = {
    polygons: [],
    lines: [],
    circles: [],
    labels: [],
  };
  collectSvgShapes(el, {}, shapes);
  const gridPolygons = shapes.polygons.filter(shape => isSvgNone(shape.fill));
  const dataPolygons = shapes.polygons.filter(shape => !isSvgNone(shape.fill));
  const valuePolygon = dataPolygons[0] || null;
  const textBox = computeSvgTextBounds(shapes.labels);
  return {
    kind: 'radar-chart',
    viewBox: resolvedViewBox,
    center,
    outerRadius: computeSvgOuterRadius(center, shapes.lines, gridPolygons),
    gridPolygons,
    dataPolygons,
    valuePolygon,
    axisLines: shapes.lines,
    labels: shapes.labels,
    textBox,
    markers: shapes.circles,
  };
}

function collectSvgShapes(el, inherited, out) {
  if (!el || !Array.isArray(el.children)) return;
  const nextInherited = Object.assign({}, inherited, normalizeSvgInheritedAttrs(el.attrs || {}));
  for (const child of el.children) {
    if (!child || child.type !== 'element') continue;
    const tag = String(child.tag || '').toLowerCase();
    const attrs = Object.assign({}, nextInherited, child.attrs || {});
    if (tag === 'polygon') {
      const points = parseSvgPoints(attrs.points);
      if (points.length >= 3) {
        out.polygons.push({
          points,
          stroke: normalizeSvgPaint(attrs.stroke),
          strokeWidth: parseSvgNumber(attrs.strokeWidth || attrs['stroke-width']),
          fill: normalizeSvgPaint(attrs.fill),
          opacity: parseSvgOpacity(attrs.opacity || attrs.fillOpacity || attrs['fill-opacity']),
        });
      }
    } else if (tag === 'line') {
      const x1 = parseSvgNumber(attrs.x1);
      const y1 = parseSvgNumber(attrs.y1);
      const x2 = parseSvgNumber(attrs.x2);
      const y2 = parseSvgNumber(attrs.y2);
      if ([x1, y1, x2, y2].every(v => Number.isFinite(v))) {
        out.lines.push({
          x1,
          y1,
          x2,
          y2,
          stroke: normalizeSvgPaint(attrs.stroke),
          strokeWidth: parseSvgNumber(attrs.strokeWidth || attrs['stroke-width']),
        });
      }
    } else if (tag === 'circle') {
      const cx = parseSvgNumber(attrs.cx);
      const cy = parseSvgNumber(attrs.cy);
      const r = parseSvgNumber(attrs.r);
      if ([cx, cy, r].every(v => Number.isFinite(v))) {
        out.circles.push({
          cx,
          cy,
          r,
          fill: normalizeSvgPaint(attrs.fill),
          stroke: normalizeSvgPaint(attrs.stroke),
          strokeWidth: parseSvgNumber(attrs.strokeWidth || attrs['stroke-width']),
        });
      }
    } else if (tag === 'text') {
      const text = collectText(child);
      const x = parseSvgNumber(attrs.x);
      const y = parseSvgNumber(attrs.y);
      if (text && Number.isFinite(x) && Number.isFinite(y)) {
        const fontSize = parseSvgNumber(attrs.fontSize || attrs['font-size']) || 13;
        out.labels.push({
          text,
          x,
          y,
          fill: normalizeSvgPaint(attrs.fill),
          fontSize,
          fontWeight: attrs.fontWeight || attrs['font-weight'] || undefined,
          fontFamily: attrs.fontFamily || attrs['font-family'] || undefined,
          textAnchor: attrs.textAnchor || attrs['text-anchor'] || undefined,
          box: estimateSvgTextBox(text, fontSize),
        });
      }
    }
    collectSvgShapes(child, attrs, out);
  }
}

function normalizeSvgInheritedAttrs(attrs) {
  const out = {};
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value == null || value === '') continue;
    if (
      key === 'stroke'
      || key === 'fill'
      || key === 'stroke-width'
      || key === 'strokeWidth'
      || key === 'font-size'
      || key === 'fontSize'
      || key === 'font-family'
      || key === 'fontFamily'
      || key === 'font-weight'
      || key === 'fontWeight'
      || key === 'text-anchor'
      || key === 'textAnchor'
      || key === 'opacity'
      || key === 'fill-opacity'
      || key === 'fillOpacity'
    ) {
      out[key] = value;
    }
  }
  return out;
}

function parseSvgViewBox(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  const parts = text.split(/[\s,]+/).map(part => parseFloat(part)).filter(Number.isFinite);
  if (parts.length !== 4) return null;
  return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] };
}

function parseSvgPoints(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  const parts = text.split(/[\s,]+/).map(part => parseFloat(part)).filter(Number.isFinite);
  const points = [];
  for (let index = 0; index + 1 < parts.length; index += 2) {
    points.push({ x: parts[index], y: parts[index + 1] });
  }
  return points;
}

function parseSvgNumber(raw) {
  if (raw == null || raw === '') return null;
  const match = String(raw).trim().match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  return parseFloat(match[0]);
}

function parseSvgOpacity(raw) {
  const value = parseSvgNumber(raw);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeSvgPaint(raw) {
  const value = String(raw || '').trim();
  return value || null;
}

function isSvgNone(value) {
  return !value || String(value).trim().toLowerCase() === 'none';
}

function computeSvgOuterRadius(center, axisLines, gridPolygons) {
  let radius = 0;
  for (const line of axisLines || []) {
    radius = Math.max(radius, Math.hypot(line.x2 - center.x, line.y2 - center.y));
  }
  for (const polygon of gridPolygons || []) {
    for (const point of polygon.points || []) {
      radius = Math.max(radius, Math.hypot(point.x - center.x, point.y - center.y));
    }
  }
  return radius > 0 ? Number(radius.toFixed(4)) : null;
}

function estimateSvgTextBox(text, fontSize) {
  const size = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 13;
  let width = 0;
  for (const ch of String(text || '')) {
    if (/\s/.test(ch)) width += size * 0.32;
    else if (/[\u3400-\u9FFF\uF900-\uFAFF]/.test(ch)) width += size;
    else if (/[A-Z0-9]/.test(ch)) width += size * 0.68;
    else if (/[a-z]/.test(ch)) width += size * 0.58;
    else width += size * 0.5;
  }
  return {
    width: Math.ceil(Math.max(size * 1.8, width + size * 0.8)),
    height: Math.ceil(Math.max(size + 4, size * 1.4)),
  };
}

function computeSvgTextBounds(labels) {
  const items = Array.isArray(labels) ? labels.filter(label => label && label.box) : [];
  if (items.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const label of items) {
    const width = Number(label.box.width) || 0;
    const height = Number(label.box.height) || 0;
    const x = Number(label.x) || 0;
    const y = Number(label.y) || 0;
    const anchor = String(label.textAnchor || '').toLowerCase();
    const left = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x;
    const top = y - height / 2;
    minX = Math.min(minX, left);
    minY = Math.min(minY, top);
    maxX = Math.max(maxX, left + width);
    maxY = Math.max(maxY, top + height);
  }
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  return {
    x: Number(minX.toFixed(4)),
    y: Number(minY.toFixed(4)),
    width: Number((maxX - minX).toFixed(4)),
    height: Number((maxY - minY).toFixed(4)),
  };
}

function anchorToWidget(anchor, style) {
  const base = anchor && ANCHOR_MAP[anchor]
    ? Object.assign({}, ANCHOR_MAP[anchor])
    : {};
  if (style) {
    assignWidgetEdge(base, 'top', style.top);
    assignWidgetEdge(base, 'left', style.left);
    assignWidgetEdge(base, 'right', style.right);
    assignWidgetEdge(base, 'bottom', style.bottom);
  }
  return Object.keys(base).length > 0 ? base : undefined;
}

function assignWidgetEdge(target, key, rawValue) {
  if (!rawValue) return;
  const px = parsePx(rawValue);
  if (px != null) {
    target[key] = px;
    return;
  }
  const raw = String(rawValue).trim();
  if (/^-?\d+(?:\.\d+)?%$/.test(raw)) target[key] = raw;
}

function collectElementStyle(el, ctx) {
  const attrs = (el && el.attrs) || {};
  const cls = (attrs.class || '').split(/\s+/).filter(Boolean);
  const styleFromInline = parseInlineStyle(attrs.style || '');
  const styleFromClass = mergeClassStyles(cls, ctx.classRules || {}, ctx.styleRules || [], attrs, el && el.tag);
  const styleFromId = attrs.id ? ((ctx.idRules || {})[attrs.id] || {}) : {};
  const style = mergeComputedStyle(
    Object.assign({}, styleFromClass, styleFromId, styleFromInline),
    attrs,
    ctx,
  );
  return { attrs, cls, style };
}

function inferLayout(style, ctx, nodeName, el) {
  if (!style) return null;
  if (style.display === 'grid') return inferGridLayout(style, ctx, nodeName);
  if (style.display !== 'flex') return inferBlockFlowLayout(style, ctx, nodeName, el);
  const isRow = (style.flexDirection || 'row').startsWith('row');
  const out = { type: isRow ? 'horizontal' : 'vertical' };
  const alignItems = mapFlexAlignItems(style.alignItems);
  if (alignItems) out.alignItems = alignItems;
  const justifyContent = mapFlexJustifyContent(style.justifyContent);
  if (justifyContent) out.justifyContent = justifyContent;
  const gap = resolveLength(style.gap, ctx && ctx.tokenRegistry);
  if (gap.value != null) {
    if (isRow) out.spacingX = gap.value; else out.spacingY = gap.value;
    if (gap.token && ctx) recordTokenUsage(ctx, 'spacing', gap.token, `${nodeName}.gap`);
  }
  const box = resolveBoxEdges(style, 'padding', ctx && ctx.tokenRegistry);
  if (box) {
    out.paddingTop = box.top;
    out.paddingRight = box.right;
    out.paddingBottom = box.bottom;
    out.paddingLeft = box.left;
    if (box.tokens && ctx) {
      for (const token of box.tokens) recordTokenUsage(ctx, 'spacing', token, `${nodeName}.padding`);
    }
  }
  return out;
}

function mapFlexAlignItems(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'flex-start' || raw === 'start') return 'start';
  if (raw === 'center') return 'center';
  if (raw === 'flex-end' || raw === 'end') return 'end';
  if (raw === 'baseline') return 'baseline';
  if (raw === 'stretch') return 'stretch';
  return null;
}

function mapFlexJustifyContent(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'flex-start' || raw === 'start' || raw === 'normal') return 'start';
  if (raw === 'center') return 'center';
  if (raw === 'flex-end' || raw === 'end') return 'end';
  if (raw === 'space-between') return 'space-between';
  if (raw === 'space-around') return 'space-around';
  if (raw === 'space-evenly') return 'space-evenly';
  return null;
}

function inferGridLayout(style, ctx, nodeName) {
  const columnSpec = String(style.gridTemplateColumns || '').trim();
  const rowSpec = String(style.gridTemplateRows || '').trim();

  // 若 gridTemplateColumns 含有 fr 單位（如 "220px 1fr"、"1fr 1fr"），
  // 這種「彈性欄」無法映射到 Cocos 的固定格 grid。
  // 改為 horizontal layout，讓子節點依內容尺寸橫向排列。
  if (/\bfr\b/.test(columnSpec)) {
    const out = { type: 'horizontal' };
    const gap = resolveGridGap(style, ctx && ctx.tokenRegistry);
    if (gap.x != null) out.spacingX = gap.x;
    if (gap.y != null) out.spacingY = gap.y;
    if (gap.token && ctx) recordTokenUsage(ctx, 'spacing', gap.token, `${nodeName}.gap`);
    const alignItems = mapFlexAlignItems(style.alignItems);
    if (alignItems) out.alignItems = alignItems;
    return out;
  }

  const cols = countGridTracks(columnSpec);
  const out = { type: 'grid' };
  const gap = resolveGridGap(style, ctx && ctx.tokenRegistry);
  if (gap.x != null) out.spacingX = gap.x;
  if (gap.y != null) out.spacingY = gap.y;
  if (gap.token && ctx) recordTokenUsage(ctx, 'spacing', gap.token, `${nodeName}.gap`);
  if (cols > 0) {
    out.constraint = 'fixed-col';
    out.constraintNum = cols;
    const inferredCellWidth = inferGridCellWidth(style, cols, gap.x || 0, columnSpec);
    if (inferredCellWidth != null) out.cellWidth = inferredCellWidth;
  }
  const inferredCellHeight = inferGridCellHeight(style, rowSpec);
  if (inferredCellHeight != null) out.cellHeight = inferredCellHeight;
  return out;
}

function inferBlockFlowLayout(style, ctx, nodeName, el) {
  const childElements = (el.children || []).filter(c => c.type === 'element');
  const padding = resolveBoxEdges(style, 'padding', ctx && ctx.tokenRegistry);
  if (childElements.length < 2 && !padding) return null;
  if (childElements.length === 0) return null;
  if (childElements.some(child => childHasOutOfFlowPosition(child, ctx))) return null;

  const out = { type: 'vertical' };
  if (padding) {
    out.paddingTop = padding.top;
    out.paddingRight = padding.right;
    out.paddingBottom = padding.bottom;
    out.paddingLeft = padding.left;
    if (padding.tokens && ctx) {
      for (const token of padding.tokens) recordTokenUsage(ctx, 'spacing', token, `${nodeName}.padding`);
    }
  }
  const spacingY = inferChildBlockSpacing(childElements, ctx);
  if (spacingY > 0) out.spacingY = spacingY;
  return out;
}

function countGridTracks(spec) {
  if (!spec || spec === 'none') return 0;
  const repeat = spec.match(/^repeat\(\s*(\d+)\s*,/i);
  if (repeat) return parseInt(repeat[1], 10) || 0;
  return spec.split(/\s+/).filter(Boolean).length;
}

function inferGridCellWidth(style, cols, gap, columnSpec) {
  const width = parsePx(style.width);
  if (width != null && cols > 0) {
    return Math.max(1, Math.floor((width - Math.max(0, cols - 1) * gap) / cols));
  }
  const trackWidths = parseGridTrackPixels(columnSpec);
  if (trackWidths && trackWidths.length === cols) {
    const first = trackWidths[0];
    if (trackWidths.every(value => value === first)) return first;
  }
  return null;
}

function inferGridCellHeight(style, rowSpec) {
  const height = parsePx(style.height);
  if (height != null) return height;
  const trackHeights = parseGridTrackPixels(rowSpec);
  if (trackHeights && trackHeights.length > 0) {
    const first = trackHeights[0];
    if (trackHeights.every(value => value === first)) return first;
  }
  return null;
}

function parseGridTrackPixels(spec) {
  const expanded = expandGridRepeat(String(spec || '').trim());
  if (!expanded) return null;
  const tokens = expanded.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const out = [];
  for (const token of tokens) {
    const px = parsePx(token);
    if (px == null) return null;
    out.push(px);
  }
  return out;
}

function expandGridRepeat(spec) {
  if (!spec || spec === 'none') return '';
  return spec.replace(/repeat\(\s*(\d+)\s*,\s*([^\)]+)\)/gi, (_all, countRaw, bodyRaw) => {
    const count = parseInt(countRaw, 10);
    const body = String(bodyRaw || '').trim();
    if (!Number.isFinite(count) || count <= 0 || !body) return '';
    return Array.from({ length: count }, () => body).join(' ');
  });
}

function resolveGridGap(style, registry) {
  const gap = resolveGapPair(style.gap, registry);
  const columnGap = resolveLength(style.columnGap, registry);
  const rowGap = resolveLength(style.rowGap, registry);
  return {
    x: columnGap.value != null ? columnGap.value : gap.x,
    y: rowGap.value != null ? rowGap.value : gap.y,
    token: columnGap.token || rowGap.token || gap.token,
  };
}

function resolveGapPair(value, registry) {
  if (value == null) return { x: null, y: null, token: null };
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { x: null, y: null, token: null };
  const first = resolveLength(parts[0], registry);
  const second = resolveLength(parts[1] || parts[0], registry);
  return {
    y: first.value,
    x: second.value,
    token: second.token || first.token,
  };
}

function childHasOutOfFlowPosition(child, ctx) {
  const childStyle = collectElementStyle(child, ctx).style;
  const position = String(childStyle.position || '').trim().toLowerCase();
  return position === 'absolute' || position === 'fixed';
}

function inferChildBlockSpacing(childElements, ctx) {
  let spacing = 0;
  for (const child of childElements) {
    const childStyle = collectElementStyle(child, ctx).style;
    const margin = parseBox(childStyle.margin, ctx && ctx.tokenRegistry);
    const marginBottom = resolveLength(childStyle.marginBottom, ctx && ctx.tokenRegistry).value
      ?? (margin && margin.bottom)
      ?? 0;
    spacing = Math.max(spacing, marginBottom);
  }
  return spacing;
}

function stabilizeGridLayout(node) {
  if (!node || !node.layout || node.layout.type !== 'grid') return;
  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return;

  const maxChildWidth = maxFinite(children.map(child => child && child.width));
  const maxChildHeight = maxFinite(children.map(child => child && child.height));

  if (Number.isFinite(node.layout.cellWidth) && maxChildWidth > node.layout.cellWidth) {
    delete node.layout.cellWidth;
  }
  if (Number.isFinite(node.layout.cellHeight) && maxChildHeight > node.layout.cellHeight) {
    delete node.layout.cellHeight;
  }
}

function maxFinite(values) {
  let out = 0;
  for (const value of values) {
    if (!Number.isFinite(value)) continue;
    if (value > out) out = value;
  }
  return out;
}

function parseBox(v, registry) {
  if (!v) return null;
  const resolved = String(v).trim().split(/\s+/).map(p => resolveLength(p, registry));
  if (resolved.some(p => p.value == null)) return null;
  const parts = resolved.map(p => p.value);
  const tokens = [...new Set(resolved.map(p => p.token).filter(Boolean))];
  const withTokens = (box) => Object.assign(box, tokens.length ? { tokens } : {});
  if (parts.length === 1) return withTokens({ top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] });
  if (parts.length === 2) return withTokens({ top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] });
  if (parts.length === 3) return withTokens({ top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] });
  return withTokens({ top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] });
}

function resolveBoxEdges(style, prefix, registry) {
  const shorthand = parseBox(style[prefix], registry);
  const edgeValue = (edge) => resolveLength(style[`${prefix}${edge}`], registry);
  const top = edgeValue('Top');
  const right = edgeValue('Right');
  const bottom = edgeValue('Bottom');
  const left = edgeValue('Left');
  if (!shorthand && [top, right, bottom, left].every(edge => edge.value == null)) return null;
  const base = shorthand || { top: 0, right: 0, bottom: 0, left: 0 };
  const tokens = [
    ...(shorthand && shorthand.tokens ? shorthand.tokens : []),
    top.token,
    right.token,
    bottom.token,
    left.token,
  ].filter(Boolean);
  const out = {
    top: top.value ?? base.top,
    right: right.value ?? base.right,
    bottom: bottom.value ?? base.bottom,
    left: left.value ?? base.left,
  };
  if (tokens.length === 0 && out.top === 0 && out.right === 0 && out.bottom === 0 && out.left === 0) return null;
  return tokens.length ? Object.assign(out, { tokens: [...new Set(tokens)] }) : out;
}

function parsePx(v) {
  if (v == null) return null;
  const m = String(v).match(/^(-?\d+(?:\.\d+)?)(px)?$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]));
}

function pickDim(styleVal, attrVal) {
  const a = parsePx(styleVal);
  if (a != null) return a;
  if (typeof styleVal === 'string' && /^\d+(?:\.\d+)?%$/.test(styleVal.trim())) return styleVal.trim();
  const b = parsePx(attrVal);
  if (b != null) return b;
  if (typeof attrVal === 'string' && /^\d+(?:\.\d+)?%$/.test(attrVal.trim())) return attrVal.trim();
  return null;
}

function resolveLength(value, registry) {
  if (value == null) return { value: null, token: null };
  const cssVar = parseCssVar(value);
  if (cssVar && registry && registry.cssVars.has(cssVar)) {
    const hit = registry.cssVars.get(cssVar);
    if (hit.kind === 'spacing' || hit.kind === 'fontSize' || hit.kind === 'lineHeight') {
      return { value: hit.value, token: hit.token, cssVar };
    }
  }
  const px = parsePx(value);
  if (px == null) return { value: null, token: null };
  const token = registry && registry.spacingByValue ? registry.spacingByValue.get(px) : null;
  return { value: px, token: token ? `spacing.${token}` : null };
}

function resolveLineHeight(value, registry, fontSize) {
  if (value == null) return { value: null, token: null };
  const cssVar = parseCssVar(value);
  if (cssVar && registry && registry.cssVars.has(cssVar)) {
    const hit = registry.cssVars.get(cssVar);
    if (hit.kind === 'lineHeight') return { value: hit.value, token: hit.token, cssVar };
  }

  const raw = String(value).trim();
  if (/^-?\d+(?:\.\d+)?$/.test(raw)) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) {
      return { value: Math.round(n * fontSize), token: null };
    }
  }
  if (/^-?\d+(?:\.\d+)?%$/.test(raw)) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) {
      return { value: Math.round((n / 100) * fontSize), token: null };
    }
  }
  if (/^-?\d+(?:\.\d+)?em$/.test(raw)) {
    const n = parseFloat(raw);
    if (Number.isFinite(n) && n > 0) {
      return { value: Math.round(n * fontSize), token: null };
    }
  }

  const px = parsePx(value);
  if (px == null) return { value: null, token: null };
  const token = registry && registry.spacingByValue ? registry.spacingByValue.get(px) : null;
  return { value: px, token: token ? `spacing.${token}` : null };
}

function parseCssVar(value) {
  const m = String(value || '').trim().toLowerCase().match(/^var\(\s*(--[a-z0-9_-]+)\s*\)$/);
  return m ? m[1] : null;
}

function autoName(ctx, tag) {
  ctx.nameCounters[tag] = (ctx.nameCounters[tag] || 0) + 1;
  return `${pascal(ctx.opts.screenId)}_${tag}_${ctx.nameCounters[tag]}`;
}

function autoSlotId(ctx, nodeName) {
  const safeName = String(nodeName).replace(/[^A-Za-z0-9_.-]/g, '_').toLowerCase();
  return `auto.${ctx.opts.screenId}.${safeName}`;
}

function appendNodeWithGeneratedSiblings(target, node) {
  if (!node) return;
  const generatedBefore = Array.isArray(node._generatedBefore) ? node._generatedBefore : [];
  for (const generatedNode of generatedBefore) {
    if (generatedNode) target.push(generatedNode);
  }
  delete node._generatedBefore;
  target.push(node);
}

function pascal(s) {
  return String(s || 'Screen').replace(/(^|[-_\s]+)(\w)/g, (_, __, c) => c.toUpperCase());
}

function mergeClassStyles(classes, classRules, styleRules = [], attrs = {}, tag = '') {
  const out = {};
  const classSet = new Set(classes);
  if (Array.isArray(styleRules) && styleRules.length > 0) {
    for (const rule of styleRules) {
      if (!matchesSimpleStyleRule(rule, classSet, attrs, tag)) continue;
      Object.assign(out, rule.decl || {});
    }
    return out;
  }
  for (const className of classes) {
    if (classRules[className]) Object.assign(out, classRules[className]);
  }
  return out;
}

function matchesSimpleStyleRule(rule, classSet, attrs = {}, tag = '') {
  if (!rule || !rule.decl) return false;
  if (rule.tag && String(tag || '').toLowerCase() !== rule.tag) return false;
  if (rule.id && String(attrs.id || '') !== rule.id) return false;
  const classes = Array.isArray(rule.classes) ? rule.classes : [];
  return classes.every(className => classSet.has(className));
}

function collectText(el) {
  const parts = [];
  for (const c of el.children) {
    if (c.type === 'text') parts.push(c.value);
    else if (c.type === 'element') parts.push(collectText(c));
  }
  return parts.join('').trim().replace(/\s+/g, ' ');
}

// R-9 (general rule): offline `text-transform` for Label text. Exported as a
// pure helper so the same general rule applies to every UI source going through
// the converter. Locale-safe via String.prototype.toLocaleUpperCase /
// toLocaleLowerCase, which leave non-cased scripts (e.g. CJK) unchanged.
function applyTextTransformGeneral(text, transform) {
  if (!text) return text;
  const t = String(transform || '').trim().toLowerCase();
  if (!t || t === 'none') return text;
  if (t === 'uppercase') return text.toLocaleUpperCase();
  if (t === 'lowercase') return text.toLocaleLowerCase();
  if (t === 'capitalize') {
    return text.replace(/(^|\s)(\S)/g, (_, ws, ch) => ws + ch.toLocaleUpperCase());
  }
  if (t === 'full-width') {
    return text.replace(/[!-~]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0xFEE0));
  }
  return text;
}

function containsRichInner(el) {
  for (const c of el.children) {
    if (c.type === 'element' && RICH_TEXT_INNER_TAGS.has(c.tag)) return true;
  }
  return false;
}

function looksSimplified(text) {
  if (!text) return false;
  for (const ch of SIMPLIFIED_CHINESE_HINTS) if (text.includes(ch)) return true;
  return false;
}

function ensureSpriteSlot(ctx, slotId, attrs, style, sizeHint) {
  if (ctx.skinSlots[slotId]) return;
  const explicitPath = attrs['data-sprite'] || attrs.src;
  const path = explicitPath || `sprites/${ctx.opts.bundle || ctx.opts.defaultBundle}/${ctx.opts.screenId}/${slotId.split('.').pop()}`;
  const guarded = guardSpritePath(ctx, path, slotId, !!explicitPath);
  const slot = {
    kind: 'sprite-frame',
    path: guarded.path,
  };
  if (sizeHint && sizeHint.width != null) slot.expectedWidth = sizeHint.width;
  if (sizeHint && sizeHint.height != null) slot.expectedHeight = sizeHint.height;
  if (NINESLICE_FAMILY_HINTS.some(f => path.includes(f))) {
    slot.nineSlice = { left: 24, right: 24, top: 24, bottom: 24, _autoFilled: true };
  }
  ctx.skinSlots[slotId] = slot;
}

function ensureSpriteOrColorSlot(ctx, slotId, style, attrs, sizeHint) {
  if (ctx.skinSlots[slotId]) return;
  if (attrs['data-sprite']) {
    return ensureSpriteSlot(ctx, slotId, attrs, style, sizeHint);
  }
  const backgroundImage = meaningfulBackgroundImage(style.backgroundImage);
  const gradientBackgroundImage = backgroundImage || meaningfulGradientBackground(style.background);
  const gradientSlot = buildGradientRectSlot(ctx, gradientBackgroundImage, slotId);
  if (gradientSlot) {
    attachBoxShapeMetadata(ctx, gradientSlot, style, slotId);
    ctx.skinSlots[slotId] = gradientSlot;
    return;
  }
  if (backgroundImage && /url\(/.test(backgroundImage)) {
    const m = backgroundImage.match(/url\(["']?([^"')]+)["']?\)/);
    return ensureSpriteSlot(ctx, slotId, { 'data-sprite': m ? stripExt(m[1]) : '' }, style, sizeHint);
  }
  // color rect
  const bg = pickBackgroundFill(style);
  if (bg) {
    const { color, opacity, warning, tokenSource } = parseColor(bg, ctx.tokenRegistry);
    if (warning) ctx.warnings.push({ code: warning, slotId });
    if (!color) {
      ctx.skinSlots[slotId] = {
        kind: 'transparent',
        _unmappedBackground: bg,
      };
      ctx.warnings.push({ code: 'unmapped-color', detail: bg });
      return;
    }
    if (color) recordTokenUsage(ctx, 'colors', color, `${slotId}.color${tokenSource ? ':' + tokenSource : ''}`);
    const slot = {
      kind: 'color-rect',
      color,
      opacity: opacity != null ? opacity : 1,
    };
    attachBoxShapeMetadata(ctx, slot, style, slotId);
    ctx.skinSlots[slotId] = slot;
  } else if (hasRenderableBorder(style)) {
    const slot = {
      kind: 'color-rect',
      color: '#000000',
      opacity: 0,
    };
    attachBoxShapeMetadata(ctx, slot, style, slotId);
    ctx.skinSlots[slotId] = slot;
  } else {
    // No CSS background at all -> emit transparent skin so we don't render
    // a fake unmappedColor rectangle that visually pollutes the runtime.
    ctx.skinSlots[slotId] = { kind: 'transparent' };
  }
}

function ensureTabButtonSkinSlot(ctx, slotId, attrs, style) {
  if (ctx.skinSlots[slotId]) return;

  const explicitNormal = attrs['data-tab-normal'] || attrs['data-sprite'] || null;
  const explicitSelected = attrs['data-tab-selected'] || null;
  const normalPath = guardSpritePath(ctx, explicitNormal || TAB_BUTTON_SKIN_NORMAL, `${slotId}.normal`, !!explicitNormal).path;
  const selectedPath = guardSpritePath(ctx, explicitSelected || TAB_BUTTON_SKIN_SELECTED, `${slotId}.selected`, !!explicitSelected).path;

  const slot = {
    kind: 'button-skin',
    normal: normalPath,
    pressed: normalPath,
    disabled: normalPath,
    selected: selectedPath,
    spriteType: 'simple',
    allowAutoAtlas: true,
  };

  const radius = resolveUniformCornerRadius(style);
  if (radius > 0) {
    const edge = Math.max(12, Math.round(radius));
    slot.border = [edge, edge, edge, edge];
  }

  ctx.skinSlots[slotId] = slot;
}

function attachBoxShapeMetadata(ctx, slot, style, slotId) {
  const radius = resolveUniformCornerRadius(style);
  if (radius > 0) slot.cornerRadius = radius;

  const borderWidth = resolveUniformBorderWidth(style);
  if (borderWidth <= 0) return;

  slot.borderWidth = borderWidth;
  const borderColor = resolveUniformBorderColor(ctx, style, slotId);
  if (borderColor) {
    slot.borderColor = borderColor;
  } else {
    ctx.warnings.push({ code: 'unmapped-border-color', slotId, detail: style && (style.borderColor || style.border) });
  }
}

function hasRenderableBorder(style) {
  return resolveUniformBorderWidth(style) > 0;
}

function resolveUniformBorderWidth(style) {
  if (!style) return 0;
  const styleCandidates = [style.borderStyle, style.borderTopStyle, style.borderRightStyle, style.borderBottomStyle, style.borderLeftStyle, style.border];
  if (styleCandidates.some(value => /(^|\s)(none|hidden)(\s|$)/i.test(String(value || '')))) return 0;

  const candidates = [
    style.borderWidth,
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
    style.border,
  ];
  for (const candidate of candidates) {
    const width = parseBorderWidthValue(candidate);
    if (width > 0) return width;
  }
  return 0;
}

function parseBorderWidthValue(value) {
  if (value == null) return 0;
  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'hidden') return 0;
  if (raw === 'thin') return 1;
  if (raw === 'medium') return 3;
  if (raw === 'thick') return 5;
  const match = raw.match(/(?:^|\s)([\d.]+)px(?:\s|$)/) || raw.match(/^([\d.]+)$/);
  if (!match) return 0;
  const width = Number.parseFloat(match[1]);
  return Number.isFinite(width) ? Math.max(0, width) : 0;
}

function resolveUniformBorderColor(ctx, style, slotId) {
  if (!style) return null;
  const candidate = firstMeaningfulBorderColor([
    style.borderColor,
    style.borderTopColor,
    style.borderRightColor,
    style.borderBottomColor,
    style.borderLeftColor,
    extractBorderColor(style.border),
  ]);
  if (!candidate) return null;

  const parsed = parseColor(candidate, ctx.tokenRegistry);
  if (parsed.color && parsed.opacity == null) {
    recordTokenUsage(ctx, 'colors', parsed.color, `${slotId}.borderColor`);
    return parsed.color;
  }

  const literal = normalizeCssColorLiteral(candidate);
  if (literal) return literal;

  if (parsed.color) {
    recordTokenUsage(ctx, 'colors', parsed.color, `${slotId}.borderColor`);
    return parsed.color;
  }
  return null;
}

function firstMeaningfulBorderColor(candidates) {
  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw || /^(currentcolor|transparent)$/i.test(raw)) continue;
    return raw;
  }
  return null;
}

function extractBorderColor(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const rgba = raw.match(/rgba?\([^)]*\)/i);
  if (rgba) return rgba[0];
  const hex = raw.match(/#[0-9a-f]{3,8}\b/i);
  if (hex) return hex[0];
  const cssVar = raw.match(/var\([^)]*\)/i);
  if (cssVar) return cssVar[0];
  return null;
}

function normalizeCssColorLiteral(value) {
  const raw = String(value || '').trim().toLowerCase();
  const hex = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hex) {
    if (hex[1].length === 8) return `#${hex[1]}`;
    return normalizeHex(raw);
  }

  const rgba = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (!rgba) return null;
  const r = clampCssByte(+rgba[1]);
  const g = clampCssByte(+rgba[2]);
  const b = clampCssByte(+rgba[3]);
  const a = rgba[4] != null ? clampCssByte(Math.round(+rgba[4] * 255)) : 255;
  const channels = [r, g, b, a].map(n => n.toString(16).padStart(2, '0'));
  return a < 255 ? `#${channels.join('')}` : `#${channels.slice(0, 3).join('')}`;
}

function clampCssByte(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(255, Math.round(value)));
}

function buildGradientRectSlot(ctx, backgroundImage, slotId) {
  if (!backgroundImage) return null;
  const layers = parseBackgroundImage(backgroundImage);
  let gradientLayer = null;
  if (layers.length === 1 && layers[0].kind === 'gradient') {
    gradientLayer = layers[0];
  } else if (layers.length > 1) {
    const gradientLayers = layers.filter(layer => layer && layer.kind === 'gradient' && layer.gradient);
    if (gradientLayers.length > 0) {
      gradientLayer = gradientLayers[gradientLayers.length - 1];
      ctx.warnings.push({
        code: 'multi-layer-background-approximated',
        slotId,
        detail: 'using last gradient layer and preserving backgroundLayers for fidelity review',
      });
    }
  }
  if (!gradientLayer) return null;
  const gradient = gradientLayer.gradient;
  if (!gradient || !/^(linear|radial)$/.test(String(gradient.type || ''))) return null;
  const stops = (gradient.stops || []).map((stop) => {
    const parsed = parseColor(stop.color, ctx.tokenRegistry);
    if (parsed.warning) ctx.warnings.push({ code: parsed.warning, slotId });
    return {
      color: parsed.color || stop.color,
      offset: typeof stop.offset === 'number' ? stop.offset : 0,
      opacity: parsed.opacity != null ? parsed.opacity : undefined,
    };
  });
  if (stops.length < 2) return null;
  const backgroundLayers = layers.map(layer => {
    if (!layer || layer.kind !== 'gradient' || !layer.gradient) return layer;
    return {
      kind: 'gradient',
      gradient: Object.assign({}, layer.gradient, {
        repeatSpanPx: typeof layer.gradient.repeatSpanPx === 'number' ? layer.gradient.repeatSpanPx : undefined,
        repeatSpanRatio: typeof layer.gradient.repeatSpanRatio === 'number' ? layer.gradient.repeatSpanRatio : undefined,
        stops: (layer.gradient.stops || []).map(stop => ({
          color: stop.color,
          offset: typeof stop.offset === 'number' ? stop.offset : 0,
        })),
      }),
    };
  });
  return {
    kind: 'gradient-rect',
    backgroundLayers,
    gradient: {
      type: gradient.type,
      repeating: gradient.repeating === true,
      angle: typeof gradient.angle === 'number' ? gradient.angle : 180,
      repeatSpanPx: typeof gradient.repeatSpanPx === 'number' ? gradient.repeatSpanPx : undefined,
      repeatSpanRatio: typeof gradient.repeatSpanRatio === 'number' ? gradient.repeatSpanRatio : undefined,
      shape: gradient.shape || undefined,
      center: gradient.center || undefined,
      radius: gradient.radius || undefined,
      stops,
    },
  };
}

function buildEffectSiblingNodes(ctx, node, style, name, width, height) {
  if (!ctx || !style || !node || !canUseGeneratedEffectSibling(node, width, height)) return [];
  const shadows = collectOuterShadows(style);
  if (shadows.length === 0) return [];

  const padding = calculateShadowPadding(shadows);
  const slotId = autoSlotId(ctx, `${name}_cssShadow`);
  if (!ctx.skinSlots[slotId]) {
    ctx.skinSlots[slotId] = {
      kind: 'shadow-set',
      boxShadows: shadows,
      padding,
      cornerRadius: resolveUniformCornerRadius(style),
    };
  }

  const effectNode = {
    type: 'panel',
    name: `${name}_CssShadow`,
    width: Math.max(1, Math.round(width + padding.left + padding.right)),
    height: Math.max(1, Math.round(height + padding.top + padding.bottom)),
    widget: expandWidgetForEffect(node.widget, padding),
    skinSlot: slotId,
    _cssEffect: 'shadow',
    _generatedEffectFor: name,
  };
  if (node.active === false) effectNode.active = false;
  return [effectNode];
}

function canUseGeneratedEffectSibling(node, width, height) {
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) return false;
  const widget = node && node.widget;
  if (!widget || typeof widget !== 'object') return false;
  const hasHorizontalAnchor = widget.left !== undefined || widget.right !== undefined || widget.hCenter !== undefined;
  const hasVerticalAnchor = widget.top !== undefined || widget.bottom !== undefined || widget.vCenter !== undefined;
  return hasHorizontalAnchor && hasVerticalAnchor;
}

function collectOuterShadows(style) {
  const shadows = [];
  for (const shadow of parseShadowList(style.boxShadow || '')) {
    if (shadow && !shadow.inset) shadows.push(normalizeShadow(shadow));
  }
  for (const shadow of parseDropShadowFilters(style.filter || '')) {
    if (shadow && !shadow.inset) shadows.push(normalizeShadow(shadow));
  }
  return shadows.filter(Boolean);
}

function normalizeShadow(shadow) {
  return {
    x: Math.round(Number(shadow.x) || 0),
    y: Math.round(Number(shadow.y) || 0),
    blur: Math.max(0, Math.round(Number(shadow.blur) || 0)),
    spread: Math.round(Number(shadow.spread) || 0),
    color: shadow.color || 'rgba(0,0,0,0.35)',
    inset: !!shadow.inset,
  };
}

function parseDropShadowFilters(filterValue) {
  if (!filterValue || String(filterValue).trim().toLowerCase() === 'none') return [];
  const raw = String(filterValue);
  const shadows = [];
  let cursor = 0;
  while (cursor < raw.length) {
    const start = raw.toLowerCase().indexOf('drop-shadow(', cursor);
    if (start < 0) break;
    const argsStart = start + 'drop-shadow('.length;
    let depth = 1;
    let index = argsStart;
    for (; index < raw.length; index += 1) {
      const char = raw[index];
      if (char === '(') depth += 1;
      else if (char === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) break;
    const args = raw.slice(argsStart, index).trim();
    shadows.push(...parseShadowList(args));
    cursor = index + 1;
  }
  return shadows;
}

function calculateShadowPadding(shadows) {
  const padding = { left: 0, right: 0, top: 0, bottom: 0 };
  for (const shadow of shadows) {
    const spread = Number(shadow.spread) || 0;
    const blur = Number(shadow.blur) || 0;
    const extent = Math.max(0, spread + blur);
    const offsetX = Number(shadow.x) || 0;
    const offsetY = Number(shadow.y) || 0;
    padding.left = Math.max(padding.left, Math.ceil(extent - offsetX));
    padding.right = Math.max(padding.right, Math.ceil(extent + offsetX));
    padding.top = Math.max(padding.top, Math.ceil(extent - offsetY));
    padding.bottom = Math.max(padding.bottom, Math.ceil(extent + offsetY));
  }
  return padding;
}

function expandWidgetForEffect(widget, padding) {
  const out = Object.assign({}, widget || {});
  if (typeof out.left === 'number') out.left = out.left - padding.left;
  if (typeof out.right === 'number') out.right = out.right - padding.right;
  if (typeof out.top === 'number') out.top = out.top - padding.top;
  if (typeof out.bottom === 'number') out.bottom = out.bottom - padding.bottom;
  if (typeof out.hCenter === 'number') out.hCenter = out.hCenter + (padding.right - padding.left) * 0.5;
  if (typeof out.vCenter === 'number') out.vCenter = out.vCenter + (padding.top - padding.bottom) * 0.5;
  return out;
}

function resolveUniformCornerRadius(style) {
  if (!style) return 0;
  const values = [
    style.borderTopLeftRadius,
    style.borderTopRightRadius,
    style.borderBottomRightRadius,
    style.borderBottomLeftRadius,
  ].map(value => resolveRadiusValue(value, style)).filter(value => value != null);
  const shorthand = parseUniformBorderRadius(style.borderRadius, style);
  if (values.length === 0) return shorthand != null ? shorthand : 0;
  if (values.every(value => value === values[0])) return values[0];
  return shorthand != null ? shorthand : Math.max(...values);
}

function parseUniformBorderRadius(value, style) {
  if (value == null) return null;
  const raw = String(value).split('/')[0].trim();
  if (!raw) return null;
  const values = raw.split(/\s+/).map(item => resolveRadiusValue(item, style)).filter(item => item != null);
  if (values.length === 0) return null;
  if (values.every(item => item === values[0])) return values[0];
  return Math.max(...values);
}

function resolveRadiusValue(value, style) {
  const px = parsePx(value);
  if (px != null) return px;
  if (value == null) return null;
  const raw = String(value).trim();
  const percentMatch = raw.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (!percentMatch) return null;
  const basis = resolveCornerRadiusBasis(style);
  if (!(basis > 0)) return null;
  return Math.round(basis * (parseFloat(percentMatch[1]) / 100));
}

function resolveCornerRadiusBasis(style) {
  if (!style || typeof style !== 'object') return null;
  const width = resolveRadiusDimension([
    style.width,
    style.maxWidth,
    style.minWidth,
    style._computedLocalRect && style._computedLocalRect.w,
    style._computedRect && style._computedRect.w,
  ]);
  const height = resolveRadiusDimension([
    style.height,
    style.maxHeight,
    style.minHeight,
    style._computedLocalRect && style._computedLocalRect.h,
    style._computedRect && style._computedRect.h,
  ]);
  if (width != null && height != null) return Math.min(width, height);
  if (width != null) return width;
  if (height != null) return height;
  return null;
}

function resolveRadiusDimension(candidates) {
  for (const candidate of candidates || []) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      return Math.round(candidate);
    }
    const px = parsePx(candidate);
    if (px != null && px > 0) return px;
  }
  return null;
}

function emitSkinLayers(ctx, name, style, attrs) {
  // 多層視覺合併建議：背景圖 + 背景色 + 描邊 -> 三層 skinLayers
  const layers = [];
  if (style.backgroundColor && style.backgroundImage) {
    const colorSlot = autoSlotId(ctx, name + '_bg');
    const imgSlot = autoSlotId(ctx, name + '_image');
    ensureSpriteOrColorSlot(ctx, colorSlot, { background: style.backgroundColor }, {}, {});
    ensureSpriteOrColorSlot(ctx, imgSlot, {}, { 'data-sprite': extractUrl(style.backgroundImage) }, {});
    layers.push({ slotId: colorSlot, order: 0 });
    layers.push({ slotId: imgSlot, order: 1 });
  }
  return layers.length > 0 ? layers : null;
}

function normalizeFidelitySnapshotMap(input) {
  const out = {};
  if (!input) return out;
  if (Array.isArray(input)) {
    for (const snapshot of input) {
      if (!snapshot || snapshot.pseudo || snapshot.id == null) continue;
      out[String(snapshot.id)] = normalizeFidelitySnapshot(snapshot, String(snapshot.id));
    }
    return out;
  }
  for (const [key, value] of Object.entries(input)) {
    if (!value) continue;
    out[String(key)] = normalizeFidelitySnapshot(value, String(key));
  }
  return out;
}

function normalizeFidelityPseudoMap(input) {
  const out = {};
  const values = Array.isArray(input) ? input : Object.values(input || {});
  for (const snapshot of values) {
    if (!snapshot || !snapshot.pseudo || snapshot.parentId == null) continue;
    const parentId = String(snapshot.parentId);
    if (!out[parentId]) out[parentId] = [];
    out[parentId].push({
      id: snapshot.id != null ? String(snapshot.id) : '',
      pseudo: snapshot.pseudo,
      styles: snapshot.styles || {},
    });
  }
  for (const list of Object.values(out)) {
    list.sort((a, b) => pseudoOrder(a.pseudo) - pseudoOrder(b.pseudo));
  }
  return out;
}

function pseudoOrder(pseudo) {
  return pseudo === 'before' ? 0 : pseudo === 'after' ? 1 : 2;
}

function normalizeFidelitySnapshot(value, fallbackId) {
  const styles = value && value.styles ? value.styles : value;
  return {
    id: value && value.id != null ? value.id : fallbackId,
    parentId: value && value.parentId != null ? value.parentId : null,
    offsetParentId: value && value.offsetParentId != null ? value.offsetParentId : null,
    styles: styles || {},
  };
}

function mergeComputedStyle(style, attrs, ctx) {
  if (!ctx || !ctx.opts || !ctx.opts.useComputedStyle) return style;
  const captureId = attrs && attrs['data-ucuf-capture-id'];
  if (!captureId) return style;
  const snapshot = ctx.computedStyleByCaptureId[String(captureId)];
  if (!snapshot) return style;
  const computed = snapshot.styles || snapshot;
  const out = Object.assign({}, style);
  out._computedCaptureId = String(captureId);
  if (snapshot.parentId != null) out._computedParentId = String(snapshot.parentId);
  if (snapshot.offsetParentId != null) out._computedOffsetParentId = String(snapshot.offsetParentId);
  if (computed._rect) out._computedRect = computed._rect;
  if (computed._localRect) out._computedLocalRect = computed._localRect;
  const computedBgColor = meaningfulCssColor(computed['background-color']);
  if (computedBgColor) out._computedBackgroundColor = computedBgColor;
  const computedBgImage = meaningfulBackgroundImage(computed['background-image']);
  if (computedBgImage) out.backgroundImage = computedBgImage;
  assignComputed(out, 'color', computed.color, meaningfulCssColor);
  assignComputed(out, 'width', computed.width, meaningfulCssLength);
  assignComputed(out, 'height', computed.height, meaningfulCssLength);
  assignComputed(out, 'top', computed.top, meaningfulCssLength);
  assignComputed(out, 'right', computed.right, meaningfulCssLength);
  assignComputed(out, 'bottom', computed.bottom, meaningfulCssLength);
  assignComputed(out, 'left', computed.left, meaningfulCssLength);
  assignComputed(out, 'marginTop', computed['margin-top'], meaningfulCssLength);
  assignComputed(out, 'marginRight', computed['margin-right'], meaningfulCssLength);
  assignComputed(out, 'marginBottom', computed['margin-bottom'], meaningfulCssLength);
  assignComputed(out, 'marginLeft', computed['margin-left'], meaningfulCssLength);
  assignComputed(out, 'paddingTop', computed['padding-top'], meaningfulCssLength);
  assignComputed(out, 'paddingRight', computed['padding-right'], meaningfulCssLength);
  assignComputed(out, 'paddingBottom', computed['padding-bottom'], meaningfulCssLength);
  assignComputed(out, 'paddingLeft', computed['padding-left'], meaningfulCssLength);
  assignComputed(out, 'fontSize', computed['font-size'], meaningfulCssLength);
  assignComputed(out, 'fontFamily', computed['font-family'], meaningfulCssText);
  assignComputed(out, 'fontWeight', computed['font-weight'], meaningfulCssText);
  assignComputed(out, 'fontStyle', computed['font-style'], meaningfulCssText);
  assignComputed(out, 'display', computed.display, meaningfulCssText);
  assignComputed(out, 'flexDirection', computed['flex-direction'], meaningfulCssText);
  assignComputed(out, 'alignItems', computed['align-items'], meaningfulCssText);
  assignComputed(out, 'justifyContent', computed['justify-content'], meaningfulCssText);
  assignComputed(out, 'gap', computed.gap, meaningfulCssLength);
  assignComputed(out, 'rowGap', computed['row-gap'], meaningfulCssLength);
  assignComputed(out, 'columnGap', computed['column-gap'], meaningfulCssLength);
  assignComputed(out, 'lineHeight', computed['line-height'], meaningfulLineHeight);
  assignComputed(out, 'letterSpacing', computed['letter-spacing'], meaningfulCssLength);
  assignComputed(out, 'textAlign', computed['text-align'], meaningfulCssText);
  assignComputed(out, 'whiteSpace', computed['white-space'], meaningfulCssText);
  assignComputed(out, 'textTransform', computed['text-transform'], meaningfulCssText);
  assignComputed(out, 'position', computed.position, meaningfulCssText);
  assignComputed(out, 'transform', computed.transform, meaningfulCssText);
  assignComputed(out, 'objectFit', computed['object-fit'], meaningfulCssText);
  assignComputed(out, 'objectPosition', computed['object-position'], meaningfulCssText);
  assignComputed(out, 'overflow', computed.overflow, meaningfulCssText);
  assignComputed(out, 'boxShadow', computed['box-shadow'], meaningfulNonDefaultCssText);
  assignComputed(out, 'textShadow', computed['text-shadow'], meaningfulNonDefaultCssText);
  assignComputed(out, 'filter', computed.filter, meaningfulNonDefaultCssText);
  assignComputed(out, 'backdropFilter', computed['backdrop-filter'], meaningfulNonDefaultCssText);
  assignComputed(out, 'clipPath', computed['clip-path'], meaningfulNonDefaultCssText);
  assignComputed(out, 'WebkitClipPath', computed['-webkit-clip-path'], meaningfulNonDefaultCssText);
  assignComputed(out, 'maskImage', computed['mask-image'], meaningfulNonDefaultCssText);
  assignComputed(out, 'WebkitMaskImage', computed['-webkit-mask-image'], meaningfulNonDefaultCssText);
  assignComputed(out, 'border', computed.border, meaningfulNonDefaultCssText);
  assignComputed(out, 'borderWidth', computed['border-width'], meaningfulCssLength);
  assignComputed(out, 'borderColor', computed['border-color'], meaningfulCssColor);
  assignComputed(out, 'borderStyle', computed['border-style'], meaningfulCssText);
  assignComputed(out, 'borderTopWidth', computed['border-top-width'], meaningfulCssLength);
  assignComputed(out, 'borderRightWidth', computed['border-right-width'], meaningfulCssLength);
  assignComputed(out, 'borderBottomWidth', computed['border-bottom-width'], meaningfulCssLength);
  assignComputed(out, 'borderLeftWidth', computed['border-left-width'], meaningfulCssLength);
  assignComputed(out, 'borderTopColor', computed['border-top-color'], meaningfulCssColor);
  assignComputed(out, 'borderRightColor', computed['border-right-color'], meaningfulCssColor);
  assignComputed(out, 'borderBottomColor', computed['border-bottom-color'], meaningfulCssColor);
  assignComputed(out, 'borderLeftColor', computed['border-left-color'], meaningfulCssColor);
  assignComputed(out, 'borderTopStyle', computed['border-top-style'], meaningfulCssText);
  assignComputed(out, 'borderRightStyle', computed['border-right-style'], meaningfulCssText);
  assignComputed(out, 'borderBottomStyle', computed['border-bottom-style'], meaningfulCssText);
  assignComputed(out, 'borderLeftStyle', computed['border-left-style'], meaningfulCssText);
  assignComputed(out, 'borderTopLeftRadius', computed['border-top-left-radius'], meaningfulCssLength);
  assignComputed(out, 'borderTopRightRadius', computed['border-top-right-radius'], meaningfulCssLength);
  assignComputed(out, 'borderBottomRightRadius', computed['border-bottom-right-radius'], meaningfulCssLength);
  assignComputed(out, 'borderBottomLeftRadius', computed['border-bottom-left-radius'], meaningfulCssLength);
  return out;
}

function applyClipPathMetadata(node, style) {
  const clipPath = meaningfulClipPath(
    style && (style.clipPath || style.WebkitClipPath || style.webkitClipPath)
  );
  if (clipPath) node.clipPath = clipPath;
}

function meaningfulClipPath(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'none') return null;
  if (/^(polygon|inset|circle|ellipse)\s*\(/i.test(raw)) return raw;
  return null;
}

function buildPseudoVisualNodes(ctx, parentStyle, parentName, pseudoKind, hasElementChildren) {
  if (!ctx || !ctx.opts || !ctx.opts.useComputedStyle || !parentStyle || !parentStyle._computedCaptureId) return [];
  const list = ctx.pseudoStyleByParentCaptureId && ctx.pseudoStyleByParentCaptureId[String(parentStyle._computedCaptureId)];
  if (!Array.isArray(list) || list.length === 0) return [];
  if (hasElementChildren) {
    if (pseudoKind === 'after') {
      ctx.warnings.push({ code: 'pseudo-overlay-skipped-child-stacking-risk', detail: parentName });
    }
    return [];
  }
  return list
    .filter(snapshot => snapshot.pseudo === pseudoKind)
    .map(snapshot => buildPseudoVisualNode(ctx, parentName, snapshot))
    .filter(Boolean);
}

function buildPseudoVisualNode(ctx, parentName, snapshot) {
  const style = normalizeComputedVisualStyle(snapshot.styles || {});
  if (!hasMeaningfulBackground(style)) return null;
  const suffix = snapshot.pseudo === 'before' ? 'Before' : 'After';
  const nodeName = `${parentName}_Pseudo${suffix}`;
  const slotId = autoSlotId(ctx, nodeName);
  ensureSpriteOrColorSlot(ctx, slotId, style, {}, {});
  const slot = ctx.skinSlots[slotId];
  if (!slot || slot.kind === 'transparent') return null;
  const node = {
    type: 'panel',
    name: nodeName,
    widget: { top: 0, left: 0, right: 0, bottom: 0 },
    skinSlot: slotId,
    _cssPseudo: snapshot.pseudo,
  };
  const opacity = parseOpacity(style.opacity);
  if (opacity !== null) node.opacity = opacity;
  return node;
}

function normalizeComputedVisualStyle(computed) {
  const out = {};
  const computedBgColor = meaningfulCssColor(computed['background-color']);
  if (computedBgColor) out._computedBackgroundColor = computedBgColor;
  const computedBgImage = meaningfulBackgroundImage(computed['background-image']);
  if (computedBgImage) out.backgroundImage = computedBgImage;
  assignComputed(out, 'opacity', computed.opacity, meaningfulCssText);
  assignComputed(out, 'overflow', computed.overflow, meaningfulCssText);
  return out;
}

function parseOpacity(value) {
  if (value == null) return null;
  const n = Number(String(value).trim());
  if (!Number.isFinite(n) || n >= 1) return null;
  return Math.max(0, Math.min(1, n));
}

function assignComputed(target, key, value, normalize) {
  const normalized = normalize(value);
  if (normalized) target[key] = normalized;
}

function hasMeaningfulBackground(style) {
  return !!(meaningfulBackgroundImage(style && style.backgroundImage) || pickBackgroundFill(style));
}

function pickBackgroundFill(style) {
  if (!style) return null;
  return meaningfulCssColor(style._computedBackgroundColor)
    || meaningfulBackgroundValue(style.background)
    || meaningfulCssColor(style.backgroundColor);
}

function meaningfulBackgroundValue(value) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'transparent' || isTransparentCssColor(raw)) return null;
  if (!/gradient\(|url\(/i.test(raw) && /\bnone\b/i.test(raw) && containsTransparentCssColor(raw)) return null;
  return value;
}

function meaningfulBackgroundImage(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'none') return null;
  return raw;
}

function meaningfulGradientBackground(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!/gradient\(/i.test(raw)) return null;
  return raw;
}

function meaningfulCssColor(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'transparent' || isTransparentCssColor(raw)) return null;
  return raw;
}

function containsTransparentCssColor(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return false;
  if (/\btransparent\b/.test(raw)) return true;
  return /rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*(0|0?\.0+))\s*\)/i.test(raw);
}

function meaningfulCssLength(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'normal') return null;
  return raw;
}

function meaningfulLineHeight(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw || raw.toLowerCase() === 'normal') return null;
  return raw;
}

function meaningfulCssText(value) {
  if (!value) return null;
  const raw = String(value).trim();
  return raw || null;
}

function meaningfulNonDefaultCssText(value) {
  const raw = meaningfulCssText(value);
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (normalized === 'none' || normalized === 'normal') return null;
  return raw;
}

function isTransparentCssColor(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (raw === 'rgba(0, 0, 0, 0)' || raw === 'rgb(0 0 0 / 0)' || raw === 'rgba(0 0 0 / 0)') return true;
  const comma = raw.match(/^rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*(0(?:\.0+)?)\s*\)$/);
  if (comma) return true;
  const slash = raw.match(/^rgba?\(\s*\d+\s+\d+\s+\d+\s*\/\s*(0(?:\.0+)?|0%)\s*\)$/);
  return !!slash;
}

function ensureLabelStyle(ctx, slotId, style, attrs, text = '') {
  if (ctx.skinSlots[slotId]) return;
  const fontSizeResolved = resolveLength(style.fontSize, ctx.tokenRegistry);
  const fontSize = fontSizeResolved.value || numAttr(attrs['data-font-size']) || 16;
  const lineHeightResolved = resolveLineHeight(style.lineHeight, ctx.tokenRegistry, fontSize);
  const lineHeight = lineHeightResolved.value || Math.round(fontSize * 1.4);
  const letterSpacing = computeLetterSpacing(style.letterSpacing, fontSize);
  const colorParsed = style.color ? parseColor(style.color, ctx.tokenRegistry) : { color: 'textPrimary' };
  const typographyToken = resolveTypographyToken(ctx.tokenRegistry, fontSize, lineHeight);
  const slot = {
    kind: 'label-style',
    font: attrs['data-font'] || pickFontByTag(style, ctx),
    fontSize,
    lineHeight,
    letterSpacing,
    color: colorParsed.color || 'textPrimary',
    // §37.2 鐵律 1：黑色輪廓 + 寬度 2，沒明確指定就自動填
    outlineColor: 'colorOutlineDark',
    outlineWidth: 2,
    horizontalAlign: (style.textAlign || 'LEFT').toUpperCase(),
  };
  const overflow = inferLabelOverflow(style, text);
  if (overflow) slot.overflow = overflow;
  if (typographyToken) {
    slot.style = typographyToken;
    recordTokenUsage(ctx, 'typography', `typography.${typographyToken}`, `${slotId}.style`);
  }
  if (isBoldWeight(style.fontWeight)) slot.isBold = true;
  if (isItalicStyle(style.fontStyle)) slot.isItalic = true;
  // R-11: emit native Cocos Label shadow data when source CSS has a single,
  // non-inset text-shadow. Multi-layer / inset shadows fall back to assetize
  // via css-capability-matrix and are not attached here.
  const textShadow = parseSimpleTextShadow(style.textShadow);
  if (textShadow) {
    slot.shadow = textShadow;
  }
  if (colorParsed.color) recordTokenUsage(ctx, 'colors', colorParsed.color, `${slotId}.color`);
  if (fontSizeResolved.token) recordTokenUsage(ctx, 'typography', fontSizeResolved.token, `${slotId}.fontSize`);
  if (lineHeightResolved.token) recordTokenUsage(ctx, 'typography', lineHeightResolved.token, `${slotId}.lineHeight`);
  ctx.skinSlots[slotId] = slot;
  if (!colorParsed.color && style.color) {
    ctx.warnings.push({ code: 'unmapped-color', slotId, detail: style.color });
  }
}

function inferLabelOverflow(style, text) {
  const whiteSpace = String(style.whiteSpace || '').trim().toLowerCase();
  if (whiteSpace === 'nowrap' || whiteSpace === 'pre') return null;
  const normalizedText = String(text || '').trim();
  if (!normalizedText) return null;
  const textAlign = String(style.textAlign || '').trim().toLowerCase();
  const longText = Array.from(normalizedText).length >= 48;
  if (textAlign === 'justify' || longText || /[。！？.!?]\s*/.test(normalizedText)) {
    return 'RESIZE_HEIGHT';
  }
  return null;
}

function isItalicStyle(value) {
  return /^(italic|oblique)/i.test(String(value || '').trim());
}

function computeLetterSpacing(value, fontSize) {
  if (value == null) return 0;
  if (typeof value === 'string' && value.endsWith('em') && fontSize) {
    const n = parseFloat(value);
    if (Number.isFinite(n)) return Number((n * fontSize).toFixed(2));
  }
  const raw = String(value).trim();
  const match = raw.match(/^(-?\d+(?:\.\d+)?)(px)?$/i);
  if (match) return Number(parseFloat(match[1]).toFixed(2));
  return 0;
}

// R-10: Generic font-family stack → project font asset resolver.
// 通則：CSS font-family 是優先級堆疊（"A","B",fallback），converter 必須依序嘗試
// 比對到第一個有資產的 family；不能因為堆疊裡有一個 generic `serif` 就把所有
// font 都打成同一份資產。Registry 為資料導向，加新字型只需要在此加一筆。
const PROJECT_FONT_REGISTRY = [
  // 具名專案字型（exact / alias）
  { match: /^newsreader$/i,                            asset: 'fonts/newsreader/font' },
  { match: /^manrope$/i,                               asset: 'fonts/manrope/font' },
  { match: /^notosans[\s_-]?tc$|^noto sans tc$|^noto sans cjk tc$/i, asset: 'fonts/notosans_tc/font' },
  // 系統 CJK（落到 NotoSansTC，runtime 字模幾何最接近）
  { match: /^pingfang tc$|^microsoft jhengHei$|^microsoft yahei$|^hiragino sans gb$|^思源黑體$|^蘋方$/i, asset: 'fonts/notosans_tc/font' },
  // 系統 serif（落到 Newsreader）
  { match: /^songti tc$|^stsong$|^playfair display$|^merriweather$/i, asset: 'fonts/newsreader/font' },
  // CSS generic family（最後一道保險）
  { match: /^serif$/i,                                 asset: 'fonts/newsreader/font' },
  { match: /^sans-serif$|^system-ui$|^ui-sans-serif$/i, asset: 'fonts/notosans_tc/font' },
];

const PROJECT_FONT_DEFAULT = 'fonts/notosans_tc/font';

function resolveFontFamilyToAsset(fontFamilyValue, registry, defaultAsset) {
  const reg = Array.isArray(registry) ? registry : PROJECT_FONT_REGISTRY;
  const def = typeof defaultAsset === 'string' ? defaultAsset : PROJECT_FONT_DEFAULT;
  if (!fontFamilyValue || typeof fontFamilyValue !== 'string') return def;
  const families = fontFamilyValue
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
  for (const fam of families) {
    for (const entry of reg) {
      if (entry.match.test(fam)) return entry.asset;
    }
  }
  return def;
}

function pickFontByTag(style, ctx) {
  const extra = (ctx && Array.isArray(ctx.fontFaceRegistry)) ? ctx.fontFaceRegistry : [];
  // Layered registry: source-CSS @font-face mappings win over project defaults.
  const layered = extra.length > 0 ? extra.concat(PROJECT_FONT_REGISTRY) : PROJECT_FONT_REGISTRY;
  return resolveFontFamilyToAsset(style && style.fontFamily, layered, PROJECT_FONT_DEFAULT);
}

// R-12: build per-conversion font registry from `@font-face` blocks in the
// source stylesheets. Each block contributes one regex→asset entry that takes
// precedence over `PROJECT_FONT_REGISTRY`. `customResolver` (optional) lets
// callers override the default convention-based asset path. Generic helper —
// reusable by any pipeline that wants to inject ad-hoc font mappings.
function buildFontFaceRegistry(styleSheets, customResolver) {
  const reg = [];
  for (const sheet of (styleSheets || [])) {
    const mappings = extractFontFaceMappings(sheet);
    for (const m of mappings) {
      if (!m.family) continue;
      const asset = (typeof customResolver === 'function')
        ? customResolver(m.family, m.src, m.srcs)
        : resolveFontAssetByConvention(m.family, m.src);
      if (!asset) continue;
      const escaped = m.family.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      reg.push({ match: new RegExp(`^${escaped}$`, 'i'), asset, source: '@font-face', family: m.family });
    }
  }
  return reg;
}

// R-12 helper: convention-based resolver — derives a Cocos font asset path
// from the @font-face family + src URL. Default convention:
//   `fonts/<sanitized-family>/font` (matches existing repo layout
//    assets/resources/fonts/<family>/font.ttf)
// `src` is currently unused but retained for future hash-based mapping.
function resolveFontAssetByConvention(family, src) {
  if (!family) return null;
  const known = PROJECT_FONT_REGISTRY.find(entry => entry.match && entry.match.test(String(family).trim()));
  if (known && known.asset) return known.asset;
  const sanitized = String(family)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (!sanitized) return null;
  return `fonts/${sanitized}/font`;
}

// R-11 (general rule): `text-shadow` simple single-shadow form is natively
// supported by Cocos Label (`enableShadow`/`shadowOffset`/`shadowBlur`/
// `shadowColor`). The converter must parse the CSS value offline and emit
// structured `{ color, offsetX, offsetY, blur }` onto the label-style slot, so
// runtime never has to re-parse CSS strings. Multi-layer / inset shadows
// remain `assetize` (handled by css-capability-matrix R-11). This helper is
// exported so any mapper / future label slot generator can reuse it.
function parseSimpleTextShadow(value) {
  if (!value || typeof value !== 'string') return null;
  const raw = value.trim();
  if (!raw || raw.toLowerCase() === 'none') return null;
  // Reject multi-layer shadows (multiple comma-separated shadow descriptors).
  // Commas inside rgba(...)/hsla(...) must not count.
  const probe = raw.replace(/rgba?\([^)]*\)/gi, 'C').replace(/hsla?\([^)]*\)/gi, 'C');
  if (probe.split(',').filter(s => s.trim()).length > 1) return null;
  // Tokenize: keep parenthesized color groups intact.
  const tokens = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '(') break; // shouldn't happen at top-level
    // color forms with parentheses
    const colorParen = raw.slice(i).match(/^(rgba?|hsla?)\([^)]*\)/i);
    if (colorParen) { tokens.push(colorParen[0]); i += colorParen[0].length; continue; }
    // hex / named color / length
    const tok = raw.slice(i).match(/^[^\s]+/);
    if (!tok) break;
    tokens.push(tok[0]); i += tok[0].length;
  }
  if (tokens.length < 2) return null;
  // Color may appear at start or end. Identify color token.
  const colorRe = /^(#[0-9a-f]{3,8}|rgba?\(|hsla?\(|[a-z]+)/i;
  const isLength = (t) => /^-?\d+(?:\.\d+)?(px|em|rem|%)?$/.test(t);
  let colorTok = null;
  let lengths = [];
  for (const t of tokens) {
    if (isLength(t)) lengths.push(t);
    else if (!colorTok && colorRe.test(t)) colorTok = t;
    else if (isLength(t)) lengths.push(t);
  }
  if (lengths.length < 2) return null;
  const toPx = (t) => {
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : 0;
  };
  const offsetX = toPx(lengths[0]);
  const offsetY = toPx(lengths[1]);
  const blur = lengths.length >= 3 ? Math.max(0, toPx(lengths[2])) : 0;
  return {
    offsetX,
    offsetY,
    blur,
    color: normalizeCssColorToHex(colorTok) || '#00000080',
  };
}

// R-11 helper: normalize rgb()/rgba()/#hex/#hex8 forms to `#RRGGBBAA` so that
// downstream UISkinResolver.resolveColor() (which only understands hex/token)
// can consume converter output without a CSS parser at runtime. Returns null
// if the value cannot be normalized; caller decides fallback.
function normalizeCssColorToHex(value) {
  if (!value || typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  if (/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(v)) {
    let h = v.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('') + 'ff';
    else if (h.length === 4) h = h.split('').map(c => c + c).join('');
    else if (h.length === 6) h = h + 'ff';
    return '#' + h.toUpperCase();
  }
  const m = v.match(/^rgba?\(\s*([^)]+)\)$/i);
  if (m) {
    const parts = m[1].split(/\s*[,/]\s*|\s+/).filter(Boolean);
    if (parts.length < 3) return null;
    const toByte = (p) => {
      if (/%$/.test(p)) return Math.round(parseFloat(p) * 255 / 100);
      const n = parseFloat(p);
      return Number.isFinite(n) ? Math.max(0, Math.min(255, Math.round(n))) : 0;
    };
    const r = toByte(parts[0]);
    const g = toByte(parts[1]);
    const b = toByte(parts[2]);
    let a = 255;
    if (parts.length >= 4) {
      const ap = parts[3];
      const an = /%$/.test(ap) ? parseFloat(ap) / 100 : parseFloat(ap);
      if (Number.isFinite(an)) a = Math.max(0, Math.min(255, Math.round(an * 255)));
    }
    const hex = (n) => n.toString(16).padStart(2, '0').toUpperCase();
    return '#' + hex(r) + hex(g) + hex(b) + hex(a);
  }
  return null;
}

function resolveTypographyToken(registry, fontSize, lineHeight) {
  if (!registry || !registry.typographyByMetric) return null;
  return registry.typographyByMetric.get(`${fontSize}/${lineHeight}`) || null;
}

function isBoldWeight(value) {
  if (!value) return false;
  const raw = String(value).trim().toLowerCase();
  if (raw === 'bold' || raw === 'bolder') return true;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 600;
}

function numAttr(v) {
  if (v == null) return null;
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : null;
}

function stripExt(p) {
  return String(p).replace(/\.(png|jpg|jpeg|webp)$/i, '');
}

function extractUrl(bgImage) {
  const m = String(bgImage).match(/url\(["']?([^"')]+)["']?\)/);
  return m ? stripExt(m[1]) : '';
}

const NAMED_COLOR_TOKENS = {
  '#000': 'colorBlack',
  '#000000': 'colorBlack',
  '#1a1a1a': 'colorOutlineDark',
  '#fff': 'colorWhite',
  '#ffffff': 'colorWhite',
};

/**
 * Best-effort parse of a CSS color into a token reference + opacity split.
 * @returns {{color:string|null, opacity:number|null, warning?:string}}
 */
function parseColor(input, registry) {
  if (!input) return { color: null, opacity: null };
  const v = String(input).trim().toLowerCase();
  if (v === 'transparent') return { color: '#000000', opacity: 0 };
  const cssVar = parseCssVar(v);
  if (cssVar) {
    const hit = registry && registry.cssVars ? registry.cssVars.get(cssVar) : null;
    if (!hit) return { color: null, opacity: null, warning: 'unmapped-css-var' };
    if (hit.kind !== 'color') return { color: null, opacity: null, warning: 'css-var-kind-mismatch' };
    return { color: hit.token, opacity: null, tokenSource: `css-var:${cssVar}` };
  }
  // hex
  let m = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/);
  if (m) {
    const norm = normalizeHex('#' + m[1]);
    const token = (registry && registry.colorByHex ? registry.colorByHex.get(norm) : null) || NAMED_COLOR_TOKENS[norm];
    return { color: token || null, opacity: null };
  }
  // rgba / rgb
  m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/);
  if (m) {
    const r = +m[1], g = +m[2], b = +m[3], a = m[4] != null ? +m[4] : 1;
    const hex = '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
    let token = registry && registry.colorByHex ? registry.colorByHex.get(hex) || null : null;
    if (!token) token = NAMED_COLOR_TOKENS[hex] || null;
    return { color: token, opacity: a };
  }
  return { color: null, opacity: null };
}

function inspectArtDirectionRisks(style, name, ctx, el) {
  if (!style) return;
  if (style.transform && style.transform !== 'none') {
    if (!deriveComputedGeometry(ctx, style, null)) {
      pushArtWarning(ctx, 'css-transform-manual-layout-risk', name, 'CSS transform 可能造成 Cocos widget 對位與縮放殘差');
    }
  }
  if (style.overflow && style.overflow !== 'visible') {
    pushArtWarning(ctx, 'overflow-hidden-clipping-risk', name, 'overflow 裁切可能吃掉水墨 bleed、glow 或九宮外沿');
  }
  if (style.zIndex != null) {
    pushArtWarning(ctx, 'z-index-manual-zorder-risk', name, 'z-index 需要人工確認 UCUF children / skinLayers 順序');
  }
  if (style.borderRadius && isAsymmetricRadius(style.borderRadius)) {
    pushArtWarning(ctx, 'asymmetric-border-radius-approximated', name, '非對稱圓角不適合直接轉成單一九宮或 color-rect');
  }
  if ((style.filter && style.filter !== 'none') || (style.backdropFilter && style.backdropFilter !== 'none') || style.boxShadow) {
    pushArtWarning(ctx, 'css-effect-needs-art-review', name, 'filter / shadow 應改成可控 sprite layer，不宜直接近似');
  }
  if (style.opacity && Number.parseFloat(style.opacity) < 1 && hasElementChild(el)) {
    pushArtWarning(ctx, 'node-opacity-washes-children-risk', name, '容器 opacity 會連子文字一起洗淡，應優先放到背景 skin');
  }
}

function pushArtWarning(ctx, code, node, detail) {
  ctx.warnings.push({ code, detail: `${node}: ${detail}` });
  ctx.tokenUsage.artWarnings.push({ code, node, detail });
}

function isAsymmetricRadius(value) {
  const parts = String(value).trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 && new Set(parts).size > 1;
}

function hasElementChild(el) {
  return !!(el && Array.isArray(el.children) && el.children.some(c => c.type === 'element'));
}

function recordTokenUsage(ctx, bucket, token, detail) {
  if (!ctx || !ctx.tokenUsage || !token) return;
  const list = ctx.tokenUsage[bucket];
  if (!Array.isArray(list)) return;
  if (!list.some(item => item.token === token && item.detail === detail)) {
    list.push({ token, detail });
  }
}

function guardSpritePath(ctx, rawPath, slotId, explicit) {
  const raw = String(rawPath || '').trim();
  const mapped = explicit ? mapKnownRuntimeSpritePath(raw) : null;
  if (mapped && assetLikelyExists(mapped)) {
    ctx.warnings.push({ code: 'asset-path-mapped-to-runtime', slotId, detail: `${raw} -> ${mapped}` });
    return { path: mapped };
  }
  const invalid = !raw || raw.startsWith('db://') || /^[A-Za-z]:[\\/]/.test(raw) || raw.startsWith('/') || raw.startsWith('\\\\') || raw.startsWith('data:');
  if (invalid) {
    ctx.warnings.push({ code: 'asset-path-guarded', slotId, detail: raw || '<empty>' });
    return { path: PLACEHOLDER_SPRITE };
  }
  const clean = stripExt(raw);
  if (explicit && !assetLikelyExists(clean)) {
    ctx.warnings.push({ code: 'asset-missing-placeholder', slotId, detail: clean });
    return { path: PLACEHOLDER_SPRITE };
  }
  return { path: clean };
}

function mapKnownRuntimeSpritePath(rawPath) {
  const normalized = stripExt(String(rawPath || '').split(String.fromCharCode(92)).join('/'));
  const general = normalized.match(/(?:^|\/)(?:assets|lobby_assets)\/generals\/([^/]+)$/i);
  if (general) return `sprites/generals/${general[1]}_portrait`;
  const avatar = normalized.match(/(?:^|\/)(?:assets|lobby_assets)\/avatars\/([^/]+)$/i);
  if (avatar) return `sprites/generals/avatars/${avatar[1]}_avatar`;
  return null;
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

function enforceColorRectGuard(ctx, parentName, childNodes) {
  let opaqueRects = 0;
  for (const c of childNodes) {
    if (c.type === 'panel' && c.skinSlot) {
      const slot = ctx.skinSlots[c.skinSlot];
      if (slot && slot.kind === 'color-rect' && (slot.opacity == null || slot.opacity > 0.1)) {
        opaqueRects += 1;
      }
    }
  }
  if (opaqueRects > 2) {
    ctx.warnings.push({ code: 'color-rect-count-warning', detail: `${parentName}:${opaqueRects}` });
  }
  if (opaqueRects >= 3) {
    ctx.warnings.push({ code: 'composition-block-risk', detail: parentName });
  }
}

module.exports = {
  buildDraftFromHtml,
  // exported for unit tests
  inferNodeType,
  anchorToWidget,
  parseColor,
  computeLetterSpacing,
  applyTextTransformGeneral,
  resolveFontFamilyToAsset,
  PROJECT_FONT_REGISTRY,
  PROJECT_FONT_DEFAULT,
  parseSimpleTextShadow,
  normalizeCssColorToHex,
  buildFontFaceRegistry,
  resolveFontAssetByConvention,
};
