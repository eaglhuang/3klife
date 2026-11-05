// @spec-source → 血統傳承G2二代傳承_功業回流與三代譜牒規格書.md §F-1、§G UI_G2_EP_CONTRIB；R4 工程驗收第 18 節；PROG-2-1824
/**
 * EpLegacyBonus — 生平功業五錨點插值（純邏輯，不依賴 cc）
 *
 * EP 決定 bonus 0／5／10／15 的機率，相鄰錨點依距離線性混合，95 以上封頂。
 * 先插值成一張分布再抽一次，不能各抽兩個錨點後平均，否則會出現表上沒有的 bonus。
 * 暫定：有效 EP 取雙親平均（R4 的總 EP 組成仍未定案，G2 畫面句寫的是雙親 EP）；
 * 每項五維各抽一次，運氣不加；用浮點數，不採 R4 回放用的精確分數。
 */
export const EP_BONUS_VALUES = [0, 5, 10, 15] as const;

const EP_ANCHORS: ReadonlyArray<{ ep: number; odds: readonly number[] }> = [
    { ep: 0, odds: [0.8, 0.18, 0.02, 0] },
    { ep: 25, odds: [0.65, 0.27, 0.08, 0] },
    { ep: 50, odds: [0.5, 0.3, 0.18, 0.02] },
    { ep: 75, odds: [0.35, 0.3, 0.25, 0.1] },
    { ep: 95, odds: [0.2, 0.25, 0.35, 0.2] },
];

/** 五維加上 bonus 後的上限 */
export const EP_BONUS_STAT_CAP = 100;

export function epBonusOdds(ep: number): number[] {
    const last = EP_ANCHORS[EP_ANCHORS.length - 1];
    const e = Math.max(0, Math.min(ep, last.ep));
    const upperIndex = EP_ANCHORS.findIndex((anchor) => e <= anchor.ep);
    if (upperIndex <= 0) return [...EP_ANCHORS[0].odds];
    const lower = EP_ANCHORS[upperIndex - 1];
    const upper = EP_ANCHORS[upperIndex];
    const weight = (e - lower.ep) / (upper.ep - lower.ep);
    return lower.odds.map((odd, i) => (1 - weight) * odd + weight * upper.odds[i]);
}

export function meanEpBonus(ep: number): number {
    return epBonusOdds(ep).reduce((sum, odd, i) => sum + odd * EP_BONUS_VALUES[i], 0);
}

export function rollEpBonus(ep: number, random: () => number): number {
    const roll = random();
    const odds = epBonusOdds(ep);
    let cumulative = 0;
    for (let i = 0; i < odds.length; i++) {
        cumulative += odds[i];
        if (roll < cumulative) return EP_BONUS_VALUES[i];
    }
    return EP_BONUS_VALUES[EP_BONUS_VALUES.length - 1];
}

/** 把 bonus 加到一項五維；原本就超過上限的不往下壓 */
export function applyEpBonus(stat: number, bonus: number): number {
    return Math.max(stat, Math.min(EP_BONUS_STAT_CAP, stat + bonus));
}

export function parentLegacyEp(fatherEp: number, motherEp: number): number {
    return (fatherEp + motherEp) / 2;
}

/** G2 §G UI_G2_EP_CONTRIB */
export function epContribLine(fatherEp: number, motherEp: number): string {
    return `雙親生平功業（父 EP ${Math.round(fatherEp)} / 母 EP ${Math.round(motherEp)}）已平滑加成此胎先天根骨分佈`;
}
