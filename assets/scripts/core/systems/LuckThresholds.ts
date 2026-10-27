/**
 * 運氣特殊門檻判定（LUK-06）。
 *
 * 規格：docs/遊戲規格文件/系統規格書/運氣系統.md「LUK 特殊門檻效果」
 * Unity 對照：像一個純函式的 Threshold Table，輸入 LUK 數值，輸出該門檻解鎖哪些旗標。
 *
 * 本檔只判定旗標，不套用效果。戰法複製、因子突破、曾祖因子繼承的實際接線另卡處理。
 * LUK 上限依紫因子計算（LUK-03，PROG-2-1166）：lukMaxForGenes。
 */

import { FATE_BLESSING_GENE_IDS, type FateHeldGene } from './FateBlessing';

/** LUK 絕對上限（★5 紫因子）；個別武將的上限見 lukMaxForGenes */
export const LUK_MAX = 100;
/** 沒有紫因子時的 LUK 上限（運氣系統 §F：LUK_Max = 50 + Purple_Gene_Level × 10） */
export const LUK_BASE_MAX = 50;
/** 紫因子每級增加的 LUK 上限 */
export const LUK_MAX_PER_PURPLE_LEVEL = 10;
/** ≥ 80：戰法強制複製（父親最強戰法 100% 繼承） */
export const LUK_FORCE_TACTIC_COPY_MIN = 80;
/** ≥ 95：血統變異（隨機一個因子突破 ★，上限 ★4） */
export const LUK_BLOODLINE_MUTATION_MIN = 95;

export interface LuckThresholdEffects {
    /** 戰法強制複製 */
    forceTacticCopy: boolean;
    /** 血統變異 */
    bloodlineMutation: boolean;
    /** 天命傳承：額外繼承一個曾祖代因子（LUK 達上限） */
    fateInheritance: boolean;
}

/**
 * 依父母平均 LUK 回傳各門檻旗標。
 * LUK 缺省、負數或非有限值視為 0，三個旗標皆為 false。
 * 高於上限的值以 LUK_MAX 計（LUK 不會超過上限）。
 */
export function luckThresholdEffects(parentAvgLuk: number): LuckThresholdEffects {
    const luk = Number.isFinite(parentAvgLuk) && parentAvgLuk > 0 ? Math.min(parentAvgLuk, LUK_MAX) : 0;
    return {
        forceTacticCopy: luk >= LUK_FORCE_TACTIC_COPY_MIN,
        bloodlineMutation: luk >= LUK_BLOODLINE_MUTATION_MIN,
        fateInheritance: luk >= LUK_MAX,
    };
}

/**
 * 依持有基因算 LUK 上限（LUK-03）：50 + 紫因子最高等級 × 10，不超過 LUK_MAX。
 * 暫定：鎖定（尚未覺醒）的紫因子也算，上限反映潛力而非已揭露的因子；多個紫因子只取最高等級。
 */
export function lukMaxForGenes(genes: readonly FateHeldGene[] | undefined): number {
    let purple = 0;
    for (const gene of genes ?? []) {
        if (!FATE_BLESSING_GENE_IDS.includes(gene.id ?? '')) continue;
        const level = Number.isFinite(gene.level) ? Math.max(0, gene.level ?? 0) : 0;
        purple = Math.max(purple, level);
    }
    return Math.min(LUK_MAX, LUK_BASE_MAX + purple * LUK_MAX_PER_PURPLE_LEVEL);
}
