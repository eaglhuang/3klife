// @spec-source → NPC人性化規格書.md §F-2 對話生成模式、§I-2 Pending_Unknown_Events、§J Unknown Event；WBS NPC-08（PROG-2-1255）
/**
 * NpcDialogueHook — RAG 對話 hook 與未命中情境收集（純邏輯，不依賴 cc，不連中台）
 *
 * 本檔只做本地部分：
 *   - pickDialogueMode：依來源、連線與主動性決定用哪一種對話模式（規格 §F-2）。
 *   - recordUnknownEvent：本地模板也無法命中時，記入 Pending_Unknown_Events（去重、上限）。
 *   - flushUnknownEvents：連網時把待送清單交給 sink；sink 失敗或未連網就保留。
 *
 * 狀態：BLOCKED — 真正送往三國大腦中台的 sink 尚未實作（規格要求連中台，本地範圍不連外部服務）。
 * 目前只提供 notConnectedUnknownSink 作為佔位，永遠回報失敗，清單會保留在本地。
 *
 * 暫定：
 *   - 待送清單上限 50 筆，超過丟棄最舊的（與告別信收件匣的上限做法一致）。
 *   - 去重鍵為 generalId + contextKey，同一情境只留一筆。
 *
 * Unity 對照：像一個 Strategy 選擇器加上一個有上限的 Queue；sink 是注入進來的 IService 介面，
 * 測試時換成假實作，正式版換成 HTTP client。
 */

export type DialogueMode = 'STATIC_TEMPLATE' | 'RAG_REWRITE' | 'JOURNAL_REACTION' | 'FALLBACK_LINE';

export interface DialogueModeInput {
    /** 對話來源：日誌反應、玩家互動、其他 */
    source: 'journal' | 'interaction' | 'other';
    online: boolean;
    /** 玩家是否主動點擊 */
    playerInitiated: boolean;
    /** 生成或檢索失敗、未命中、安全攔截時為 true */
    failed: boolean;
}

/** 依規格 §F-2 選擇對話模式；失敗一律走固定句 */
export function pickDialogueMode(input: DialogueModeInput): DialogueMode {
    if (input.failed) return 'FALLBACK_LINE';
    if (input.source === 'journal') return 'JOURNAL_REACTION';
    if (input.online && input.playerInitiated) return 'RAG_REWRITE';
    return 'STATIC_TEMPLATE';
}

export interface UnknownEvent {
    generalId: string;
    contextKey: string;
    capturedAt: string;
}

export const UNKNOWN_EVENT_QUEUE_LIMIT = 50;

/** 記入待送清單：同一武將＋情境只留一筆（保留最新），超過上限丟棄最舊的；不修改輸入 */
export function recordUnknownEvent(
    pending: readonly UnknownEvent[],
    event: UnknownEvent,
    limit: number = UNKNOWN_EVENT_QUEUE_LIMIT,
): UnknownEvent[] {
    const kept = pending.filter((e) => !(e.generalId === event.generalId && e.contextKey === event.contextKey));
    const next = [...kept, { ...event }];
    return next.length > limit ? next.slice(next.length - limit) : next;
}

/** 送出結果：true 代表已被中台接收，可清空；false 代表保留 */
export type UnknownEventSink = (events: readonly UnknownEvent[]) => boolean;

/** 佔位 sink：尚未連接三國大腦中台，永遠回報失敗（BLOCKED） */
export const notConnectedUnknownSink: UnknownEventSink = () => false;

/** 連網時嘗試送出待送清單；未連網或 sink 失敗就原樣保留，回傳新清單 */
export function flushUnknownEvents(
    pending: readonly UnknownEvent[],
    online: boolean,
    sink: UnknownEventSink = notConnectedUnknownSink,
): UnknownEvent[] {
    if (!online || pending.length === 0) return [...pending];
    return sink(pending) ? [] : [...pending];
}
