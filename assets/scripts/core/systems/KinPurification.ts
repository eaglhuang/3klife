/**
 * KinPurification — 外戚血脈純化（血統傳承 G3 §E #2，PROG-2-1819）
 *
 * 28 祖位內有共祖、又不是同血脈的配對，子嗣帶到共祖的藍因子時可推到 5★。
 * 規格的 m-only 要有上限 m 才成立，現有星數不受 m 限制，所以和門風連攜一樣做成機率 ★+1，
 * 機率沿用近親純化的暫定 30%。每胎只判 1 項；同血脈走原本的近親純化，不走這裡。
 */
import type { GeneralConfig, GeneralGeneConfig } from '../models/GeneralUnit';
import { resolveFactorColor, type FactorDictionary, type InheritedFactor } from './FactorInheritance';

export const KIN_PURIFICATION_CAP_STAR = 5;
export const KIN_PURIFICATION_CHANCE = 0.3;

/** 雙親共同祖先身上可純化的一項因子 */
export interface KinPurificationTarget {
    gene: GeneralGeneConfig;
    ancestorName: string;
}

export interface KinPurificationOutcome {
    factorId: string;
    factorName: string;
    ancestorName: string;
    star: number;
}

/** 共祖依近到遠排，同一項因子算最近的那位 */
export function kinPurificationTargetsOf(ancestorIds: string[], lookup: (uid: string) => GeneralConfig | undefined, dictionary?: FactorDictionary): KinPurificationTarget[] {
    const targets: KinPurificationTarget[] = [];
    for (const uid of ancestorIds) {
        const ancestor = lookup(uid);
        for (const gene of ancestor?.genes ?? []) {
            if (!gene.id || resolveFactorColor(gene.id, dictionary, gene) !== 'blue') continue;
            if (!targets.some((target) => target.gene.id === gene.id)) targets.push({ gene, ancestorName: ancestor?.name ?? uid });
        }
    }
    return targets;
}

/** 沒有可判的因子時不消耗亂數，也回傳原陣列 */
export function applyKinPurification(factors: InheritedFactor[], targets: KinPurificationTarget[], options: { random: () => number; dictionary?: FactorDictionary; priorityId?: string }): { factors: InheritedFactor[]; outcome: KinPurificationOutcome | null } {
    const eligible = factors.filter((factor) => targets.some((target) => target.gene.id === factor.id)
        && factor.level < Math.min(KIN_PURIFICATION_CAP_STAR, options.dictionary?.get(factor.id)?.maxLevel ?? KIN_PURIFICATION_CAP_STAR));
    const picked = eligible.find((factor) => factor.id === options.priorityId)
        ?? eligible.reduce<InheritedFactor | undefined>((best, factor) => (!best || factor.level > best.level ? factor : best), undefined);
    if (!picked || options.random() >= KIN_PURIFICATION_CHANCE) return { factors, outcome: null };
    const target = targets.find((item) => item.gene.id === picked.id)!;
    return {
        factors: factors.map((factor) => (factor === picked ? { ...factor, level: factor.level + 1 } : factor)),
        outcome: { factorId: picked.id, factorName: target.gene.displayName ?? picked.id, ancestorName: target.ancestorName, star: picked.level + 1 },
    };
}

/** UI_G3_PURIFY_DESC，把「僅拔高天花板」的註換成這胎實際的星數：現在是直接升星 */
export function kinPurificationLine(outcome: KinPurificationOutcome): string {
    return `【血脈純化】命中外戚共祖 ${outcome.ancestorName}：${outcome.factorName} 當胎發揮上限提升至 ${KIN_PURIFICATION_CAP_STAR}★，此胎得 ${outcome.star}★！`;
}

/** 結緣預覽 */
export function kinPurificationHint(targets: KinPurificationTarget[]): string | null {
    if (targets.length === 0) return null;
    const first = targets[0];
    const names = targets.map((target) => target.gene.displayName ?? target.gene.id).join('、');
    return `血脈純化：外戚共祖 ${first.ancestorName}（${names}）`;
}
