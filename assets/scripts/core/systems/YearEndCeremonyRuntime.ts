// @spec-source → PROG-2-10046 年終頒獎典禮掛載（資料組裝與三幕文字，純邏輯不依賴 cc）
/**
 * YearEndCeremonyRuntime — 年終頒獎典禮需要的真實資料與三幕文字（純邏輯）
 *
 * 職責：把遊戲現況（家族聲望、年份）組成榜單入參、交給 YearEndRankingService 結算，
 *       並依幕數產生對白（文字全走注入的翻譯函式，四語系由 i18n 表負責）。
 * 不負責：畫面節點（YearEndCeremonyPanel）、存檔旗標（GameSession.yearEndCeremonySeen）。
 */
import {
    YearEndRankingService,
    computeYearEndScore,
    judgeSurpriseTags,
    type RankingCandidateInput,
    type YearEndRankingResult,
    type YearEndScoreInput,
} from './YearEndRankingService';

export type CeremonyAct = 1 | 2 | 3;
export type CeremonyTranslate = (key: string, ...args: string[]) => string;

/** 三幕各自停留秒數；三幕合計必須 ≤ 30 秒（驗收條件） */
export const CEREMONY_ACT_SECONDS: readonly [number, number, number] = [7, 8, 8];
export const CEREMONY_MAX_TOTAL_SECONDS = 30;

/** 玩家在榜單上的固定 id */
export const CEREMONY_PLAYER_ID = 'player';

/** 上一次典禮的玩家榜單分數；存檔欄位 resources.lastCeremonyScore */
export interface LastCeremonyScore {
    year: number;
    score: number;
}

