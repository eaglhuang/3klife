// @spec-source → 轉蛋系統規格 §排程第 8 項「限定池排程：期間限定角色輪替」、§貨幣表（銅錢符僅常設池）；WBS GCH-12；PROG-2-1072
/**
 * LimitedPoolSchedule — 限定池的上下架時間窗與本期限定角色（純邏輯，不依賴 cc）。
 *
 * - 時間窗為半開區間 [startMs, endMs)：開始時刻已上架，結束時刻已下架。
 * - 結束不晚於開始、或時間不是有限數的時間窗視為無效，不會上架。
 * - 本期限定角色只在池子開放時回傳；池子未開放時回傳空陣列，並複製陣列，避免外部改到排程資料。
 * - 銅錢符不可用於限定池，沿用 GachaCurrency 的規則，不在這裡另寫一份。
 *
 * 規格未定：時間單位（真實時間或遊戲季）與輪替節奏。本模組只接收毫秒時間窗，節奏由排程資料決定。
 *
 * Unity 對照：像一個 ScheduledEvent 清單，依目前時間檢查哪一個 Event 的 Active 區間包含現在，只讀不寫。
 */
import { isPoolAcceptingCurrency, type GachaCurrencyType } from './GachaCurrency';

export interface LimitedPoolWindow {
    poolId: string;
    /** 上架時刻（毫秒，含） */
    startMs: number;
    /** 下架時刻（毫秒，不含） */
    endMs: number;
    /** 本期限定角色 id */
    featuredGeneralIds: readonly string[];
}

function isValidWindow(window: LimitedPoolWindow): boolean {
    return Number.isFinite(window.startMs) && Number.isFinite(window.endMs) && window.endMs > window.startMs;
}

/** 此刻池子是否開放：時間窗有效且 startMs ≤ nowMs < endMs。 */
export function isLimitedPoolOpen(window: LimitedPoolWindow, nowMs: number): boolean {
    if (!Number.isFinite(nowMs) || !isValidWindow(window)) return false;
    return nowMs >= window.startMs && nowMs < window.endMs;
}

/** 此刻開放中的限定池（依輸入順序，不重排）。 */
export function openLimitedPools(windows: readonly LimitedPoolWindow[], nowMs: number): LimitedPoolWindow[] {
    return windows.filter((window) => isLimitedPoolOpen(window, nowMs));
}

/** 指定池子此刻的本期限定角色；池子未開放或查無此池時回傳空陣列（新陣列，不共用原資料）。 */
export function featuredGeneralsOf(windows: readonly LimitedPoolWindow[], poolId: string, nowMs: number): string[] {
    const window = windows.find((item) => item.poolId === poolId && isLimitedPoolOpen(item, nowMs));
    return window ? [...window.featuredGeneralIds] : [];
}

/** 限定池是否接受此貨幣：目前只有靈玉可用，銅錢符不可用（沿用 GachaCurrency 規則）。 */
export function limitedPoolAcceptsCurrency(currency: GachaCurrencyType): boolean {
    return isPoolAcceptingCurrency(currency, 'LIMITED');
}

/**
 * 讀取排程設定（已解析的 JSON 物件，格式為 { windows: [...] }）。
 * 欄位不合的項目略過，不讓整份排程失效；時間窗無效（結束不晚於開始）也略過。
 */
export function parseLimitedPoolWindows(raw: unknown): LimitedPoolWindow[] {
    const list = (raw as { windows?: unknown } | null | undefined)?.windows;
    if (!Array.isArray(list)) return [];
    const result: LimitedPoolWindow[] = [];
    for (const item of list) {
        const entry = item as Partial<Record<keyof LimitedPoolWindow, unknown>> | null;
        if (entry === null || typeof entry !== 'object') continue;
        const { poolId, startMs, endMs, featuredGeneralIds } = entry;
        if (typeof poolId !== 'string' || poolId.length === 0) continue;
        if (typeof startMs !== 'number' || typeof endMs !== 'number') continue;
        if (!Array.isArray(featuredGeneralIds) || !featuredGeneralIds.every((id) => typeof id === 'string')) continue;
        const window: LimitedPoolWindow = { poolId, startMs, endMs, featuredGeneralIds: [...(featuredGeneralIds as string[])] };
        if (isValidWindow(window)) result.push(window);
    }
    return result;
}
