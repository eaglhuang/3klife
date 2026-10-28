// @spec-source → 武將人物介面規格書.md（寶頁 §寶：一般裝備／傳家寶／道具三段）；WBS TSK-08（PROG-2-1394，PM 2026-10-28）
/**
 * EquipBindPathPolicy — 寶頁三段的節點名稱（TSK-08，純常數，不依賴 cc）。
 *
 * - gear：六格 EquipSlot_<槽>，在 character-ds3-equip-content.json 的版型內。
 * - heirloom：HeirloomCard，由 CharacterDs3EquipChild 於執行期建立（不在版型內，見 TSK-04）。
 * - items：EquipItemSummary，在版型內，由 CharacterDs3EquipChild 寫入道具摘要文字。
 *
 * Unity 對照：像 Prefab 的 child 名稱表，Presenter 用名稱找節點；名稱表與 Prefab 不一致時，測試直接報錯。
 */
import { EQUIP_SLOTS } from '../../../core/systems/GeneralBackpack';

export const EQUIP_GEAR_NODE_PREFIX = 'EquipSlot_';
export const EQUIP_HEIRLOOM_NODE = 'HeirloomCard';
export const EQUIP_ITEM_SUMMARY_NODE = 'EquipItemSummary';

export const EQUIP_SEGMENT_NODES = {
    gear: EQUIP_SLOTS.map((slot) => `${EQUIP_GEAR_NODE_PREFIX}${slot}`),
    heirloom: [EQUIP_HEIRLOOM_NODE],
    items: [EQUIP_ITEM_SUMMARY_NODE],
} as const;
