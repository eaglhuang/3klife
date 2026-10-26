// @spec-source → 使用者裁定 2026-10-25（戰鬥先用自動模擬數值結果直接跳結算）；PROG-2-1091
/**
 * BattleAutoResolve — 戰鬥「自動」鈕的數值結算（純 TS，不依賴 cc）。
 *
 * 雙方戰力 = 主將（武·統·智加權 × 剩餘血量比例）+ 存活部隊（血量與攻擊）+ 城寨血量，
 * 各乘 0.85~1.15 的浮動後比大小：高者勝，差距在 3% 內算平手。
 * 結果交給既有 BattleEnded 流程，結算彈窗、戰績、通關紀錄都不另寫。
 */
import type { BattleResult } from './BattleRuntimeContract';

export interface AutoResolveGeneral {
    readonly str: number;
    readonly int: number;
    readonly lea: number;
    readonly currentHp: number;
    readonly maxHp: number;
}

export interface AutoResolveTroop {
    readonly currentHp: number;
    readonly attack: number;
}

export interface AutoResolveSide {
    readonly general: AutoResolveGeneral | null;
    readonly troops: readonly AutoResolveTroop[];
    readonly fortressHp: number;
}

export interface AutoResolveOutcome {
    readonly result: Exclude<BattleResult, 'ongoing'>;
    readonly playerPower: number;
    readonly enemyPower: number;
}

export const AUTO_RESOLVE_DRAW_MARGIN = 0.03;

export function sidePower(side: AutoResolveSide): number {
    const g = side.general;
    const generalPart = g && g.maxHp > 0
        ? (g.str * 0.4 + g.lea * 0.4 + g.int * 0.2) * 10 * Math.max(0, g.currentHp) / g.maxHp
        : 0;
    const troopPart = side.troops.reduce((sum, t) => sum + Math.max(0, t.currentHp) / 10 + t.attack / 2, 0);
    return Math.round(generalPart + troopPart + Math.max(0, side.fortressHp) / 5);
}

export function autoResolveOutcome(player: AutoResolveSide, enemy: AutoResolveSide, random: () => number): AutoResolveOutcome {
    const playerPower = Math.round(sidePower(player) * (0.85 + random() * 0.3));
    const enemyPower = Math.round(sidePower(enemy) * (0.85 + random() * 0.3));
    const top = Math.max(playerPower, enemyPower, 1);
    const result = Math.abs(playerPower - enemyPower) / top <= AUTO_RESOLVE_DRAW_MARGIN
        ? 'draw'
        : playerPower > enemyPower ? 'player-win' : 'enemy-win';
    return { result, playerPower, enemyPower };
}

/** 新手首戰保證勝（使用者裁定 2026-10-26，PROG-2-1127）：尚未首勝時敗、和都改判玩家勝，戰力數字照實顯示 */
export function applyOpeningWinGuarantee(outcome: AutoResolveOutcome, firstBattleCleared: boolean): AutoResolveOutcome {
    return firstBattleCleared ? outcome : { ...outcome, result: 'player-win' };
}
