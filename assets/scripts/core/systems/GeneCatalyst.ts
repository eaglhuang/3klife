// @spec-source → 血統理論系統.md 因子媒介；WBS BLT-10
/** WBS BLT-10：對應因子的繼承機率加 25 個百分點，限一次。 */
export const CATALYST_INHERITANCE_BONUS = 0.25;

export interface CatalystGeneral {
    catalystUsed?: boolean;
}

export interface CatalystResult {
    inheritanceChance: number;
    applied: boolean;
    reason?: 'ALREADY_USED';
}

/**
 * 呼叫端負責提供已退役武將與對應因子的機率；不挑因子、不消耗媒介。
 * 已用過時保留原值；首次使用有限機率夾在 0~1，非法數值明確拒絕。
 */
export function applyGeneCatalyst(retiredGeneral: CatalystGeneral, inheritanceChance: number): CatalystResult {
    if (retiredGeneral.catalystUsed === true) {
        return { inheritanceChance, applied: false, reason: 'ALREADY_USED' };
    }
    if (!Number.isFinite(inheritanceChance)) throw new RangeError('繼承機率必須是有限數值');
    return { inheritanceChance: Math.max(0, Math.min(1, inheritanceChance + CATALYST_INHERITANCE_BONUS)), applied: true };
}

/** 回傳使用標記副本；呼叫端在成功消耗後才保存，不修改原物件。 */
export function markCatalystUsed<T extends CatalystGeneral>(general: T): Omit<T, 'catalystUsed'> & { catalystUsed: true } {
    return { ...general, catalystUsed: true };
}
