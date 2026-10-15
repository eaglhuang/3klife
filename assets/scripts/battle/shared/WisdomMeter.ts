/**
 * WisdomMeter — 軍師智謀能量累積（WBS v7 SCN-10 純邏輯，PROG-2-0616）
 *
 * 每回合累積 INT × 0.5，滿 100 觸發一次後歸零。
 * 全局增幅效果與 HUD 不在本檔範圍。
 */

export const WISDOM_METER_MAX = 100;
export const WISDOM_METER_GAIN_RATIO = 0.5;

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
