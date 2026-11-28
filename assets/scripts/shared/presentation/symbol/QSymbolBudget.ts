/**
 * QSymbolBudget.ts — 符號預算表與 LOD 分配（QLIFE-01 §5.9）
 *
 * 純邏輯。超過同時符號上限時依距離降級（遠的先降），不新增節點。
 */
import { SymbolLod, SymbolTier } from './types';

export interface SymbolBudget {
    /** 同畫面同時完整動畫的符號數 */
    maxAnimated: number;
    /** 每個符號最多子精靈 */
    maxSubPerSymbol: number;
    /** 子精靈總上限（含全部，也是節點池容量） */
    maxTotalSprites: number;
    /** 每顆頭同時主符號數（2 = 主＋副） */
    mainPerHead: number;
}

/** 預算表（PM 定數字） */
export const SYMBOL_BUDGETS: Readonly<Record<SymbolTier, SymbolBudget>> = {
    low: { maxAnimated: 8, maxSubPerSymbol: 3, maxTotalSprites: 28, mainPerHead: 1 },
    mid: { maxAnimated: 14, maxSubPerSymbol: 4, maxTotalSprites: 48, mainPerHead: 1 },
    high: { maxAnimated: 22, maxSubPerSymbol: 5, maxTotalSprites: 80, mainPerHead: 2 },
};

/** 距離門檻（單位：螢幕寬） */
export const LOD1_DISTANCE = 0.5;
export const LOD2_DISTANCE = 0.9;
/** LOD 重算間隔（秒） */
export const LOD_RECALC_INTERVAL = 0.25;
/** LOD2 靜態小圖形的透明度 */
export const LOD2_ALPHA = 0.7;

/** 依與焦點距離（螢幕寬倍數）決定想要的 LOD；畫面外不畫 */
export function lodForDistance(dist: number, onScreen: boolean): SymbolLod {
    if (!onScreen) return 3;
    if (dist > LOD2_DISTANCE) return 2;
    if (dist > LOD1_DISTANCE) return 1;
    return 0;
}

export interface BudgetItem {
    id: number;
    /** 與焦點距離（螢幕寬倍數），遠的先降級 */
    dist: number;
    /** 距離決定的 LOD */
    wantLod: SymbolLod;
    /** 各 LOD 需要的子精靈數：[LOD0, LOD1, LOD2] */
    sprites: [number, number, number];
}

/**
 * 分配每個項目的最終 LOD（近的先拿好品質，遠的先降級）：
 * 1. 完整動畫（LOD0）名額用完，超出的（較遠的）改 LOD1；
 * 2. 先假設所有項目都在最省的 LOD2；放不下就從最遠的開始整個隱藏（LOD3）；
 * 3. 有剩餘預算時，由近到遠把項目升回目標 LOD（升不到 LOD0 就試 LOD1）。
 * 回傳 Map<id, LOD>。同樣輸入結果固定（距離相同以 id 小者較近）。
 */
export function allocateLods(items: readonly BudgetItem[], budget: SymbolBudget): Map<number, SymbolLod> {
    const sorted = items.slice().sort((a, b) => a.dist - b.dist || a.id - b.id);
    const lod = new Map<number, SymbolLod>();
    const target = new Map<number, SymbolLod>();
    let animated = 0;
    for (const it of sorted) {
        let l = it.wantLod;
        if (l === 0) {
            if (animated < budget.maxAnimated) animated++;
            else l = 1;
        }
        target.set(it.id, l);
        lod.set(it.id, l === 3 ? 3 : 2);
    }
    let total = 0;
    for (const it of sorted) if (lod.get(it.id) === 2) total += it.sprites[2];
    for (let k = sorted.length - 1; k >= 0 && total > budget.maxTotalSprites; k--) {
        const it = sorted[k];
        if (lod.get(it.id) === 2 && it.sprites[2] > 0) {
            lod.set(it.id, 3);
            total -= it.sprites[2];
        }
    }
    let remaining = budget.maxTotalSprites - total;
    for (const it of sorted) {
        if (lod.get(it.id) !== 2) continue;
        for (let l = target.get(it.id) as number; l <= 2; l++) {
            const delta = it.sprites[l as 0 | 1 | 2] - it.sprites[2];
            if (delta <= remaining) {
                lod.set(it.id, l as SymbolLod);
                remaining -= delta;
                break;
            }
        }
    }
    return lod;
}
