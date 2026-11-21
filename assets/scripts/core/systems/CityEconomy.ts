// @spec-source → 領地治理系統.md「太守府經濟公式（2026-11-17 使用者裁決）」（PROG-2-9138）
/**
 * CityEconomy — 太守府的人口、民心與人口紅利公式（純邏輯，不依賴 cc）。
 *
 * - 人口紅利率 = min(30%, 人口 ÷ 400000 × (0.7 + 民心 ÷ 200))，作用於黃金與糧草產出。
 * - 人口每季成長率 = (民心 − 40) ÷ 2000（民心低於 40 會流失）；上限 = 100000 + 50000 × (太守府等級 − 1)。
 * - 民心是獨立存檔值，初始 60，範圍 0～100。
 *
 * Unity 對照：像一組 static 的 EconomyFormula 函式加一個可序列化的 CityEconomyState。
 */

export interface CityEconomyState {
    population: number;
    morale: number;
}

export const INITIAL_POPULATION = 80000;
export const INITIAL_MORALE = 60;
export const MORALE_MIN = 0;
export const MORALE_MAX = 100;
export const POPULATION_CAP_BASE = 100000;
export const POPULATION_CAP_PER_LEVEL = 50000;
export const POPULATION_BONUS_CAP = 0.3;
export const POPULATION_BONUS_DIVISOR = 400000;
/** 民心低於此值人口流失，高於則成長 */
export const MORALE_GROWTH_PIVOT = 40;
export const MORALE_GROWTH_DIVISOR = 2000;
/** 守城大敗的人口損失比例 */
export const DEFENSE_ROUT_POPULATION_LOSS = 0.03;

/** 每季民心變動 */
export const MORALE_DELTA = Object.freeze({
    foodEnough: 1,
    diplomacyDone: 2,
    foodShortage: -5,
    defenseDefeat: -3,
    reliefMissionDone: 15,
});

/** 開倉賑濟貧民的大廳任務模板代號（hall-mission-templates.json） */
export const RELIEF_MISSION_TEMPLATE_ID = 'DOM_EASY_01';

export function clampMorale(value: number): number {
    if (!Number.isFinite(value)) return INITIAL_MORALE;
    return Math.max(MORALE_MIN, Math.min(MORALE_MAX, Math.floor(value)));
}

export function populationCapOf(territoryLevel: number): number {
    const level = Math.max(1, Math.floor(territoryLevel || 1));
    return POPULATION_CAP_BASE + POPULATION_CAP_PER_LEVEL * (level - 1);
}

/** 人口紅利率（0～0.3） */
export function populationBonusRate(population: number, morale: number): number {
    const raw = (Math.max(0, population) / POPULATION_BONUS_DIVISOR) * (0.7 + clampMorale(morale) / 200);
    return Math.max(0, Math.min(POPULATION_BONUS_CAP, raw));
}

/** 人口紅利的實際數量：產出 × 紅利率，無條件捨去 */
export function populationBonusAmount(base: number, population: number, morale: number): number {
    if (base <= 0) return 0;
    // 加 1e-9 吸收浮點誤差
    return Math.floor(base * populationBonusRate(population, morale) + 1e-9);
}

/** 每季人口成長率（可為負） */
export function populationGrowthRate(morale: number): number {
    return (clampMorale(morale) - MORALE_GROWTH_PIVOT) / MORALE_GROWTH_DIVISOR;
}

/** 推進一季人口：成長不超過上限（已超過上限不被砍回），流失不低於 0 */
export function advancePopulation(population: number, morale: number, cap: number): number {
    const rate = populationGrowthRate(morale);
    const next = Math.floor(population * (1 + rate) + 1e-9);
    if (rate >= 0) return Math.max(population, Math.min(cap, next));
    return Math.max(0, next);
}

/** 守城大敗：人口 −3%（無條件捨去損失量以外的部分，結果為整數）；比例可由 data/defense-battle 覆寫（PROG-2-9431） */
export function applyPopulationRout(population: number, lossRatio: number = DEFENSE_ROUT_POPULATION_LOSS): number {
    const ratio = Number.isFinite(lossRatio) ? Math.min(1, Math.max(0, lossRatio)) : DEFENSE_ROUT_POPULATION_LOSS;
    return Math.max(0, Math.floor(population * (1 - ratio) + 1e-9));
}

/** 取得本季商業內政任務的實際產出（黃金基礎值）；本季沒選商業任務回 0 */
export function commerceGoldBase(log: { lastSeason: number | null; lastTask: string | null; lastGrant?: { resource: string; amount: number } }, season: number): number {
    if (log.lastSeason !== season || log.lastTask !== 'commerce') return 0;
    return log.lastGrant && log.lastGrant.resource === 'gold' ? Math.max(0, log.lastGrant.amount) : 0;
}

/** 讀檔補值：舊檔沒有欄位時，民心補 60，人口用呼叫端給的舊算法當下值 */
export function normalizeCityEconomy(raw: unknown, legacyPopulation: number): CityEconomyState {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
    const population = typeof r.population === 'number' && Number.isFinite(r.population) && r.population >= 0
        ? Math.floor(r.population) : Math.max(0, Math.floor(legacyPopulation));
    const morale = typeof r.morale === 'number' ? clampMorale(r.morale) : INITIAL_MORALE;
    return { population, morale };
}
