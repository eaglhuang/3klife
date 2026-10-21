// @spec-source → 官職系統.md §功能清單 #4「世界沙盤解鎖」；PROG-2-0964（沙盤狀態列，唯讀）
/**
 * SandtableStatus — 天下沙盤入口的狀態文字（純邏輯，不依賴 cc）
 *
 * 職責：依官職沙盤階段與已放置標記數，組出大廳沙盤按鈕上的狀態字串。
 * 未解鎖時只顯示「尚未開放」；已解鎖時顯示階段與「已放 / 上限」。
 *
 * Unity 對照：像沙盤入口按鈕的 Label，由 Presenter 算好文字，View 只寫 label.text。
 */
import { SANDTABLE_MARKER_LIMIT } from './SandtableMarkers';
import type { OfficerUnlocks } from './OfficerSnapshot';

const SANDTABLE_TITLE = '天下沙盤';

export function buildSandtableStatusLabel(
    stage: OfficerUnlocks['sandtableStage'],
    markersPlaced: number,
): string {
    if (!stage) return `${SANDTABLE_TITLE}（尚未開放）`;
    const placed = Number.isFinite(markersPlaced) && markersPlaced > 0 ? Math.floor(markersPlaced) : 0;
    return `${SANDTABLE_TITLE}・${stage}｜標記 ${placed}/${SANDTABLE_MARKER_LIMIT[stage]}`;
}
