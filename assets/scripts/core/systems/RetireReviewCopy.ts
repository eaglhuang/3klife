// @spec-source → 武將戰績系統.md §G 劇本（退役戰績回顧、戰損報告）、§H UI_RETIRE_REVIEW / UI_BATTLE_REPORT；「不建議結緣」門檻為暫定（PM 2026-10-14，待定案）
/**
 * RetireReviewCopy — 退役戰績回顧與季度戰損報告的文字（純邏輯，不依賴 cc）
 *
 * Unity 對照：像 Presenter，把戰績與精力數值組成要顯示的字串，
 * View 只負責 label.text = ...，不自己拼字。
 */
import { buildBattleRecordPanel, type BattleRecordLike } from './BattleRecordStats';
import { VITALITY_HIGH_THRESHOLD_PCT } from './VitalityBattleGate';
import { GENERAL_STAGE_START_AGE } from './GeneralStage';

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

/** 季度戰報的一列：名冊武將一筆（REC-08） */
export interface QuarterlyBattleReportRow extends QuarterlyBattleReport {
    generalId: string;
}

/** 季度戰報的對象資格：只列現役可出戰武將（PM 2026-10-21 裁定）；排除教官卡與退休年齡、未成年 */
export interface QuarterlyReportEligibility {
    readonly age?: number;
    readonly isMentorCard?: boolean;
}

/**
 * 年齡未知時不排除（暫定）；成年（adult 起）到退休前才算現役。
 * 退休教官（isMentorCard）一律排除，即使年齡仍在現役區間。
 */
export function isQuarterlyReportEligible(general: QuarterlyReportEligibility): boolean {
    if (general.isMentorCard) return false;
    if (general.age === undefined) return true;
    return general.age >= GENERAL_STAGE_START_AGE.adult && general.age < GENERAL_STAGE_START_AGE.retired;
}

/**
 * 名冊武將的季度戰報（REC-08）。沒有精力資料的武將略過，不編造數值。
 * 精力上限缺少時沿用精力值當上限（與 BattleRoster 的預設一致）。
 * 不符合戰報資格（退休、未成年）的武將也略過。
 */
export function buildQuarterlyBattleReportRows(
    roster: readonly ({ id: string; name: string; vitality?: number; maxVitality?: number } & QuarterlyReportEligibility)[],
): QuarterlyBattleReportRow[] {
    return roster.flatMap((general) => {
        if (general.vitality === undefined) return [];
        if (!isQuarterlyReportEligible(general)) return [];
        const max = general.maxVitality ?? general.vitality;
        const pct = vitalityPercentOf(general.vitality, max);
        return [{ generalId: general.id, ...quarterlyBattleReport(general.name, pct) }];
    });
}
