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

/** 暫定（PROG-2-0864）：規格未給注入的基礎機率，先取 0.5，加上 CATALYST_INHERITANCE_BONUS 後擲骰。 */
export const CATALYST_BASE_INHERITANCE_CHANCE = 0.5;

export interface CatalystInjectable {
    genes?: readonly { id?: string }[];
}

export interface CatalystInjectionResult<C extends CatalystInjectable> {
    /** 注入後的子嗣副本；沒有注入時與輸入內容相同 */
    child: C;
    /** 注入的因子 id；未命中或沒有可注入因子時為 null */
    injectedFactorId: string | null;
    /** 是否消耗媒介（擲過骰才消耗，命中與否都算） */
    consumed: boolean;
    reason?: 'ALREADY_USED' | 'NO_CANDIDATE';
}

/**
 * 因子媒介注入子嗣（PROG-2-0864）：從退役武將的因子中挑第一個子嗣還沒有的，
 * 以 applyGeneCatalyst 算出的機率擲骰，命中才加入子嗣。沒有可注入的因子或媒介已用過時不擲骰、不消耗。
 * 純函式：不修改輸入，呼叫端負責保存與標記 catalystUsed。
 */
export function injectCatalystFactor<C extends CatalystInjectable>(
    retiredGeneral: CatalystGeneral & CatalystInjectable,
    child: C,
    random: () => number,
): CatalystInjectionResult<C> {
    if (retiredGeneral.catalystUsed === true) {
        return { child, injectedFactorId: null, consumed: false, reason: 'ALREADY_USED' };
    }
    const owned = new Set((child.genes ?? []).map((gene) => gene.id));
    const candidate = (retiredGeneral.genes ?? []).find((gene): gene is { id: string } => gene.id !== undefined && !owned.has(gene.id));
    if (!candidate) {
        return { child, injectedFactorId: null, consumed: false, reason: 'NO_CANDIDATE' };
    }
    const { inheritanceChance } = applyGeneCatalyst(retiredGeneral, CATALYST_BASE_INHERITANCE_CHANCE);
    const hit = random() < inheritanceChance;
    if (!hit) {
        return { child, injectedFactorId: null, consumed: true };
    }
    const injected: C = { ...child, genes: [...(child.genes ?? []), { ...candidate }] };
    return { child: injected, injectedFactorId: candidate.id, consumed: true };
}
