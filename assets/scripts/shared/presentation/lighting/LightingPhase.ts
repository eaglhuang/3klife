/**
 * LightingPhase.ts — 日夜階段判定（QLIFE-01 第 3.5.5 節）。純函式，不依賴 Cocos。
 *
 * 時段 1～7（晨、上午、午、下午、傍晚、夜、深夜）換成 0～24 小時，
 * 再依該季「夜開始／晨起」判定光照階段：晨／日／昏／夜。
 * 時鐘參數全部來自 life-lighting.json（見 LightingTable.ts），此檔不寫死任何數字。
 */
import type { LightingPhaseId, LightingSeason, LightingTable } from './LightingTable';

export interface PhaseResult {
    phase: LightingPhaseId;
    /** 換算後的小時（0～24） */
    hour: number;
    /** 深夜：夜階段中 00 時至晨起，乘色再乘 deepNightMultiplier、光源只留特定店家 */
    deepNight: boolean;
}

/**
 * 時段換算小時：該時段起點 + 進度 × 時段長度。progress 預設 0.5＝時段代表時
 * （晨 6.5、上午 9.5、午 12.5、下午 15.5、傍晚 18.5、夜 22、深夜 2.5）。
 */
export function slotToHour(table: LightingTable, slot: number, progress = 0.5): number {
    const def = table.slots.find(s => s.id === slot);
    if (!def) throw new Error(`[LightingPhase] 未知時段：${slot}`);
    const p = Math.min(1, Math.max(0, progress));
    return def.startHour + (def.endHour - def.startHour) * p;
}

/** 依小時與季節判定光照階段 */
export function phaseOfHour(table: LightingTable, season: LightingSeason, hour: number): PhaseResult {
    const clock = table.seasonClock[season];
    const dawnEnd = clock.dawnStart + table.dawnDurationHours;
    const duskStart = clock.nightStart - table.duskLeadHours;
    let phase: LightingPhaseId;
    if (hour < clock.dawnStart) phase = 'night';
    else if (hour < dawnEnd) phase = 'dawn';
    else if (hour < duskStart) phase = 'day';
    else if (hour < clock.nightStart) phase = 'dusk';
    else phase = 'night';
    return { phase, hour, deepNight: phase === 'night' && hour < clock.dawnStart };
}

/** 時段 → 階段（進入場景直接用當下時段算，無過場載入） */
export function phaseOfSlot(table: LightingTable, season: LightingSeason, slot: number, progress = 0.5): PhaseResult {
    return phaseOfHour(table, season, slotToHour(table, slot, progress));
}

/** 遊戲季度（1 春 2 夏 3 秋 4 冬，循環）→ 季節 */
export function seasonOfQuarter(table: LightingTable, quarter: number): LightingSeason {
    const n = table.seasons.length;
    const idx = (((Math.floor(quarter) - 1) % n) + n) % n;
    return table.seasons[idx];
}
