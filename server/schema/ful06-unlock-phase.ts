// @spec-source → 因子解鎖系統規格書 §F「三階段解鎖表」、§I「Server 端」Player_ID／Player_Level／Unlock_Phase（FUL-06，PROG-2-0856）
/**
 * ful06-unlock-phase — 玩家等級與因子解鎖階段（純 TS，不連資料庫）
 *
 * 規格：Lv1~20 為 Phase 1，Lv21~45 為 Phase 2，Lv46+ 為 Phase 3。
 * 門檻數值對應 §I 的 DiscoveryThresholds（Phase1: 20、Phase2: 45），
 * 可由呼叫端傳入覆寫，預設值即規格值。
 *
 * 本檔只負責「階段換算」「跨階段偵測」「列驗證」。
 * 跨階段後的階段通知文案屬內容，依 PM 裁定不在本卡，只回傳跨越的階段供日後接線。
 *
 * Unity 對照：像 Player 的等級曲線 ScriptableObject，升級時比對新舊等級，
 * 跨過門檻就觸發一次解鎖事件（OnLevelUp 裡判斷 phase 有沒有變）。
 */

export const UNLOCK_PHASES = [1, 2, 3] as const;
export type UnlockPhase = (typeof UNLOCK_PHASES)[number];

export interface UnlockPhaseThresholds {
    /** Phase 1 最高等級（含），預設 20 */
    phase1MaxLevel: number;
    /** Phase 2 最高等級（含），預設 45；超過即 Phase 3 */
    phase2MaxLevel: number;
}

export const DEFAULT_UNLOCK_PHASE_THRESHOLDS: UnlockPhaseThresholds = {
    phase1MaxLevel: 20,
    phase2MaxLevel: 45,
};

export interface PlayerUnlockStateRow {
    player_id: string;
    player_level: number;
    unlock_phase: number;
}

export interface PhaseCrossing {
    fromPhase: UnlockPhase;
    toPhase: UnlockPhase;
    /** 本次升級新跨過的階段，例如 1→3 會是 [2, 3] */
    crossedPhases: UnlockPhase[];
}

function isPositiveInt(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

export function phaseForLevel(
    level: number,
    thresholds: UnlockPhaseThresholds = DEFAULT_UNLOCK_PHASE_THRESHOLDS,
): UnlockPhase {
    if (level <= thresholds.phase1MaxLevel) return 1;
    if (level <= thresholds.phase2MaxLevel) return 2;
    return 3;
}

/**
 * 比較升級前後的等級，若跨過階段門檻則回傳跨越資訊；同階段內或降級回傳 null。
 */
export function detectPhaseCrossing(
    previousLevel: number,
    nextLevel: number,
    thresholds: UnlockPhaseThresholds = DEFAULT_UNLOCK_PHASE_THRESHOLDS,
): PhaseCrossing | null {
    if (nextLevel <= previousLevel) return null;
    const fromPhase = phaseForLevel(previousLevel, thresholds);
    const toPhase = phaseForLevel(nextLevel, thresholds);
    if (toPhase === fromPhase) return null;
    const crossedPhases = UNLOCK_PHASES.filter((phase) => phase > fromPhase && phase <= toPhase);
    return { fromPhase, toPhase, crossedPhases };
}

/**
 * 玩家升級並寫回階段。回傳更新後的列與跨越資訊（無跨越則為 null）。
 * 非法等級（非正整數）直接丟錯，不產生半套資料。
 */
export function advancePlayerUnlockState(
    row: PlayerUnlockStateRow,
    nextLevel: number,
    thresholds: UnlockPhaseThresholds = DEFAULT_UNLOCK_PHASE_THRESHOLDS,
): { row: PlayerUnlockStateRow; crossing: PhaseCrossing | null } {
    if (!isPositiveInt(nextLevel)) {
        throw new Error(`player_level: 必須是正整數，收到 ${String(nextLevel)}`);
    }
    const crossing = detectPhaseCrossing(row.player_level, nextLevel, thresholds);
    return {
        row: {
            ...row,
            player_level: nextLevel,
            unlock_phase: phaseForLevel(nextLevel, thresholds),
        },
        crossing,
    };
}

export function validatePlayerUnlockStateRow(
    row: Partial<PlayerUnlockStateRow>,
    thresholds: UnlockPhaseThresholds = DEFAULT_UNLOCK_PHASE_THRESHOLDS,
): string[] {
    const errors: string[] = [];
    if (typeof row.player_id !== 'string' || row.player_id.trim().length === 0) {
        errors.push('player_id: 缺少');
    } else if (row.player_id.length > 32) {
        errors.push('player_id: 超過 VARCHAR(32) 長度');
    }

    if (!isPositiveInt(row.player_level)) {
        errors.push('player_level: 必須是正整數');
    }

    if (!(UNLOCK_PHASES as readonly number[]).includes(row.unlock_phase as number)) {
        errors.push('unlock_phase: 必須是 1/2/3 之一');
    } else if (isPositiveInt(row.player_level)) {
        const expected = phaseForLevel(row.player_level, thresholds);
        if (row.unlock_phase !== expected) {
            errors.push(`unlock_phase: 與 player_level 不符（Lv${row.player_level} 應為 Phase ${expected}）`);
        }
    }
    return errors;
}
