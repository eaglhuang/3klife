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
    /** 系統事件直接指定價值與重要度（例：母國開戰的心情衝擊，PROG-2-9592）；給了就不查規則表 */
    forceValence?: MindValence;
    forceWeight?: MindWeight;
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
    /** 敗給的對手 id（≤3，新的在後）；MIND-2 */
    grudges: string[];
    /** 玩家答應過「請再戰」的任務類型；之後同類成功會加倍並寫里程碑（雪恥）；MIND-2 */
    redeemTag?: string;
    /** 最近一次抗命的季數；MIND-2 */
    defiedSeason?: number;
    /** 最近一次被稱讚／安撫的季數；MIND-2 */
    lastPraiseSeason: number;
}

/** 主動請求的種類（MIND-2）：求封、請戰為重大事件 */
export type MindRequestKind = 'ASK_PROMOTE' | 'ASK_BATTLE' | 'REDEEM' | 'APOLOGIZE' | 'COMPLAIN_IDLE' | 'ADVISE' | 'DEFY_LETTER';

export const MIND_REQUEST_KINDS: readonly MindRequestKind[] = ['ASK_PROMOTE', 'ASK_BATTLE', 'REDEEM', 'APOLOGIZE', 'COMPLAIN_IDLE', 'ADVISE', 'DEFY_LETTER'];

export type MindRequestStatus = 'PENDING' | 'GRANTED' | 'DENIED' | 'EXPIRED' | 'ACKED';

/** 請求引用的真實過去（任務名、對手、季數），玩家看了知道「他記得」 */
export interface MindRequestRef {
    label?: string;
    partnerId?: string;
    season?: number;
    eventId?: string;
}

/** 信箱裡的一則請求或來信；text 在生成當下就定稿，之後讀檔也不會變 */
export interface MindRequest {
    id: string;
    generalId: string;
    kind: MindRequestKind;
    /** 提出的季數 */
    season: number;
    /** 超過這一季仍未回應就作廢（寫 PASSED_OVER） */
    expiresSeason: number;
    status: MindRequestStatus;
    /** 求封、請戰＝重大事件 */
    major: boolean;
    text: string;
    reasonCodes: string[];
    ref?: MindRequestRef;
    /** 玩家回應後武將的一句反應 */
    reply?: string;
    read: boolean;
    /** 已被准許的請戰是否已被戰場取用 */
    consumed?: boolean;
}

export interface GeneralMindSave {
    v: 1;
    events: Record<string, MindEvent[]>;
    ledger: Record<string, MindLedger>;
    lastSeasonSettled: number;
    /** 信箱：未回應與近期已回應的請求（有上限）；MIND-2 */
    requests: MindRequest[];
    /** generalId → 請求種類 → 最早可再提的季數；MIND-2 */
    cooldowns: Record<string, Record<string, number>>;
}

/** 呼叫端提供的將階與名聲現況（求封、請戰判斷用）；沒給就不會提出這兩類請求 */
export interface MindFameFacts {
    rank: number;
    fame: number;
    /** 下一階需要的名聲；已最高階為 null */
    nextFame: number | null;
    nextTitle?: string;
    /** 突破瓶頸的缺項；系統沒提供時由性格決定走求封或請戰 */
    bottleneck?: 'BESTOW' | 'KILL' | 'DUEL';
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
    /** 性別（'男'／'女'）與年齡：台詞第一人稱用 */
    gender?: string;
    age?: number;
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
    /** MIND-2：將階與名聲現況 */
    fame?: MindFameFacts;
    /** MIND-2：季數顯示文字（例「第3年夏」）；不給用「第N季」 */
    seasonLabel?: (season: number) => string;
}

export interface SeasonMindReport {
    season: number;
    moodChanges: Array<{ generalId: string; from: MindMood; to: MindMood }>;
    /** 本季被冷落（連續 ≥ 門檻季數無事件）的武將 */
    idleGeneralIds: string[];
    /** MIND-2：本季新提出的請求 */
    newRequests: MindRequest[];
    /** MIND-2：本季因無人回應而作廢的請求 */
    expiredRequests: MindRequest[];
}

/** 任務詳情選將時查詢意見用的任務輪廓（任務系統只要填這幾欄） */
export interface MindTaskProfile {
    tags: readonly string[];
    label?: string;
    /** 派遣當下的情報度 0~3；不知道就不填（視為 3） */
    intelLevel?: number;
}

export type MindOpinionStance = 'WILLING' | 'OK' | 'CAUTIOUS' | 'DISSUADE';

/** 意見只勸阻不抗命：DISSUADE 仍可派遣，成功率小幅下修（successDelta ≤ 0） */
export interface MindOpinion {
    stance: MindOpinionStance;
    willingness: number;
    line: string;
    reasonCodes: string[];
    /** 給任務結算的成功率修正（0 或小幅負值） */
    successDelta: number;
}

export interface MindResolveResult {
    ok: boolean;
    request?: MindRequest;
    /** 武將對玩家決定的反應 */
    reply: string;
    events: MindEvent[];
    /** 交給呼叫端的遊戲效果提示（賜封、請戰、雪恥獲准）；心智本身不動名冊 */
    hook?: 'PROMOTE_GRANTED' | 'BATTLE_GRANTED' | 'REDEEM_GRANTED';
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
        /** 被駁回後同類冷卻倍數 */
        deniedCooldownFactor: 2,
        /** 每將每季最多幾則（含重大） */
        maxPerGeneralPerSeason: 2,
        /** 請求幾季內未回應就作廢 */
        expireAfterSeasons: 2,
        /** 信箱容量（未回應＋近期已回應） */
        mailboxCap: 30,
        /** 未回應請求達此數就不再提一般請求（重大請求仍可） */
        pendingSoftCap: 12,
        /** 名聲達下一階門檻的幾成就會求封／請戰 */
        fameAskRatio: 0.8,
        /** 提出機率 = clamp(base + perScore × 分數) */
        chanceBase: 0.5,
        chancePerScore: 0.12,
        chanceMax: 0.95,
    },
    /** 意願與勸阻 */
    opinion: {
        dissuadeBelow: 0.3,
        cautiousBelow: 0.45,
        willingFrom: 0.7,
        /** 勸阻時成功率下修（小幅） */
        dissuadeSuccessDelta: -0.05,
        cautiousSuccessDelta: -0.02,
        /** 謹慎狀態下要情報度達此級才願意 */
        cautionNeedsIntel: 2,
    },
    /** 抗命：忠誠低於此值且近 insultWindow 季內受辱 ≥ insultNeeded 次，才抗命一次 */
    defiance: {
        loyaltyBelow: 30,
        insultNeeded: 3,
        insultWindowSeasons: 3,
    },
    /** 回應後的心智事件價值已在 MIND_EVENT_RULES；這裡只放請求之外的學習參數 */
    learning: {
        /** 近幾季的事件在信心計算中多算一次（×2） */
        recentSeasons: 3,
        /** 連敗幾回進入謹慎／雪恥 */
        streakLossForStance: 2,
        redeemWinValenceMultiplier: 2,
        grudgeCap: 3,
    },
} as const;
