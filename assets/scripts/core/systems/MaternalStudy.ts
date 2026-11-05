// @spec-source → 血統傳承G3三代深淵_外戚純化與世交合譜規格書.md §F-3 途徑③；PROG-2-1817
/**
 * MaternalStudy — 母門擇承：第一位教官是母親或舅氏時，開蒙首 3 回合承襲母系 1 項因子（純邏輯，不依賴 cc）
 *
 * 暫定（可逆）：
 * - 規格的「主太傅」對應牌組第一位教官；舅氏指與母親同父或同母的教官。
 * - 規格的「修業池」沒有對應系統，這裡直接以 1★、未覺醒寫進子嗣因子。
 * - 「代表性因子」指母親與母系上溯兩代曾達 3★ 以上的因子，子嗣已有的不列；欄位滿 5 項時不能補。
 * - 每胎限 1 次，與家學研習、隔代復興的名額分開。
 *
 * Unity 對照：像開局一次的選修事件，只在第一回合開放，資料在出生時就烘好。
 */
import type { GeneralGeneConfig, MaternalLine } from '../models/GeneralUnit';
import { DEFAULT_MAX_INHERITED_FACTORS } from './FactorInheritance';
import type { FamilyStudyCandidate } from './FamilyStudy';

export const MATERNAL_ROUND_COST = 3;
export const MATERNAL_STAR = 1;

export interface MentorLineage {
    generalId: string;
    parentUids: readonly string[];
}

/** 母親本人，或與母親同父或同母的人 */
export function isMaternalTutor(lineage: MentorLineage | undefined, line: MaternalLine | undefined): boolean {
    if (!lineage || !line) return false;
    if (lineage.generalId === line.motherId) return true;
    return lineage.parentUids.some((uid) => !!uid && line.motherParentIds.indexOf(uid) >= 0);
}

export function maternalCandidates(
    round: number,
    used: boolean,
    genes: readonly GeneralGeneConfig[] | undefined,
    line: MaternalLine | undefined,
    mainTutor: MentorLineage | undefined,
): FamilyStudyCandidate[] {
    if (round !== 0 || used || !line || !isMaternalTutor(mainTutor, line)) return [];
    const current = genes ?? [];
    if (current.length >= DEFAULT_MAX_INHERITED_FACTORS) return [];
    return line.factors.flatMap((factor) => {
        const geneId = factor.gene.id ?? '';
        if (current.some((gene) => gene.id === geneId)) return [];
        return [{ geneId, displayName: factor.gene.displayName ?? geneId, starBefore: 0, starAfter: MATERNAL_STAR, maternalFrom: factor.ancestorName }];
    });
}

export function maternalHint(candidate: FamilyStudyCandidate): string {
    return `母門擇承（消耗開蒙首 ${MATERNAL_ROUND_COST} 季課業，向外家請益，承襲 ${candidate.maternalFrom} 的 ${candidate.displayName}，${MATERNAL_STAR}★）`;
}

/** 規格 §G 沒有這句，暫定 */
export function maternalLineText(candidate: FamilyStudyCandidate): string {
    return `外家學問淵源有自，此子開蒙便得${candidate.maternalFrom}一脈真傳，【${candidate.displayName}】自此入門！`;
}
