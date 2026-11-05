/**
 * LineageSynergy — 門風連攜（血統傳承 G2 §E #3、G3 §F-3，PROG-2-1818）
 *
 * 雙親同持藍因子時，不必近親也能把當胎該項推到 4★。
 * 規格的上限 m 沒有基礎值，現有星數也不受 m 限制，所以這裡做成「該項有機率 ★+1」；
 * 機率規格未定，暫用近親純化同一個 30%。每胎只判 1 項，世交合譜鎖定的優先。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { resolveFactorColor, type FactorDictionary, type InheritedFactor } from './FactorInheritance';

export const LINEAGE_SYNERGY_CAP_STAR = 4;
export const LINEAGE_SYNERGY_CHANCE = 0.3;

interface SynergyParent {
    genes?: GeneralGeneConfig[];
}

export interface LineageSynergyOptions {
    random: () => number;
    dictionary?: FactorDictionary;
    /** 世交合譜鎖定的因子，連攜先判它 */
    priorityId?: string;
}

/** 雙親都帶的藍因子，順序照父親 */
export function sharedBlueGenesOf(father: SynergyParent, mother: SynergyParent, dictionary?: FactorDictionary): GeneralGeneConfig[] {
    const motherIds = (mother.genes ?? []).map((gene) => gene.id);
    return (father.genes ?? []).filter((gene) => !!gene.id && motherIds.includes(gene.id) && resolveFactorColor(gene.id, dictionary, gene) === 'blue');
}

function synergyTargetOf(factors: InheritedFactor[], shared: GeneralGeneConfig[], options: LineageSynergyOptions): InheritedFactor | undefined {
    const eligible = factors.filter((factor) => shared.some((gene) => gene.id === factor.id)
        && factor.level < Math.min(LINEAGE_SYNERGY_CAP_STAR, options.dictionary?.get(factor.id)?.maxLevel ?? LINEAGE_SYNERGY_CAP_STAR));
    return eligible.find((factor) => factor.id === options.priorityId)
        ?? eligible.reduce<InheritedFactor | undefined>((best, factor) => (!best || factor.level > best.level ? factor : best), undefined);
}

/** 沒有可判的因子時不消耗亂數，也回傳原陣列 */
export function applyLineageSynergy(factors: InheritedFactor[], father: SynergyParent, mother: SynergyParent, options: LineageSynergyOptions): { factors: InheritedFactor[]; risen: InheritedFactor | null } {
    const target = synergyTargetOf(factors, sharedBlueGenesOf(father, mother, options.dictionary), options);
    if (!target || options.random() >= LINEAGE_SYNERGY_CHANCE) return { factors, risen: null };
    const risen = { ...target, level: target.level + 1 };
    return { factors: factors.map((factor) => (factor === target ? risen : factor)), risen };
}

/** UI_G2_CAP_SYNERGY */
export function lineageSynergyLine(factorName: string): string {
    return `【門風連攜】雙親血脈共鳴，${factorName} 天賦發揮上限提升至 ${LINEAGE_SYNERGY_CAP_STAR}★！`;
}

/** 結緣預覽：這對夫妻可連攜的因子 */
export function lineageSynergyHint(shared: GeneralGeneConfig[]): string | null {
    if (shared.length === 0) return null;
    return `門風連攜：${shared.map((gene) => gene.displayName ?? gene.id).join('、')}`;
}
