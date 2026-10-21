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
import type { TigerTallyCard, TigerTallyQuality } from '../models/TigerTallyCard';

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

/** 卡片實例上的星級欄位（PM 裁定：星級存在每張卡實例上，隨卡組存檔） */
export interface TallyCardStarFields {
    quality: TigerTallyQuality;
    stars?: number;
    battleExp?: number;
}

/**
 * 讀出卡片的星級狀態；缺欄位預設 1★ / 0 經驗。
 * 星級先夾到 1~5，再依品質封頂夾（R 最高 3★，QA 複查意見 2026-10-14）。
 */
export function readCardStarState(card: TallyCardStarFields): TallyStarState {
    const cap = Math.min(5, QUALITY_STAR_CAP[card.quality]);
    const star = Number.isInteger(card.stars) ? Math.min(cap, Math.max(1, card.stars as number)) : 1;
    const exp = typeof card.battleExp === 'number' && Number.isFinite(card.battleExp) && card.battleExp >= 0 ? card.battleExp : 0;
    return { quality: card.quality, star, exp };
}

/** 套用一場戰鬥的經驗到卡片實例，回傳要寫回的兩個欄位 */
export function applyBattleExpToCard(card: TallyCardStarFields, outcome: TallyBattleOutcome): { stars: number; battleExp: number } {
    const next = applyBattleExp(readCardStarState(card), outcome);
    return { stars: next.star, battleExp: next.exp };
}

/** 戰場結果字串轉成虎符戰鬥經驗的結果；尚未結束（ongoing）回 null，不結算 */
export function tallyBattleOutcome(result: string): TallyBattleOutcome | null {
    if (result === 'player-win') return 'win';
    if (result === 'enemy-win') return 'lose';
    if (result === 'draw') return 'draw';
    return null;
}

/** 戰場讀取虎符時需要的資訊（星級、模板、來源武將模板） */
export interface TallyBattleInfo {
    star: number;
    templateId: string;
    /** 來源武將的模板 id，供史實合攻查關係；虎符即來源模板（TigerTally.produceDeathTally），不查名冊 */
    sourceTemplateId: string;
}

/**
 * 出陣時戰場讀取虎符的資訊。來源武將戰死後已不在名冊，因此來源模板直接取虎符的 templateId，
 * 不能依賴 sourceGeneralUid 回頭查名冊（PM QA 2026-10-21）。
 */
export function tallyBattleInfoOf(card: TigerTallyCard): TallyBattleInfo {
    return { star: readCardStarState(card).star, templateId: card.templateId, sourceTemplateId: card.templateId };
}
