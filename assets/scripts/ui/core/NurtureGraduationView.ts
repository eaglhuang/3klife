// @spec-source → 培育系統.md §Server 端 — 培育紀錄表（NUR-15）；PROG-2-0746（畢業紀錄檢視的視圖模型）
/**
 * NurtureGraduationView — 畢業紀錄檢視的列（純邏輯，不依賴 cc）
 *
 * 把 NurtureRecordDraft 轉成畫面列。JSON 欄位解析失敗時退回空值，不讓畫面崩潰。
 * revelation_level 0 表示未揭露（PROG-2-0744，暫定）。
 * 文案缺 key 時退回 zh-TW 預設。
 */
import type { NurtureRecordDraft } from '../../core/systems/NurtureRecordRow';

export const NURTURE_GRADUATION_FALLBACK_ZH_TW: Readonly<Record<string, string>> = {
    'ui.general.nurture.record.period': '第 {0} 季至第 {1} 季',
    'ui.general.nurture.record.rating': '評級 {0}',
    'ui.general.nurture.record.tags_empty': '無標籤',
    'ui.general.nurture.record.tp_unknown': 'TP 未紀錄',
    'ui.general.nurture.record.tp': 'TP {0}',
    'ui.general.nurture.record.revelation_none': '未揭露',
    'ui.general.nurture.record.revelation': '揭露第 {0} 層',
};

export type NurtureGraduationTextLookup = (key: string) => string;

const IDENTITY_LOOKUP: NurtureGraduationTextLookup = (key) => key;

function textOf(lookup: NurtureGraduationTextLookup, key: string, ...args: (string | number)[]): string {
    const localized = lookup(key);
    const template = localized === key ? (NURTURE_GRADUATION_FALLBACK_ZH_TW[key] ?? key) : localized;
    return template.replace(/\{(\d+)\}/g, (match, index: string) => {
        const value = args[Number(index)];
        return value === undefined ? match : String(value);
    });
}

export interface NurtureGraduationRow {
    sessionId: string;
    periodText: string;
    ratingText: string;
    tagsText: string;
    tpText: string;
    revelationText: string;
}

/** 解析 graduation_tags_json；壞掉或不是陣列時回傳空陣列 */
export function parseGraduationTags(json: string): string[] {
    try {
        const parsed: unknown = JSON.parse(json);
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : [];
    } catch {
        return [];
    }
}

/** 畢業紀錄轉檢視列；不修改輸入 */
export function nurtureGraduationRows(
    records: readonly NurtureRecordDraft[],
    lookup: NurtureGraduationTextLookup = IDENTITY_LOOKUP,
): NurtureGraduationRow[] {
    return records.map((record) => {
        const tags = parseGraduationTags(record.graduation_tags_json);
        const level = record.revelation_level ?? 0;
        return {
            sessionId: record.session_id,
            periodText: textOf(lookup, 'ui.general.nurture.record.period', record.start_season, record.end_season),
            ratingText: textOf(lookup, 'ui.general.nurture.record.rating', record.rating),
            tagsText: tags.length > 0 ? tags.join('、') : textOf(lookup, 'ui.general.nurture.record.tags_empty'),
            tpText: record.tp_total === null
                ? textOf(lookup, 'ui.general.nurture.record.tp_unknown')
                : textOf(lookup, 'ui.general.nurture.record.tp', record.tp_total),
            revelationText: level === 0
                ? textOf(lookup, 'ui.general.nurture.record.revelation_none')
                : textOf(lookup, 'ui.general.nurture.record.revelation', level),
        };
    });
}
