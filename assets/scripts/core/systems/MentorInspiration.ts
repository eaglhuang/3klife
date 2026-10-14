// @spec-source → 教官系統（支援卡）.md (doc_spec_0027) §F-3 靈感事件觸發機率、§F-5 靈感事件表（Trigger_Window / Base_Rate / Min_Star / Bloodline_Required）
/**
 * MentorInspiration — 戰法靈感事件觸發引擎（純邏輯，不依賴 cc）
 *
 * 規格公式：P(靈感) = Base_Rate × (1 + Friendship_Bonus) × (1 + 子嗣_LUK / 200)
 * 閘門（全部通過才擲骰）：
 *   - Trigger_Window：目前回合必須在 [起, 迄] 之內（含端點）。
 *   - Min_Star：教官星等不足則不觸發（對應 F-4 星等解鎖）。
 *   - Bloodline_Required：有指定血統時，子嗣必須具備該血統（例如趙家槍法需 ZHAO）。
 *
 * 暫定（規格沒有寫清楚的部分）：
 *   - Friendship_Bonus 由呼叫端傳入（小數，0.2 = +20%）；規格的友情倍率欄位如何換算到這裡，待 MENT-01 schema 定案。
 *   - 機率上限封頂 1；LUK 小於 0 視為 0。
 *   - 每回合對每個合格事件擲一次；一旦確認就不再擲（同一場培育只會觸發一次）。
 *   - 不合格的事件不消耗亂數，避免閘門變動改變其他事件的擲骰結果。
 *
 * Unity 對照：像一組 EventRoller，每回合呼叫一次，只回傳「這回合新觸發的靈感 ID」，不改教官或武將資料。
 */
import type { RandomSource } from './GeneralAging';

export const INSPIRE_LUK_DIVISOR = 200;

export interface InspireEvent {
    eventId: string;
    tacticId: string;
    /** 觸發回合區間 [起, 迄]，含端點 */
    triggerWindow: readonly [number, number];
    /** 基礎觸發率 0~1 */
    baseRate: number;
    /** 最低教官星等 */
    minStar: number;
    /** 必須具備的血統代碼（家傳戰法）；沒有則為 undefined */
    bloodlineRequired?: string;
}

export interface InspireContext {
    mentorStar: number;
    /** 友情加成（小數，0.2 = +20%） */
    friendshipBonus: number;
    childLuk: number;
    /** 子嗣具備的血統代碼 */
    childBloodlines: readonly string[];
}

export type InspireBlockReason = 'out-of-window' | 'star-too-low' | 'bloodline-missing';

function assertBaseRate(event: InspireEvent): void {
    if (!Number.isFinite(event.baseRate) || event.baseRate < 0 || event.baseRate > 1) {
        throw new RangeError(`${event.eventId} 的 Base_Rate 必須在 0~1 之間：${event.baseRate}`);
    }
}

/** 通過閘門的理由清單；空陣列代表可以擲骰 */
export function inspireBlockReasons(event: InspireEvent, round: number, ctx: InspireContext): InspireBlockReason[] {
    const reasons: InspireBlockReason[] = [];
    const [from, to] = event.triggerWindow;
    if (round < from || round > to) reasons.push('out-of-window');
    if (ctx.mentorStar < event.minStar) reasons.push('star-too-low');
    if (event.bloodlineRequired && !ctx.childBloodlines.includes(event.bloodlineRequired)) reasons.push('bloodline-missing');
    return reasons;
}

/** P(靈感) = Base_Rate × (1 + Friendship_Bonus) × (1 + LUK/200)，封頂 1；不看閘門 */
export function inspireChance(event: InspireEvent, ctx: InspireContext): number {
    assertBaseRate(event);
    const luk = Number.isFinite(ctx.childLuk) ? Math.max(0, ctx.childLuk) : 0;
    const raw = event.baseRate * (1 + ctx.friendshipBonus) * (1 + luk / INSPIRE_LUK_DIVISOR);
    return Math.min(1, raw);
}

/**
 * 這一回合要擲骰的事件：依序檢查，已確認的略過，閘門不過的不擲骰（不消耗亂數）。
 * 回傳本回合新觸發的 eventId，順序與輸入相同；confirmed 不會被修改。
 */
export function rollInspireRound(
    events: readonly InspireEvent[],
    round: number,
    ctx: InspireContext,
    confirmed: ReadonlySet<string>,
    random: RandomSource,
): string[] {
    const triggered: string[] = [];
    for (const event of events) {
        if (confirmed.has(event.eventId)) continue;
        if (inspireBlockReasons(event, round, ctx).length > 0) continue;
        if (random() < inspireChance(event, ctx)) triggered.push(event.eventId);
    }
    return triggered;
}
