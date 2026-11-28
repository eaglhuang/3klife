/**
 * DuelInvite.ts — 切磋邀約：資格過濾、接受率修正、扣互動次數（QLIFE-01 6.0／6.4，PROG-2-10231）
 *
 * 純函式。互動次數走 master 的 InteractionQuota（結構型別，不 import ui 層）：
 * 邀約成立才呼叫 consume()；被資格或每季 3 次上限擋下的邀約不扣次數。
 */
import { DEFAULT_DUEL_CONFIG, simulateDuel } from './DuelSim';
import type { DuelConfig, DuelInjuryLevel, DuelInput, DuelMode, DuelResult } from './DuelTypes';

export type DuelBlockReason = 'unavailable' | 'severeInjured' | 'quarterCap' | 'notRival' | 'needPurchase' | 'capReached';

/** 與 InteractionQuota.consume() 相容的最小介面 */
export interface DuelQuotaPort {
    consume(): 'free' | 'extra' | 'needPurchase' | 'capReached';
}

export interface DuelInviteTarget {
    id: string;
    /** 出征中、被擒、學府、陣亡者不能邀 */
    unavailable?: boolean;
    injury?: DuelInjuryLevel;
    /** 當季已被單挑次數（點到為止在演武場／校場／兵營不計） */
    duelsThisQuarter?: number;
    /** 與邀約者是否宿敵（只有宿敵才提供死鬥） */
    isRival?: boolean;
}

export interface DuelInviteCheck {
    ok: boolean;
    reason?: DuelBlockReason;
    /** 接受率修正（加算）：輕傷 -20%、演武場／校場／兵營 +20% */
    acceptDelta: number;
}

export function checkDuelInvite(target: DuelInviteTarget, mode: DuelMode, atArena: boolean, cfg: DuelConfig = DEFAULT_DUEL_CONFIG): DuelInviteCheck {
    const none = { ok: false, acceptDelta: 0 };
    if (target.unavailable) return { ...none, reason: 'unavailable' };
    if (target.injury === 'severe') return { ...none, reason: 'severeInjured' };
    if (mode === 'deathmatch' && !target.isRival) return { ...none, reason: 'notRival' };
    const counted = !(mode === 'friendly' && atArena);
    if (counted && (target.duelsThisQuarter ?? 0) >= cfg.perGeneralQuarterCap) return { ...none, reason: 'quarterCap' };
    let acceptDelta = 0;
    if (target.injury === 'light') acceptDelta += cfg.acceptRateLightInjuredDelta;
    if (atArena) acceptDelta += cfg.acceptRateArenaDelta;
    return { ok: true, acceptDelta };
}

export interface DuelInviteOutcome {
    started: boolean;
    reason?: DuelBlockReason;
    quota?: 'free' | 'extra';
    result?: DuelResult;
}

/** 檢查資格 -> 扣一次互動 -> 模擬。扣次數失敗（要買／本季買滿）不開打。 */
export function startDuel(
    input: DuelInput, target: DuelInviteTarget, atArena: boolean, quota: DuelQuotaPort, cfg: DuelConfig = DEFAULT_DUEL_CONFIG,
): DuelInviteOutcome {
    const check = checkDuelInvite(target, input.mode, atArena, cfg);
    if (!check.ok) return { started: false, reason: check.reason };
    const used = quota.consume();
    if (used === 'needPurchase' || used === 'capReached') return { started: false, reason: used };
    return { started: true, quota: used, result: simulateDuel(input, cfg) };
}
