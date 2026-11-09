// @spec-source → 季度通行證軍功任務追蹤與雙軌獎勵階梯規格書.md (doc_spec_0627) §2、§4、§5；裁決 11/09 第 12 題；PROG-2-2197
/**
 * SeasonPass — 季度通行證 Mock（純邏輯，不依賴 cc）。
 *
 * 裁決只開 1~30 級的本地 Mock 領取：等級與黃金戰令都由 Mock 動作推進，尚未接軍功任務追蹤、
 * 實際付費與季末補發。規格只定義里程碑（§4），一般等級的獎勵是暫定。
 *
 * Unity 對照：像一個只有資料與 static 工具的賽季模組，存檔與 UI 由外層負責。
 */

import { ITEM_ORACLE_TOKEN, ITEM_PREMIUM_VITALITY_PILL, ITEM_VITALITY_PILL } from './ItemDef';

/** 規格 §2 每級所需軍功 */
export const SEASON_PASS_EXP_PER_LEVEL = 1000;
/** 裁決 11/09 第 12 題：Mock 只開到 30 級（規格滿級 50） */
export const SEASON_PASS_MOCK_MAX_LEVEL = 30;

export type SeasonPassTrack = 'free' | 'premium';

export interface SeasonPassReward {
    /** 進背包的道具；null 表示遊戲還沒有這項內容，Mock 只記錄已領 */
    itemId: string | null;
    count: number;
    label: string;
}

export interface SeasonPassTier {
    level: number;
    free: SeasonPassReward;
    premium: SeasonPassReward;
    isMilestone: boolean;
}

export interface SeasonPassState {
    exp: number;
    premium: boolean;
    claimedFree: number[];
    claimedPremium: number[];
}

const item = (itemId: string, count: number, name: string): SeasonPassReward => ({ itemId, count, label: `${name} ×${count}` });
const recordOnly = (label: string): SeasonPassReward => ({ itemId: null, count: 1, label });

/** 規格 §4 里程碑（10／20／30 級） */
const MILESTONES: Readonly<Record<number, { free: SeasonPassReward; premium: SeasonPassReward }>> = {
    10: { free: recordOnly('精元 ×100'), premium: item(ITEM_ORACLE_TOKEN, 5, '求籤令') },
    20: { free: recordOnly('名將好感禮盒 ×1'), premium: recordOnly('限定主城外觀·銅雀春深') },
    30: { free: item(ITEM_PREMIUM_VITALITY_PILL, 5, '高級補元散'), premium: recordOnly('先祖傳承印記 ×1') },
};

export function createSeasonPassState(): SeasonPassState {
    return { exp: 0, premium: false, claimedFree: [], claimedPremium: [] };
}

function normalizeLevels(raw: unknown): number[] {
    if (!Array.isArray(raw)) return [];
    const valid = raw.filter((v): v is number => Number.isInteger(v) && v >= 1 && v <= SEASON_PASS_MOCK_MAX_LEVEL);
    return Array.from(new Set(valid)).sort((a, b) => a - b);
}

export function normalizeSeasonPassState(raw: unknown): SeasonPassState {
    const value = (raw ?? {}) as Partial<SeasonPassState>;
    const exp = typeof value.exp === 'number' && Number.isFinite(value.exp) ? Math.max(0, Math.floor(value.exp)) : 0;
    return {
        exp: Math.min(exp, SEASON_PASS_MOCK_MAX_LEVEL * SEASON_PASS_EXP_PER_LEVEL),
        premium: value.premium === true,
        claimedFree: normalizeLevels(value.claimedFree),
        claimedPremium: normalizeLevels(value.claimedPremium),
    };
}

/** 全新狀態不用寫進存檔 */
export function isDefaultSeasonPassState(state: SeasonPassState): boolean {
    return state.exp === 0 && !state.premium && state.claimedFree.length === 0 && state.claimedPremium.length === 0;
}

export function seasonPassLevel(state: SeasonPassState): number {
    return Math.min(SEASON_PASS_MOCK_MAX_LEVEL, Math.floor(state.exp / SEASON_PASS_EXP_PER_LEVEL));
}

export function seasonPassTier(level: number): SeasonPassTier {
    const milestone = MILESTONES[level];
    return {
        level,
        free: milestone?.free ?? item(ITEM_VITALITY_PILL, 1, '補元散'),
        premium: milestone?.premium ?? item(ITEM_PREMIUM_VITALITY_PILL, 1, '高級補元散'),
        isMilestone: milestone !== undefined,
    };
}

export type SeasonPassRewardStatus = 'locked' | 'claimable' | 'claimed' | 'needPremium';

export function seasonPassRewardStatus(state: SeasonPassState, level: number, track: SeasonPassTrack): SeasonPassRewardStatus {
    if ((track === 'free' ? state.claimedFree : state.claimedPremium).includes(level)) return 'claimed';
    if (seasonPassLevel(state) < level) return 'locked';
    return track === 'premium' && !state.premium ? 'needPremium' : 'claimable';
}

/** Mock 升級：加一級的軍功，滿級不變 */
export function mockSeasonPassLevelUp(state: SeasonPassState): SeasonPassState {
    if (seasonPassLevel(state) >= SEASON_PASS_MOCK_MAX_LEVEL) return state;
    return { ...state, exp: state.exp + SEASON_PASS_EXP_PER_LEVEL };
}

/** 規格 §5 一鍵領取：已達等級且未領的全部領取；黃金軌要先解鎖 */
export function claimAllSeasonPass(state: SeasonPassState): { state: SeasonPassState; rewards: SeasonPassReward[] } {
    const rewards: SeasonPassReward[] = [];
    const claimedFree = state.claimedFree.slice();
    const claimedPremium = state.claimedPremium.slice();
    for (let level = 1; level <= seasonPassLevel(state); level += 1) {
        const tier = seasonPassTier(level);
        if (seasonPassRewardStatus(state, level, 'free') === 'claimable') {
            rewards.push(tier.free);
            claimedFree.push(level);
        }
        if (seasonPassRewardStatus(state, level, 'premium') === 'claimable') {
            rewards.push(tier.premium);
            claimedPremium.push(level);
        }
    }
    return { state: { ...state, claimedFree, claimedPremium }, rewards };
}
