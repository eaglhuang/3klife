// @spec-source → 因子解鎖系統.md；PROG-2-0100 使用者裁決：常數優先，不新增 config。
import { FACTOR_DISCOVERY_LEVEL, FactorColor, normalizeFactorColor } from './FactorInheritance';

export type FactorVisibility =
    | { status: 'visible'; visible: true }
    | { status: 'locked'; visible: false; requiredLevel: number };

/** 只讀取單因子可見性資料；不讀 isLocked，覺醒生效與可見性是不同概念。 */
export interface GeneVisibilityInput {
    type?: string | null;
    discoveryLevel?: number | null;
}

/** 發現等級為整數；非有限值、零或負數依新玩家等級 1 處理。 */
function normalizedDiscoveryLevel(level: number): number {
    return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

/** 每次回傳新物件；鎖定色系附上原常數的門檻，不更改常數或 Session。 */
export function getFactorVisibility(playerDiscoveryLevel: number): Record<FactorColor, FactorVisibility> {
    const level = normalizedDiscoveryLevel(playerDiscoveryLevel);
    const result = {} as Record<FactorColor, FactorVisibility>;
    for (const color of Object.keys(FACTOR_DISCOVERY_LEVEL) as FactorColor[]) {
        const requiredLevel = FACTOR_DISCOVERY_LEVEL[color];
        result[color] = level >= requiredLevel
            ? { status: 'visible', visible: true }
            : { status: 'locked', visible: false, requiredLevel };
    }
    return result;
}

/**
 * 已知色系：gene.discoveryLevel 優先，否則用色系常數，與 FactorAwakening 優先序一致。
 * 未知／缺失色系依本卡要求鎖定（不同於舊覺醒 fallback=1），即使帶覆寫值也不猜色。
 * 無效單因子門檻不讓因子可見；不發事件、不覺醒、不修改輸入。
 */
export function isGeneFactorVisible(gene: GeneVisibilityInput, playerDiscoveryLevel: number): boolean {
    const color = normalizeFactorColor(gene.type);
    // 舊 alias 表可能讀到原型屬性；只接受常數表自身的六個色系鍵。
    if (typeof color !== 'string' || !Object.prototype.hasOwnProperty.call(FACTOR_DISCOVERY_LEVEL, color)) return false;
    const requiredLevel = gene.discoveryLevel ?? FACTOR_DISCOVERY_LEVEL[color];
    return Number.isFinite(requiredLevel) && normalizedDiscoveryLevel(playerDiscoveryLevel) >= requiredLevel;
}
