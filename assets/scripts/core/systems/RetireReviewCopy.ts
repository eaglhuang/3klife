// @spec-source → 武將戰績系統.md §G 劇本（退役戰績回顧、戰損報告）、§H UI_RETIRE_REVIEW / UI_BATTLE_REPORT；「不建議結緣」門檻為暫定（PM 2026-10-14，待定案）
/**
 * RetireReviewCopy — 退役戰績回顧與季度戰損報告的文字（純邏輯，不依賴 cc）
 *
 * Unity 對照：像 Presenter，把戰績與精力數值組成要顯示的字串，
 * View 只負責 label.text = ...，不自己拼字。
 */
import { buildBattleRecordPanel, type BattleRecordLike } from './BattleRecordStats';
import { VITALITY_HIGH_THRESHOLD_PCT } from './VitalityBattleGate';

/** 退役面板的生涯戰績一行（UI_RETIRE_REVIEW） */
export function retireReviewCareerLine(record: BattleRecordLike | null | undefined): string {
    return buildBattleRecordPanel(record).careerText;
}

/** 退役戰績回顧的劇本句（§G）：回首征途：勝 X 場，斬敵 Y 人，承傷 Z */
export function retireReviewScriptLine(record: BattleRecordLike | null | undefined): string {
    const panel = buildBattleRecordPanel(record);
    const wins = panel.rows[0].value;
    const kills = panel.rows[2].value;
    const guardian = panel.rows[4].value;
    return `回首征途：勝${wins}場，斬敵${kills}人，承傷${guardian}——英雄無悔。`;
}

/**
 * 精力百分比（0~100，無條件捨去）。上限無效時回 0。
 * 規格的戰損報告顯示「精力 {Vitality}%」。
 */
export function vitalityPercentOf(current: number, max: number): number {
    if (!Number.isFinite(max) || max <= 0) return 0;
    const pct = Math.floor((Math.max(0, current) / max) * 100);
    return Math.min(100, Math.max(0, pct));
}

export interface QuarterlyBattleReport {
    /** UI_BATTLE_REPORT：戰損報告：精力 X% */
    readonly reportLine: string;
    /** 劇本句：本季戰報：{Name} 精力剩 X%，不建議進行結緣。 */
    readonly scriptLine: string;
    /** 是否建議結緣；精力在高區（> 50%）才建議（暫定） */
    readonly bondRecommended: boolean;
}

/**
 * 季度戰損報告。
 * 規格只寫「不建議進行結緣」，沒有寫門檻；暫定沿用精力高區門檻，精力不在高區時不建議結緣（PM 待定案）。
 */
export function quarterlyBattleReport(name: string, vitalityPct: number): QuarterlyBattleReport {
    const pct = Math.min(100, Math.max(0, Math.floor(Number.isFinite(vitalityPct) ? vitalityPct : 0)));
    const bondRecommended = pct > VITALITY_HIGH_THRESHOLD_PCT;
    return {
        reportLine: `戰損報告：精力 ${pct}%`,
        scriptLine: `本季戰報：${name} 精力剩 ${pct}%，${bondRecommended ? '可進行結緣。' : '不建議進行結緣。'}`,
        bondRecommended,
    };
}
