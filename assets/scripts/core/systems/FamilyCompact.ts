// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §E #5、§F-2 作用面限制、§F-3 途徑①②；PROG-2-1813、PROG-2-1816
/**
 * FamilyCompact — 世交合譜（純邏輯，不依賴 cc）
 *
 * 與聯姻名門結緣時鎖定雙親共同持有的 1 項因子：受孕成功時子嗣必帶此因子。
 * 親代因子進池機率本來就是 100%，實際只會在候選超過子嗣上限時被擠掉，所以真的保住時才收費。
 * 不消耗亂數，也不改傳星機率；K 只折抵成本，最高 50%。
 * 暫定（可逆）：規格的「合譜文書」沒有道具定義，先收黃金；「雙家關係 R 達標」也沒定義，先只要求雙親之一來自名門。
 * 補回來的因子星數取雙親較低者；子嗣因子滿額時擠掉排序最後一項。
 *
 * 父系家傳（途徑①）與合譜共用主門風承襲槽：免費保住父親 1 項核心因子，星數照父親，其餘規則相同。
 * 暫定（可逆）：核心因子指藍、紅與自創金因子。
 *
 * Unity 對照：像配種前的一張鎖定券，只在結果產生後補上指定基因。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { CUSTOM_GOLD_ID_PREFIX } from './CustomGoldFactor';
import { type FactorDictionary, type InheritedFactor, resolveFactorColor } from './FactorInheritance';
import { familyPairKey, PLAYER_FAMILY_UID, synergyKOf, type FamilySynergyLedger } from './FamilySynergy';

export const COMPACT_BASE_GOLD = 1000;
export const COMPACT_MAX_DISCOUNT = 0.5;

interface CompactParent {
    id?: string;
    familyUid?: string;
    genes?: GeneralGeneConfig[];
}

export function compactFamilyOf(father: CompactParent, mother: CompactParent): string | null {
    return father.familyUid ?? mother.familyUid ?? null;
}

export function compactCost(k: number): number {
    return Math.round(COMPACT_BASE_GOLD * (1 - COMPACT_MAX_DISCOUNT * Math.min(1, Math.max(0, k))));
}

/** G3 §G 大禮句的「K 滿額」 */
export function compactSynergyFull(family: string, ledger: FamilySynergyLedger | undefined): boolean {
    return synergyKOf(ledger?.pairs[familyPairKey(PLAYER_FAMILY_UID, family)]) >= 1;
}

export function compactCostFor(family: string, ledger: FamilySynergyLedger | undefined): number {
    return compactCost(synergyKOf(ledger?.pairs[familyPairKey(PLAYER_FAMILY_UID, family)]));
}

/** 雙親都持有的因子，依 id 排序；星數取較低者 */
export function sharedFactorsOf(father: CompactParent, mother: CompactParent): GeneralGeneConfig[] {
    const motherGenes = mother.genes ?? [];
    return (father.genes ?? [])
        .map((gene): GeneralGeneConfig | null => {
            const match = gene.id ? motherGenes.find((other) => other.id === gene.id) : undefined;
            return match ? { ...gene, level: Math.min(gene.level ?? 1, match.level ?? 1) } : null;
        })
        .filter((gene): gene is GeneralGeneConfig => gene !== null)
        .sort((a, b) => (a.id ?? '').localeCompare(b.id ?? ''));
}

export interface CompactLockOptions {
    dictionary?: FactorDictionary;
    enabledColors?: readonly string[];
    maxFactors: number;
}

/** 已傳下來就不動；顏色未開放時不補 */
function lockFactor(factors: InheritedFactor[], gene: GeneralGeneConfig | undefined, sources: readonly CompactParent[], options: CompactLockOptions): InheritedFactor[] {
    if (!gene?.id) return factors;
    const id = gene.id;
    if (factors.some((factor) => factor.id === id)) return factors;
    const color = resolveFactorColor(id, options.dictionary, gene);
    if (!color || (options.enabledColors && options.enabledColors.indexOf(color) < 0)) return factors;
    const kept = factors.slice(0, Math.max(0, options.maxFactors - 1));
    const sourceUids = sources.map((parent) => parent.id).filter((uid): uid is string => !!uid);
    return [...kept, { id, color, level: gene.level ?? 1, generation: 1, sourceUids }];
}

/** 雙親不再共有時不補 */
export function applyCompactLock(factors: InheritedFactor[], lockedId: string, father: CompactParent, mother: CompactParent, options: CompactLockOptions): InheritedFactor[] {
    return lockFactor(factors, sharedFactorsOf(father, mother).find((gene) => gene.id === lockedId), [father, mother], options);
}

/** 父親可家傳的核心因子，維持父親身上的順序 */
export function heritageFactorsOf(father: CompactParent, dictionary?: FactorDictionary): GeneralGeneConfig[] {
    return (father.genes ?? []).filter((gene) => {
        if (!gene.id) return false;
        if (gene.id.indexOf(CUSTOM_GOLD_ID_PREFIX) === 0) return true;
        const color = resolveFactorColor(gene.id, dictionary, gene);
        return color === 'blue' || color === 'red';
    });
}

/** 父親已沒有這項核心因子時不補 */
export function applyHeritageLock(factors: InheritedFactor[], lockedId: string, father: CompactParent, options: CompactLockOptions): InheritedFactor[] {
    return lockFactor(factors, heritageFactorsOf(father, options.dictionary).find((gene) => gene.id === lockedId), [father], options);
}
