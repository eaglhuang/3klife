/**
 * DuelTypes.ts — 生活層 Q 頭切磋的型別（QACT-01 第 4 章、QLIFE-01 第 6.4／6.4.1 章，PROG-2-10231）
 *
 * 純邏輯、不依賴 Cocos。模組只算「過程事件＋勝負＋後果分級」，不寫傷勢、不寫友誼、不存檔
 * （傷勢由呼叫端經伺服器 API occupancy.acquire(kind=medical, sub=injured) 寫入，冪等鍵見 duelIdempotencyKey）。
 * Unity 對照：相當於一組 POCO／ScriptableObject 資料定義。
 */

/** 切磋模式：friendly＝點到為止、serious＝認真切磋（預設）、deathmatch＝宿敵死鬥（輸方被擒，仍不陣亡）。 */
export type DuelMode = 'friendly' | 'serious' | 'deathmatch';

/** 傷勢等級：與戰場 WOUNDED 輕傷休養是同一個狀態，不新增數值系統。 */
export type DuelInjuryLevel = 'none' | 'light' | 'severe';

/** 後果分級（QACT-01 4.2）。 */
export type DuelOutcomeTier = 'draw' | 'lightInjury' | 'severeInjury' | 'captured';

export type DuelSide = 'a' | 'b';

export interface DuelFighter {
    id: string;
    force: number;
    intellect: number;
    /** 高將階血量 x1.2 */
    highRank?: boolean;
    /** 主角（或主角代理頭）：落敗只演出暈，不產生傷勢與被擒 */
    isProtagonist?: boolean;
    /** 目前傷勢（輸方分級用）；沒給＝none */
    injury?: DuelInjuryLevel;
    /** 上一場切磋是否落敗（連輸升重傷） */
    lostLastDuel?: boolean;
    /** 當季已升級過重傷（同一人當季最多被升級一次重傷） */
    severeUpgradedThisQuarter?: boolean;
}

export interface DuelInput {
    a: DuelFighter;
    b: DuelFighter;
    mode: DuelMode;
    /** 確定性種子；相同種子相同過程 */
    seed: number;
}

export type DuelEventKind = 'hit' | 'crit' | 'dodge' | 'stop' | 'ko' | 'limit';

export interface DuelEvent {
    round: number;
    kind: DuelEventKind;
    /** 出手方；stop／ko／limit 為 null（ko 帶出手方） */
    attacker: DuelSide | null;
    /** 被打方（受傷或閃避）；stop／limit 為 null */
    defender: DuelSide | null;
    /** 傷害（hit／crit）；其餘 0 */
    damage: number;
    /** 事件發生後雙方血量 */
    hpA: number;
    hpB: number;
}

export interface DuelInjuryResult {
    targetId: string;
    level: 'light' | 'severe';
}

export interface DuelResult {
    /** 勝者；平手（點到為止收手、回合上限血量相同）為 null */
    winner: DuelSide | null;
    rounds: number;
    hpLeft: { a: number; b: number };
    hpMax: { a: number; b: number };
    /** 血量歸零（模組只回報 ko，不產生死亡） */
    ko: boolean;
    outcomeTier: DuelOutcomeTier;
    /** 要寫入的傷勢；主角落敗、平手、死鬥被擒時為 null */
    injury: DuelInjuryResult | null;
    /** 被擒者 id（宿敵死鬥輸方，主角除外）；仍然不陣亡 */
    capturedId: string | null;
    /** 輸方是主角：只演出暈，無任何後果 */
    protagonistStunned: boolean;
    events: DuelEvent[];
}

/** life-duel.json 的 playback 區段（呈現用，時間單位秒、長度單位頭高 H）。 */
export interface DuelPlaybackConfig {
    chargeSec: number;
    rushSec: number;
    hitstopSec: number;
    knockbackSec: number;
    shakeSec: number;
    floatSec: number;
    endPoseSec: number;
    chargePullH: number;
    knockbackH: number;
    knockbackRotDeg: number;
    shakePx: number;
    floatRiseH: number;
    floatPopScale: number;
    hpBarFollowSec: number;
    weaponReadyDeg: number;
    weaponSwingDeg: number;
    standoffH: number;
}

export interface DuelConfig {
    schema: string;
    hpBase: number;
    hpHighRankMul: number;
    roundLimit: number;
    friendlyStopRatio: number;
    dmgMin: number;
    dmgMax: number;
    critChance: number;
    critMul: number;
    dodgeCap: number;
    dodgeDiffFull: number;
    perGeneralQuarterCap: number;
    acceptRateLightInjuredDelta: number;
    acceptRateArenaDelta: number;
    injury: Record<'light' | 'severe', { restQuarters: number; statMul: number }>;
    playback: DuelPlaybackConfig;
}
