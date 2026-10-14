// @spec-source → 戰法系統.md §G-6-1（TCOND 條件觸發：鄰格條件、天氣條件、兵種條件）；TAC-07（PROG-2-0569）
/**
 * TacticCondition — 戰法 TCOND 條件評估（純邏輯，不依賴 cc）
 *
 * 戰法可以附帶多個條件，全部成立才可發動；沒有條件時直接可發動。
 * 條件失敗時回傳原因，UI 可直接拿來提示玩家。
 *
 * Unity 對照：像 Button 的 interactable 條件組合，每個條件是一個判斷，全部通過才開放按鈕。
 */
import { TroopType, Weather } from '../config/Constants';

export type TacticCondition =
    | { kind: 'troopType'; allowed: readonly TroopType[] }
    | { kind: 'weather'; allowed: readonly Weather[] }
    | { kind: 'adjacentCount'; side: 'ally' | 'enemy'; min: number };

export interface TacticConditionContext {
    casterTroopType: TroopType;
    weather: Weather;
    /** 施放者四周八格（或指定範圍）內，友軍與敵軍的數量 */
    adjacentAllies: number;
    adjacentEnemies: number;
}

export type TacticConditionResult =
    | { ok: true }
    | { ok: false; failed: TacticCondition };

export function evaluateTacticConditions(
    conditions: readonly TacticCondition[] | undefined,
    context: TacticConditionContext,
): TacticConditionResult {
    for (const condition of conditions ?? []) {
        if (!isSatisfied(condition, context)) return { ok: false, failed: condition };
    }
    return { ok: true };
}

function isSatisfied(condition: TacticCondition, context: TacticConditionContext): boolean {
    switch (condition.kind) {
        case 'troopType':
            return condition.allowed.includes(context.casterTroopType);
        case 'weather':
            return condition.allowed.includes(context.weather);
        case 'adjacentCount': {
            const count = condition.side === 'ally' ? context.adjacentAllies : context.adjacentEnemies;
            return count >= condition.min;
        }
    }
}
