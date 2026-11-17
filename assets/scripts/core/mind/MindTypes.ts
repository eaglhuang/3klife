// @spec-source → 武將心智提案 MIND-1（PROG-2-9146）；NPC人性化規格書 doc_spec_0176 §A（Utility AI 骨架＋模板記憶＋語言皮膚）
/**
 * 武將心智的共用型別與常數表，純 TS，不依賴 cc。
 * 設計：事件流是真相、累計器是快取；所有數值放 MIND_CONFIG，企劃日後只改這張表。
 * Unity 對照：像一份 ScriptableObject 設定檔加一組 DTO，邏輯完全不碰引擎。
 */

export type MindMood = 'EAGER' | 'HIGH' | 'NORMAL' | 'LOW';
export type MindOutcome = 'SUCCESS' | 'PARTIAL' | 'FAIL';

export type MindEventKind =
    | 'TASK_DONE' | 'TASK_ABORTED'
    | 'BATTLE_RESULT'
    | 'DUEL' | 'KILL_GENERAL'
    | 'WOUNDED' | 'CAPTURED' | 'RESCUED'
    | 'PROMOTED'
    | 'PRAISED' | 'SCOLDED' | 'GIFTED'
    | 'IDLE_SEASON' | 'PASSED_OVER'
    | 'REQUEST_GRANTED' | 'REQUEST_DENIED'
    | 'BOND_FORMED' | 'DESTINY_CHOICE';

export const MIND_EVENT_KINDS: readonly MindEventKind[] = [
    'TASK_DONE', 'TASK_ABORTED', 'BATTLE_RESULT', 'DUEL', 'KILL_GENERAL', 'WOUNDED', 'CAPTURED', 'RESCUED',
    'PROMOTED', 'PRAISED', 'SCOLDED', 'GIFTED', 'IDLE_SEASON', 'PASSED_OVER', 'REQUEST_GRANTED', 'REQUEST_DENIED',
    'BOND_FORMED', 'DESTINY_CHOICE',
];

export type MindValence = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export type MindWeight = 1 | 2 | 3 | 4 | 5;

/** 存進事件流的一筆記憶；id 是冪等鍵（日後 server 對帳用）。 */
export interface MindEvent {
    id: string;
    season: number;
    kind: MindEventKind;
    outcome?: MindOutcome;
    /** 任務類型／牆別／兵種等，≤4 */
    tags: string[];
    /** 給台詞引用的短名稱（任務名、出征等），≤12 字 */
    label?: string;
    partnerId?: string;
    valence: MindValence;
    weight: MindWeight;
    /** 原因碼，同時餵台詞模板與玩家 UI，例 'FAIL_NO_INTEL' */
    reason?: string;
}

/** 呼叫端（GameSession、任務系統、戰場）用的事件輸入；價值與重要度由規則表決定，呼叫端不手填。 */
export interface MindEventInput {
    generalId: string;
    season: number;
    kind: MindEventKind;
    outcome?: MindOutcome;
    tags?: readonly string[];
    label?: string;
    partnerId?: string;
    /** 派遣當下的情報度 0~3；未知不填 */
    intelLevel?: number;
    /** 任務風險 1~5，≥4 視為高風險（重要度 +1） */
    risk?: number;
    volunteered?: boolean;
    delegated?: boolean;
    /** 戰後是否為主將 */
    isLead?: boolean;
    injured?: boolean;
    reason?: string;
    /** 冪等鍵；不給時由服務產生 `${generalId}#${seq}` */
    id?: string;
}

/** 任務結算 DTO：任務系統（含日後重做版）只要把結果填成這個形狀，不必知道心智內部。 */
export interface TaskSettlementDto {
    taskId: string;
    season: number;
    tags: readonly string[];
    label?: string;
    risk: number;
    intelLevelAtDispatch: number;
    /** 第一位為主執行者，其餘搭檔 */
    generalIds: readonly string[];
    delegated: boolean;
    volunteered: boolean;
    outcome: MindOutcome;
    injuries?: Readonly<Record<string, 'NONE' | 'LIGHT' | 'SERIOUS'>>;
}

export interface MindTagStat {
    win: number;
    loss: number;
    lastSeason: number;
    streakLoss: number;
}

export interface MindPartnerStat {
    together: number;
    wins: number;
    lastSeason: number;
}

/** 極小累計器：事件被擠掉也不會遺失「做過幾次、勝幾敗幾」。 */
export interface MindLedger {
    seq: number;
    lastActiveSeason: number;
    idleSeasons: number;
    byTag: Record<string, MindTagStat>;
    partners: Record<string, MindPartnerStat>;
}

