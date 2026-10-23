// @spec-source → 經濟系統.md「基礎資源」初始上限表、UI_RES_LOW 文案；WBS ECO-11；PROG-2-1010
/**
 * ResourceCap — 基礎資源的存儲上限夾制與不足提示（純邏輯，不依賴 cc）。
 *
 * - 上限依經濟系統初始上限表；超出上限時夾回上限，負數夾回 0。
 * - 不足提示：存量低於需求時回傳警示字串，足夠時回傳 null。
 * - 上限與文案為初始值（暫定），之後由設定表覆寫。
 *
 * Unity 對照：像 Clamp 一個 ScriptableObject 的 Min/Max 欄位，再由 UI 決定要不要跳警示。
 */

export type BaseResourceKey = 'food' | 'gold' | 'troops' | 'fame';

export const BASE_RESOURCE_CAPS: Readonly<Record<BaseResourceKey, number>> = Object.freeze({
    food: 10000,
    gold: 5000,
    troops: 3000,
    fame: 2000,
});

const RESOURCE_NAMES: Readonly<Record<BaseResourceKey, string>> = Object.freeze({
    food: '糧草',
    gold: '黃金',
    troops: '城市兵源',
    fame: '名聲',
});

/** 夾制到 [0, 上限]；非有限數視為 0。 */
export function clampResource(key: BaseResourceKey, amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) return 0;
    return Math.min(amount, BASE_RESOURCE_CAPS[key]);
}

/** 存量不足 `need` 時回傳警示字串（UI_RES_LOW），足夠時回傳 null。 */
export function resourceShortageWarning(key: BaseResourceKey, have: number, need: number): string | null {
    if (have >= need) return null;
    return `⚠ ${RESOURCE_NAMES[key]} 存量不足！`;
}
