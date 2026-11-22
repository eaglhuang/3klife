// @spec-source → 武將帶兵統御上限與戰場戰損回寫數值錨點規格書.md（doc_spec_0357）；PROG-2-2043
/**
 * CommandSortieLoss — 帶兵上限錨點版公式、出陣閾值與戰損 6:4 回寫（純邏輯，不依賴 cc）
 *
 * - §1 CommandCapacity = 1,000 + LDR×50 + Fame×2 + RankBonus（校尉 500／雜號將軍 2,500／大將軍 10,000）。
 * - §3 SortiePool = min(帶兵上限, 城市駐軍, 關卡上限)；< 500 不得出陣。
 * - §4 戰損：傷兵 floor(60%) 回傷兵營、其餘陣亡永久扣；傷兵每季康復 30%（向下取整）。
 * - §4 補（PROG-2-9717）：第 1 年敗戰「新手保護」——損兵（陣亡＋傷兵）不超過戰前城市兵源的 30%，上限內才依 60/40 分傷兵與陣亡。
 *   60%／30%／保護年數／上限比例都放 data/troop-loss-rules.json，由 ServiceLoader 載入後呼叫 configureTroopLossRules；載入失敗用下方預設。
 * 既有 SortieDeploy.computeCommandCapacity 是另一版（依將階底數、保底 8,000），兩版並存待裁決。
 */

export const COMMAND_BASE_CAPACITY = 1000;
export const COMMAND_PER_LDR = 50;
export const COMMAND_PER_FAME = 2;
export const COMMAND_RANK_BONUS = { none: 0, colonel: 500, generalTitled: 2500, grandGeneral: 10000 } as const;
export type CommandRankTier = keyof typeof COMMAND_RANK_BONUS;

export const SORTIE_MIN_DEPLOY_TROOPS = 500;
/** 預設值（JSON 載入失敗時使用）；實際生效值見 troopLossRules() */
export const LOST_TROOPS_WOUNDED_RATIO = 0.6;
export const WOUNDED_QUARTER_RECOVERY_RATIO = 0.3;

export const TROOP_LOSS_RULES_JSON = 'data/troop-loss-rules';

export interface TroopLossRulesConfig {
    /** 損兵中進傷兵營的比例 */
    woundedRatio: number;
    /** 傷兵營每季康復回兵源的比例 */
    recoveryRatio: number;
    /** 新手保護只在 ≤ 此年有效（第 1 年） */
    noviceProtectionMaxYear: number;
    /** 新手保護：敗戰損兵（陣亡＋傷兵）上限＝戰前城市兵源 × 此比例 */
    noviceLossCapRatio: number;
}

export const DEFAULT_TROOP_LOSS_RULES: Readonly<TroopLossRulesConfig> = {
    woundedRatio: LOST_TROOPS_WOUNDED_RATIO,
    recoveryRatio: WOUNDED_QUARTER_RECOVERY_RATIO,
    noviceProtectionMaxYear: 1,
    noviceLossCapRatio: 0.3,
};

let _rules: TroopLossRulesConfig = { ...DEFAULT_TROOP_LOSS_RULES };

function ratioOr(value: unknown, fallback: number): number {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1 ? value : fallback;
}

/** 套用 JSON 設定；缺欄位或型別不對的欄位退回預設 */
export function configureTroopLossRules(raw: Partial<TroopLossRulesConfig> | null | undefined): void {
    const src = raw ?? {};
    const maxYear = src.noviceProtectionMaxYear;
    _rules = {
        woundedRatio: ratioOr(src.woundedRatio, DEFAULT_TROOP_LOSS_RULES.woundedRatio),
        recoveryRatio: ratioOr(src.recoveryRatio, DEFAULT_TROOP_LOSS_RULES.recoveryRatio),
        noviceProtectionMaxYear: typeof maxYear === 'number' && Number.isFinite(maxYear) && maxYear >= 0 ? Math.floor(maxYear) : DEFAULT_TROOP_LOSS_RULES.noviceProtectionMaxYear,
        noviceLossCapRatio: ratioOr(src.noviceLossCapRatio, DEFAULT_TROOP_LOSS_RULES.noviceLossCapRatio),
    };
}

