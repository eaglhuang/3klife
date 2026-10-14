// @spec-source → 戰場格子系統.md §B(3) Force-Move（onEnterPush(direction)，受阻則轉為傷害）；GRD-03（PROG-2-0576）
/**
 * ForcedMoveTile — 位移格的推移判定（純邏輯，不依賴 cc）
 *
 * 逐格推移；遇到受阻（有單位、不可通行或出界）就停下，剩下的步數記為受阻。
 * 受阻後的傷害比例由呼叫端決定，本模組不寫死數值。
 *
 * Unity 對照：像 Rigidbody 的 MovePosition 逐格檢查 Collider，撞到就停，剩餘力道轉成傷害。
 */

export interface ForcedMoveResult {
    /** 推移結束後的深度（格） */
    finalDepth: number;
    /** 實際成功推移的格數 */
    movedSteps: number;
    /** 剩餘步數是否因受阻而沒走完 */
    blocked: boolean;
    /** 受阻時沒走完的步數 */
    remainingSteps: number;
}

/**
 * 沿 direction（+1 / -1）推移 steps 格；遇到 isBlocked 為 true 的格子就停下。
 * steps 小於 1 或非整數時視為 0 步，不推移也不算受阻。
 */
export function resolveForcedMove(
    startDepth: number,
    direction: 1 | -1,
    steps: number,
    isBlocked: (depth: number) => boolean,
): ForcedMoveResult {
    const total = Math.max(0, Math.floor(steps));
    let depth = startDepth;
    let movedSteps = 0;
    for (let i = 0; i < total; i++) {
        const next = depth + direction;
        if (isBlocked(next)) break;
        depth = next;
        movedSteps += 1;
    }
    const remainingSteps = total - movedSteps;
    return { finalDepth: depth, movedSteps, blocked: remainingSteps > 0, remainingSteps };
}

/** 受阻傷害：每剩餘 1 步 = 最大 HP 的 5%，上限 20%（PM 暫定 2026-10-14，待企劃定案） */
export const FORCED_MOVE_BLOCKED_DAMAGE_PER_STEP = 0.05;
export const FORCED_MOVE_BLOCKED_DAMAGE_CAP = 0.2;

/** 受阻時的傷害比例（相對最大 HP）；沒有剩餘步數時為 0 */
export function forcedMoveBlockedDamageRatio(remainingSteps: number): number {
    const steps = Math.max(0, Math.floor(remainingSteps));
    return Math.min(FORCED_MOVE_BLOCKED_DAMAGE_CAP, steps * FORCED_MOVE_BLOCKED_DAMAGE_PER_STEP);
}
