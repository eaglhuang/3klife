// @spec-source → 任務系統 Base 框架規格書 (doc_spec_1185) §2～§4；共用框架總綱 (doc_spec_1182) §12 QST-M；PROG-2-9209
/**
 * QuestTypes — 任務框架的型別與常數（零依賴，不 import 引擎或 UI）。
 *
 * 任務框架只管：接受、步驟、閘門、暫離、結算、紀錄。獎勵與懲罰一律交給獎勵框架（reward.claim），
 * 執行者忙碌交給人員占用登記（occupancy.*）；任務自己不加減任何資源。
 */
import type { Condition } from '../foundation/Condition';

export const QUEST_CONFIG_SCHEMA = 'quest-config.v1';
export const QUEST_CONFIG_JSON = 'data/quest-config';

/** 結算成敗等級（規格 §2） */
export const QUEST_TIERS = ['critical', 'success', 'fail', 'disaster'] as const;
export type QuestTier = (typeof QUEST_TIERS)[number];

/** 任務種類：MVP 只實作 academy；其他種類之後各自註冊 QuestKindAdapter */
export type QuestTaskKind = string;

/** 解法：MVP 只有 steps（逐步推進，學府 36 回合就是 36 步）；progress 只留欄位 */
export type QuestSolver = 'steps' | 'progress';

/** 實例狀態（規格 §3.3，另加 PAUSED 暫離；OPEN 任務牆階段 MVP 不做） */
export type QuestState = 'ACTIVE' | 'PAUSED' | 'SETTLED' | 'ABANDONED' | 'EXPIRED';

/** 閘門擋下的動作標籤；預設擋 advance 與 settle，宿主可在定義加自己的標籤（例如 enroll、dispatch） */
export const DEFAULT_GATE_BLOCKS: readonly string[] = Object.freeze(['advance', 'settle']);

export interface QuestGateDef {
    id: string;
    /** 推進到第幾步時關上（學府 12、24、36）；步數滿 at 就停在那一步，清閘後才能繼續 */
    at: number;
    blocks: string[];
    /** 清閘條件（由宿主事實評估）；null＝宿主呼叫 task.clearGate 就放行（例如打斷彈窗處理完） */
    clearWhen: Condition | null;
}

export interface QuestOutcomeDef {
    /** 呼叫 reward.claim 的套件 id；null＝這個等級不發獎也不罰 */
    reward: string | null;
}

export interface QuestDef {
    id: string;
    taskKind: QuestTaskKind;
    solver: QuestSolver;
    /** 總步數 */
    steps: number;
    /** 執行者人數範圍 */
    actors: { min: number; max: number };
    /** 接取條件；null＝不限 */
    acceptWhen: Condition | null;
    gates: QuestGateDef[];
    /** 執行者占用種類（occupancy.acquire 的 kind）；null＝不占用 */
    occupancy: string | null;
    /** 倒數季數；null＝沒有期限。只有 ACTIVE 遞減，PAUSED 不動 */
    countdownSeasons: number | null;
    /** 暫離時是否釋放占用（學府暫離仍在學，預設 false） */
    releaseOnPause: boolean;
    outcome: Record<QuestTier, QuestOutcomeDef>;
}

export interface QuestConfigV1 {
    schema: typeof QUEST_CONFIG_SCHEMA;
    defs: QuestDef[];
}

export type QuestGateStatus = 'locked' | 'pending' | 'cleared';

export interface QuestLogEntry {
    /** 發生時的季序（QuestService 的時鐘） */
    at: number;
    kind: 'accept' | 'advance' | 'gate' | 'clearGate' | 'pause' | 'resume' | 'settle' | 'abandon' | 'expire';
    step: number;
    note?: string;
}

export interface QuestResultRecord {
    tier: QuestTier;
    bundleId: string | null;
    grantId: string | null;
    settledAt: number;
}

export interface QuestInstance {
    qid: string;
    defId: string;
    taskKind: QuestTaskKind;
    state: QuestState;
    /** 呼叫端去重鍵：同鍵重送 accept 回同一張，不重複建立 */
    acceptKey: string;
    actors: string[];
    step: number;
    total: number;
    /** 已清除的閘門 id */
    clearedGates: string[];
    /** 剩餘倒數季數；null＝無期限 */
    remainingSeasons: number | null;
    openedAt: number;
    pausedAt: number | null;
    pauseReason: string | null;
    /** 占用 refId；放棄、結算時用同一個釋放 */
    occupancyRef: string | null;
    log: QuestLogEntry[];
    result: QuestResultRecord | null;
}

/** 存檔狀態（隨存檔欄位 questState 保存；舊檔缺值＝空狀態） */
export interface QuestStateV1 {
    v: 1;
    seq: number;
    /** 已處理到的季序高水位（tick 冪等用）；null＝尚未 tick */
    lastTick: number | null;
    instances: QuestInstance[];
}

export const QUEST_LOG_LIMIT = 120;
/** 已終局（結算／放棄／過期）的實例最多保留幾張，超過丟最舊；仍在進行的永遠保留 */
export const QUEST_SETTLED_KEEP = 40;

export type QuestErrorCode =
    | 'DEF_NOT_FOUND' | 'NOT_FOUND' | 'BAD_STATE' | 'GATE_PENDING' | 'NOT_READY'
    | 'STEP_MISMATCH' | 'ACTOR_INVALID' | 'CONDITION_UNMET' | 'KEY_CONFLICT' | 'INVALID';

/** 領域錯誤：命令層轉成 E35x */
export class QuestError extends Error {
    public readonly code: QuestErrorCode;

    public constructor(code: QuestErrorCode, message: string) {
        super(message);
        this.name = 'QuestError';
        this.code = code;
    }
}

/** 給畫面與宿主看的實例投影（task.query 的回傳元素） */
export interface QuestInstanceView {
    qid: string;
    defId: string;
    taskKind: string;
    state: QuestState;
    actors: string[];
    step: number;
    total: number;
    gates: Array<{ id: string; at: number; status: QuestGateStatus }>;
    pendingGate: string | null;
    /** 目前被閘門擋下的動作標籤；宿主在做這些動作前先查 */
    blockedActions: string[];
    remainingSeasons: number | null;
    openedAt: number;
    pausedAt: number | null;
    result: QuestResultRecord | null;
    log: QuestLogEntry[];
}
