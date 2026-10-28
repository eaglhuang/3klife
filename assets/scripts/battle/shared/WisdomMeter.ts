// @spec-source → 戰法場景規格書.md (doc_spec_0039)；PROG-2-1429 依建檔紀錄補標出處
/**
 * WisdomMeter — 軍師智謀能量累積（WBS v7 SCN-10 純邏輯，PROG-2-0616）
 *
 * 每回合累積 INT × 0.5，滿 100 觸發一次後歸零。
 * 滿格觸發「全局增幅」（PROG-2-1574，暫定）：我方全軍鼓舞士氣 +20（沿用士氣系統，+20% 攻擊、3 回合不疊加）。
 * HUD 不在本檔範圍。
 */
import type { Faction } from '../../core/config/Constants';
import { castMorale, MoraleCarrier } from './Morale';

export const WISDOM_METER_MAX = 100;
export const WISDOM_METER_GAIN_RATIO = 0.5;
/** 智謀滿格時全軍士氣加成（暫定，PROG-2-1574） */
export const WISDOM_SURGE_MORALE = 20;

export interface WisdomMeterStep {
    meter: number;
    triggered: boolean;
}

export function advanceWisdomMeter(meter: number, intelligence: number): WisdomMeterStep {
    const gain = Math.max(0, intelligence) * WISDOM_METER_GAIN_RATIO;
    const next = meter + gain;
    if (next >= WISDOM_METER_MAX) {
        return { meter: 0, triggered: true };
    }
    return { meter: next, triggered: false };
}

/** 智謀全局增幅：該陣營存活部隊全體鼓舞；回傳受影響數量 */
export function applyWisdomSurge(units: Iterable<MoraleCarrier & { isDead(): boolean }>, faction: Faction): number {
    let count = 0;
    for (const unit of units) {
        if (unit.faction !== faction || unit.isDead()) continue;
        castMorale(unit, WISDOM_SURGE_MORALE);
        count += 1;
    }
    return count;
}
