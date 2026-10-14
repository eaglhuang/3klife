// @spec-source → 兵種（虎符）系統.md §虎符星級養成系統（1~3★ 戰鬥經驗）；TRP-10（PROG-2-0568）
/**
 * TigerTallyStar — 虎符 1~3★ 戰鬥經驗升星（純邏輯，不依賴 cc）
 *
 * 虎符初始 1★，上場戰鬥累積經驗，達門檻自動升星（2★ 100、3★ 350）。
 * 戰鬥經驗只負責 1~3★；4★ 以上需要突破材料，另案處理。
 * 星級倍率：攻防 = 1 + 星 × 0.08。
 *
 * Unity 對照：像 Equipment 的 Auto-Upgrade，累積經驗到門檻就自動升一級，不需要玩家按按鈕。
 */
import type { TigerTallyQuality } from '../models/TigerTallyCard';

export const TALLY_STAR_EXP: Readonly<Record<number, number>> = { 2: 100, 3: 350 };

/** 戰鬥經驗：勝利 +15、敗北 +8、平手 +10（15 × 勝率修正，四捨五入） */
export const TALLY_BATTLE_EXP_BASE = 15;
export type TallyBattleOutcome = 'win' | 'lose' | 'draw';
const TALLY_EXP_MOD: Readonly<Record<TallyBattleOutcome, number>> = { win: 1.0, lose: 0.53, draw: 0.67 };

/** 品質封頂星級（R 3★、SR 4★、SSR 5★、UR 5★） */
export const QUALITY_STAR_CAP: Readonly<Record<TigerTallyQuality, number>> = { R: 3, SR: 4, SSR: 5, UR: 5 };

/** 戰鬥經驗只能升到 3★，即使品質封頂更高 */
export const BATTLE_GROWTH_STAR_LIMIT = 3;

export interface TallyStarState {
    quality: TigerTallyQuality;
    star: number;
    exp: number;
}

export function starStatMultiplier(star: number): number {
    return 1 + star * 0.08;
}

export function battleExpGain(outcome: TallyBattleOutcome): number {
    return Math.round(TALLY_BATTLE_EXP_BASE * TALLY_EXP_MOD[outcome]);
}

/** 套用一場戰鬥的經驗：經驗累加後，依門檻自動升星，直到封頂（不超過 3★ 與品質上限） */
export function applyBattleExp(state: TallyStarState, outcome: TallyBattleOutcome): TallyStarState {
    const exp = state.exp + battleExpGain(outcome);
    const cap = Math.min(BATTLE_GROWTH_STAR_LIMIT, QUALITY_STAR_CAP[state.quality]);
    let star = state.star;
    while (star < cap && TALLY_STAR_EXP[star + 1] !== undefined && exp >= TALLY_STAR_EXP[star + 1]) {
        star += 1;
    }
    return { ...state, star, exp };
}
