// @spec-source → 武將系統.md §B 功能 #5（GEN-07 生命週期）；武將壽命系統.md §F（剩餘壽命）；PROG-2-0232
/**
 * GeneralLifecyclePresenter — 武將詳情與培育畫面的生命週期文字（純邏輯，不依賴 cc）
 *
 * 階段由 GeneralStage（GEN-07 狀態機）依年齡推導；剩餘壽命由 LifespanWiring.remainingLifespanMonths 推導。
 * 只產生文字，不改武將資料。沒有年齡或已故時回傳佔位文字，不猜測。
 *
 * Unity 對照：像 Presenter 的一個小 helper，把 Model 的數值轉成 Label 的字串。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { deriveGeneralStage, GeneralStage } from '../../core/systems/GeneralStage';
import { AgingGeneral, GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';
import { MONTHS_PER_YEAR, remainingLifespanMonths } from '../../core/systems/LifespanWiring';

export const GENERAL_STAGE_LABELS: Readonly<Record<GeneralStage, string>> = {
    birth: '幼兒',
    unveiling: '待開獎',
    adult: '成年',
    peak: '巔峰',
    decline: '衰老',
    retired: '退役候選',
};

export const LIFECYCLE_PLACEHOLDER = '—';

export interface LifecycleView {
    stage: GeneralStage | null;
    stageLabel: string;
    /** 剩餘月數；未知或已故為 null */
    remainingMonths: number | null;
    /** 「剩餘 12 年 3 月」；沒有資料為佔位文字 */
    remainingText: string;
    /** 「成年 · 剩餘 12 年 3 月」，給一行空間放的摘要 */
    summary: string;
}

export function formatRemainingMonths(months: number): string {
    const years = Math.floor(months / MONTHS_PER_YEAR);
    const rest = months % MONTHS_PER_YEAR;
    return `剩餘 ${years} 年 ${rest} 月`;
}

export function describeLifecycle(general: GeneralConfig): LifecycleView {
    const dead = (general.status ?? '').toLowerCase() === GENERAL_STATUS_DEAD;
    if (dead) {
        return { stage: null, stageLabel: '已故', remainingMonths: null, remainingText: '已故', summary: '已故' };
    }
    if (typeof general.age !== 'number' || !Number.isFinite(general.age) || general.age < 0) {
        return { stage: null, stageLabel: LIFECYCLE_PLACEHOLDER, remainingMonths: null, remainingText: LIFECYCLE_PLACEHOLDER, summary: LIFECYCLE_PLACEHOLDER };
    }
    const stage = deriveGeneralStage(general.age);
    const months = remainingLifespanMonths(general as AgingGeneral);
    const remainingText = formatRemainingMonths(months);
    return {
        stage,
        stageLabel: GENERAL_STAGE_LABELS[stage],
        remainingMonths: months,
        remainingText,
        summary: `${GENERAL_STAGE_LABELS[stage]} · ${remainingText}`,
    };
}
