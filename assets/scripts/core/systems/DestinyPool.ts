// @spec-source → 使用者裁定 2026-11-12（doc_spec_0471 文首：宿命轉蛋是轉蛋系統的一池，每輪恰一位宿命名將，十連全收）；轉蛋系統.md §L；PROG-2-2243
/**
 * DestinyPool — 轉蛋系統「宿命池」（gacha-config.json 的 destiny-pool）的抽法與接新局入口，純 TS，不依賴 cc。
 *
 * 一輪十連：必出名單（六大宿命名將）恰好抽 guaranteedCount 位，其餘格子由一般武將補滿；
 * 不滿意就免費重轉。按確定後，這一輪十位全部入名冊，本輪的宿命名將就是核心主將，不用點選。
 * 必出名單、人數、一般武將的稀有度與排除性別都寫在池設定，這裡只有預設值。
 *
 * Unity 對照：像一個 ScriptableObject 的卡池設定，抽法讀設定，不在程式裡寫死名單。
 */
import type { GachaConfig } from '../models/GachaConfig';
import type { GeneralConfig } from '../models/GeneralUnit';
import { STARTER_GENERAL_IDS, type StarterGeneralId, type StarterRosterOptions } from '../services/StarterRosterService';
import {
    optionsFromGachaConfig, rollDestinyGacha,
    type DestinyGachaOptions, type DestinyGachaResult, type DestinyGachaState,
} from './DestinyGacha';

/** 轉蛋設定裡宿命池的 id */
export const DESTINY_POOL_ID = 'destiny-pool';
/** 宿命名將：六位初始名將（順序同 STARTER_GENERAL_IDS）；池設定沒填 guaranteedIds 時的預設 */
export const DESTINY_POOL_IDS: readonly StarterGeneralId[] = STARTER_GENERAL_IDS;

const DEFAULT_GUARANTEED_COUNT = 1;
const DEFAULT_FILLER_TIERS: readonly string[] = ['common', 'rare'];
const DEFAULT_EXCLUDED_GENDER = '女';

export function isDestinyStar(id: string): boolean {
    return DESTINY_POOL_IDS.some((star) => star === id);
}

/** 宿命池的抽法設定（從池設定讀，缺的用預設） */
export interface DestinyPoolRules extends DestinyGachaOptions {
    guaranteedIds: readonly string[];
    guaranteedCount: number;
    fillerRarityTiers: readonly string[];
    fillerExcludeGender: string;
}

/** 從轉蛋設定取規則 */
export function destinyOptionsFromConfig(config: Readonly<GachaConfig>): DestinyPoolRules {
    return {
        ...optionsFromGachaConfig(config),
        guaranteedIds: config.guaranteedIds?.length ? config.guaranteedIds : DESTINY_POOL_IDS,
        guaranteedCount: config.guaranteedCount ?? DEFAULT_GUARANTEED_COUNT,
        fillerRarityTiers: config.fillerRarityTiers?.length ? config.fillerRarityTiers : DEFAULT_FILLER_TIERS,
        fillerExcludeGender: config.fillerExcludeGender ?? DEFAULT_EXCLUDED_GENDER,
    };
}

/** 搭配用的一般武將：符合稀有度、排除指定性別與必出名單 */
export function destinyFillerIds(generals: readonly GeneralConfig[], rules?: Readonly<DestinyPoolRules>): string[] {
    const tiers = rules?.fillerRarityTiers ?? DEFAULT_FILLER_TIERS;
    const gender = rules?.fillerExcludeGender ?? DEFAULT_EXCLUDED_GENDER;
    const stars = rules?.guaranteedIds ?? DESTINY_POOL_IDS;
    return generals
        .filter((g) => tiers.includes(String(g.rarityTier)) && g.gender !== gender && !stars.includes(g.id))
        .map((g) => g.id);
}

function drawWithoutReplacement(pool: readonly string[], count: number, random: () => number): string[] {
    const remaining = [...pool];
    const picked: string[] = [];
    while (picked.length < count && remaining.length > 0) {
        const index = Math.min(remaining.length - 1, Math.floor(random() * remaining.length));
        picked.push(...remaining.splice(index, 1));
    }
    return picked;
}

/** 抽一輪：必出名單恰好 guaranteedCount 位，其餘補一般武將，再打散順序。同一輪不重複。 */
export function rollDestinyPool(
    state: Readonly<DestinyGachaState>,
    rules: Readonly<DestinyPoolRules>,
    generals: readonly GeneralConfig[],
    random: () => number,
): DestinyGachaResult {
    const starCount = Math.min(rules.guaranteedIds.length, rules.pickCount, rules.guaranteedCount);
    const fillers = destinyFillerIds(generals, rules);
    if (fillers.length < rules.pickCount - starCount) return { ok: false, state: { ...state }, reason: 'pool-too-small' };
    const picks = [
        ...drawWithoutReplacement(rules.guaranteedIds, starCount, random),
        ...drawWithoutReplacement(fillers, rules.pickCount - starCount, random),
    ];
    return rollDestinyGacha(state, picks, { ...rules, firstPickOnly: true }, random);
}

/** 本輪的核心主將：抽到的第一位宿命名將 */
export function destinyCoreOf(state: Readonly<DestinyGachaState>): StarterGeneralId | null {
    const id = state.rolled.find(isDestinyStar);
    return (id as StarterGeneralId | undefined) ?? null;
}

/** 開新局需要的最小介面（GameSession 滿足） */
export interface DestinyNewGameTarget {
    startNewGameWithStarters(seed: number, generals: readonly GeneralConfig[], options?: StarterRosterOptions): Promise<void>;
}

/**
 * 宿命鎖定後開新局：這一輪抽到的武將全部入名冊，鎖定的那位成為核心主將；有開局紅顏時一併入名冊。尚未鎖定、或鎖定的不在宿命池時拒絕（丟錯，不動存檔）。
 */
export async function startNewGameFromDestiny(
    session: DestinyNewGameTarget,
    seed: number,
    generals: readonly GeneralConfig[],
    state: Readonly<DestinyGachaState>,
    beautyGeneralId?: string | null,
): Promise<StarterGeneralId> {
    const locked = state.locked;
    if (state.phase !== 'locked' || locked === null) throw new Error('[DestinyPool] 宿命轉蛋尚未鎖定');
    const coreId = DESTINY_POOL_IDS.find((id) => id === locked);
    if (!coreId) throw new Error(`[DestinyPool] ${locked} 不在宿命池內`);
    const rosterIds = state.rolled.length > 0 ? { rosterIds: state.rolled } : {};
    await session.startNewGameWithStarters(seed, generals, beautyGeneralId ? { coreGeneralId: coreId, beautyGeneralId, ...rosterIds } : { coreGeneralId: coreId, ...rosterIds });
    return coreId;
}
