import type { GeneralDetailRarityTier } from '../../core/models/GeneralUnit';

/**
 * UIContrast.ts — 文字對比與人物頁稀有度標籤配色（PROG-2-2113）
 *
 * 純資料與純函式（不依賴 cc），讓測試能直接驗證「字色配底色」是否達標。
 * Unity 對照：像一個 ScriptableObject 配色表加 WCAG 對比度計算。
 */
export type UIRgb = readonly [number, number, number];

/** 人物頁稀有度標籤底色。綠／藍／紅壓暗到白字達 4.5:1；金底配深字 */
export const DS3_RARITY_PILL_BG: Readonly<Record<GeneralDetailRarityTier, UIRgb>> = {
    common: [46, 125, 50],
    rare: [21, 101, 192],
    epic: [156, 39, 176],
    legendary: [255, 193, 7],
    mythic: [198, 40, 40],
};

export const DS3_RARITY_PILL_TEXT: Readonly<Record<GeneralDetailRarityTier, UIRgb>> = {
    common: [255, 255, 255],
    rare: [255, 255, 255],
    epic: [255, 255, 255],
    legendary: [45, 30, 0],
    mythic: [255, 255, 255],
};

function channel(v: number): number {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** WCAG 相對亮度 */
export function relativeLuminance(rgb: UIRgb): number {
    return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

/** WCAG 對比度（1~21）。一般文字至少 4.5，大字至少 3 */
export function contrastRatio(a: UIRgb, b: UIRgb): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** 以 alpha 把前景疊在底色上，回傳疊合後的不透明顏色 */
export function blendOver(fg: UIRgb, bg: UIRgb, alpha: number): UIRgb {
    const a = Math.max(0, Math.min(1, alpha));
    return [
        Math.round(fg[0] * a + bg[0] * (1 - a)),
        Math.round(fg[1] * a + bg[1] * (1 - a)),
        Math.round(fg[2] * a + bg[2] * (1 - a)),
    ];
}
