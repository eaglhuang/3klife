// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) E-8 霸權反制、F-4 邦交值衰減、F-5 反霸權同盟觸發（PROG-2-1472）
/**
 * RivalHegemony — 霸權判定與反霸權同盟（純邏輯，不依賴 cc，不改輸入）
 *
 * 規格：
 * - 任一勢力領土佔比 ≥ 30% 即為霸主，其他勢力自動成為反霸權聯盟成員（FORCED_MEMBER，不可拒絕）。
 * - 聯盟成員的邦交衰減速率由每季 2 提高到 4。
 * - 佔比 ≥ 40% 時對霸主施加叛亂壓力。
 *
 * 暫定（可逆）：多個勢力同時過 30% 時取佔比最高者（同分取先出現者）；全部領土為 0 時佔比為 0。
 *
 * Unity 對照：像 Campaign 層的 BalanceDirector，每季看領土比例，決定誰要被群起圍攻。
 */

export const HEGEMON_DOMAIN_RATIO = 0.3;
export const REBELLION_DOMAIN_RATIO = 0.4;
export const RELATION_DECAY_RATE = 2;
export const COALITION_RELATION_DECAY_RATE = 4;

export interface DomainHolder {
    readonly id: string;
    readonly territories: number;
}

export type CoalitionState = 'NONE' | 'FORCED_MEMBER';

export interface CoalitionStatus {
    readonly hegemonId: string | null;
    readonly state: CoalitionState;
    readonly relationDecayRate: number;
}

function totalTerritoriesOf(holders: readonly DomainHolder[]): number {
    return holders.reduce((sum, h) => sum + Math.max(0, h.territories), 0);
}

/** 勢力領土佔比；全部領土為 0 時回 0 */
export function domainRatioOf(holder: DomainHolder, holders: readonly DomainHolder[]): number {
    const total = totalTerritoriesOf(holders);
    return total > 0 ? Math.max(0, holder.territories) / total : 0;
}

export function shouldStartCoalition(domainRatio: number): boolean {
    return domainRatio >= HEGEMON_DOMAIN_RATIO;
}

export function shouldApplyRebellionPressure(domainRatio: number): boolean {
    return domainRatio >= REBELLION_DOMAIN_RATIO;
}

/** 佔比 ≥ 30% 且最高的勢力；沒有回 null */
export function findHegemon(holders: readonly DomainHolder[]): DomainHolder | null {
    let best: DomainHolder | null = null;
    let bestRatio = -1;
    for (const holder of holders) {
        const ratio = domainRatioOf(holder, holders);
        if (shouldStartCoalition(ratio) && ratio > bestRatio) {
            best = holder;
            bestRatio = ratio;
        }
    }
    return best;
}

/** 某勢力本季的聯盟狀態與邦交衰減速率（E-8 evaluateCoalitionPressure） */
export function coalitionStatusOf(holderId: string, holders: readonly DomainHolder[]): CoalitionStatus {
    const hegemon = findHegemon(holders);
    if (!hegemon || hegemon.id === holderId) {
        return { hegemonId: hegemon?.id ?? null, state: 'NONE', relationDecayRate: RELATION_DECAY_RATE };
    }
    return { hegemonId: hegemon.id, state: 'FORCED_MEMBER', relationDecayRate: COALITION_RELATION_DECAY_RATE };
}

/** F-4：邦交值每季向 0 回歸 rate，不越過 0 */
export function decayRelation(value: number, rate: number = RELATION_DECAY_RATE): number {
    if (value > 0) return Math.max(0, value - rate);
    if (value < 0) return Math.min(0, value + rate);
    return 0;
}
