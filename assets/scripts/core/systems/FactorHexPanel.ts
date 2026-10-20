// @spec-source → 新手開場規格書.md §分鏡 8（因子解鎖特效）、§7.4 視覺化需求（六色六角圖）、§17 AttributePanel；OPEN-08（PROG-2-0717）
/**
 * FactorHexPanel — 六色因子六角圖與解鎖特效的資料（純邏輯，不依賴 cc）
 *
 * 規格：六色六角圖（藍 / 粉 / 綠 / 白 / 紫 / 紅）顯示因子覺醒狀況；因子覺醒時，觸發解鎖特效。
 *
 * 暫定（可逆）：
 *   - 每個頂點的數值 = 該色已覺醒因子數 ÷ DEFAULT_MAX_INHERITED_FACTORS（5），夾在 0..1。
 *     規格沒有給因子等級的上限，先比照人物頁 5 格。
 *   - 六角圖的形狀依規格偏向「命盤 / 家譜印輪」，這裡只給頂點座標，外觀由 cc 端決定。
 *
 * Unity 對照：像一個 Presenter，把因子清單算成六個頂點數值；解鎖特效只看「前後兩次覺醒數」的差。
 */
import { ALL_FACTOR_COLORS, DEFAULT_MAX_INHERITED_FACTORS, type FactorColor } from './FactorInheritance';

export const FACTOR_COLOR_LABELS: Readonly<Record<FactorColor, string>> = {
    blue: '藍',
    pink: '粉',
    green: '綠',
    purple: '紫',
    white: '白',
    red: '紅',
};

export interface FactorHexInput {
    color: FactorColor;
    awakened: boolean;
}

export interface FactorHexVertex {
    color: FactorColor;
    label: string;
    /** 0..1 */
    value: number;
    /** 該色是否至少有一個已覺醒因子 */
    lit: boolean;
}

/** 依 ALL_FACTOR_COLORS 的順序（頂點順時針）算出六個頂點；只計已覺醒的因子。 */
export function buildFactorHexView(factors: readonly FactorHexInput[]): FactorHexVertex[] {
    const counts: Record<FactorColor, number> = { blue: 0, pink: 0, green: 0, purple: 0, white: 0, red: 0 };
    for (const f of factors) {
        if (f.awakened && f.color in counts) counts[f.color] += 1;
    }
    return ALL_FACTOR_COLORS.map((color) => {
        const count = counts[color];
        return {
            color,
            label: FACTOR_COLOR_LABELS[color],
            value: Math.min(1, count / DEFAULT_MAX_INHERITED_FACTORS),
            lit: count > 0,
        };
    });
}

/** 比較前後兩次的因子狀態，回傳本次新亮起的顏色（每色只要有增加就算一次，供解鎖特效播放）。 */
export function newlyLitFactorColors(before: readonly FactorHexInput[], after: readonly FactorHexInput[]): FactorColor[] {
    const litBefore = new Set(before.filter((f) => f.awakened).map((f) => f.color));
    const litAfter = new Set(after.filter((f) => f.awakened).map((f) => f.color));
    const newlyLit = new Set<FactorColor>();
    for (const color of litAfter) {
        if (!litBefore.has(color)) newlyLit.add(color);
    }
    return ALL_FACTOR_COLORS.filter((c) => newlyLit.has(c));
}

/** 第 index 個頂點的平面座標（中心為 0,0，半徑為 radius × value）。index 從正上方開始、順時針。 */
export function hexVertexPoint(index: number, value: number, radius: number): { x: number; y: number } {
    const angle = (-Math.PI / 2) + (index * Math.PI * 2) / ALL_FACTOR_COLORS.length;
    const r = radius * Math.max(0, Math.min(1, value));
    return { x: Math.round(Math.cos(angle) * r * 100) / 100, y: Math.round(Math.sin(angle) * r * 100) / 100 };
}
