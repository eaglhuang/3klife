/**
 * GeneralPoolCycle — 人物頁左右箭頭：在武將清單中找上一位／下一位（首尾相接）。
 * Unity 對照：像 carousel 的 index wrap，純函式、不碰引擎。
 */
export function cyclePoolItem<T extends { id: string }>(pool: readonly T[], currentId: string | null | undefined, step: number): T | null {
    if (pool.length === 0) return null;
    const index = pool.findIndex(item => item.id === currentId);
    if (index < 0) return pool[0];
    const n = pool.length;
    return pool[(((index + Math.trunc(step)) % n) + n) % n];
}
