// @spec-source → PROG-2-10153 年末頒獎典禮 A 版領獎台（純邏輯不依賴 cc；設計稿 artifacts/ui-review/ceremony-redesign-1127/spec.md）
/**
 * YearEndCeremonyPodium — 領獎台榜單模型、多榜流程、前三名得獎感言與觀眾台詞挑選（純邏輯）
 *
 * 職責：把名門榜與風雲榜整理成同一種 CeremonyBoard、決定播哪幾榜與各榜秒數、
 *       各榜揭曉時間點，以及點頭像時要說哪一句（依榜名、名次、本府名次組合）。
 * 不負責：節點繪製（CeremonyPodiumView）、文字內容（i18n 四語系，鍵在這裡組）、音效。
 */
import type { LobbyBoardPreview } from './annual_ranking/AnnualRankingTypes';
import type { YearEndRankingResult } from './YearEndRankingService';
import { ceremonyDisplayName, type CeremonyTranslate } from './YearEndCeremonyRuntime';

export type CeremonyBoardId = 'house' | 'kills' | 'governance' | 'charm' | 'rookie' | 'mentor';

/** 獎盃字徽（一字）；5 種字徽由程式疊字，不用 5 張圖 */
export const CEREMONY_BOARD_BADGE: Readonly<Record<CeremonyBoardId, string>> = {
    house: '名',
    kills: '武',
    governance: '政',
    charm: '艷',
    rookie: '新',
    mentor: '師',
};

/** 每榜停留秒數：名門榜 6、風雲榜 4；沒有風雲榜時名門榜多給 2 秒（維持第 2 幕 8 秒） */
export const CEREMONY_HOUSE_BOARD_SECONDS = 6;
export const CEREMONY_FAME_BOARD_SECONDS = 4;
export const CEREMONY_SOLO_HOUSE_BOARD_SECONDS = 8;
export const CEREMONY_MAX_FAME_BOARDS = 2;

export interface CeremonyEntry {
    readonly rank: number;
    readonly name: string;
    readonly score: number;
    readonly isPlayer: boolean;
    /** 頭像用的武將 id；缺值走性別剪影 */
    readonly portraitId?: string;
    readonly gender: 'M' | 'F';
}

export interface CeremonyBoard {
    readonly id: CeremonyBoardId;
    readonly entries: readonly CeremonyEntry[];
    readonly seconds: number;
    /** 玩家自家武將是否在這榜前三（風雲榜選榜排序用） */
    readonly playerInTop3: boolean;
}

/** 名門榜（沿用 YearEndRankingResult）；npcPortraits 由宿主給 NPC 名門的頭像 id，玩家頭像由 playerPortraitId 給 */
export function buildHouseBoard(
    result: YearEndRankingResult,
    t: CeremonyTranslate,
    portraits: { readonly npc?: Readonly<Record<string, string>>; readonly player?: string } = {},
): CeremonyBoard {
    const entries: CeremonyEntry[] = result.standings.map((s) => ({
        rank: s.rank,
        name: s.isPlayer ? t('ui.ceremony.player', s.name) : ceremonyDisplayName(s, t),
        score: s.score,
        isPlayer: s.isPlayer,
        gender: 'M',
        ...(s.isPlayer
            ? (portraits.player ? { portraitId: portraits.player } : {})
            : (portraits.npc?.[s.id.replace(/_y\d+$/, '')] ? { portraitId: portraits.npc[s.id.replace(/_y\d+$/, '')] } : {})),
    }));
    return { id: 'house', entries, seconds: CEREMONY_HOUSE_BOARD_SECONDS, playerInTop3: result.playerRank <= 3 };
}

const FAME_BOARD_IDS: readonly CeremonyBoardId[] = ['kills', 'governance', 'charm', 'rookie', 'mentor'];

/**
 * 風雲榜（BoardRankResult 的大廳預覽：前三名＋本府最佳名次）轉成典禮榜；
 * 沒有分數的項目（遮蔽或帳本是空的）不上台，一個都沒有就回 null＝這榜不播。
 */
export function buildFameBoard(
    preview: LobbyBoardPreview,
    resolve: (generalId: string) => { name: string; portraitId?: string; gender?: 'M' | 'F' },
    seconds: number = CEREMONY_FAME_BOARD_SECONDS,
): CeremonyBoard | null {
    const id = FAME_BOARD_IDS.find((b) => b === preview.boardId);
    if (!id) return null;
    const entries: CeremonyEntry[] = preview.topThree
        .filter((e) => typeof e.score === 'number' && e.score > 0 && !e.isMasked)
        .map((e) => {
            const who = resolve(e.generalId);
            return {
                rank: e.rank,
                name: who.name,
                score: e.score ?? 0,
                isPlayer: e.isPlayerOwned,
                portraitId: who.portraitId ?? e.generalId,
                gender: who.gender ?? 'M',
            };
        });
    if (entries.length === 0) return null;
    return { id, entries, seconds, playerInTop3: entries.some((e) => e.isPlayer && e.rank <= 3) };
}

/**
 * 決定第 2 幕播哪些榜：名門榜固定第一個；風雲榜最多 2 個，
 * 優先序「玩家自家有人入前三 > 新人王 > 原榜順序（ceremonyOrder）」，沒資料的榜不播。
 * 沒有任何風雲榜（例如首年隱藏）時名門榜多給 2 秒，退化成原本的單榜。
 */
