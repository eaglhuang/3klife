// @spec-source → 新手開場規格書.md §6（宿命池就是六位初始名將；玩家選誰誰當核心）；WBS OPEN-05
/**
 * DestinyPool — 宿命轉蛋的專用六人池與接新局入口，純 TS，不依賴 cc。
 *
 * 為什麼另設池：gacha-config.json 的 hero-pool 是 20 位一般名將池（只含 3 位初始名將），
 * 而且 firstPickOnly 的十連不重複，要至少 10 人；宿命池只有六位，抽數要封頂在池子大小，
 * 否則 rollDestinyGacha 會以 pool-too-small 拒絕。
 *
 * Unity 對照：像一個 ScriptableObject 的「開局角色清單」，轉蛋 UI 只從這份清單抽，
 * 鎖定後把選中的 id 交給 GameSession 開新局。
 */
import type { GachaConfig } from '../models/GachaConfig';
import type { GeneralConfig } from '../models/GeneralUnit';
import { STARTER_GENERAL_IDS, type StarterGeneralId, type StarterRosterOptions } from '../services/StarterRosterService';
import {
    optionsFromGachaConfig, rollDestinyGacha,
    type DestinyGachaOptions, type DestinyGachaResult, type DestinyGachaState,
} from './DestinyGacha';

/** 宿命池：六位初始名將（順序同 STARTER_GENERAL_IDS） */
export const DESTINY_POOL_IDS: readonly StarterGeneralId[] = STARTER_GENERAL_IDS;

/** 從轉蛋設定取規則，十連抽數封頂在宿命池大小（不重複時最多抽完整個池）。 */
export function destinyOptionsFromConfig(config: Readonly<GachaConfig>): DestinyGachaOptions {
    const options = optionsFromGachaConfig(config);
    return { ...options, pickCount: Math.min(options.pickCount, DESTINY_POOL_IDS.length) };
}

/** 對宿命池抽一輪（封頂後的十連）。 */
export function rollDestinyPool(
    state: Readonly<DestinyGachaState>,
    options: Readonly<DestinyGachaOptions>,
    random: () => number,
): DestinyGachaResult {
    return rollDestinyGacha(state, DESTINY_POOL_IDS, options, random);
}

/** 開新局需要的最小介面（GameSession 滿足） */
export interface DestinyNewGameTarget {
    startNewGameWithStarters(seed: number, generals: readonly GeneralConfig[], options?: StarterRosterOptions): Promise<void>;
}

/**
 * 宿命鎖定後開新局：鎖定的那位成為核心主將。尚未鎖定、或鎖定的不在宿命池時拒絕（丟錯，不動存檔）。
 */
export async function startNewGameFromDestiny(
    session: DestinyNewGameTarget,
    seed: number,
    generals: readonly GeneralConfig[],
    state: Readonly<DestinyGachaState>,
): Promise<StarterGeneralId> {
    const locked = state.locked;
    if (state.phase !== 'locked' || locked === null) throw new Error('[DestinyPool] 宿命轉蛋尚未鎖定');
    const coreId = DESTINY_POOL_IDS.find((id) => id === locked);
    if (!coreId) throw new Error(`[DestinyPool] ${locked} 不在宿命池內`);
    await session.startNewGameWithStarters(seed, generals, { coreGeneralId: coreId });
    return coreId;
}
