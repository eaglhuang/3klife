// @spec-source → ACAD_04_洛陽太學_五經注疏與九品官聲規格書.md (doc_spec_0306) §2 五經注疏與九品官聲、§2.3 清議彈劾、§3 專屬產出（PROG-2-2012）
/**
 * LuoyangAcademy — 洛陽太學的五經注疏進度、九品官聲晉升、公卿名望大彩圈、清議彈劾與結業產出（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 五經（易、書、詩、禮、春秋）進度 0～100；滿 100 可請益，得經生筆記。
 * - 品階 9→7→5→3→1；晉升需總進度 ≥ (10-品)×40 且持有引薦信，消耗 1 封。
 * - 訓練乘區 1 + (10-品)×0.15（一品 2.35）。
 * - 三品以上，第 12、24 回合考評借用世家遺物觸發【公卿名望大彩圈】×2.4。
 * - 急功近利選項 25% 觸發士林清議彈劾：官聲降一級，下次拜謁名望花費翻倍。
 * - 結業：九品中正（政治 ≥ 88 且三品以上）、公卿威儀（魅力 ≥ 90 且一品）、冠冕世族（魅＋政 ≥ 170）。
 *
 * 暫定：
 * - §2.2 寫「每晉一品 +10%」與 §4 的 0.15 不一致，依 §4 演算法與測試案例採 0.15。
 * - 降一級＝品階數字 +2（一個序列級距），最低九品。
 * - 每卷只能請益一次；拜謁名望基礎花費未定，集中在 LUOYANG_TUNING。
 * - 未掛到 AcademyTrainingEngine 的 IAcademyGimmickHandler，接線另卡。
 */
import type { IDeterministicRng } from './AcademyTypes';

export enum ClassicsBook {
    YIJING = 'YIJING',
    SHANGSHU = 'SHANGSHU',
    SHIJING = 'SHIJING',
    LIZHI = 'LIZHI',
    CHUNQIU = 'CHUNQIU',
}

export const LUOYANG_LOWEST_RANK = 9;
export const LUOYANG_HIGHEST_RANK = 1;
export const LUOYANG_RANK_STEP = 2;
export const LUOYANG_RELIC_TURNS: readonly number[] = [12, 24];
export const LUOYANG_RELIC_MULTIPLIER = 2.4;
export const LUOYANG_IMPEACH_CHANCE_PERCENT = 25;

/** 規格未給的數值（暫定）。 */
export const LUOYANG_TUNING = {
    visitPrestigeCost: 100,
} as const;

export interface LuoyangGimmickState {
    classicsProgress: Record<ClassicsBook, number>;
    officialRank: number;
    recommendationLetters: number;
    scholarNotes: number;
    petitionedBooks: ClassicsBook[];
    relicsBorrowed: string[];
    /** 下次拜謁花費倍率；彈劾後為 2，拜謁後回 1。 */
    visitCostMultiplier: number;
}

export function createLuoyangState(): LuoyangGimmickState {
    return {
        classicsProgress: { YIJING: 0, SHANGSHU: 0, SHIJING: 0, LIZHI: 0, CHUNQIU: 0 },
        officialRank: LUOYANG_LOWEST_RANK, recommendationLetters: 0, scholarNotes: 0,
        petitionedBooks: [], relicsBorrowed: [], visitCostMultiplier: 1,
    };
}

export function addClassicsProgress(state: LuoyangGimmickState, book: ClassicsBook, amount: number): LuoyangGimmickState {
    const v = Math.max(0, Math.min(100, state.classicsProgress[book] + amount));
    return { ...state, classicsProgress: { ...state.classicsProgress, [book]: v } };
}

/** 滿 100% 的經卷向祭酒請益，得 1 本經生筆記；每卷一次。 */
export function petitionClassics(state: LuoyangGimmickState, book: ClassicsBook): { state: LuoyangGimmickState; success: boolean } {
    if (state.classicsProgress[book] < 100 || state.petitionedBooks.includes(book)) return { state, success: false };
    return { state: { ...state, scholarNotes: state.scholarNotes + 1, petitionedBooks: [...state.petitionedBooks, book] }, success: true };
}

