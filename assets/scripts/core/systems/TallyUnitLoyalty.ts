// @spec-source → 虎符忠誠度維護與戰場抗命背叛數值模型規格書.md（doc_spec_0354）；PROG-2-2040
/**
 * TallyUnitLoyalty — 虎符部隊自身忠誠度（純邏輯，不依賴 cc）
 *
 * 與 TigerTallyLoyalty（拔裝虎符對「武將」忠誠的影響）不同：這裡是部隊對主將的忠誠。
 * - §1 初始 100；同季換將第 n 次扣 floor(10 × 1.5^(n−1))；季末史實主將 +10、同陣營 +5、倉庫不變。
 * - §2 四態：LOYAL ≥60、RESTLESS ≥30、DISOBEDIENT ≥10、MUTINOUS <10。
 * - §4-3 叛變時陣營轉 Rogue、血條轉黃。
 */

export enum TallyLoyaltyStatus {
    Loyal = 'LOYAL',
    Restless = 'RESTLESS',
    Disobedient = 'DISOBEDIENT',
    Mutinous = 'MUTINOUS',
}

export const TALLY_UNIT_LOYALTY_MAX = 100;
export const TALLY_REASSIGN_BASE_DEDUCTION = 10;
export const TALLY_REASSIGN_STREAK_MULT = 1.5;
export const TALLY_SEASON_RECOVERY = { historicalLord: 10, sameFaction: 5, storage: 0 } as const;
/** RESTLESS 攻防 −10%、不暴擊 */
export const TALLY_RESTLESS_STAT_MULT = 0.9;
export const TALLY_DISOBEY_CHANCE = 0.5;
export const TALLY_MUTINY_CHANCE = 0.15;
export const TALLY_DISOBEY_TOAST = '軍士怨懟，拒不出擊';

export type TallyAssignment = keyof typeof TALLY_SEASON_RECOVERY;

function clampLoyalty(value: number): number {
    return Math.max(0, Math.min(TALLY_UNIT_LOYALTY_MAX, Math.floor(value)));
}

export function evaluateTallyLoyaltyStatus(loyalty: number): TallyLoyaltyStatus {
    if (loyalty >= 60) return TallyLoyaltyStatus.Loyal;
    if (loyalty >= 30) return TallyLoyaltyStatus.Restless;
    if (loyalty >= 10) return TallyLoyaltyStatus.Disobedient;
    return TallyLoyaltyStatus.Mutinous;
}

/** changeCountInQuarter：本季第幾次換將（1 起算） */
export function computeReassignmentDeduction(changeCountInQuarter: number): number {
    if (changeCountInQuarter <= 1) return TALLY_REASSIGN_BASE_DEDUCTION;
    return Math.floor(TALLY_REASSIGN_BASE_DEDUCTION * Math.pow(TALLY_REASSIGN_STREAK_MULT, changeCountInQuarter - 1));
}

export interface TallyUnitLoyaltyState {
    loyalty: number;
    changesThisQuarter: number;
}

export function createTallyUnitLoyalty(): TallyUnitLoyaltyState {
    return { loyalty: TALLY_UNIT_LOYALTY_MAX, changesThisQuarter: 0 };
}

export function reassignTallyLord(state: TallyUnitLoyaltyState): TallyUnitLoyaltyState {
    const count = state.changesThisQuarter + 1;
    return { loyalty: clampLoyalty(state.loyalty - computeReassignmentDeduction(count)), changesThisQuarter: count };
}

/** 季末：依裝配情形修復，並重置本季換將次數 */
export function endTallyQuarter(state: TallyUnitLoyaltyState, assignment: TallyAssignment): TallyUnitLoyaltyState {
    return { loyalty: clampLoyalty(state.loyalty + TALLY_SEASON_RECOVERY[assignment]), changesThisQuarter: 0 };
}

export interface TallyCombatModifier {
    statMultiplier: number;
    canCrit: boolean;
}

export function tallyCombatModifier(loyalty: number): TallyCombatModifier {
    return evaluateTallyLoyaltyStatus(loyalty) === TallyLoyaltyStatus.Loyal
        ? { statMultiplier: 1, canCrit: true }
        : { statMultiplier: TALLY_RESTLESS_STAT_MULT, canCrit: false };
}

/** 每回合下令：DISOBEDIENT 以下 50% 原地待命 */
export function rollTallyDisobey(loyalty: number, rand: () => number = Math.random): boolean {
    const status = evaluateTallyLoyaltyStatus(loyalty);
    if (status !== TallyLoyaltyStatus.Disobedient && status !== TallyLoyaltyStatus.Mutinous) return false;
    return rand() < TALLY_DISOBEY_CHANCE;
}

export type TallyFaction = 'Player' | 'Rogue';

export interface TallyMutinyOutcome {
    mutinied: boolean;
    faction: TallyFaction;
    hpBarColor: 'player' | 'yellow';
}

/** 出陣開局：MUTINOUS 15% 倒戈為中立暴民 */
export function rollTallyMutinyAtDeploy(loyalty: number, rand: () => number = Math.random): TallyMutinyOutcome {
    const mutinied = evaluateTallyLoyaltyStatus(loyalty) === TallyLoyaltyStatus.Mutinous && rand() < TALLY_MUTINY_CHANCE;
    return mutinied ? { mutinied, faction: 'Rogue', hpBarColor: 'yellow' } : { mutinied, faction: 'Player', hpBarColor: 'player' };
}
