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
    type RankingCandidateInput,
    type YearEndRankingResult,
} from './YearEndRankingService';

export type CeremonyAct = 1 | 2 | 3;
export type CeremonyTranslate = (key: string, ...args: string[]) => string;

/** 三幕各自停留秒數；三幕合計必須 ≤ 30 秒（驗收條件） */
export const CEREMONY_ACT_SECONDS: readonly [number, number, number] = [7, 8, 8];
export const CEREMONY_MAX_TOTAL_SECONDS = 30;

/** 玩家在榜單上的固定 id */
export const CEREMONY_PLAYER_ID = 'player';

/**
 * 以真實遊戲現況結算本年榜單。
 * 分數暫以家族聲望（GameSession.clanPrestige）為準；驚喜獎標籤由呼叫端依真實事件帶入（沒有就不發）。
 */
export function buildYearEndCeremonyResult(
    year: number,
    clanPrestige: number,
    playerName: string,
    tags: readonly string[] = [],
): YearEndRankingResult {
    const player: RankingCandidateInput = {
        id: CEREMONY_PLAYER_ID,
        name: playerName,
        score: Math.max(0, Math.round(Number.isFinite(clanPrestige) ? clanPrestige : 0)),
        isPlayer: true,
        ...(tags.length > 0 ? { tags: [...tags] } : {}),
    };
    return YearEndRankingService.evaluateYearEndRanking(year, [player]);
}

/** 每一幕的標題（「第一幕・名門入場」） */
export function ceremonyActHeadline(act: CeremonyAct, t: CeremonyTranslate): string {
    return t(`ui.ceremony.act.${act}`);
}

/** 第一幕下方的名單：名次、名門、分數；玩家那行標「本府」 */
export function ceremonyStandingsText(result: YearEndRankingResult, t: CeremonyTranslate): string {
    return result.standings
        .map((s) => t('ui.ceremony.standing', String(s.rank), s.isPlayer ? t('ui.ceremony.player', s.name) : s.name, String(s.score)))
        .join('\n');
}

/** 各幕對白；第 3 幕有驚喜獎念賀詞，沒有就念明年展望 */
export function ceremonyActDialogue(result: YearEndRankingResult, act: CeremonyAct, t: CeremonyTranslate): string {
    if (act === 1) {
        return t('ui.ceremony.act1.intro', result.standings.map((s) => s.name).join('、'));
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
