// @spec-source → 武將戰績系統.md §G 劇本（退役戰績回顧、季度戰損報告）、§H UI_RETIRE_REVIEW / UI_BATTLE_REPORT；PROG-2-0448（REC-08）
/**
 * RetireReviewController — 退役戰績回顧與季度戰損報告的畫面流程（純邏輯，不依賴 cc）
 *
 * 職責：從武將資料取出 battleRecord 與精力，組成退役回顧面板與季度戰報要顯示的文字。
 * 文字組合沿用 RetireReviewCopy（已有測試）；這裡只負責「從武將拿資料、缺資料時給安全預設」。
 *
 * 暫定（可逆）：舊存檔沒有 battleRecord 時當作空戰績（0 勝 0 敗），與戰績分頁一致。
 * Unity 對照：Presenter。View 只把 texts[key] 寫進 Label，不自己拼字。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { BattleRecord } from '../../core/systems/BattleRoster';
import { quarterlyBattleReport, retireReviewCareerLine, retireReviewScriptLine, vitalityPercentOf } from '../../core/systems/RetireReviewCopy';

export interface RetireReviewView {
    /** 退役回顧：生涯戰績一行（UI_RETIRE_REVIEW） */
    readonly careerLine: string;
    /** 退役回顧：劇本句（回首征途） */
    readonly scriptLine: string;
    /** 季度戰損報告：戰損報告：精力 X% */
    readonly reportLine: string;
    /** 季度戰報劇本句，含是否建議結緣 */
    readonly quarterlyScriptLine: string;
    readonly bondRecommended: boolean;
}

type ReviewCarrier = GeneralConfig & { battleRecord?: BattleRecord; vitality?: number; maxVitality?: number };

export function buildRetireReviewView(general: GeneralConfig | undefined | null): RetireReviewView {
    const g = (general ?? {}) as ReviewCarrier;
    const record = g.battleRecord ?? null;
    const pct = vitalityPercentOf(g.vitality ?? 0, g.maxVitality ?? g.vitality ?? 0);
    const report = quarterlyBattleReport(g.name ?? '', pct);
    return {
        careerLine: retireReviewCareerLine(record),
        scriptLine: retireReviewScriptLine(record),
        reportLine: report.reportLine,
        quarterlyScriptLine: report.scriptLine,
        bondRecommended: report.bondRecommended,
    };
}