export interface GeneralMindSave {
    v: 1;
    events: Record<string, MindEvent[]>;
    ledger: Record<string, MindLedger>;
    lastSeasonSettled: number;
}

export interface MindRecordResult {
    recorded: boolean;
    duplicate: boolean;
    events: MindEvent[];
}

export interface MindEventView {
    id: string;
    season: number;
    kind: MindEventKind;
    outcome?: MindOutcome;
    label?: string;
    valence: MindValence;
    weight: MindWeight;
    reason?: string;
}

export type MindBarkPlace = 'LOBBY' | 'MORNING' | 'PROFILE';
export type MindBarkSource = 'NONE' | 'MEMORY' | 'STREAK' | 'BOND' | 'IDLE' | 'MOOD';

export interface MindLine {
    /** 空字串代表「沒什麼特別想說」，呼叫端應退回一般閒聊台詞 */
    text: string;
    source: MindBarkSource;
    reasonCodes: string[];
    eventId?: string;
}

/** 武將檔案的最小視圖（性格推導用，不依賴名冊型別） */
export interface MindGeneralView {
    id: string;
    name?: string;
    personality?: { type?: 'Loyal' | 'Brave' | 'Wise' | 'Playful' };
    str?: number; int?: number; lea?: number; pol?: number; cha?: number; luk?: number;
    stats?: Partial<Record<'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk', number>>;
}

/** 讀取心情／台詞時由呼叫端補的名冊現況；全部選填 */
export interface MindContext {
    /** 目前季數；不給用服務見過的最新季 */
    season?: number;
    loyalty?: number;
    /** 轉蛋名將忠誠鎖 100：心情照變，但不吃忠誠修正 */
    loyaltyLocked?: boolean;
    wounded?: boolean;
    general?: MindGeneralView;
    nameOf?: (generalId: string) => string | undefined;
}

export interface SeasonMindReport {
    season: number;
    moodChanges: Array<{ generalId: string; from: MindMood; to: MindMood }>;
    /** 本季被冷落（連續 ≥ 門檻季數無事件）的武將 */
    idleGeneralIds: string[];
}

/** 任務情報度百分比（0~100）→ 派遣情報等級 0~3；25 以下 0、50 以下 1、75 以下 2、其餘 3 */
export function intelLevelOfPercent(percent: number): 0 | 1 | 2 | 3 {
    if (!Number.isFinite(percent) || percent < 25) return 0;
    if (percent < 50) return 1;
    if (percent < 75) return 2;
    return 3;
}

/** 暫定數值（平衡先不管）；企劃之後只改這張表。 */
export const MIND_CONFIG = {
    /** 每季衰減係數：約 4 季後剩 40% */
    decayPerSeason: 0.8,
    /** 心情只看近幾季事件（里程碑 weight 5 例外，不衰減也不過期） */
    moodWindowSeasons: 6,
    normalEventCap: 40,
    milestoneCap: 10,
    milestoneWeight: 5,
    /** EAGER 門檻分數，且近 recentPositiveSeasons 季內要有正面事件 */
    eagerMinScore: 2.4,
    recentPositiveSeasons: 3,
    highMinScore: 1,
    lowMaxScore: -1,
    /** 連續幾季沒事件算被冷落；每多一季心情 -idlePenaltyPerSeason（上限 idlePenaltyCap） */
    idleThresholdSeasons: 2,
    idlePenaltyPerSeason: 0.8,
    idlePenaltyCap: 3,
    loyaltyLowBelow: 30,
    loyaltyLowPenalty: 1,
    loyaltyHighFrom: 80,
    loyaltyHighBonus: 0.5,
    woundedPenalty: 1,
    /** 並肩幾次寫入 BOND_FORMED */
    bondTogether: 3,
    /** 台詞只引用近幾季內的事件 */
    memoryQuoteSeasons: 4,
    memoryQuoteMinWeight: 2,
    /** 同類事件連敗幾回算「連失」 */
    streakLossLine: 2,
    /** 有可引用記憶時，說記憶而非心情話的機率 */
    memoryBarkChance: 0.7,
    maxTags: 4,
    maxLabelLength: 12,
    maxTagStats: 24,
    maxPartnerStats: 12,
    /** 使用者 2026-11-17 裁決：主動請求「活躍」。請求清單本身屬 MIND-2，此處只定常數。 */
    request: {
        maxPerSeasonTeam: 6,
        sameKindCooldownSeasons: 1,
    },
} as const;
