'use strict';

// 文字排版規則（字族／字重／字元涵蓋、字距、陰影、大小寫轉換、溢出推斷）。
// 由 draft-builder-core 搬出（PROG-2-1651），純函式、與節點遍歷無關。

const { extractFontFaceMappings } = require('../css-capability-matrix');

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

// 字族字元涵蓋（與引擎無關的字型屬性）：瀏覽器遇到字族沒有的字會逐字往堆疊下一個字族退，
// 引擎 Label 只能掛一份字型，所以文字含某文字系統時要跳過不涵蓋它的字族（PROG-2-1650）。
// 未列出的字族視為涵蓋全部。
const FONT_SCRIPT_COVERAGE = [
  { match: /^newsreader$|^manrope$/i, scripts: ['latin'] },
];

const TEXT_SCRIPT_PATTERNS = [
  { script: 'cjk', pattern: /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]/ },
];

function requiredTextScripts(text) {
  const value = String(text || '');
  return TEXT_SCRIPT_PATTERNS.filter(entry => entry.pattern.test(value)).map(entry => entry.script);
}

function familyCoversScripts(family, scripts) {
  if (!scripts.length) return true;
  const entry = FONT_SCRIPT_COVERAGE.find(item => item.match.test(family));
  return !entry || scripts.every(script => entry.scripts.includes(script));
}

function resolveFontFamilyToAsset(fontFamilyValue, registry, defaultAsset, text = '') {
  const reg = Array.isArray(registry) ? registry : PROJECT_FONT_REGISTRY;
  const def = typeof defaultAsset === 'string' ? defaultAsset : PROJECT_FONT_DEFAULT;
  if (!fontFamilyValue || typeof fontFamilyValue !== 'string') return def;
  const families = fontFamilyValue
    .split(',')
    .map(s => s.trim().replace(/^["']|["']$/g, '').trim())
    .filter(Boolean);
  const scripts = requiredTextScripts(text);
  for (const fam of families) {
    if (!familyCoversScripts(fam, scripts)) continue;
    for (const entry of reg) {
      if (entry.match.test(fam)) return entry.asset;
    }
  }
  return def;
}

function pickFontByTag(style, ctx, text = '') {
  const extra = (ctx && Array.isArray(ctx.fontFaceRegistry)) ? ctx.fontFaceRegistry : [];
  // Layered registry: source-CSS @font-face mappings win over project defaults.
  const layered = extra.length > 0 ? extra.concat(PROJECT_FONT_REGISTRY) : PROJECT_FONT_REGISTRY;
  return resolveFontFamilyToAsset(style && style.fontFamily, layered, PROJECT_FONT_DEFAULT, text);
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
function resolveFontAssetByConvention(family, _src) {
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
  const lengths = [];
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

module.exports = {
  inferLabelOverflow,
  isItalicStyle,
  computeLetterSpacing,
  PROJECT_FONT_REGISTRY,
  PROJECT_FONT_DEFAULT,
  pickFontByTag,
  buildFontFaceRegistry,
  resolveFontAssetByConvention,
  parseSimpleTextShadow,
  normalizeCssColorToHex,
  resolveTypographyToken,
  isBoldWeight,
  applyTextTransformGeneral,
  resolveFontFamilyToAsset,
};
