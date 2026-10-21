// @spec-source → 戰場部署系統.md (doc_spec_0040) §委任 AI；PROG-2-0904（DEP-11 純決策）
/**
 * DelegateAi — 委任 AI 四級部署策略（純邏輯，不依賴 cc）
 *
 * 依武將智力決定部署品質；品質決定保留策略（糧草保留線、精銳保留槽、特殊兵只留給主將戰）。
 * 只回傳「現在要不要部署」，不改 SortieState，也不接自動戰鬥流程。
 *
 * Unity 對照：AI 的 Decision 模組，輸入目前戰況，輸出要不要出手與理由。
 */
import { checkDeploy, type DeployRequest, type SortieState } from './SortieDeploy';

export type DelegateQuality = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';

export interface DelegateReservePolicy {
    /** 糧草保留線：部署後糧草不得低於 maxFood × 這個比例 */
    keepFoodFloorRate: number;
    /** 特殊兵 / 精銳只留給主將戰（bossTargetVisible）時才部署 */
    reserveSpecialForBoss: boolean;
    /** 保留的精銳名額數（非主將目標時不得佔用） */
    reserveSiegeSlots: number;
}

/** 規格 AI_RESERVE_POLICY（照表抄，不自行調整） */
export const DELEGATE_RESERVE_POLICY: Readonly<Record<DelegateQuality, DelegateReservePolicy>> = {
    LOW: { keepFoodFloorRate: 0, reserveSpecialForBoss: false, reserveSiegeSlots: 0 },
    MEDIUM: { keepFoodFloorRate: 0.1, reserveSpecialForBoss: false, reserveSiegeSlots: 0 },
    HIGH: { keepFoodFloorRate: 0.18, reserveSpecialForBoss: true, reserveSiegeSlots: 1 },
    EXPERT: { keepFoodFloorRate: 0.25, reserveSpecialForBoss: true, reserveSiegeSlots: 1 },
};

/** 規格 getAIDeployQuality：智力 ≥90 EXPERT、≥70 HIGH、≥50 MEDIUM、其餘 LOW */
export function delegateQualityOf(int: number): DelegateQuality {
    if (int >= 90) return 'EXPERT';
    if (int >= 70) return 'HIGH';
    if (int >= 50) return 'MEDIUM';
    return 'LOW';
}

export type DelegateDeployReason =
    | 'ok'
    | 'deploy-check-failed'
    | 'food-floor'
    | 'hold-for-boss'
    | 'hold-reserved-elite';

export interface DelegateDecision {
    deploy: boolean;
    reason: DelegateDeployReason;
}

export interface DelegateSituation {
    /** 戰場上是否已出現主將戰目標（敵方主將、營帳、城門等） */
    bossTargetVisible: boolean;
}

/** 委任 AI 要不要部署這一隊（回傳理由，供測試與日後戰報使用） */
export function delegateDecideDeploy(
    state: SortieState,
    request: DeployRequest,
    quality: DelegateQuality,
    situation: DelegateSituation,
): DelegateDecision {
    const policy = DELEGATE_RESERVE_POLICY[quality];
    const check = checkDeploy(state, request);
    if (!check.ok) return { deploy: false, reason: 'deploy-check-failed' };

    const foodAfter = state.food - check.cost.foodCost;
    if (foodAfter < state.maxFood * policy.keepFoodFloorRate) {
        return { deploy: false, reason: 'food-floor' };
    }

    // 精銳：非主將目標時，保留槽不得佔用（暫定：規格「保留 1 槽」與「等主將戰再下」兩條都套用）
    if (check.cost.isElite && !situation.bossTargetVisible) {
        // 以場上現有精銳計（與 checkDeploy 同口徑）；eliteDeployed 是累計派出數，陣亡退場後不會減少
        const eliteActive = Object.values(state.units).filter((unit) => unit.isElite && !unit.retired).length;
        if (eliteActive + 1 > state.eliteCap - policy.reserveSiegeSlots) {
            return { deploy: false, reason: 'hold-reserved-elite' };
        }
        if (policy.reserveSpecialForBoss) {
            return { deploy: false, reason: 'hold-for-boss' };
        }
    }

    return { deploy: true, reason: 'ok' };
}

export interface DelegatePick {
    /** 被批准部署的兵種；全部被擋時為 null */
    troopType: string | null;
    reason: DelegateDeployReason;
}

/**
 * 依候選兵種順序挑第一個被批准的部署（委任 AI 的戰鬥呼叫端入口）。
 * 全部被擋時回傳第一個候選的擋下原因；候選為空時回傳 deploy-check-failed。
 */
export function delegatePickDeploy(
    state: SortieState,
    candidates: readonly string[],
    quality: DelegateQuality,
    situation: DelegateSituation,
): DelegatePick {
    if (candidates.length === 0) return { troopType: null, reason: 'deploy-check-failed' };

    let firstReason: DelegateDeployReason | null = null;
    for (const troopType of candidates) {
        const decision = delegateDecideDeploy(state, { troopType }, quality, situation);
        if (decision.deploy) return { troopType, reason: 'ok' };
        firstReason ??= decision.reason;
    }
    return { troopType: null, reason: firstReason ?? 'deploy-check-failed' };
}

/**
 * 候選兵種依糧耗低→兵力耗低排序（與 DEP-10 改派建議同一規則）；不合法的排後面，同值保留原順序。
 * 只排序，不做保留策略判斷（那是 delegateDecideDeploy 的事）。
 */
export function sortDelegateCandidates(state: SortieState, candidates: readonly string[]): string[] {
    const ranked = candidates.map((troopType, index) => {
        const check = checkDeploy(state, { troopType });
        return {
            troopType,
            index,
            ok: check.ok,
            foodCost: check.cost.foodCost,
            troopCost: check.cost.troopCost,
        };
    });
    ranked.sort((a, b) => {
        if (a.ok !== b.ok) return a.ok ? -1 : 1;
        if (!a.ok && !b.ok) return a.index - b.index;
        return a.foodCost - b.foodCost || a.troopCost - b.troopCost || a.index - b.index;
    });
    return ranked.map(r => r.troopType);
}
