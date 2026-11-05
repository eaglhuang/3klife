// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §F-3 途徑④、§G；PROG-2-1815
/**
 * Atavism — 隔代復興：祖輩曾達 3★ 而父母輩斷代或不足 1★ 的因子，孫輩可花 3 回合重現並保底 2★（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 祖輩只算四位祖父母；曾祖不算。
 * - 種子在出生時定值：冷存檔的祖先沒有星數，要靠父母身上的 peakFactors 往上接。
 * - 規格的「16 歲加冠前夕」對應培育衝刺期（第 25 回合起）。
 * - 規格的「藏書閣孤本」目前沒有這項道具，只扣回合。
 * - 同一因子家學研習也能補時只走家學研習，它比較便宜。
 *
 * Unity 對照：像把祖代資料烘進子代的 ScriptableObject，之後不必回頭查祖先。
 */
import type { AncestralPeak, GeneralGeneConfig } from '../models/GeneralUnit';
import { DEFAULT_MAX_INHERITED_FACTORS } from './FactorInheritance';
import { FAMILY_STUDY_ROUND_COST, familyStudyHint, familyStudyLine, type FamilyStudyCandidate } from './FamilyStudy';
import { MATERNAL_ROUND_COST, maternalHint, maternalLineText } from './MaternalStudy';

export const ATAVISM_ROUND_COST = 3;
export const ATAVISM_FLOOR_STAR = 2;
export const ATAVISM_MIN_PEAK_STAR = 3;
export const ATAVISM_PARENT_MAX_STAR = 1;
/** 走完第 24 回合才進衝刺期 */
export const ATAVISM_OPEN_ROUND = 24;

type Genes = readonly GeneralGeneConfig[] | undefined;

const starOf = (genes: Genes, geneId: string): number => (genes ?? []).find((gene) => gene.id === geneId)?.level ?? 0;

export function peakFactorsOf(genes: Genes, ancestorName: string): AncestralPeak[] {
    return (genes ?? [])
        .filter((gene) => !!gene.id && (gene.level ?? 0) >= ATAVISM_MIN_PEAK_STAR)
        .map((gene) => ({ gene, ancestorName }));
}

/** 同一因子留星數最高的那位祖先；父母任一方已有 2★ 以上就不算斷代 */
export function atavismSeedsOf(grandPeaks: readonly AncestralPeak[], fatherGenes: Genes, motherGenes: Genes): AncestralPeak[] {
    const seeds: AncestralPeak[] = [];
    for (const peak of grandPeaks) {
        const geneId = peak.gene.id ?? '';
        if (Math.max(starOf(fatherGenes, geneId), starOf(motherGenes, geneId)) > ATAVISM_PARENT_MAX_STAR) continue;
        const index = seeds.findIndex((seed) => seed.gene.id === geneId);
        if (index < 0) seeds.push(peak);
        else if ((peak.gene.level ?? 0) > (seeds[index].gene.level ?? 0)) seeds[index] = peak;
    }
    return seeds;
}

export function atavismCandidates(round: number, totalRounds: number, genes: Genes, seeds: readonly AncestralPeak[] | undefined): FamilyStudyCandidate[] {
    if (round < ATAVISM_OPEN_ROUND || round + ATAVISM_ROUND_COST > totalRounds) return [];
    return (seeds ?? []).flatMap((seed) => {
        const geneId = seed.gene.id ?? '';
        const star = starOf(genes, geneId);
        if (star >= ATAVISM_FLOOR_STAR) return [];
        const owned = (genes ?? []).some((gene) => gene.id === geneId);
        if (!owned && (genes ?? []).length >= DEFAULT_MAX_INHERITED_FACTORS) return [];
        return [{ geneId, displayName: seed.gene.displayName ?? geneId, starBefore: star, starAfter: ATAVISM_FLOOR_STAR, ancestorName: seed.ancestorName }];
    });
}

/** 家學研習在前；同一因子兩邊都能補時只留家學研習 */
export function mergeStudyCandidates(study: readonly FamilyStudyCandidate[], atavism: readonly FamilyStudyCandidate[]): FamilyStudyCandidate[] {
    return [...study, ...atavism.filter((candidate) => !study.some((c) => c.geneId === candidate.geneId))];
}

export function studyRoundCost(candidate: FamilyStudyCandidate): number {
    if (candidate.maternalFrom) return MATERNAL_ROUND_COST;
    return candidate.ancestorName ? ATAVISM_ROUND_COST : FAMILY_STUDY_ROUND_COST;
}

/** 把補救結果寫進因子：已有就改星數，斷代的補回一項；祖先的覺醒狀態不會跟著過來 */
export function applyStudyCandidate(genes: Genes, candidate: FamilyStudyCandidate, seeds: readonly AncestralPeak[] | undefined): GeneralGeneConfig[] {
    const current = genes ?? [];
    if (current.some((gene) => gene.id === candidate.geneId)) {
        return current.map((gene) => (gene.id === candidate.geneId ? { ...gene, level: candidate.starAfter } : gene));
    }
    const seed = (seeds ?? []).find((s) => s.gene.id === candidate.geneId);
    return seed ? [...current, { ...seed.gene, level: candidate.starAfter, isLocked: true }] : [...current];
}

export function studyLabelOf(candidate: FamilyStudyCandidate): string {
    const prefix = candidate.maternalFrom ? '母門擇承' : candidate.ancestorName ? '隔代復興' : '家學研習';
    return `${prefix}：${candidate.displayName} ${candidate.starBefore}→${candidate.starAfter}★`;
}

export function studyHintOf(candidate: FamilyStudyCandidate): string {
    if (candidate.maternalFrom) return maternalHint(candidate);
    if (!candidate.ancestorName) return familyStudyHint(candidate);
    return `隔代復興（消耗 ${ATAVISM_ROUND_COST} 季課業，與家學研習共用名額，重現 ${candidate.ancestorName} 的 ${candidate.displayName}，保底 ${ATAVISM_FLOOR_STAR}★）`;
}

/** §G 隔代復興（乃祖之風）；規格的「老太公（祖父）」換成實際祖先的名字 */
export function studyLineOf(candidate: FamilyStudyCandidate): string {
    if (candidate.maternalFrom) return maternalLineText(candidate);
    if (!candidate.ancestorName) return familyStudyLine(candidate);
    return `奇哉！此子父母雖未顯山露水，然其演武之姿，竟與昔年${candidate.ancestorName}如出一轍！真乃【隔代復興，有乃祖之風】！`;
}
