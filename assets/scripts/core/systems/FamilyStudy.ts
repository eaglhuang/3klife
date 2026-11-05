// @spec-source → 血統傳承G2二代傳承_功業回流與三代譜牒規格書.md §E #4、§F-3、§G、§H UI_G2_STUDY_BTN；PROG-2-1793
/**
 * FamilyStudy — 家學研習：每名子嗣限 1 次、消耗 2 回合，確定把藍因子補 1 星，最高 3★（純邏輯，不依賴 cc）
 *
 * 規格的「家族文書工時」目前沒有這項資源，只扣回合。
 *
 * Unity 對照：像一次性強化道具的資格判斷與文案表，實際寫入由 Service 做。
 */
import type { GeneralGeneConfig } from '../models/GeneralUnit';
import { resolveFactorColor, type FactorDictionary } from './FactorInheritance';

export const FAMILY_STUDY_ROUND_COST = 2;
export const FAMILY_STUDY_MAX_STAR = 3;

export type FamilyStudyBlock = 'inactive' | 'used' | 'injured' | 'rounds' | 'no-candidate';

export const FAMILY_STUDY_BLOCK_TEXT: Readonly<Record<FamilyStudyBlock, string>> = Object.freeze({
    inactive: '培育已結束',
    used: '此子已研習過',
    injured: '負傷中',
    rounds: '回合不足',
    'no-candidate': '無可補救的因子',
});

export interface FamilyStudyCandidate {
    geneId: string;
    displayName: string;
    starBefore: number;
    starAfter: number;
}

export function familyStudyCandidates(genes: readonly GeneralGeneConfig[] | undefined, dictionary?: FactorDictionary): FamilyStudyCandidate[] {
    return (genes ?? []).flatMap((gene) => {
        const star = gene.level ?? 0;
        if (gene.isLocked || !gene.id || star < 1 || star >= FAMILY_STUDY_MAX_STAR) return [];
        if (resolveFactorColor(gene.id, dictionary, gene) !== 'blue') return [];
        return [{ geneId: gene.id, displayName: gene.displayName ?? gene.id, starBefore: star, starAfter: star + 1 }];
    });
}

export function familyStudyBlock(
    session: { status: string; round: number; skipRounds?: number },
    totalRounds: number,
    used: boolean,
    candidateCount: number,
): FamilyStudyBlock | null {
    if (session.status !== 'active') return 'inactive';
    if (used) return 'used';
    if ((session.skipRounds ?? 0) > 0) return 'injured';
    if (session.round + FAMILY_STUDY_ROUND_COST > totalRounds) return 'rounds';
    if (candidateCount === 0) return 'no-candidate';
    return null;
}

const STAR_WORD = ['零', '一', '二', '三'];

/** §H UI_G2_STUDY_BTN（「文書」目前不扣，先不提） */
export function familyStudyHint(candidate: FamilyStudyCandidate): string {
    return `家學研習（消耗 ${FAMILY_STUDY_ROUND_COST} 季課業，確定將 ${candidate.displayName} 由 ${candidate.starBefore}★ 補救至 ${candidate.starAfter}★，上限 ${FAMILY_STUDY_MAX_STAR}★）`;
}

/** §G 家學研習補救 */
export function familyStudyLine(candidate: FamilyStudyCandidate): string {
    return `雖先天【${candidate.displayName}】僅得${STAR_WORD[candidate.starBefore]}星之資，然經苦讀先祖兵書研習，終補全根基，晉升${STAR_WORD[candidate.starAfter]}星！`;
}
