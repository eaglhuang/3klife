/**
 * lore id 解析（PROG-2-0417）
 *
 * 規則：
 *   1. aliases 把 lore 的舊 id 指向 base 的 id（例如 cao-cao-pi → cao-pi）。
 *   2. deprecated 的 lore 條目略過，不進 runtime。
 *   3. 同一個 base id 出現多筆時，真實內容優先於 draft；兩者同類時保留先出現者。
 */
'use strict';

/**
 * @param {Array<Record<string, unknown>>} loreList  generals-lore.json 的 data
 * @param {{ aliases?: Record<string,string>, deprecated?: Record<string,string> }} aliasDoc
 * @returns {Map<string, Record<string, unknown>>} base id → 解析後的 lore 條目
 */
function resolveLoreMap(loreList, aliasDoc = {}) {
  const aliases = aliasDoc.aliases || {};
  const deprecated = new Set(Object.keys(aliasDoc.deprecated || {}));
  const map = new Map();
  for (const entry of loreList) {
    if (!entry || !entry.id || deprecated.has(entry.id) || entry.deprecated === true) continue;
    const target = aliases[entry.id] || entry.id;
    const existing = map.get(target);
    if (!existing || (existing.draft === true && entry.draft !== true)) {
      map.set(target, { ...entry, id: target });
    }
  }
  return map;
}

module.exports = { resolveLoreMap };
