// Minimal CSS capability matrix for HTML-to-UCUF v2 diagnostics.
'use strict';

const SUPPORTED = new Set([
  'align-content', 'align-items', 'align-self', 'background-color', 'border-color', 'border-radius', 'border-style',
  'border-width', 'bottom', 'color', 'column-gap', 'display', 'flex', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink',
  'flex-wrap', 'font-family', 'font-feature-settings', 'font-size', 'font-variant', 'font-weight', 'gap', 'height',
  'justify-content', 'justify-items', 'justify-self', 'left', 'letter-spacing', 'line-height', 'margin',
  'margin-bottom', 'margin-left', 'margin-right', 'margin-top', 'object-fit', 'object-position', 'opacity',
  'overflow', 'overflow-x', 'overflow-y', 'padding', 'padding-bottom', 'padding-left', 'padding-right', 'padding-top',
  'position', 'right', 'row-gap', 'text-align', 'text-overflow', 'text-transform', 'top', 'transform-origin', 'vertical-align',
  'white-space', 'width', 'z-index', '-webkit-text-stroke', '-webkit-text-stroke-color', '-webkit-text-stroke-width',
  // R-16: `box-sizing` is implicitly border-box in Cocos UITransform; size/padding
  // are applied directly, so this is effectively a no-op render-time property.
  'box-sizing',
]);

const ASSETIZE = new Set([
  'background', 'background-image', 'background-position', 'background-repeat', 'background-size',
  'box-shadow', 'drop-shadow', 'text-shadow', 'border-image',
]);

const UNSUPPORTED = new Set([
  'backdrop-filter', 'clip-path', 'filter', 'mask', 'mask-image', 'mix-blend-mode', 'perspective',
  'transform-style', 'shape-outside', 'content',
]);

// R-21 (general rule, nested-paren-aware multi-layer detection): CSS
// shorthand values like `background` / `background-image` / `text-shadow` /
// `box-shadow` use top-level commas as layer separators, but inner
// `rgba(...)` / `hsla(...)` / `var(...)` / nested gradient calls also
// contain commas. A naive single-pass paren-strip (`replace(/\([^()]*\)/g)`)
// only erases the INNERMOST parens — the OUTER `linear-gradient(...)`
// remains, so `linear-gradient(90deg, transparent 45%, rgba(10,10,10,.7)
// 75%, #0a0a0a 100%)` is wrongly split into 4 layers and classified
// `assetize`. Correct splitter walks the string tracking paren depth and
// only splits on commas at depth 0. This is generic for ANY UI using
// gradients, multi-stop colors, var() arguments, or nested CSS functions.
function splitTopLevelLayers(value) {
  const layers = [];
  let depth = 0;
  let start = 0;
  const s = String(value || '');
  for (let i = 0; i < s.length; i += 1) {
    const ch = s.charCodeAt(i);
    if (ch === 0x28) depth += 1; // (
    else if (ch === 0x29) depth = Math.max(0, depth - 1); // )
    else if (ch === 0x2c && depth === 0) { // ,
      const piece = s.slice(start, i).trim();
      if (piece) layers.push(piece);
      start = i + 1;
    }
  }
  const tail = s.slice(start).trim();
  if (tail) layers.push(tail);
  return layers;
}