/** 讀檔還原本年家族銀兩入帳合計；壞值回 0 */
export function normalizeYearSilverIncome(raw: unknown): number {
    return typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/** 讀檔還原去年典禮分數；壞值回 null（視為沒有比較基準，不發黑馬） */
export function normalizeLastCeremonyScore(raw: unknown): LastCeremonyScore | null {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as { year?: unknown; score?: unknown };
    if (typeof src.year !== 'number' || !Number.isInteger(src.year) || src.year <= 0) return null;
    if (typeof src.score !== 'number' || !Number.isFinite(src.score) || src.score < 0) return null;
    return { year: src.year, score: Math.round(src.score) };
}

/** 驚喜獎判定的上下文：去年分數（第 1 年為 null）與當年子嗣互動次數 */
export interface CeremonyContext {
    lastYearScore: number | null;
    childInteractions: number;
}

/**
 * 以真實遊戲現況結算本年榜單。
 * 玩家分數由 computeYearEndScore（係數在 year-end-ranking-config.json）算出；驚喜獎由 judgeSurpriseTags 依去年分數與互動次數判定。
 */
export function buildYearEndCeremonyResult(
    year: number,
    scoreInput: YearEndScoreInput,
    playerName: string,
    context: CeremonyContext = { lastYearScore: null, childInteractions: 0 },
): YearEndRankingResult {
    const score = computeYearEndScore(scoreInput);
    const tags = judgeSurpriseTags({ score, lastYearScore: context.lastYearScore, childInteractions: context.childInteractions });
    const player: RankingCandidateInput = {
        id: CEREMONY_PLAYER_ID,
        name: playerName,
        score,
        isPlayer: true,
        ...(tags.length > 0 ? { tags } : {}),
    };
    return YearEndRankingService.evaluateYearEndRanking(year, [player]);
}

/** 榜單上的顯示名：NPC 名門走 i18n key，玩家用傳入的名字 */
export function ceremonyDisplayName(entry: { name: string; nameKey?: string }, t: CeremonyTranslate): string {
    return entry.nameKey ? t(entry.nameKey) : entry.name;
}

/** 每一幕的標題（「第一幕・名門入場」） */
export function ceremonyActHeadline(act: CeremonyAct, t: CeremonyTranslate): string {
    return t(`ui.ceremony.act.${act}`);
}

/** 第一幕下方的名單：名次、名門、分數；玩家那行標「本府」 */
export function ceremonyStandingsText(result: YearEndRankingResult, t: CeremonyTranslate): string {
    return result.standings
        .map((s) => t('ui.ceremony.standing', String(s.rank), s.isPlayer ? t('ui.ceremony.player', s.name) : ceremonyDisplayName(s, t), String(s.score)))
        .join('\n');
}

/** 各幕對白；第 3 幕有驚喜獎念賀詞，沒有就念明年展望；首年目標達新手滿貫（PROG-2-10062）再加一行賀詞 */
export function ceremonyActDialogue(result: YearEndRankingResult, act: CeremonyAct, t: CeremonyTranslate): string {
    const base = ceremonyActBaseDialogue(result, act, t);
    return act === 3 && result.newbieGrandSlam ? `${base}\n${t('ui.ceremony.act3.grandSlam')}` : base;
}

function ceremonyActBaseDialogue(result: YearEndRankingResult, act: CeremonyAct, t: CeremonyTranslate): string {
    if (act === 1) {
        return t('ui.ceremony.act1.intro', result.standings.map((s) => ceremonyDisplayName(s, t)).join('、'), String(result.standings.length));
    }
    if (act === 2) {
        if (result.playerRank <= 3) {
            return t('ui.ceremony.act2.top3', String(result.playerRank), String(result.playerReward.gold), String(result.playerReward.jade));
        }
        return t(`ui.ceremony.roast.${((result.year - 1) % 3) + 1}`);
    }
    if (result.surpriseAward) {
        const kind = result.surpriseAward.id === 'surprise_dark_horse' ? 'dark_horse' : 'spoiled';
        return t(`ui.ceremony.surprise.${kind}.${((result.year - 1) % 2) + 1}`, String(result.surpriseAward.bonusGold));
    }
    const next = YearEndRankingService.getRankReward(1, result.year + 1);
    return t(result.playerRank <= 3 ? 'ui.ceremony.act3.hint.top' : 'ui.ceremony.act3.hint.out', String(result.year + 1), String(next.gold), String(next.jade));
}

// ─── 演出時間軸（PROG-2-10050）：金／銀／銅框揭曉與敲鑼掌聲時機，純資料、由面板 tick 驅動 ───

export type CeremonyCue = 'gong' | 'applause';
export type CeremonyEvent =
    | { readonly type: 'cue'; readonly cue: CeremonyCue }
    | { readonly type: 'reveal'; readonly rank: 1 | 2 | 3 };

interface TimedEvent {
    /** 本幕開始後幾秒觸發 */
    readonly at: number;
    readonly event: CeremonyEvent;
}

/**
 * 各幕事件表。第 1 幕開場敲鑼；第 2 幕換幕敲鑼，名次依金、銀、銅序亮框，金框亮起同時掌聲。
 * 第 3 幕沒有事件（框保持亮著）。所有 at 必須小於該幕停留秒數（測試鎖住）。
 */
export const CEREMONY_TIMELINE: Readonly<Record<CeremonyAct, readonly TimedEvent[]>> = {
    1: [{ at: 0, event: { type: 'cue', cue: 'gong' } }],
    2: [
        { at: 0, event: { type: 'cue', cue: 'gong' } },
        { at: 0.8, event: { type: 'reveal', rank: 1 } },
        { at: 0.8, event: { type: 'cue', cue: 'applause' } },
        { at: 1.9, event: { type: 'reveal', rank: 2 } },
        { at: 3.0, event: { type: 'reveal', rank: 3 } },
    ],
    3: [],
};

/** 名次框對應的主題色 token（沒有金銀銅專用 token，取 settle 家族既有金邊、淡褐、深褐） */
export const CEREMONY_RANK_FRAME_TOKENS: Readonly<Record<1 | 2 | 3, { token: string; fallback: string }>> = {
    1: { token: 'settle.button.gold.border', fallback: '#E8BE60' },
    2: { token: 'settle.text.muted', fallback: '#8A6A3A' },
    3: { token: 'settle.text.key', fallback: '#8A4B12' },
};

/** 取出「本幕經過時間在 (fromSec, toSec]」的事件；fromSec 傳負數代表包含 0 秒（剛進幕） */
export function ceremonyEventsBetween(act: CeremonyAct, fromSec: number, toSec: number): CeremonyEvent[] {
    return CEREMONY_TIMELINE[act]
        .filter((item) => item.at > fromSec && item.at <= toSec)
        .map((item) => item.event);
}
