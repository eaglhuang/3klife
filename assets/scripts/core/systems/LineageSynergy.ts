/**
 * LineageSynergy — 門風連攜（血統傳承 G2 §E #3、G3 §F-3，PROG-2-1818）
 *
 * 雙親同持藍因子時，不必近親也能把當胎該項推到 4★。
 * 規格的上限 m 沒有基礎值，現有星數也不受 m 限制，所以這裡做成「該項有機率 ★+1」；
 * 機率規格未定，暫用近親純化同一個 30%。每胎只判 1 項，世交合譜鎖定的優先。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { resolveFactorColor, type FactorDictionary, type InheritedFactor } from './FactorInheritance';
import { KIN_PURIFICATION_CAP_STAR } from './KinPurification';

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

/** G2 §E #3 的基礎顯性上限，暫定與家學研習封頂相同 */
export const BLUE_BASE_CAP_STAR = 3;
const BLUE_CAP_LINE_ROWS = 3;

export interface BlueFactorCap {
    name: string;
    /** 雙親持有的較高星數 */
    star: number;
    /** 當胎上限；現有星數不受上限限制，所以不低於星數 */
    cap: number;
    source: '基礎顯性' | '門風連攜 +1' | '血脈純化';
}

export interface BlueFactorCapOptions {
    dictionary?: FactorDictionary;
    /** 同血脈走近親純化，不算連攜 */
    synergyAllowed: boolean;
    /** 命中外戚共祖、可純化的因子 */
    purifyIds: readonly string[];
    /** 玩家還看不到的因子不列出 */
    isVisible: (gene: GeneralGeneConfig) => boolean;
}

/** 雙親持有的藍因子與當胎上限，星數高的在前 */
export function blueFactorCaps(father: SynergyParent, mother: SynergyParent, options: BlueFactorCapOptions): BlueFactorCap[] {
    const shared = sharedBlueGenesOf(father, mother, options.dictionary).map((gene) => gene.id ?? '');
    const genes = [...(father.genes ?? []), ...(mother.genes ?? [])]
        .filter((gene) => !!gene.id && resolveFactorColor(gene.id, options.dictionary, gene) === 'blue' && options.isVisible(gene));
    const rows = new Map<string, BlueFactorCap>();
    genes.forEach((gene) => {
        const id = gene.id ?? '';
        const star = Math.max(gene.level ?? 1, rows.get(id)?.star ?? 0);
        const source = options.purifyIds.includes(id) ? '血脈純化' : options.synergyAllowed && shared.includes(id) ? '門風連攜 +1' : '基礎顯性';
        const cap = source === '血脈純化' ? KIN_PURIFICATION_CAP_STAR : source === '基礎顯性' ? BLUE_BASE_CAP_STAR : LINEAGE_SYNERGY_CAP_STAR;
        rows.set(id, { name: gene.displayName ?? id, star, cap: Math.max(star, cap), source });
    });
    const list: BlueFactorCap[] = [];
    rows.forEach((row) => list.push(row));
    return list.sort((a, b) => b.star - a.star || b.cap - a.cap);
}

/** 只列前幾項，其餘寫項數；沒有藍因子時回傳空字串 */
export function blueFactorCapLine(rows: readonly BlueFactorCap[]): string {
    if (rows.length === 0) return '';
    const shown = rows.slice(0, BLUE_CAP_LINE_ROWS).map((row) => `${row.name} ${row.star}★/${row.cap}★${row.source === '基礎顯性' ? '' : `（${row.source}）`}`);
    const hidden = rows.length - shown.length;
    return `藍因子 星數/上限：${shown.join('｜')}${hidden > 0 ? `｜另 ${hidden} 項` : ''}`;
}

/** 結緣預覽：這對夫妻可連攜的因子 */
export function lineageSynergyHint(shared: GeneralGeneConfig[]): string | null {
    if (shared.length === 0) return null;
    return `門風連攜：${shared.map((gene) => gene.displayName ?? gene.id).join('、')}`;
}