export function troopLossRules(): Readonly<TroopLossRulesConfig> {
    return _rules;
}

export function resetTroopLossRules(): void {
    _rules = { ...DEFAULT_TROOP_LOSS_RULES };
}

function nonNeg(value: number): number {
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

export function computeAnchorCommandCapacity(ldr: number, fame: number, rank: CommandRankTier): number {
    return COMMAND_BASE_CAPACITY + nonNeg(ldr) * COMMAND_PER_LDR + nonNeg(fame) * COMMAND_PER_FAME + COMMAND_RANK_BONUS[rank];
}

export interface SortiePoolCheck {
    sortiePool: number;
    canDeploy: boolean;
}

export function checkSortiePool(commandCapacity: number, cityAvailableTroops: number, stageTroopCap: number): SortiePoolCheck {
    const sortiePool = Math.min(nonNeg(commandCapacity), nonNeg(cityAvailableTroops), nonNeg(stageTroopCap));
    return { sortiePool, canDeploy: sortiePool >= SORTIE_MIN_DEPLOY_TROOPS };
}

export interface LostTroopsSplit {
    wounded: number;
    dead: number;
}

/** Wounded + Dead 恆等於 LostTroops */
export function splitLostTroops(lostTroops: number): LostTroopsSplit {
    const lost = nonNeg(lostTroops);
    const wounded = Math.floor(lost * _rules.woundedRatio);
    return { wounded, dead: lost - wounded };
}

export interface CityTroopLedger {
    /** 城市總預備兵員 */
    reserveTroops: number;
    woundedCamp: number;
}

/** 戰後回寫：全部損失先離開預備兵員，傷兵進傷兵營，陣亡不回來 */
export function applyBattleLoss(ledger: CityTroopLedger, lostTroops: number): CityTroopLedger {
    const { wounded } = splitLostTroops(lostTroops);
    return {
        reserveTroops: Math.max(0, ledger.reserveTroops - nonNeg(lostTroops)),
        woundedCamp: ledger.woundedCamp + wounded,
    };
}

/** 季末傷兵營自然康復 30% 回預備兵員 */
export function recoverWoundedQuarter(ledger: CityTroopLedger): CityTroopLedger {
    const healed = Math.floor(ledger.woundedCamp * _rules.recoveryRatio);
    return { reserveTroops: ledger.reserveTroops + healed, woundedCamp: ledger.woundedCamp - healed };
}

export interface NoviceLossProtection {
    /** 實際損兵（已套上限） */
    lostTroops: number;
    /** 被減免的兵數（原始損兵 − 實際損兵） */
    reduced: number;
    /** 這場有沒有適用新手保護（第 1 年敗戰） */
    applies: boolean;
}

/**
 * 新手保護（PROG-2-9717）：只限「第 1 年」且「敗戰」；損兵（陣亡＋傷兵總量）上限＝戰前城市兵源 × 30%。
 * 勝利、平手、第 2 年起一律原樣回傳。
 */
export function applyNoviceLossProtection(rawLostTroops: number, cityTroopsBefore: number, year: number, outcome: 'win' | 'draw' | 'loss'): NoviceLossProtection {
    const lost = nonNeg(rawLostTroops);
    if (outcome !== 'loss' || year > _rules.noviceProtectionMaxYear) return { lostTroops: lost, reduced: 0, applies: false };
    const cap = Math.floor(nonNeg(cityTroopsBefore) * _rules.noviceLossCapRatio);
    const capped = Math.min(lost, cap);
    return { lostTroops: capped, reduced: lost - capped, applies: true };
}
