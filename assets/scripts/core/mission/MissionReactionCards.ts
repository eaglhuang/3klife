// @spec-source → 大廳任務規格 doc_spec_1178 §9（結算回報）；武將台詞系統（PROG-2-9964）；PROG-2-9966
/**
 * MissionReactionCards — 派出泡泡與季末「任務回報卡」用的純邏輯（不 import 'cc'）。
 *
 * - 回報卡資料（HallMissionReportCard）由 GameSession 換季結算時組出，畫面只照卡顯示。
 * - 台詞走台詞系統的兩個觸發點：派出（mission-dispatch）、返回（mission-return；失敗與大失敗用 mission-return-bad，
 *   因為心情推導只認情境鍵）。中台不通、參數推不齊或逾時，一律靜默退回本機預設台詞（i18n），玩家看不出差別。
 * - 文字全部由呼叫端注入的 t（i18n）產生，這裡不寫死字串（測試以替身驗證）。
 */
import type { MissionTier } from './MissionTypes';

export interface HallMissionReportCard {
    missionId: string;
    title: string;
    generalId: string;
    generalName: string;
    tier: MissionTier;
    /** 這一件實際入帳的量（已截斷；損失為負） */
    gains: { grain: number; gold: number; silver: number; generalExp: number };
    /** 這一件造成的友誼變化總和 */
    friendship: number;
    /** 連鎖任務：第幾段／最多幾段；completed＝整串完成 */
    chain?: { depth: number; total: number; completed: boolean };
}

export type MissionLineKind = 'dispatch' | 'return';
export type MissionTranslate = (key: string, ...args: Array<string | number>) => string;

export const MISSION_DISPATCH_CONTEXT = 'mission-dispatch';
export const MISSION_RETURN_CONTEXT = 'mission-return';
export const MISSION_RETURN_BAD_CONTEXT = 'mission-return-bad';
/** 每個情境本機預設台詞的句數（i18n：ui.hallMission.line.<kind>.<1..N>） */
export const MISSION_FALLBACK_LINE_COUNT = 3;
/** 台詞等中台的最久時間（毫秒）：逾時就用本機預設，不讓玩家等 */
export const MISSION_LINE_TIMEOUT_MS = 1200;

export const isGoodTier = (tier: MissionTier): boolean => tier === 'critical' || tier === 'success';

/** 台詞系統的情境鍵：派出、返回（成功類／失敗類） */
export function missionContextKey(kind: MissionLineKind, tier?: MissionTier): string {
    if (kind === 'dispatch') return MISSION_DISPATCH_CONTEXT;
    return tier && !isGoodTier(tier) ? MISSION_RETURN_BAD_CONTEXT : MISSION_RETURN_CONTEXT;
}

/** 本機預設台詞的 i18n 鍵：派出一組，返回依四級結果各一組；pick 任意整數，會取餘 */
export function fallbackLineKey(kind: MissionLineKind, tier: MissionTier | undefined, pick: number): string {
    const group = kind === 'dispatch' ? 'dispatch' : (tier ?? 'success');
    const n = ((Math.floor(pick) % MISSION_FALLBACK_LINE_COUNT) + MISSION_FALLBACK_LINE_COUNT) % MISSION_FALLBACK_LINE_COUNT;
    return `ui.hallMission.line.${group}.${n + 1}`;
}

const signed = (n: number): string => `${n > 0 ? '+' : ''}${n}`;

/** 獎勵（含損失）逐項文字，例「糧草 +90」；沒有任何變動回空陣列 */
export function rewardParts(card: Pick<HallMissionReportCard, 'gains'>, t: MissionTranslate): string[] {
    const g = card.gains;
    const out: string[] = [];
    if (g.grain !== 0) out.push(`${t('ui.hallMission.report.res.grain')} ${signed(g.grain)}`);
    if (g.gold !== 0) out.push(`${t('ui.hallMission.report.res.gold')} ${signed(g.gold)}`);
    if (g.silver !== 0) out.push(`${t('ui.hallMission.report.res.silver')} ${signed(g.silver)}`);
    if (g.generalExp !== 0) out.push(`${t('ui.hallMission.report.res.exp')} ${signed(g.generalExp)}`);
    return out;
}

/** 友誼變化文字；沒變化回空字串 */
export function friendshipText(card: Pick<HallMissionReportCard, 'friendship'>, t: MissionTranslate): string {
    return card.friendship === 0 ? '' : `${t('ui.hallMission.report.res.friendship')} ${signed(card.friendship)}`;
}

export interface HallMissionReportCardWithLine extends HallMissionReportCard { line: string }

/**
 * 替每張卡取一句台詞：fetcher 是台詞系統（可為 null＝不問中台）；任何失敗、空句、逾時都退回 fallback。
 * 所有卡併行等待，整體最多等 timeoutMs。
 */
export async function resolveCardLines(
    cards: readonly HallMissionReportCard[],
    fetcher: ((card: HallMissionReportCard) => Promise<string | null>) | null,
    fallback: (card: HallMissionReportCard, index: number) => string,
    timeoutMs = MISSION_LINE_TIMEOUT_MS,
): Promise<HallMissionReportCardWithLine[]> {
    return Promise.all(cards.map(async (card, index) => {
        let text: string | null = null;
        if (fetcher) {
            let timer: ReturnType<typeof setTimeout> | undefined;
            try {
                text = await Promise.race([
                    fetcher(card),
                    new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), timeoutMs); }),
                ]);
            } catch { text = null; } finally { if (timer) clearTimeout(timer); }
        }
        const line = text && text.trim().length > 0 ? text.trim() : fallback(card, index);
        return { ...card, line };
    }));
}

// ── 牆上進行中任務置頂（doc_spec_1178 §7.3(5)；PROG-2-9966） ──

export const PINNED_MISSION_MAX = 3;

export interface PinnedMissionItem { missionId: string; generalId: string; generalName: string; seasonsLeft: number; title: string }
export interface PinnedMissionView { items: PinnedMissionItem[]; more: number }

/** 進行中任務 → 牆上置頂清單：依剩餘季數由近到遠，最多 PINNED_MISSION_MAX 個，其餘併成「+N」 */
export function buildPinnedMissions(
    cards: ReadonlyArray<{ id: string; title: string; status: string; executorId?: string; executorName?: string; returnSeason?: number }>,
    season: number,
): PinnedMissionView {
    const active = cards
        .filter((c) => c.status === 'ACTIVE' && !!c.executorId)
        .map((c) => ({ missionId: c.id, generalId: c.executorId as string, generalName: c.executorName ?? (c.executorId as string), title: c.title, seasonsLeft: Math.max(0, (c.returnSeason ?? season) - season) }))
        .sort((a, b) => a.seasonsLeft - b.seasonsLeft);
    return { items: active.slice(0, PINNED_MISSION_MAX), more: Math.max(0, active.length - PINNED_MISSION_MAX) };
}
