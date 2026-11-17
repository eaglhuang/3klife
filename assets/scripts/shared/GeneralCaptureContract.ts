// @spec-source → 戰場武將單挑對決與斬將功能規格書 (doc_spec_0314) §4；使用者 2026-11-17 被擒八題裁決；PROG-2-9393
/**
 * GeneralCaptureContract — 「主將被擒」的戰場 → 戰場外介面（純資料與純函式，不依賴 cc）。
 *
 * 戰場只回報事實（誰、被誰、怎麼被擒）；有沒有君主、君主怎麼處置（斬首／投降／關押／釋放）由戰場外決定。
 * 一場每個陣營最多一筆。
 *
 * Unity 對照：像戰鬥結束時交給 MetaGame 的 BattleReport 裡的一個 DTO。
 */
import { Faction } from './CommonEnums';

/** 怎麼被擒的 */
export type GeneralCaptureCause =
    | 'duel-escape-failed'   // 單挑敗逃，脫逃判定失敗
    | 'duel-slain'           // 單挑一擊歸零（原本的「被斬」）
    | 'troop';               // 單挑以外被打到生命 0（部隊、戰法、奧義）

export interface GeneralCaptureRecord {
    /** 被擒的一方 */
    capturedFaction: Faction;
    /** 被擒主將的名冊代號（GeneralUnit.id，與存檔名冊 GeneralConfig.id 同值） */
    capturedGeneralId: string;
    capturedTemplateId: string | null;
    /** 擒人一方的主將；敵方主將不在名冊，戰場外用 templateId 或關卡找君主 */
    captorGeneralId: string | null;
    captorTemplateId: string | null;
    cause: GeneralCaptureCause;
    /** 教學戰不會產生紀錄，欄位只是保險 */
    tutorial: boolean;
    /** 發生在第幾回合 */
    turn: number;
    /** 這場的關卡代號；戰場畫面收集時補上，戰場核心不知道關卡 */
    encounterId?: string;
}

/** 脫逃機率的基礎值與上下限（使用者 2026-11-17 裁決 Q1 甲） */
export const DUEL_ESCAPE_BASE = 0.6;
export const DUEL_ESCAPE_MIN = 0.3;
export const DUEL_ESCAPE_MAX = 0.9;
/** 雙方運氣差每 200 點換 100% 機率 */
export const DUEL_ESCAPE_LUCK_DIVISOR = 200;

/** 單挑敗逃的脫逃機率＝0.6＋(敗方運氣−勝方運氣)/200，夾在 0.3～0.9 */
export function duelEscapeChance(loserLuck: number, winnerLuck: number): number {
    const luckGap = (Number.isFinite(loserLuck) ? loserLuck : 0) - (Number.isFinite(winnerLuck) ? winnerLuck : 0);
    const raw = DUEL_ESCAPE_BASE + luckGap / DUEL_ESCAPE_LUCK_DIVISOR;
    return Math.max(DUEL_ESCAPE_MIN, Math.min(DUEL_ESCAPE_MAX, raw));
}

/** 擲出的亂數（0～1）小於脫逃機率就逃得掉 */
export function rollDuelEscape(loserLuck: number, winnerLuck: number, roll: number): boolean {
    return roll < duelEscapeChance(loserLuck, winnerLuck);
}
