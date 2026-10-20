// @spec-source → 結緣系統（配種）.md、名詞定義文件.md（天象異變 Omen）；WBS BRD-09
/**
 * SageRemarks — 結緣介面的名士批語與天象異變（純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 結緣介面顯示 2~3 名士的方向性批語，含 10~20% 誤差（PM 裁定另訂，不動 SAGES 準確率表）
 * - 神祕期子嗣出生時有天象異變：流星 / 紫氣 / 鹿銜草
 *
 * 暫定（PM 裁定，記入待辦檔）：
 * - 批語誤差取 15%（10~20% 中點）
 * - 天象異變依武將出生季節與存檔亂數種子確定性抽選，三種等機率
 *
 * Unity 對照：像一個 static class OmenService，輸入固定、輸出固定，
 * 不在內部保存狀態，方便讀檔後重算。
 */
import type { FactorColor } from './FactorInheritance';
import type { FactorPoolEntry } from './BreedingSystem';
import { distortColor, getSage, ProphecyKeywordSource, SAGE_BIAS_WEIGHT } from './SageDivination';

/** 批語誤差率（暫定 15%，10~20% 中點） */
export const REMARK_ERROR_RATE = 0.15;
export const REMARK_MIN_COUNT = 2;
export const REMARK_MAX_COUNT = 3;

export interface SageRemark {
    sageId: string;
    color: FactorColor;
    keyword: string | null;
    /** 是否為誤差批語（僅供測試與紀錄，畫面不顯示） */
    isDistorted: boolean;
}

export type OmenKind = 'meteor' | 'purple-qi' | 'deer-grass';

export const OMEN_KINDS: readonly OmenKind[] = ['meteor', 'purple-qi', 'deer-grass'];

/** 名士批語：不足 2 位名士時不出批語 */
export function buildSageRemarks(
    pool: readonly FactorPoolEntry[],
    unlockedSageIds: readonly string[],
    random: () => number,
    keywordSources: readonly ProphecyKeywordSource[] = [],
): SageRemark[] {
    const sageIds = [...new Set(unlockedSageIds)].filter((id) => getSage(id) !== undefined).slice(0, REMARK_MAX_COUNT);
    const candidates = pool.filter((entry) => entry.chance > 0);
    if (sageIds.length < REMARK_MIN_COUNT || candidates.length === 0) return [];

    const inPool = new Set(pool.map((entry) => entry.id));
    return sageIds.map((sageId): SageRemark => {
        const sage = getSage(sageId)!;
        const weights = candidates.map((entry) => entry.chance * (sage.biasColors.includes(entry.color) ? SAGE_BIAS_WEIGHT : 1));
        const total = weights.reduce((sum, w) => sum + w, 0);
        let roll = random() * total;
        let pick = candidates[candidates.length - 1];
        for (let i = 0; i < candidates.length; i++) {
            roll -= weights[i];
            if (roll < 0) { pick = candidates[i]; break; }
        }

        if (random() >= REMARK_ERROR_RATE) {
            return { sageId, color: pick.color, keyword: pick.displayName ?? pick.id, isDistorted: false };
        }
        const color = distortColor(pick.color, sage);
        const decoy = keywordSources.find((source) => source.color === color && !inPool.has(source.id));
        return { sageId, color, keyword: decoy ? decoy.displayName ?? decoy.id : null, isDistorted: true };
    });
}

/** 天象異變：依出生季節與存檔亂數種子確定性抽選，三種等機率 */
export function pickOmen(birthSeason: number, saveSeed: number): OmenKind {
    const mixed = Math.imul(Math.trunc(birthSeason) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.trunc(saveSeed);
    const hashed = Math.imul(mixed ^ (mixed >>> 15), 0x2c1b3c6d) >>> 0;
    return OMEN_KINDS[hashed % OMEN_KINDS.length];
}

/**
 * 以文字（例：父母 id 組合）產生固定的亂數序列，同一組輸入每次畫面刷新都得到同樣的批語。
 * 用 FNV-1a 把文字壓成種子，再接線性同餘產生器。
 */
export function remarkRandomOf(seedText: string): () => number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < seedText.length; i++) {
        hash = Math.imul(hash ^ seedText.charCodeAt(i), 0x01000193) >>> 0;
    }
    return () => {
        hash = (Math.imul(hash, 1664525) + 1013904223) >>> 0;
        return hash / 0x100000000;
    };
}
