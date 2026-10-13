// @spec-source → 武將壽命系統.md (doc_spec_0018) §K；WBS v3 LIFE-09
/** 主動指令的獨立壽命帳本；尚未接線，不改 GeneralAging 的年齡與死亡率。 */
export const MONTHS_PER_SEASON = 3;
export const LIFESPAN_COST_MONTHS = Object.freeze({ nurture: 1, siege: 3, breeding: 6 });
export type LifespanCommand = keyof typeof LIFESPAN_COST_MONTHS | 'passive-season';

export interface LifespanState {
    id: string;
    /** 月為權威單位，避免培育的 1/3 季在反覆扣除時累積誤差。 */
    remainingMonths: number;
    isDead?: boolean;
}
export type LifespanCostEvent =
    | { type: 'died'; generalId: string; cause: 'lifespan-cost' }
    | { type: 'unknown-command'; generalId: string; command: string };
export interface LifespanCostResult {
    state: LifespanState;
    /** 規格成本與實際扣除分開；不足時剩餘月數夾到 0。 */
    costMonths: number;
    consumedMonths: number;
    deathTriggered: boolean;
    events: LifespanCostEvent[];
}

/** 1 季 = 3 個月；僅換算顯示，不進位成完整季度。 */
export function monthsToSeasons(months: number): number {
    if (!Number.isFinite(months) || months < 0) throw new RangeError('壽命月數必須為有限非負數');
    return months / MONTHS_PER_SEASON;
}

/**
 * 回傳新狀態與事件，不改輸入、不用亂數、不寫入存檔。
 * 被動季度推進不扣這份壽命帳本；未知指令回報且不扣。
 * 主動指令耗盡時當次回報死亡，已死亡者不重複扣除或發死亡事件。
 * 與既有超齡隨機死亡的接線／優先順序由後續工單決定。
 */
export function applyLifespanCost(source: LifespanState, command: string): LifespanCostResult {
    if (!Number.isFinite(source.remainingMonths) || source.remainingMonths < 0)
        throw new RangeError('剩餘壽命必須為有限非負月數');
    const state = { ...source };
    const result: LifespanCostResult = { state, costMonths: 0, consumedMonths: 0,
        deathTriggered: false, events: [] };
    if (command === 'passive-season') return result;
    if (!Object.prototype.hasOwnProperty.call(LIFESPAN_COST_MONTHS, command)) {
        result.events.push({ type: 'unknown-command', generalId: source.id, command });
        return result;
    }
    if (source.isDead) return result;
    const cost = LIFESPAN_COST_MONTHS[command as keyof typeof LIFESPAN_COST_MONTHS];
    result.costMonths = cost;
    result.consumedMonths = Math.min(cost, source.remainingMonths);
    state.remainingMonths = Math.max(0, source.remainingMonths - cost);
    if (state.remainingMonths === 0) {
        state.isDead = true;
        result.deathTriggered = true;
        result.events.push({ type: 'died', generalId: source.id, cause: 'lifespan-cost' });
    }
    return result;
}
