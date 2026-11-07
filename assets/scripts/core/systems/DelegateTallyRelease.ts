// @spec-source → 戰場部署系統.md (doc_spec_0040) §委任 AI；整併疑問書 Q65=D；PROG-2-1982（TRP-20 後半）
/**
 * DelegateTallyRelease — 委任 AI 的英靈虎符出展時機（純邏輯，不依賴 cc）
 *
 * Q65=D：委任時依武將屬性有條件才放虎符部隊（糧耗高）。
 * 暫定（PROG-2-1972 #13A）：智力 ≥75 才會「存」虎符；放出條件＝敵方名將已現身，且放出後糧草仍 ≥ 2 季用量。
 * 智力不足的武將不存，糧草夠就直接放。其餘四項屬性暫不參與，待使用者裁決。
 */

/** 暫定：會存虎符的智力門檻 */
export const DELEGATE_TALLY_HOLD_INT = 75;
/** 暫定：放出後至少保留幾季糧草用量 */
export const DELEGATE_TALLY_FOOD_SEASONS = 2;

export interface DelegateTallyInput {
    int: number;
    food: number;
    /** 一季的糧草用量 */
    seasonFoodUse: number;
    /** 這支虎符部隊的出展糧耗 */
    tallyFoodCost: number;
    /** 敵方名將是否已在戰場現身 */
    enemyFamousVisible: boolean;
}

export type DelegateTallyReason = 'release' | 'no-food' | 'hold-for-famous' | 'hold-food-reserve';

export interface DelegateTallyDecision {
    release: boolean;
    reason: DelegateTallyReason;
}

export function delegateTallyRelease(input: DelegateTallyInput): DelegateTallyDecision {
    const foodAfter = input.food - input.tallyFoodCost;
    if (foodAfter < 0) return { release: false, reason: 'no-food' };
    if (input.int < DELEGATE_TALLY_HOLD_INT) return { release: true, reason: 'release' };
    if (!input.enemyFamousVisible) return { release: false, reason: 'hold-for-famous' };
    if (foodAfter < input.seasonFoodUse * DELEGATE_TALLY_FOOD_SEASONS) {
        return { release: false, reason: 'hold-food-reserve' };
    }
    return { release: true, reason: 'release' };
}
