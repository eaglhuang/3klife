'use strict';
// 整頁配色變體（PROG-2-9025）
// 分頁切換若改了 <html>/<body> 狀態屬性（例如 body[data-pool] 換整頁主題），分頁重播會另存整頁快照
// （tab.themeHtml）。這裡把每份快照轉成 skin，與正式 skin 比對，只留變色的 slot，
// 寫成 <screen>.skin-variants.json；執行期 UIScreenPreviewHost.applySkinVariant(分頁 key) 只重套這些 slot。
// 比對前兩邊都把色票名與 rgb()/rgba() 統一成 #RRGGBB：正式 skin 用畫面專屬色票，快照 skin 是原始色值，
// 不統一的話同色也會被當成差異；輸出也寫實際色值，執行期不依賴色票表。
const fs = require('fs');
const path = require('path');
const { normalizeColorValue } = require('./token-governance');

/** 深層走訪：色票名換成色值，可解析的顏色字串統一成 #RRGGBB */
function normalizeSlotColors(value, tokenColors) {
  if (typeof value === 'string') {
    const resolved = Object.prototype.hasOwnProperty.call(tokenColors, value) ? tokenColors[value] : value;
    const color = /^(#|rgba?\()/i.test(resolved) ? normalizeColorValue(resolved) : null;
    if (!color || !color.hex) return resolved;
    // normalizeColorValue 不保留透明度；半透明色補成 #RRGGBBAA，否則淡暈影會變成不透明色塊
    const alpha = /^rgba\(/i.test(resolved) ? Number(resolved.split(',')[3]?.replace(/[^\d.]/g, '')) : 1;
    return alpha < 1 ? color.hex + Math.round(alpha * 255).toString(16).padStart(2, '0').toUpperCase() : color.hex;
  }
  if (Array.isArray(value)) return value.map((v) => normalizeSlotColors(v, tokenColors));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = normalizeSlotColors(v, tokenColors);
    return out;
  }
  return value;
}

// 轉換器替沒命名的節點流水編號（<畫面>_div_22），快照多一個節點編號就整串位移，不能靠名稱對 slot。
const AUTO_NAME = /_[a-z]+\d*_\d+$/i;

/**
 * 依結構把每個節點編成穩定鍵：具名節點用名稱；自動編號節點用「最近具名祖先＋類型＋文字＋同鍵序號」。
 * withText=false 時不看文字，給快照文字不同（腳本移除後的預設字）時退一步比對。
 * fixName 把快照畫面前綴換成正式前綴（衍生節點如 <前綴>_body_Background 會帶前綴）。
 */
function structuralSlotKeys(root, withText, fixName = (n) => n) {
  const out = new Map();
  const seen = new Map();
  (function walk(node, anchor) {
    if (!node || typeof node !== 'object') return;
    const name = node.name ? fixName(node.name) : '';
    const auto = !name || AUTO_NAME.test(name);
    let key = auto ? null : `name:${name}`;
    if (auto) {
      const base = `${anchor}>${node.type || ''}>${withText ? (node.text || '') : ''}`;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      key = `${base}#${n}`;
    }
    for (const field of ['styleSlot', 'skinSlot']) {
      if (node[field]) out.set(`${key}|${field}`, node[field]);
    }
    // 最佳化會把整面背景節點併成父節點的 skinLayers，以 layerId 當名稱對應
    for (const layer of node.skinLayers || []) {
      if (layer && layer.layerId && layer.slotId) out.set(`name:${fixName(layer.layerId)}|skinSlot`, layer.slotId);
    }
    for (const child of node.children || []) walk(child, auto ? anchor : name);
  })(root && (root.root || root), '');
  return out;
}

const pascal = (id) => id.split(/[^a-z0-9]+/i).filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join('');

/** 快照 slot id → 正式 slot id：先比含文字的鍵，對不上再比不含文字的鍵 */
function mapThemeSlotIds(baseLayout, themeLayout, themeId = '', screenId = '') {
  const map = new Map();
  const fixName = themeId && screenId ? (n) => n.split(pascal(themeId)).join(pascal(screenId)) : undefined;
  for (const withText of [true, false]) {
    const baseKeys = structuralSlotKeys(baseLayout, withText);
    for (const [key, themeSlot] of structuralSlotKeys(themeLayout, withText, fixName)) {
      if (!map.has(themeSlot) && baseKeys.has(key)) map.set(themeSlot, baseKeys.get(key));
    }
  }
  return map;
}

function renameByMap(slots, idMap) {
  const out = {};
  for (const [id, slot] of Object.entries(slots)) {
    if (idMap.has(id)) out[idMap.get(id)] = slot;
  }
  return out;
}

/** 只收兩邊都有、且內容不同的 slot（快照多出的 slot 不算，執行期也沒有對應節點） */
function diffSlots(baseSlots, variantSlots) {
  const out = {};
  for (const [id, slot] of Object.entries(baseSlots)) {
    const other = variantSlots[id];
    if (other && JSON.stringify(other) !== JSON.stringify(slot)) out[id] = other;
  }
  return out;
}

/**
 * @param {{ screenId: string, baseSkinPath: string, baseLayoutPath: string, tokenColors: Record<string,string>,
 *           themes: Array<{ key: string, skinPath: string }>, outPath: string }} args
 */
function writeSkinVariants(args) {
  const { screenId, baseSkinPath, baseLayoutPath, tokenColors, themes, outPath } = args;
  const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
  const readSlots = (file, colors) => normalizeSlotColors(readJson(file).slots || {}, colors);
  const baseLayout = readJson(baseLayoutPath);
  const baseSlots = readSlots(baseSkinPath, tokenColors || {});
  const variants = {};
  for (const theme of themes) {
    if (!theme.skinPath || !fs.existsSync(theme.skinPath)) continue;
    // 快照 layout 與 skin 同目錄同名
    const themeLayoutPath = theme.skinPath.replace(/\.skin\.json$/, '.layout.json');
    if (!fs.existsSync(themeLayoutPath)) continue;
    const themeId = path.basename(themeLayoutPath).replace(/\.layout\.json$/, '');
    const idMap = mapThemeSlotIds(baseLayout, readJson(themeLayoutPath), themeId, screenId);
    variants[theme.key] = { slots: diffSlots(baseSlots, renameByMap(readSlots(theme.skinPath, {}), idMap)) };
  }
  if (Object.keys(variants).length === 0) {
    // 沒有任何主題狀態：移除舊側檔，避免執行期套到上一次轉換的變體
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    return { written: false, variantCount: 0 };
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify({ version: 1, screenId, variants }, null, 2)}\n`, 'utf8');
  return {
    written: true,
    variantCount: Object.keys(variants).length,
    slotCounts: Object.fromEntries(Object.entries(variants).map(([k, v]) => [k, Object.keys(v.slots).length])),
  };
}

module.exports = { writeSkinVariants, normalizeSlotColors, diffSlots, mapThemeSlotIds };
