'use strict';
// UCUF 規格目錄分流（PROG-2-1638）：執行期檔留在 resources，轉換證據寫到 ui-spec-evidence。
const fs = require('fs');
const path = require('path');
const config = require('./ui-spec-sidecars.json');

/** 檔名尾段（去 .json）若是證據副檔名就回傳它，否則 null；"x.compare.css-coverage.json" 也算。 */
function evidenceSuffixOf(fileName) {
  const parts = path.basename(String(fileName)).replace(/\.json$/i, '').split('.');
  if (parts.length < 2) return null;
  const last = parts[parts.length - 1];
  return config.evidenceSidecars.includes(last) ? last : null;
}

/** 路徑中的 assets/resources/ui-spec 段換成 ui-spec-evidence（任何 repo 根都適用）；不含該段就原樣回傳。 */
function toEvidencePath(filePath) {
  const raw = String(filePath);
  const norm = raw.replace(/\\/g, '/');
  const seg = config.runtimeRoot;
  const idx = norm.lastIndexOf(seg + '/');
  if (idx < 0) return filePath;
  const out = norm.slice(0, idx) + config.evidenceRoot + norm.slice(idx + seg.length);
  return raw.includes('\\') ? out.replace(/\//g, '\\') : out;
}

/** 寫入目的地：證據檔改寫到 evidence 根。 */
function destinationFor(filePath) {
  return evidenceSuffixOf(filePath) ? toEvidencePath(filePath) : filePath;
}

/** 讀取：先找 evidence 位置，再退回舊位置（相容尚未搬移的輸出）。 */
function resolveExisting(filePath) {
  const moved = destinationFor(filePath);
  if (moved !== filePath && fs.existsSync(moved)) return moved;
  return filePath;
}

module.exports = { config, evidenceSuffixOf, toEvidencePath, destinationFor, resolveExisting };
