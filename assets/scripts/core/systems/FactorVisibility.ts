// @spec-source → 因子解鎖系統.md；PROG-2-0100 使用者裁決：常數優先，不新增 config；PROG-2-0513 PM 裁定：未知色系統一視為 Lv1
import { ALL_FACTOR_COLORS, FACTOR_DISCOVERY_LEVEL, FactorColor, normalizeFactorColor } from './FactorInheritance';

export type FactorVisibility =
    | { status: 'visible'; visible: true }
    | { status: 'locked'; visible: false; requiredLevel: number };

/** 只讀取單因子可見性資料；不讀 isLocked，覺醒生效與可見性是不同概念。 */
export interface GeneVisibilityInput {
    type?: string | null;
    discoveryLevel?: number | null;
}

/** 階段摘要（規格 Visible_Types / Locked_Types）；顏色依 ALL_FACTOR_COLORS 順序。 */
export interface FactorStageSummary {
    visibleTypes: FactorColor[];
    lockedTypes: FactorColor[];
}

/** 發現等級為整數；非有限值、零或負數依新玩家等級 1 處理。 */
function normalizedDiscoveryLevel(level: number): number {
    return Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;
}

/**
 * 單因子的發現門檻，全專案共用這一條規則（FactorMask 與 FactorVisibility 都呼叫它）：
 * 1. gene.discoveryLevel 有值時優先（出生時寫入的覆寫）；
 * 2. 已知色系取 FACTOR_DISCOVERY_LEVEL 常數；
 * 3. 未知或缺失色系視為 Lv1（PM 裁定，與既有遮罩行為一致）。
 * 別名表可能讀到原型屬性，因此只接受常數表自己的色系鍵。
 */
export function requiredDiscoveryLevel(gene: GeneVisibilityInput): number {
    if (gene.discoveryLevel !== undefined && gene.discoveryLevel !== null) return gene.discoveryLevel;
    const color = normalizeFactorColor(gene.type);
    if (typeof color === 'string' && Object.prototype.hasOwnProperty.call(FACTOR_DISCOVERY_LEVEL, color)) {
        return FACTOR_DISCOVERY_LEVEL[color];
    }
    return 1;
}

/** 每次回傳新物件；鎖定色系附上原常數的門檻，不更改常數或 Session。 */
export function getFactorVisibility(playerDiscoveryLevel: number): Record<FactorColor, FactorVisibility> {
    const level = normalizedDiscoveryLevel(playerDiscoveryLevel);
    const result = {} as Record<FactorColor, FactorVisibility>;
    for (const color of Object.keys(FACTOR_DISCOVERY_LEVEL) as FactorColor[]) {
        const requiredLevel = FACTOR_DISCOVERY_LEVEL[color];
        result[color] = isFactorLevelUnlocked(level, requiredLevel)
            ? { status: 'visible', visible: true }
            : { status: 'locked', visible: false, requiredLevel };
    }
    return result;
}

/** 結緣畫面用的階段摘要：玩家等級已開放與尚未開放的色系。 */
export function factorStageSummary(playerDiscoveryLevel: number): FactorStageSummary {
    const visibility = getFactorVisibility(playerDiscoveryLevel);
    const visibleTypes = ALL_FACTOR_COLORS.filter((color) => visibility[color].visible);
    const lockedTypes = ALL_FACTOR_COLORS.filter((color) => !visibility[color].visible);
    return { visibleTypes, lockedTypes };
}

const FACTOR_COLOR_LABEL: Record<FactorColor, string> = {
    blue: '藍',
    pink: '粉',
    green: '綠',
    white: '白',
    purple: '紫',
    red: '紅',
};

/** 結緣畫面的一行階段摘要，例如「已開放：藍 · 粉｜未開放：綠 · 白 · 紫 · 紅」。 */
export function factorStageText(playerDiscoveryLevel: number): string {
    const { visibleTypes, lockedTypes } = factorStageSummary(playerDiscoveryLevel);
    const names = (colors: FactorColor[]) => (colors.length > 0 ? colors.map((c) => FACTOR_COLOR_LABEL[c]).join(' · ') : '無');
    return `已開放：${names(visibleTypes)}｜未開放：${names(lockedTypes)}`;
}

/**
 * 單一因子是否看得到（發現等級）。無效門檻（NaN / Infinity）不可見；不發事件、不修改輸入。
 * 生效與否不在這裡判定，見 FactorMask 的 active。
 */
/**
 * 因子階段解鎖判定（PM 裁定 B，LUK-04）：門檻數值保留，判定為「等級 > 門檻」。
 * 門檻 ≤ 1 的色系（藍 / 粉）視為 Lv1 起即可見，對應規格「Lv1~20 只見藍粉」。
 */
export function isFactorLevelUnlocked(playerLevel: number, requiredLevel: number): boolean {
    if (requiredLevel <= 1) return playerLevel >= 1;
    return playerLevel > requiredLevel;
}

export function isGeneFactorVisible(gene: GeneVisibilityInput, playerDiscoveryLevel: number): boolean {
    const required = requiredDiscoveryLevel(gene);
    return Number.isFinite(required) && isFactorLevelUnlocked(normalizedDiscoveryLevel(playerDiscoveryLevel), required);
}
