/**
 * SandtableMarkers — 世界沙盤標記數量上限（純邏輯，不依賴 cc）
 *
 * 規格來源：官職系統.md §功能清單 #4「世界沙盤解鎖」（S1/S2/S3 階段）。
 * 各階段可放的標記數量為暫定值（PM 2026-10-21 暫定 S1=3、S2=5、S3=8），待正式定案後改常數即可。
 *
 * Unity 對照：像沙盤地圖的 Prefab 池，每個階段只開放固定數量的 Slot，超過就不再生成。
 */
import type { OfficerUnlocks } from './OfficerSnapshot';

export type SandtableStage = NonNullable<OfficerUnlocks['sandtableStage']>;

/** 各階段標記上限（暫定） */
export const SANDTABLE_MARKER_LIMIT: Readonly<Record<SandtableStage, number>> = {
    S1: 3,
    S2: 5,
    S3: 8,
};

/** 未解鎖沙盤（stage 為 null）時上限為 0 */
export function sandtableMarkerLimitOf(stage: OfficerUnlocks['sandtableStage']): number {
    return stage ? SANDTABLE_MARKER_LIMIT[stage] : 0;
}

/** 還能放幾個標記；已放數量為負或非有限數時視為 0 */
export function remainingSandtableMarkers(placed: number, stage: OfficerUnlocks['sandtableStage']): number {
    const used = Number.isFinite(placed) && placed > 0 ? Math.floor(placed) : 0;
    return Math.max(0, sandtableMarkerLimitOf(stage) - used);
}

/** 是否還能再放一個標記 */
export function canPlaceSandtableMarker(placed: number, stage: OfficerUnlocks['sandtableStage']): boolean {
    return remainingSandtableMarkers(placed, stage) > 0;
}
