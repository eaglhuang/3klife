// @spec-source → 轉蛋系統.md §B-1 雙池分工敘事、§雙池定位導覽（GCH-10）、§死亡傳承提示（PROG-2-0563）
/**
 * GachaPoolGuide — 雙池定位文案與死亡傳承提示（純邏輯，不依賴 cc）
 *
 * - 名將池明示「血統種子」，支援卡池明示「培育深度」，降低新手把支援卡誤認成可上陣角色。
 * - 名將詳情提示「死亡後會留下英靈卡與虎符卡」，但明確說明不會在抽卡結果中掉落。
 * - 只提供文案，畫面（卡池頁、新手引導、詳情頁）由 UI 端引用。
 *
 * Unity 對照：像 Localization 表的 key → 字串，UI 只讀字串、不自己拼。
 */

export const GENERAL_POOL_GUIDE = '三國名將池：血統種子（抽到的名將可直接培養與上陣）';
export const SUPPORT_POOL_GUIDE = '支援卡池：培育深度（抽到的教官用於培育，不可上陣）';
export const DEATH_LEGACY_HINT = '死亡後會留下英靈卡與虎符卡；這些遺產不會在抽卡結果中掉落。';
