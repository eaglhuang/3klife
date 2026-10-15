/**
 * SkillStatusTicks — 戰法狀態回合遞減純函式（PROG-2-0753）
 *
 * 定身（root）、緩速（slow）、毒傷（dot）的回合規則。
 * 只做數學與判定，不改戰鬥狀態；接線留給後續 PR。
 */

import { dotDamagePerTurn, slowedMoveRange } from './SkillEffectFormulas';

export interface StatusTickStep {
    remaining: number;
    expired: boolean;
}

/** 回合減 1，不低於 0；減到 0 即到期 */
export function tickStatusTurns(remaining: number): StatusTickStep {
    const next = Math.max(0, remaining - 1);
    return { remaining: next, expired: next === 0 };
}

/** 定身中不可移動 */
export function rootedBlocksMove(remainingRootTurns: number): boolean {
    return remainingRootTurns > 0;
}

/** 緩速仍有效時套用移動力減少，否則維持原移動力 */
export function slowedStatusMoveRange(move: number, remainingSlowTurns: number, amount: number): number {
    return remainingSlowTurns > 0 ? slowedMoveRange(move, amount) : move;
}

/** 毒傷仍有效時回傳本回合傷害，否則 0 */
export function dotTickDamage(maxHp: number, remainingDotTurns: number): number {
    return remainingDotTurns > 0 ? dotDamagePerTurn(maxHp) : 0;
}
