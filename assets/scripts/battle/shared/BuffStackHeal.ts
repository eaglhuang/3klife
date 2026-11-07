// @spec-source → 戰鬥增益減益效果堆疊與治療結算規格書.md（doc_spec_0359）；PROG-2-2045
/**
 * BuffStackHeal — 狀態堆疊、THEAL 治療與 TDOT 結算（純邏輯，不依賴 cc）
 *
 * - §1 同名狀態最多 3 層；再次施加時回合數取 max(舊, 新)，不相加。
 * - §2 治療 = floor(BaseHeal + 已損 HP × 0.25)，截斷到不超過 MaxHp。
 * - §3 燃燒：回合開始扣當前 HP 8%（機械 16%）；中毒：回合結束扣最大 HP 5%、移動力 −1。
 */

export const STATUS_STACK_CAP = 3;
export const HEAL_LOST_HP_RATIO = 0.25;
export const BURN_CURRENT_HP_RATIO = 0.08;
export const BURN_MECHANICAL_MULT = 2;
export const POISON_MAX_HP_RATIO = 0.05;
export const POISON_MOVE_PENALTY = 1;

export interface StatusStack {
    stacks: number;
    remainingTurns: number;
}

export function applyBuffStack(current: StatusStack | null, newDuration: number): StatusStack {
    const turns = Math.max(0, Math.floor(newDuration));
    if (!current || current.stacks <= 0) return { stacks: 1, remainingTurns: turns };
    return { stacks: Math.min(STATUS_STACK_CAP, current.stacks + 1), remainingTurns: Math.max(current.remainingTurns, turns) };
}

/** 單位身上的同名狀態表（statusId → 層數） */
export class StatusStackBook {
    private readonly _map = new Map<string, StatusStack>();

    public apply(statusId: string, duration: number): StatusStack {
        const next = applyBuffStack(this._map.get(statusId) ?? null, duration);
        this._map.set(statusId, next);
        return { ...next };
    }

    public get(statusId: string): StatusStack | null {
        const s = this._map.get(statusId);
        return s ? { ...s } : null;
    }

    /** 回合結束遞減，歸零即移除 */
    public tick(): void {
        for (const id of Array.from(this._map.keys())) {
            const s = this._map.get(id)!;
            if (s.remainingTurns <= 1) this._map.delete(id);
            else this._map.set(id, { stacks: s.stacks, remainingTurns: s.remainingTurns - 1 });
        }
    }
}

export interface HealCalculationInput {
    baseHeal: number;
    currentHp: number;
    maxHp: number;
}

export function computeHealAmount(input: HealCalculationInput): number {
    const missing = Math.max(0, input.maxHp - input.currentHp);
    const raw = Math.floor(Math.max(0, input.baseHeal) + missing * HEAL_LOST_HP_RATIO);
    return Math.max(0, Math.min(missing, raw));
}

export function burnTickDamage(currentHp: number, isMechanical: boolean): number {
    const ratio = BURN_CURRENT_HP_RATIO * (isMechanical ? BURN_MECHANICAL_MULT : 1);
    return Math.floor(Math.max(0, currentHp) * ratio);
}

export function poisonTickDamage(maxHp: number): { damage: number; movePenalty: number } {
    return { damage: Math.floor(Math.max(0, maxHp) * POISON_MAX_HP_RATIO), movePenalty: POISON_MOVE_PENALTY };
}