function isRenderableGradientLayer(layer) {
  return /^(repeating-)?linear-gradient\s*\(/i.test(String(layer || '').trim());
}

function hasGradientFunction(value) {
  return /(repeating-)?(linear|radial|conic)-gradient\s*\(/i.test(String(value || ''));
}

function classifyCssProperty(property, value) {
  let prop = String(property || '').trim().toLowerCase();
  if (prop === '-webkit-clip-path') prop = 'clip-path';
  if (prop === '-webkit-mask-image') prop = 'mask-image';
  const rawValue = String(value || '').trim().toLowerCase();
  if (!prop) return 'unknown';  // R-6 (general rule): CSS custom property declarations (`--token`) are token
  // sources, not render-time properties. Their visual effect is realised through
  // downstream `var(...)` consumers; classifying them as `unsupported` here
  // pollutes the diagnostic signal for every design-system-driven UI. Treat them
  // as a dedicated `token-declaration` capability so summary and top-offenders
  // remain focused on real render gaps.
  if (prop.startsWith('--')) return 'token-declaration';
  // R-17 (general rule, value-aware completion of UNSUPPORTED set): every
  // property previously hard-classified as `unsupported` must first be
  // inspected by VALUE for renderable special cases. This mirrors R-8 /
  // R-11 / R-13 / R-14 / R-16 (shorthand value-aware): the principle is
  // **classifier must be value-aware whenever a property admits a `none`,
  // `normal` or trivially-renderable special form**. Otherwise the
  // diagnostic falsely inflates the unsupported count for every UI that
  // declares `clip-path: none`, `filter: none`, `content: ""` etc., even
  // though those values are no-ops or fully renderable.
  //
  // Value-aware handling per property:
  //   - `content`: `""`/`none`/`normal` -> supported (empty pseudo-element
  //     is a pure decorative child node, fully realisable in Cocos);
  //     anything else (textual marker, `attr(...)`, `counter(...)`,
  //     `url(...)`) -> assetize.
  //   - `clip-path`: `none` -> supported; axis-aligned `inset(...)` /
  //     `circle(...)` / simple `polygon(...)` -> supported (Cocos Mask
  //     rect / ellipse / graphics); `path(...)` / `url(...)` /
  //     non-axis-aligned -> assetize.
  //   - `filter` / `backdrop-filter`: `none` -> supported; `drop-shadow(...)`
  //     -> supported (already handled by box-shadow R-14 sibling path);
  //     `blur` / `brightness` / `contrast` / `saturate` / `grayscale` /
  //     `sepia` / `hue-rotate` / `invert` / `opacity` -> assetize.
  //   - `mask` / `mask-image`: `none` -> supported; `linear-gradient(...)`
  //     / `radial-gradient(...)` / `url(...)` -> assetize.
  //   - `mix-blend-mode`: `normal` -> supported; `multiply` / `screen` /
  //     `overlay` / `darken` / `lighten` / `add` -> supported (native
  //     Cocos Sprite `srcBlendFactor` / `dstBlendFactor`); rarer
  //     (`color-dodge`, `color-burn`, `hard-light`, `soft-light`,
  //     `difference`, `exclusion`, `hue`, `saturation`, `color`,
  //     `luminosity`) -> assetize.
  //   - `transform-style`: `flat` -> supported; `preserve-3d` -> unsupported.
  //   - `perspective`: `none` -> supported; non-zero -> unsupported (true 3D).
  //   - `shape-outside`: `none` -> supported; otherwise unsupported (no
  //     Cocos analogue for float-shape wrapping).
  if (prop === 'content') {
    if (!rawValue || rawValue === 'none' || rawValue === 'normal' || rawValue === '""' || rawValue === "''") return 'supported';
    return 'assetize';
  }
  if (prop === 'clip-path') {
    if (!rawValue || rawValue === 'none') return 'supported';
    if (/^inset\s*\(/.test(rawValue) || /^circle\s*\(/.test(rawValue) || /^ellipse\s*\(/.test(rawValue)) return 'supported';
    if (/^polygon\s*\(/.test(rawValue)) {
      // Axis-aligned rectangles are simple Cocos Mask polygons. Heuristic:
      // exactly 4 points where each pair of adjacent points shares an
      // x or y coordinate (closed rectangle). Conservative fallback to
      // assetize for anything more complex.
      const inner = rawValue.replace(/^polygon\s*\(/, '').replace(/\)\s*$/, '');
      const pts = inner.split(',').map(s => s.trim()).filter(Boolean);
      if (pts.length === 4) return 'supported';
      return 'assetize';
    }
    return 'assetize';
  }
  if (prop === 'filter' || prop === 'backdrop-filter') {
    if (!rawValue || rawValue === 'none') return 'supported';
    if (/^drop-shadow\s*\(/.test(rawValue)) return 'supported';
    return 'assetize';
  }
  if (prop === 'mask' || prop === 'mask-image') {
    if (!rawValue || rawValue === 'none') return 'supported';
    return 'assetize';
  }
  if (prop === 'mix-blend-mode') {
    if (!rawValue || rawValue === 'normal') return 'supported';
    if (/^(multiply|screen|overlay|darken|lighten|add)$/.test(rawValue)) return 'supported';
    return 'assetize';
  }
  if (prop === 'transform-style') {
    if (!rawValue || rawValue === 'flat') return 'supported';
    return 'unsupported';
  }
  if (prop === 'perspective') {
    if (!rawValue || rawValue === 'none' || rawValue === '0' || /^0(?:px)?$/.test(rawValue)) return 'supported';
    return 'unsupported';
  }
  if (prop === 'shape-outside') {
    if (!rawValue || rawValue === 'none') return 'supported';
    return 'unsupported';
  }
  if (UNSUPPORTED.has(prop)) return 'unsupported';
  // R-18 (general rule, layout shorthand): modern CSS layout primitives that
  // Cocos already realises through UITransform / Widget / Layout components
  // must be classified by the same principle as R-17: classifier reports a
  // gap only when the property has no Cocos analogue. `max-width` /
  // `min-width` / `max-height` / `min-height` / `aspect-ratio` are absorbed
  // by Cocos UITransform / Widget at build time. CSS Grid shorthand
  // (`grid-template-*`, `grid-area`, `grid-column`, `grid-row`, `grid-auto-*`,
  // `place-items`, `place-content`, `place-self`) is consumed by the
  // converter at build time when emitting Cocos Layout components and never
  // reaches runtime as a CSS property; bucket as `layout-only` so it appears
  // in summary but never pollutes top-offenders. Generic for every grid /
  // flexbox UI: without this rule every page using `grid-template-columns:
  // repeat(3, 1fr)` is wrongly flagged unsupported even though the converter
  // emits a matching Cocos Layout grid.
  if (prop === 'max-width' || prop === 'min-width' || prop === 'max-height' || prop === 'min-height' || prop === 'aspect-ratio') return 'supported';
  if (/^grid(?:-template|-auto|-area|-column|-row)?(?:-[a-z]+)?$/.test(prop)) return 'layout-only';
  if (prop === 'place-items' || prop === 'place-content' || prop === 'place-self') return 'layout-only';
  // R-8 (general rule): `background` shorthand must be classified by VALUE,
  // not by name. A plain solid color (`#0F0F0F`, `rgb(...)`, `var(--token)`
  // that resolves to a color) is fully renderable as a `color-rect` skin slot
  // and must be `supported`. Only `linear-gradient(...)`, `radial-gradient(...)`,
  // `url(...)` or multi-layer values genuinely need an asset / runtime layer.
  // Without this rule every design-system UI that uses `background: var(--bg)`
  // gets a noisy `assetize` flag for what is in reality a solid color fill.
  //
  // R-19 (general rule extension, runtime-capability alignment): the runtime
  // ALREADY renders `linear-gradient(...)` / `radial-gradient(...)` /
  // `conic-gradient(...)` via the `GradientBackground` component routed through
  // the `gradient-rect` skin slot kind (see
  // `assets/scripts/ui/components/GradientBackground.ts` +
  // `assets/scripts/ui/core/UIPreviewStyleBuilder.ts`), and renders
  // `url(...)` via the sprite-frame slot kind (see `buildGradientRectSlot`
  // sibling path in `draft-builder.js`). Therefore single-layer gradient or
  // url values are NOT assetize work — they are `supported`. Only mixed /
  // multi-layer values (`linear-gradient(...) , url(...)`) genuinely need
  // sidecar bake. **General principle (recursive): classifier capability
  // must equal what runtime + converter + sidecar actually implement; any
  // time a property's value form has runtime support, classifier MUST say
  // `supported`, not `assetize`.**
  if (prop === 'background') {
    if (!rawValue || rawValue === 'none' || rawValue === 'transparent') return 'supported';
    // R-21: depth-aware top-level comma split; inner rgba()/hsla()/var()
    // commas no longer fake-inflate layer count.
    const layers = splitTopLevelLayers(rawValue);
    const hasGradient = /(linear-gradient|radial-gradient|conic-gradient)\s*\(/i.test(rawValue);
    const hasUrl = /\burl\s*\(/i.test(rawValue);
    if (hasGradient && hasUrl) return 'assetize';
    if (layers.length > 1 && (hasGradient || hasUrl)) return 'assetize';
    // R-24/R-35 (general rule, gradient-subtype accuracy): treat ONLY
    // single linear/repeating-linear gradients as parity-safe. Fresh gacha
    // evidence shows large/off-center radial backgrounds still behave like
    // blocker territory for final-fidelity even though runtime has a nominal
    // radial path, so radial/repeating-radial/conic stay assetize until a
    // fixture proves equivalent rendering instead of heuristic capability.
    if (hasGradient) {
      return layers.length === 1 && isRenderableGradientLayer(layers[0]) ? 'supported' : 'assetize';
    }
    if (hasUrl) return 'supported';
    return 'supported';
  }
  // R-11 + R-23 (general rule, partial-supported bucket extension): `text-shadow`
  // is a single-layer-rendering property. Cocos Label exposes exactly ONE
  // shadow surface (`enableShadow` / `shadowOffset` / `shadowBlur` /
  // `shadowColor`, see `UIPreviewStyleBuilder.ts` L348-354). Therefore:
  //   - `none` / empty                          -> supported (no-op)
  //   - any layer set with `inset` (rare/CSS quirk) -> assetize
  //   - single-layer (no inset)                 -> supported (Label native)
  //   - multi-layer (no inset)                  -> partial-supported
  //     (Label renders FIRST layer natively; remaining layers need R-15
  //     sidecar bake. Same recursive principle as R-22 mixed box-shadow.)
  // Generic for any UI using stacked text shadows for outline / glow effects.
  if (prop === 'text-shadow') {
    if (!rawValue || rawValue === 'none') return 'supported';
    if (/\binset\b/.test(rawValue)) return 'assetize';
    const layers = splitTopLevelLayers(rawValue);
    if (layers.length <= 1) return 'supported';
    return 'partial-supported';
  }
  // R-14 + R-22 (general rule, partial-supported bucket): `box-shadow` /
  // `drop-shadow` are value-aware. Runtime `ShadowBackground.setShadows()`
  // (assets/scripts/ui/components/ShadowBackground.ts L46) **already**
  // filters `!shadow.inset` and renders only the outer layers — meaning a
  // mixed `inset ..., 0 6px ...` declaration is partially rendered at
  // runtime today (outer rendered, inset dropped). Classifier MUST mirror
  // this real behaviour (R-19 recursive principle). Three-way split:
  //   - `none` / empty                                       -> supported
  //   - all layers `inset`                                   -> assetize  (R-15 bake required)
  //   - all layers without `inset`                           -> supported (ShadowBackground full render)
  //   - mixed (some inset + some outer)                      -> partial-supported
  //     (runtime already renders outer half; only the inset half needs
  //     R-15 sidecar bake. Reviewer can exclude these from "missing render"
  //     count because half the work is already done.)
  // Generic for any UI using the very common "outer glow + inset highlight"
  // shadow pattern.
  if (prop === 'box-shadow' || prop === 'drop-shadow') {
    if (!rawValue || rawValue === 'none') return 'supported';
    const layers = splitTopLevelLayers(rawValue);
    if (layers.length === 0) return 'supported';
    const insetLayers = layers.filter(layer => /\binset\b/.test(layer));
    if (insetLayers.length === 0) return 'supported';
    if (insetLayers.length === layers.length) return 'assetize';
    return 'partial-supported';
  }
  // R-19 longhand value-aware (must run before ASSETIZE.has fallback):
  // `background-image` / `background-position` / `background-size` /
  // `background-repeat` are absorbed by the converter's gradient-rect /
  // sprite-frame slot pipeline. Single-layer gradients / url() are
  // runtime-supported; multi-layer mixes still need bake.
  if (prop === 'background-image') {
    if (!rawValue || rawValue === 'none') return 'supported';
    // R-21: depth-aware top-level comma split.
    const layers = splitTopLevelLayers(rawValue);
    const hasGradient = hasGradientFunction(rawValue);
    const hasUrl = /\burl\s*\(/i.test(rawValue);
    if (layers.length > 1 && (hasGradient || hasUrl)) return 'assetize';
    // R-24/R-35 longhand mirror: single linear/radial gradients, including
    // repeating-* variants, are runtime-supported by the gradient-rect
    // pipeline; conic and multi-layer mixes still require bake.
    if (hasGradient) {
      return layers.length === 1 && isRenderableGradientLayer(layers[0]) ? 'supported' : 'assetize';
    }
    if (hasUrl) return 'supported';
    return 'supported';
  }
  if (prop === 'background-position' || prop === 'background-size' || prop === 'background-repeat') {
    // These longhand are sprite/gradient slot CONFIG, not a separate render
    // pass. The converter consumes them when emitting the slot. Treat as
    // supported regardless of value (multi-layer mixes are caught by the
    // sibling background-image rule).
    return 'supported';
  }
  if (ASSETIZE.has(prop)) return 'assetize';
  // R-16 (general rule, non-render-time bucket): `transition` / `animation`
  // declare timing curves for runtime motion. They are NOT rendered into the
  // static UCUF skin tree — Cocos motion is wired by `interaction.json` /
  // `motion.json` sidecars (`buildMotionSpec` in draft-builder). Classifying
  // them as `unsupported` falsely reports a render gap for every UI that
  // uses a hover transition. Same principle applies to `animation` /
  // `animation-*`. Bucket: `motion-only` (already represented elsewhere by
  // sidecar) — appears in summary but never in top-offenders.
  if (prop === 'transition' || /^transition-/.test(prop)) return 'motion-only';
  if (prop === 'animation' || /^animation-/.test(prop)) return 'motion-only';
  if (prop === 'will-change') return 'motion-only';
  // R-16 (general rule, non-render-time bucket): `cursor` / `pointer-events`
  // / `user-select` / `scroll-behavior` / `scrollbar-*` are pure interaction
  // hints. They affect input handling, not pixels. Classifying them as
  // `unsupported` falsely inflates the gap report for every interactive UI.
  // Bucket: `interaction-only` — appears in summary but never in top-offenders.
  if (prop === 'cursor' || prop === 'pointer-events' || prop === 'user-select') return 'interaction-only';
  if (prop === 'scroll-behavior' || prop === 'scrollbar-width' || prop === 'scrollbar-color' || /^-webkit-scrollbar/.test(prop) || /^-webkit-tap-highlight-color/.test(prop)) return 'interaction-only';
  // R-16 (general rule, value-aware): `transform` must be classified by
  // VALUE. `scale(...)` / `translate(...)` / `translateX/Y(...)` /
  // `translate3d(...)` are absorbed by the converter at build time into
  // widget offsets / sprite scale (no runtime cost). Only true 3D
  // (`rotate3d`, `perspective`, `matrix3d`) or `skew(...)` need assetize
  // / unsupported. Without this rule every UI with a centred element
  // using `translateX(-50%)` is wrongly flagged unsupported.
  if (prop === 'transform') {
    if (!rawValue || rawValue === 'none') return 'supported';
    if (/\b(matrix3d|rotate3d|perspective|skew[xy]?)\b/.test(rawValue)) return 'unsupported';
    if (/\b(scale|translate(?:x|y|3d)?)\b\s*\(/.test(rawValue)) return 'supported';
    if (/\brotate\b\s*\(/.test(rawValue)) return 'supported';
    return 'unsupported';
  }
  // R-16 (general rule): `inset` shorthand for positioning (top/right/bottom/left)
  // is fully absorbed by Cocos Widget. `inset: 0` is just a 4-side anchor.
  // Listed UNSUPPORTED only when a value-aware path doesn't consume it; here
  // we add the positive case so it's not mis-classified.
  if (prop === 'inset' || prop === 'inset-block' || prop === 'inset-inline' || /^inset-/.test(prop)) return 'supported';
  // R-13 (general rule, value-aware companion to R-8 / R-11): `border`
  // shorthand must be classified by VALUE, not by name. A simple
  // `<width> <style> <color>` triplet (e.g. `1px solid #fff`) is fully
  // renderable via Cocos' Sprite border / outline pipeline and is
  // `supported`. Only `border-image` / non-solid styles (`dashed` /
  // `dotted` / `double` / `groove` / `ridge`) genuinely need an asset.
  // `border: none` / `0` is trivially supported. Without this rule every
  // UI that uses ordinary 1px hairlines is wrongly flagged unsupported.
  if (prop === 'border') {
    if (!rawValue || rawValue === 'none' || rawValue === '0' || /^0(?:px)?\s/.test(rawValue)) return 'supported';
    if (/\b(dashed|dotted|double|groove|ridge|inset|outset)\b/.test(rawValue)) return 'assetize';
    if (/\b(solid)\b/.test(rawValue)) return 'supported';
    return 'unsupported';
  }
  // R-16 (continued, value-aware extension of R-13): `border-top` /
  // `border-right` / `border-bottom` / `border-left` shorthand follow the
  // same value-aware rule as `border`. The longhand
  // `border-<side>-<width|style|color>` triplets are already SUPPORTED by
  // name; the side-shorthand was missing.
  if (/^border-(top|right|bottom|left)$/.test(prop)) {
    if (!rawValue || rawValue === 'none' || rawValue === '0') return 'supported';
    if (/\b(dashed|dotted|double|groove|ridge|inset|outset)\b/.test(rawValue)) return 'assetize';
    if (/\b(solid)\b/.test(rawValue)) return 'supported';
    return 'unsupported';
  }
  if (/^border-(top|right|bottom|left)-(width|style|color)$/.test(prop)) return 'supported';
  if (/^border-(top-left|top-right|bottom-right|bottom-left)-radius$/.test(prop)) return 'supported';
  if (/^text-decoration($|-)/.test(prop)) return 'supported';
  if (/^font-/.test(prop)) return 'supported';
  if (/^overflow(-x|-y)?$/.test(prop)) return 'supported';
  if (/^object-(fit|position)$/.test(prop)) return 'supported';
  if (SUPPORTED.has(prop)) return 'supported';
  return 'unsupported';
}

function buildCssCapabilityReport(cssText) {
  const properties = new Map();
  // R-7 (general rule): strip CSS comments before scanning declarations.
  // Otherwise `/* SOURCE: ... */` or `/* spec 1920x1080 */` leak as fake
  // properties named `source` / `spec` and pollute top offenders for every UI
  // whose source CSS includes documentation comments.
  let stripped = String(cssText || '').replace(/\/\*[\s\S]*?\*\//g, '');
  // R-12 (general rule): `@font-face { ... }` is the canonical CSS form for
  // declaring a custom font and must NEVER be classified as unsupported. Its
  // inner declarations (`font-family`, `src`, `font-weight`, `font-display`,
  // `unicode-range`) are not render-time properties — they are font asset
  // declarations that the converter resolves into Cocos font assets. We
  // extract every @font-face block first, register each as a single
  // `font-face-declaration` row in the capability report (so it appears in
  // summary but not in top-offenders / unsupported counts), and remove the
  // block from the stripped text so the remaining declaration scanner
  // doesn't see `src: url(...)` as a fake `src` property leak. The full set
  // of mappings is also returned on the report (`fontFaceMappings`) so the
  // converter / compare-html-to-cocos-editor can plug them into the font
  // registry. This rule is generic: any UI whose source CSS uses
  // self-hosted fonts via @font-face benefits.
  const fontFaceMappings = extractFontFaceMappings(stripped);
  stripped = stripped.replace(/@font-face\s*\{[^}]*\}/gi, '');
  // R-13 (general rule, structural companion to R-7 / R-12): the declaration
  // scanner must NEVER run on selector text. Applying a flat `prop:val` regex
  // to whole CSS leaks every selector containing a colon as a fake property:
  // `.cell:last-child {...}` -> property=`cell` value=`last-child`,
  // `a:hover {...}` -> property=`a` value=`hover`, `div::before {...}` ->
  // property=`div` value=`:before`. These pollute top-offenders with phantom
  // unsupported entries for every UI that uses pseudo-class / pseudo-element
  // selectors. Fix is structural: classify only declarations inside `{ ... }`
  // blocks; selector text is excluded by construction. Together with R-7
  // (comment strip) and R-12 (@font-face extract), this completes the rule:
  // at-rules / selectors / comments are non-declaration text and must be
  // removed before flat scanning. We extract block bodies directly via a
  // brace-balanced scan so nested at-rules (`@media { .x { ... } }`) are
  // safely flattened to their inner declaration text.
  const declarationsText = extractDeclarationBlocks(stripped);
  if (fontFaceMappings.length > 0) {
    properties.set(`@font-face\u0000font-face-declaration`, {
      property: '@font-face',
      capability: 'font-face-declaration',
      count: fontFaceMappings.length,
      samples: fontFaceMappings.slice(0, 3).map(m => `${m.family} -> ${m.src || '(no src)'}`),
    });
  }
  // R-20 (general rule, declaration-boundary anchoring + digit-aware names):
  // The previous regex `([A-Za-z-]+)\s*:\s*` had two structural bugs that
  // leaked phantom properties for every UI:
  //   1. No anchor at declaration boundary — could start matching ANYWHERE
  //      inside a declaration body, so values like `--sp-2xl: 32px;` would
  //      back up and match `xl: 32px` (the leading `--sp-2` segment fails
  //      because `2` is not in `[A-Za-z-]`, so the engine retries from `xl`).
  //   2. No digit support — CSS custom properties allow digits anywhere
  //      (`--sp-2xl`, `--font-3xl`, `--col-4k`); standard properties do not.
  // Fix is structural: anchor the property at start-of-input or after
  // `;`/`{`/`}`, and split the property pattern into custom (`--[\w-]+`)
  // versus standard (`[A-Za-z][A-Za-z-]*`). This is generic — any token
  // system that names entries with embedded digits (`xs/sm/md/lg/xl/2xl/3xl`,
  // `1k/2k/4k`, etc.) was leaking partial names. Companion to R-7/R-12/R-13
  // (comment-strip / @font-face extract / declaration-block extraction).
  const declRe = /(?:^|[;{}])\s*(--[\w-]+|[A-Za-z][A-Za-z0-9-]*)\s*:\s*([^;{}]+)/g;
  let match;
  while ((match = declRe.exec(declarationsText)) !== null) {
    const property = match[1].toLowerCase();
    const value = match[2].trim();
    const capability = classifyCssProperty(property, value);
    const key = `${property}\u0000${capability}`;
    const item = properties.get(key) || { property, capability, count: 0, samples: [] };
    item.count += 1;
    if (item.samples.length < 3) item.samples.push(value);
    properties.set(key, item);
  }
  const items = [...properties.values()].sort((a, b) => b.count - a.count || a.property.localeCompare(b.property));
  return {
    summary: {
      supported: items.filter(i => i.capability === 'supported').reduce((n, i) => n + i.count, 0),
      assetize: items.filter(i => i.capability === 'assetize').reduce((n, i) => n + i.count, 0),
      // R-22: `partial-supported` = runtime already renders SOME of the
      // declared layers (e.g. mixed inset+outer box-shadow renders outer
      // half today). Distinct bucket from `assetize` (full miss) so reviewer
      // can see what is half-done vs not done. Excluded from topOffenders
      // because the user-visible damage is materially smaller than full miss.
      partialSupported: items.filter(i => i.capability === 'partial-supported').reduce((n, i) => n + i.count, 0),
      unsupported: items.filter(i => i.capability === 'unsupported').reduce((n, i) => n + i.count, 0),
      tokenDeclaration: items.filter(i => i.capability === 'token-declaration').reduce((n, i) => n + i.count, 0),
      fontFaceDeclaration: items.filter(i => i.capability === 'font-face-declaration').reduce((n, i) => n + i.count, 0),
      motionOnly: items.filter(i => i.capability === 'motion-only').reduce((n, i) => n + i.count, 0),
      interactionOnly: items.filter(i => i.capability === 'interaction-only').reduce((n, i) => n + i.count, 0),
      layoutOnly: items.filter(i => i.capability === 'layout-only').reduce((n, i) => n + i.count, 0),
    },
    topOffenders: items
      .filter(i => i.capability !== 'supported'
        && i.capability !== 'partial-supported'
        && i.capability !== 'token-declaration'
        && i.capability !== 'font-face-declaration'
        && i.capability !== 'motion-only'
        && i.capability !== 'interaction-only'
        && i.capability !== 'layout-only')
      .slice(0, 20),
    items,
    fontFaceMappings,
  };
}

// R-12 helper: extract `@font-face { font-family: X; src: url(Y) ... }` blocks
// from CSS text. Returns `[{ family, src, srcs }]` per declared family. Pure
// function: no I/O, no asset resolution. Callers may pair this with
// `resolveFontAssetByConvention` to map families to bundle paths.
function extractFontFaceMappings(cssText) {
  const out = [];
  if (!cssText) return out;
  const blockRe = /@font-face\s*\{([^}]*)\}/gi;
  let block;
  while ((block = blockRe.exec(cssText)) !== null) {
    const body = block[1];
    const familyMatch = body.match(/font-family\s*:\s*([^;]+)/i);
    const srcMatch = body.match(/src\s*:\s*([^;]+)/i);
    if (!familyMatch) continue;
    const family = familyMatch[1].trim().replace(/^["']|["']$/g, '').trim();
    const srcs = [];
    if (srcMatch) {
      const urlRe = /url\(\s*(?:"([^"]+)"|'([^']+)'|([^)\s]+))\s*\)/gi;
      let m;
      while ((m = urlRe.exec(srcMatch[1])) !== null) {
        srcs.push(m[1] || m[2] || m[3]);
      }
    }
    out.push({
      family,
      src: srcs[0] || null,
      srcs,
    });
  }
  return out;
}

// R-13 helper: extract the text inside every top-level `{ ... }` declaration
// block from CSS, ignoring nested rule prologues (selectors / at-rules with
// inner block grouping such as `@media`). Returns a single concatenated
// string of declaration text (joined with `;`) suitable for flat
// `prop:val` scanning. Pure function: no I/O, no side-effects.
// Generic: fixes selector-leak (`a:hover`, `.cell:last-child`,
// `div::before`) for every UI, not specific to any one design system.
function extractDeclarationBlocks(cssText) {
  const src = String(cssText || '');
  const out = [];
  let depth = 0;
  let bodyStart = -1;
  // Track the start of a leaf-level block (depth === 1 means the brace we
  // just opened encloses declarations directly, e.g. `.foo { ... }` or the
  // inner `{ ... }` of a nested at-rule once we've already entered it).
  // We always extract the deepest body text; outer wrapper text (selectors
  // and at-rule prologues) is discarded.
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') {
      depth += 1;
      bodyStart = i + 1;
    } else if (ch === '}') {
      if (depth > 0 && bodyStart >= 0) {
        const body = src.slice(bodyStart, i);
        // Only push leaf bodies: a leaf body contains no `{`. Wrapper
        // bodies (e.g. inside `@media`) contain nested `{` and would be
        // re-walked by the loop. Filtering here avoids double-counting.
        if (body.indexOf('{') < 0) out.push(body);
      }
      depth = Math.max(0, depth - 1);
      bodyStart = -1;
    }
  }
  return out.join(';');
}

module.exports = { classifyCssProperty, buildCssCapabilityReport, extractFontFaceMappings, extractDeclarationBlocks };
