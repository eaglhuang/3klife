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
import { buildBattleRecordPanel } from '../../core/systems/BattleRecordStats';
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

/** 退役回顧開啟事件（退役成功後由名冊發出；payload 為退役前的武將快照） */
export const RETIRE_REVIEW_OPEN_EVENT = 'RETIRE_REVIEW_OPEN';

export interface RetireReviewOpenPayload {
    readonly general: GeneralConfig;
}

/** 版面靜態文字的 zh-TW 預設；與 resources/i18n/zh-TW.json 的 ui.retire_review.* 同步（測試會比對） */
export const RETIRE_REVIEW_TEXT_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.retire_review.title': '退役回顧',
    'ui.retire_review.close': '關閉',
    'ui.retire_review.report_title': '季度戰損報告',
    'ui.retire_review.career': '生涯戰績：{0}勝 {1}敗 斬{2}人',
    'ui.retire_review.script': '回首征途：勝{0}場，斬敵{1}人，承傷{2}——英雄無悔。',
    'ui.retire_review.report': '戰損報告：精力 {0}%',
    'ui.retire_review.quarterly': '本季戰報：{0} 精力剩 {1}%，{2}',
    'ui.retire_review.bond_ok': '可進行結緣。',
    'ui.retire_review.bond_no': '不建議進行結緣。',
};

/** 文案查詢：key 與可選的 {0}、{1} 占位參數；語系表沒有該 key 時回傳 key 本身 */
export type RetireReviewTextLookup = (key: string, ...args: string[]) => string;

/** 把 {0}、{1} 占位符換成參數；沒給的參數保留原占位符 */
function fillRetireText(template: string, args: readonly string[]): string {
    return template.replace(/\{(\d+)\}/g, (match, index: string) => args[Number(index)] ?? match);
}

export function fallbackRetireReviewText(key: string, ...args: string[]): string {
    const template = RETIRE_REVIEW_TEXT_FALLBACK_ZH_TW[key];
    return template === undefined ? key : fillRetireText(template, args);
}

/** 語系表未載入時 i18n.t 會回傳 key 本身，這時改用 zh-TW 預設，避免畫面出現原始 key */
export function withRetireReviewFallback(lookup: RetireReviewTextLookup): RetireReviewTextLookup {
    return (key, ...args) => {
        const localized = lookup(key, ...args);
        return localized === key ? fallbackRetireReviewText(key, ...args) : localized;
    };
}

/**
 * 退役回顧面板的全部文字，key 等於 retire-review-main.json 的節點 id。
 * 所有句子都走語系查詢，數值以占位參數傳入；缺資料時戰績為 0 勝 0 敗。
 */
export function buildRetireReviewTexts(
    general: GeneralConfig | undefined | null,
    lookup: RetireReviewTextLookup = fallbackRetireReviewText,
): Record<string, string> {
    const g = (general ?? {}) as ReviewCarrier;
    const [wins, losses, kills, , guardian] = buildBattleRecordPanel(g.battleRecord ?? null).rows.map(row => String(row.value));
    const pct = vitalityPercentOf(g.vitality ?? 0, g.maxVitality ?? g.vitality ?? 0);
    const report = quarterlyBattleReport(g.name ?? '', pct);
    const bondText = lookup(report.bondRecommended ? 'ui.retire_review.bond_ok' : 'ui.retire_review.bond_no');
    return {
        retireTitle: lookup('ui.retire_review.title'),
        retireName: g.name ?? '',
        retireCareer: lookup('ui.retire_review.career', wins, losses, kills),
        retireScript: lookup('ui.retire_review.script', wins, kills, guardian),
        retireReport: lookup('ui.retire_review.report', String(pct)),
        retireQuarterly: lookup('ui.retire_review.quarterly', g.name ?? '', String(pct), bondText),
        closeRetireLabel: lookup('ui.retire_review.close'),
    };
}