export function luoyangVisitCost(state: LuoyangGimmickState): number {
    return LUOYANG_TUNING.visitPrestigeCost * state.visitCostMultiplier;
}

/** 拜謁公卿：消耗 1 本筆記與名望，得 1 封引薦信。 */
export function visitPatron(state: LuoyangGimmickState, prestige: number): { state: LuoyangGimmickState; success: boolean; prestigeSpent: number } {
    const cost = luoyangVisitCost(state);
    if (state.scholarNotes < 1 || prestige < cost) return { state, success: false, prestigeSpent: 0 };
    return {
        state: { ...state, scholarNotes: state.scholarNotes - 1, recommendationLetters: state.recommendationLetters + 1, visitCostMultiplier: 1 },
        success: true, prestigeSpent: cost,
    };
}

export function totalClassicsProgress(state: LuoyangGimmickState): number {
    return Object.values(state.classicsProgress).reduce((a, b) => a + b, 0);
}

export function canPromoteLuoyang(state: LuoyangGimmickState): boolean {
    return state.officialRank > LUOYANG_HIGHEST_RANK
        && totalClassicsProgress(state) >= (10 - state.officialRank) * 40
        && state.recommendationLetters > 0;
}

export function promoteLuoyang(state: LuoyangGimmickState): { state: LuoyangGimmickState; success: boolean; newRank: number } {
    if (!canPromoteLuoyang(state)) return { state, success: false, newRank: state.officialRank };
    const rank = Math.max(LUOYANG_HIGHEST_RANK, state.officialRank - LUOYANG_RANK_STEP);
    return { state: { ...state, officialRank: rank, recommendationLetters: state.recommendationLetters - 1 }, success: true, newRank: rank };
}

export function luoyangTrainingMultiplier(rank: number): number {
    const r = Math.max(LUOYANG_HIGHEST_RANK, Math.min(LUOYANG_LOWEST_RANK, rank));
    return Math.round((1 + (10 - r) * 0.15) * 100) / 100;
}

/** 考評回合且三品以上，借用遺物觸發公卿名望大彩圈；回傳 null 表示不觸發。 */
export function borrowLuoyangRelic(state: LuoyangGimmickState, turn: number, relicId: string): { state: LuoyangGimmickState; multiplier: number } | null {
    if (!LUOYANG_RELIC_TURNS.includes(turn) || state.officialRank > 3) return null;
    return { state: { ...state, relicsBorrowed: [...state.relicsBorrowed, relicId] }, multiplier: LUOYANG_RELIC_MULTIPLIER };
}

/** 急功近利選項後的清議檢定。 */
export function rollLuoyangImpeachment(state: LuoyangGimmickState, rng: IDeterministicRng, salt: string): { state: LuoyangGimmickState; impeached: boolean } {
    if (!rng.chance(LUOYANG_IMPEACH_CHANCE_PERCENT, 100, `luoyang.impeach.${salt}`)) return { state, impeached: false };
    return {
        state: { ...state, officialRank: Math.min(LUOYANG_LOWEST_RANK, state.officialRank + LUOYANG_RANK_STEP), visitCostMultiplier: 2 },
        impeached: true,
    };
}

export function luoyangGraduationRewards(cha: number, pol: number, state: LuoyangGimmickState): string[] {
    const out: string[] = [];
    if (pol >= 88 && state.officialRank <= 3) out.push('TAC_JIUPIN_ZHONGZHENG');
    if (cha >= 90 && state.officialRank === LUOYANG_HIGHEST_RANK) out.push('TAC_GONGQING_WEIYI');
    if (cha + pol >= 170) out.push('TRT_GUANMIAN_SHIZU');
    return out;
}
