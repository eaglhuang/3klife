'use strict';
// 綁定表：替渲染後的 HTML 元素取固定節點名（data-name），讓重轉後名稱不變，
// 子面板可以依名稱填資料。設計稿不進版控，所以名稱表放在 tools_node/data/ui-bind-maps/<screenId>.json。
const fs = require('fs');
const path = require('path');

const BIND_MAP_DIR = path.join(__dirname, '..', '..', 'data', 'ui-bind-maps');

function bindMapPathFor(screenId) {
  return path.join(BIND_MAP_DIR, `${screenId}.json`);
}

function loadBindMap(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return [];
  const json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entries = Array.isArray(json) ? json : json.bindings;
  if (!Array.isArray(entries)) throw new Error(`[bind-map] ${filePath}: expected bindings[]`);
  for (const entry of entries) {
    if (!entry || typeof entry.name !== 'string' || typeof entry.selector !== 'string') {
      throw new Error(`[bind-map] ${filePath}: each binding needs name and selector`);
    }
  }
  return entries;
}

// 在瀏覽器內執行：依 selector（可加 text 精確比對、index、looseText）找元素並寫入 data-name
function applyBindMapInPage(entries) {
  const norm = value => String(value || '').replace(/\s+/g, ' ').trim();
  const wrapLooseText = parent => {
    for (const child of Array.from(parent.childNodes || [])) {
      if (child.nodeType === 1 && child.getAttribute('data-ucuf-loose-text') != null) return child;
    }
    const textNode = Array.from(parent.childNodes || []).find(child => child.nodeType === 3 && norm(child.textContent));
    if (!textNode) return null;
    const span = document.createElement('span');
    span.setAttribute('data-ucuf-loose-text', '');
    parent.insertBefore(span, textNode);
    span.appendChild(textNode);
    return span;
  };
  const apply = () => {
    const report = [];
    for (const entry of entries) {
      let nodes = [];
      try { nodes = Array.from(document.querySelectorAll(entry.selector)); } catch (_e) { nodes = []; }
      if (entry.text != null) nodes = nodes.filter(node => norm(node.textContent) === norm(entry.text));
      let node = nodes[entry.index || 0];
      // looseText：名字給元素裡直接的裸文字（例如標題後面接的內文），包成 span 再命名
      if (node && entry.looseText) node = wrapLooseText(node);
      if (node && node.getAttribute('data-name') !== entry.name) node.setAttribute('data-name', entry.name);
      report.push({ name: entry.name, matched: !!node });
    }
    return report;
  };
  const report = apply();
  // 切分頁時框架會重畫內容：DOM 變動後重新套名
  if (!window.__ucufBindMapObserver && document.body) {
    window.__ucufBindMapObserver = new MutationObserver(() => apply());
    window.__ucufBindMapObserver.observe(document.body, { subtree: true, childList: true, characterData: true });
  }
  return report;
}

async function installBindMap(page, entries) {
  if (!entries || entries.length === 0) return [];
  return page.evaluate(applyBindMapInPage, entries);
}

module.exports = { BIND_MAP_DIR, bindMapPathFor, loadBindMap, applyBindMapInPage, installBindMap };