export function planCeremonyBoards(house: CeremonyBoard, fameBoards: readonly CeremonyBoard[]): CeremonyBoard[] {
    const usable = fameBoards.filter((b) => b.id !== 'house' && b.entries.length > 0);
    const rankOf = (b: CeremonyBoard): number => (b.playerInTop3 ? 0 : b.id === 'rookie' ? 1 : 2);
    const picked = usable
        .map((b, index) => ({ b, index }))
        .sort((a, c) => rankOf(a.b) - rankOf(c.b) || a.index - c.index)
        .slice(0, CEREMONY_MAX_FAME_BOARDS)
        .map(({ b }) => ({ ...b, seconds: CEREMONY_FAME_BOARD_SECONDS }));
    if (picked.length === 0) return [{ ...house, seconds: CEREMONY_SOLO_HOUSE_BOARD_SECONDS }];
    return [{ ...house, seconds: CEREMONY_HOUSE_BOARD_SECONDS }, ...picked];
}

/** 第 2 幕總秒數 = 各榜秒數合計 */
export function ceremonyAct2Seconds(boards: readonly CeremonyBoard[]): number {
    return boards.reduce((sum, b) => sum + b.seconds, 0);
}

/** 目前第 2 幕經過 elapsed 秒，落在第幾榜、榜內第幾秒；超出就停在最後一榜 */
export function ceremonyBoardAt(boards: readonly CeremonyBoard[], elapsed: number): { index: number; local: number } {
    let start = 0;
    for (let i = 0; i < boards.length; i++) {
        if (elapsed < start + boards[i].seconds || i === boards.length - 1) return { index: i, local: Math.max(0, elapsed - start) };
        start += boards[i].seconds;
    }
    return { index: 0, local: 0 };
}

/** 單榜內台座揭曉順序：季軍 → 亞軍 → 冠軍（倒敘）；冠軍揭曉時一併掌聲與彩帶 */
export interface BoardReveal {
    readonly at: number;
    readonly rank: 1 | 2 | 3;
    readonly applause: boolean;
}
const REVEAL_RATIOS: readonly [number, number, number] = [0.083, 0.183, 0.283];
export function ceremonyBoardReveals(boardSeconds: number): BoardReveal[] {
    return ([3, 2, 1] as const).map((rank, i) => ({ at: boardSeconds * REVEAL_RATIOS[i], rank, applause: rank === 1 }));
}

/** 取出榜內經過時間在 (fromSec, toSec] 的揭曉；fromSec 傳負數代表含 0 秒 */
export function ceremonyBoardRevealsBetween(boardSeconds: number, fromSec: number, toSec: number): BoardReveal[] {
    return ceremonyBoardReveals(boardSeconds).filter((r) => r.at > fromSec && r.at <= toSec);
}

// ─── 台詞：得獎感言與觀眾台詞（鍵由這裡組，文字在 i18n） ───

/** 每名次的得獎感言句數（每位至少 3～5 句輪播） */
export const CEREMONY_SPEECH_COUNT = 5;
/** 觀眾台詞各類別的句數 */
export const CEREMONY_AUDIENCE_COUNTS = { rank: 2, kin: 5, roast: 5, board: 2 } as const;

/** 前三名得獎感言鍵：clicks=0 是揭曉當下的第一句，之後每點一次換下一句，輪播不重複到繞一圈 */
export function winnerSpeechKey(rank: 1 | 2 | 3, clicks: number): string {
    const n = ((Math.max(0, Math.floor(clicks)) % CEREMONY_SPEECH_COUNT) + CEREMONY_SPEECH_COUNT) % CEREMONY_SPEECH_COUNT;
    return `ui.ceremony.podium.speech.${rank}.${n + 1}`;
}

export type AudienceCategory = 'rank' | 'kin' | 'roast' | 'board';

export interface AudienceContext {
    readonly boardId: CeremonyBoardId;
    /** 本府在這榜的名次；本府不在這榜為 0 */
    readonly playerRank: number;
    /** 這一輪觀眾點擊／輪播的累計次數，決定類別與句序 */
    readonly turn: number;
}

/**
 * 觀眾台詞類別輪替：本府在榜上時「名次反應」先講；進前三多接親友起鬨，沒進前三多接吐槽拍肩；
 * 本府不在這榜（風雲榜）改以榜名評論起頭。
 */
export function audienceCategories(playerRank: number): readonly AudienceCategory[] {
    if (playerRank <= 0) return ['board', 'kin', 'roast'];
    if (playerRank <= 3) return ['rank', 'kin', 'board', 'roast'];
    return ['rank', 'roast', 'board', 'kin'];
}

export function audienceLineKey(ctx: AudienceContext): string {
    const cats = audienceCategories(ctx.playerRank);
    const turn = Math.max(0, Math.floor(ctx.turn));
    const cat = cats[turn % cats.length];
    const round = Math.floor(turn / cats.length);
    const count = CEREMONY_AUDIENCE_COUNTS[cat];
    const variant = (round % count) + 1;
    switch (cat) {
        case 'rank': return `ui.ceremony.podium.aud.rank.${Math.min(Math.max(ctx.playerRank, 1), 5)}.${variant}`;
        case 'board': return `ui.ceremony.podium.aud.board.${ctx.boardId}.${variant}`;
        default: return `ui.ceremony.podium.aud.${cat}.${variant}`;
    }
}

/** 台詞槽位：{0} 自稱（由呼叫端以 SpeakerVoice 代入）、{1} 榜名簡稱、{2} 冠軍名、{3} 本府名次、{4} 第 4 名的名字（沒有就用冠軍名） */
export function audienceLineArgs(board: CeremonyBoard, playerRank: number, t: CeremonyTranslate): string[] {
    const champion = board.entries.find((e) => e.rank === 1)?.name ?? '';
    const fourth = board.entries.find((e) => e.rank === 4)?.name ?? champion;
    return [t(`ui.ceremony.board.${board.id}.short`), champion, String(playerRank), fourth];
}

export function playerRankOnBoard(board: CeremonyBoard): number {
    return board.entries.find((e) => e.isPlayer)?.rank ?? 0;
}
