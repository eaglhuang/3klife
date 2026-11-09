// @spec-source → 使用者裁定 2026-11-09（宿命轉蛋是真正的轉蛋：六位名將摻一般武將，無限重抽）；新手開場規格書.md §4 分鏡 5、§6；WBS OPEN-05
/**
 * DestinyPool — 宿命轉蛋的新手武將池與接新局入口，純 TS，不依賴 cc。
 *
 * 一輪十連：六位宿命名將是這個池的高級武將，其餘格子由一般武將補滿；
 * 每輪至少一位名將，所以永遠選得出核心。不滿意就免費重抽。
 * 確認後，這一輪抽到的武將全部入名冊，玩家從抽到的名將裡選一位當核心。
 *
 * Unity 對照：像一個 ScriptableObject 的「開局卡池」，一般武將直接由武將資料的稀有度篩出來，
 * 不必另外維護名單；鎖定後把整包 id 交給 GameSession 開新局。
 */
import type { GachaConfig } from '../models/GachaConfig';
import type { GeneralConfig } from '../models/GeneralUnit';
import { STARTER_GENERAL_IDS, type StarterGeneralId, type StarterRosterOptions } from '../services/StarterRosterService';
import {
    optionsFromGachaConfig, rollDestinyGacha,
    type DestinyGachaOptions, type DestinyGachaResult, type DestinyGachaState,
} from './DestinyGacha';

/** 宿命名將：六位初始名將（順序同 STARTER_GENERAL_IDS） */
export const DESTINY_POOL_IDS: readonly StarterGeneralId[] = STARTER_GENERAL_IDS;

/** 每格抽中宿命名將的機率（暫定，待使用者定案） */
export const DESTINY_STAR_RATE = 0.1;
/** 每輪保底的宿命名將人數 */
export const DESTINY_MIN_STARS = 1;
/** 可當一般武將的稀有度 */
const DESTINY_FILLER_TIERS: readonly string[] = ['common', 'rare'];
/** 女性武將屬於紅顏池，不放進這裡 */
const DESTINY_EXCLUDED_GENDER = '女';

export function isDestinyStar(id: string): boolean {
    return DESTINY_POOL_IDS.some((star) => star === id);
}

/** 搭配用的一般武將：稀有度低的男性武將，排除六位名將 */
export function destinyFillerIds(generals: readonly GeneralConfig[]): string[] {
    return generals
        .filter((g) => DESTINY_FILLER_TIERS.includes(String(g.rarityTier)) && g.gender !== DESTINY_EXCLUDED_GENDER && !isDestinyStar(g.id))
        .map((g) => g.id);
}

/** 從轉蛋設定取規則 */
export function destinyOptionsFromConfig(config: Readonly<GachaConfig>): DestinyGachaOptions {
    return optionsFromGachaConfig(config);
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

/** 抽一輪：先決定名將人數（至少保底），其餘補一般武將，再打散順序。同一輪不重複。 */
export function rollDestinyPool(
    state: Readonly<DestinyGachaState>,
    options: Readonly<DestinyGachaOptions>,
    generals: readonly GeneralConfig[],
    random: () => number,
): DestinyGachaResult {
    let starCount = 0;
    for (let i = 0; i < options.pickCount; i++) {
        if (random() < DESTINY_STAR_RATE) starCount++;
    }
    starCount = Math.min(DESTINY_POOL_IDS.length, options.pickCount, Math.max(DESTINY_MIN_STARS, starCount));
    const picks = [
        ...drawWithoutReplacement(DESTINY_POOL_IDS, starCount, random),
        ...drawWithoutReplacement(destinyFillerIds(generals), options.pickCount - starCount, random),
    ];
    return rollDestinyGacha(state, picks, { ...options, firstPickOnly: true }, random);
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
