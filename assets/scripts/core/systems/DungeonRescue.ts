// @spec-source → 養成系統與教官來源定義：地下城救美（8 小時刷新）；FEM-07（PROG-2-0561）
/**
 * DungeonRescue — 地下城救美任務結果（純邏輯，不依賴 cc）
 *
 * 機率（PM 指示）：民女 60%、千金 30%、貴族 10%。
 * 刷新間隔與傭兵池相同（8 小時）；本檔獨立定義，避免依賴尚未合併的 FemalePoolRefresh。
 *
 * Unity 對照：像一張加權掉落表（Loot Table），用一個隨機數落在哪個區間決定結果。
 */

import type { GeneralConfig } from '../models/GeneralUnit';
import { BREEDING_MIN_AGE, epRatingLabel } from './BreedingSystem';

/** 救美任務的刷新間隔（小時），與傭兵池女武將相同 */
export const RESCUE_REFRESH_HOURS = 8;
const MS_PER_HOUR = 60 * 60 * 1000;

export type RescueOutcome = 'commoner' | 'noble-lady' | 'noble';

/** 結果機率的累積上限：[0, 0.6) 民女、[0.6, 0.9) 千金、[0.9, 1) 貴族 */
export const RESCUE_OUTCOME_WEIGHTS: ReadonlyArray<{ outcome: RescueOutcome; weight: number }> = Object.freeze([
    { outcome: 'commoner', weight: 0.6 },
    { outcome: 'noble-lady', weight: 0.3 },
    { outcome: 'noble', weight: 0.1 },
]);

/** 依隨機數（0~1）決定救美結果 */
export function rollDungeonRescue(random: () => number): RescueOutcome {
    const roll = random();
    let cumulative = 0;
    for (const entry of RESCUE_OUTCOME_WEIGHTS) {
        cumulative += entry.weight;
        if (roll < cumulative) return entry.outcome;
    }
    return RESCUE_OUTCOME_WEIGHTS[RESCUE_OUTCOME_WEIGHTS.length - 1].outcome;
}

/** 救美任務是否可刷新（8 小時） */
export function isRescueRefreshDue(lastRefreshMs: number, nowMs: number): boolean {
    // 現在時間比上次還早（裝置時鐘被調回、存檔帶著未來時間戳）視為到期，避免池子被鎖到時鐘追上為止
    if (nowMs < lastRefreshMs) return true;
    return nowMs - lastRefreshMs >= RESCUE_REFRESH_HOURS * MS_PER_HOUR;
}

/** 還要等多久才能再尋訪（毫秒）；已到期回傳 0 */
export function rescueRefreshRemainingMs(lastRefreshMs: number, nowMs: number): number {
    if (isRescueRefreshDue(lastRefreshMs, nowMs)) return 0;
    return lastRefreshMs + RESCUE_REFRESH_HOURS * MS_PER_HOUR - nowMs;
}

/** 可結緣女性來源系統 §H UI_DUNGEON_REFRESH；不足一分鐘算一分鐘 */
export function rescueRefreshLine(remainingMs: number): string {
    const minutes = Math.ceil(remainingMs / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const time = hours > 0 ? `${hours} 小時 ${minutes % 60} 分` : `${minutes} 分`;
    return `民間尋訪將在 ${time} 後刷新`;
}

/** 可結緣女性來源系統 §G；§G 沒有千金的結果句，千金句是暫定文案 */
const RESCUE_RESULT_LINE: Readonly<Record<RescueOutcome, string>> = Object.freeze({
    commoner: '救下一名村姑，雖非名門，卻質樸健康。',
    'noble-lady': '救下一位富家千金，言談間自有教養。',
    noble: '竟是沒落世家之女！舉手投足盡顯風華。',
});

/** 尋訪成功時依序顯示的句子 */
export function rescueResultLines(outcome: RescueOutcome, name: string, qualityTag: string): string[] {
    return [
        '密林深處傳來救命聲——一名女子被山賊圍困！',
        RESCUE_RESULT_LINE[outcome],
        `${name} 歸入名冊（${qualityTag}）`,
    ];
}

/** §F 品質：民女 R、千金 R+、貴族 SR-；品質只有四級，千金記 R、貴族記 SR */
export const RESCUE_QUALITY: Readonly<Record<RescueOutcome, 'R' | 'SR'>> = Object.freeze({
    commoner: 'R',
    'noble-lady': 'R',
    noble: 'SR',
});

/** 暫定（可逆）：規格沒給救回女將的姓名與能力，這裡的姓氏、能力區間、EP 都是暫定值 */
const RESCUE_SURNAMES: readonly string[] = Object.freeze(['王', '李', '張', '陳', '劉', '楊', '黃', '趙', '吳', '周', '徐', '孫', '馬', '朱', '胡', '郭']);

interface RescueProfile {
    nameOf(surname: string): string;
    min: number;
    max: number;
    /** 千金的額外政治／魅力 */
    polChaBonus: number;
    ep: number;
    rarityTier: 'common' | 'rare';
}

const RESCUE_PROFILE: Readonly<Record<RescueOutcome, RescueProfile>> = Object.freeze({
    commoner: { nameOf: (surname) => `${surname}氏`, min: 25, max: 45, polChaBonus: 0, ep: 30, rarityTier: 'common' },
    'noble-lady': { nameOf: (surname) => `${surname}家千金`, min: 30, max: 50, polChaBonus: 10, ep: 40, rarityTier: 'common' },
    noble: { nameOf: (surname) => `${surname}氏貴女`, min: 50, max: 70, polChaBonus: 0, ep: 55, rarityTier: 'rare' },
});

/** 下限等於結緣年齡（BREEDING_MIN_AGE），救回就能結緣 */
const RESCUE_MIN_AGE = BREEDING_MIN_AGE;
const RESCUE_MAX_AGE = 28;
const RESCUE_HP = 800;

/** 產生救回的女武將；因子（名門白色因子等）還沒給，見任務卡 */
export function buildRescuedGeneral(outcome: RescueOutcome, id: string, random: () => number): GeneralConfig {
    const profile = RESCUE_PROFILE[outcome];
    const roll = (min: number, max: number): number => min + Math.floor(random() * (max - min + 1));
    const stat = (): number => roll(profile.min, profile.max);
    const stats = {
        str: stat(),
        int: stat(),
        lea: stat(),
        pol: stat() + profile.polChaBonus,
        cha: stat() + profile.polChaBonus,
        luk: stat(),
    };
    return {
        id,
        name: profile.nameOf(RESCUE_SURNAMES[roll(0, RESCUE_SURNAMES.length - 1)]),
        faction: 'player',
        gender: '女',
        age: roll(RESCUE_MIN_AGE, RESCUE_MAX_AGE),
        status: 'Active',
        role: 'Combat',
        hp: RESCUE_HP,
        currentHp: RESCUE_HP,
        ...stats,
        stats,
        ep: profile.ep,
        epRating: epRatingLabel(profile.ep),
        rarityTier: profile.rarityTier,
        genes: [],
        hiddenFlags: [],
    } as unknown as GeneralConfig;
}
