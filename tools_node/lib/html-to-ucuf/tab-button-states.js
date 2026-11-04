'use strict';
// 分頁鈕選中狀態：HTML 快照只畫得出「當下選中那一顆」，轉出的 slot 樣式彼此不同卻沒有狀態關聯。
// 同組分頁鈕中樣式唯一的那顆視為選中樣式，其餘為一般樣式，寫成 visualStates 給 runtime 切換。

const TAB_CONTRACT_PREFIX = 'tab.switch.';
const STYLE_KEYS = ['gradient', 'backgroundLayers', 'color', 'borderWidth', 'borderColor', 'cornerRadius'];

function collectTabSlotIds(node, out = []) {
  if (!node || typeof node !== 'object') return out;
  const contract = typeof node._contract === 'string' ? node._contract : '';
  if (contract.startsWith(TAB_CONTRACT_PREFIX) && typeof node.skinSlot === 'string') out.push(node.skinSlot);
  for (const child of Array.isArray(node.children) ? node.children : []) collectTabSlotIds(child, out);
  return out;
}

function styleSignature(slot) {
  return JSON.stringify(STYLE_KEYS.map((key) => slot[key] ?? null));
}

/** 回傳 { applied, normal, selected, reason }；skin 就地修改。 */
function applyTabButtonVisualStates(layout, skin) {
  const slots = (skin && skin.slots) || {};
  const slotIds = [...new Set(collectTabSlotIds(layout && layout.root ? layout.root : layout))]
    .filter((id) => slots[id] && slots[id].kind !== 'button-skin');
  if (slotIds.length < 2) return { applied: false, reason: 'fewer-than-two-procedural-tab-buttons' };

  const groups = new Map();
  for (const id of slotIds) {
    const signature = styleSignature(slots[id]);
    if (!groups.has(signature)) groups.set(signature, []);
    groups.get(signature).push(id);
  }
  const unique = [...groups.values()].filter((ids) => ids.length === 1);
  if (groups.size !== 2 || unique.length !== 1) return { applied: false, reason: 'no-single-selected-style' };

  const selected = unique[0][0];
  const normal = slotIds.find((id) => id !== selected);
  for (const id of slotIds) slots[id].visualStates = { normal, selected };
  return { applied: true, normal, selected };
}

module.exports = { applyTabButtonVisualStates };
