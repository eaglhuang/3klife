// @spec-source → 限定卡池排程時間窗與期間限定角色輪替規格書 (GCH-12)；PROG-2-9024（限定池每週輪替一位武將）
/**
 * 限定池週期輪替（純資料，不依賴 cc）。
 *
 * 排程檔除了逐期列出的 windows，也可以寫 rotations：給起算時刻、週期與輪替名單，
 * 這裡把它展開成一段段 LimitedPoolWindow，交給既有的 LimitedPoolSchedule 判斷開放與焦點武將。
 * 名單輪完會從頭再來，所以只要維護名單，不用每週改檔。
 *
 * Unity 對照：ScriptableObject 存輪替表，執行時依 DateTime 算出本期 Banner。
 */
import type { LimitedPoolWindow } from './LimitedPoolSchedule';

export const DAY_MS = 24 * 60 * 60 * 1000;

export interface LimitedPoolRotation {
    poolId: string;
    /** 第 0 期開始時刻（毫秒） */
    anchorMs: number;
    /** 每期天數，預設 7（一週換一位） */
    periodDays: number;
    /** 依序輪替的焦點武將 id，每期一位 */
    generalIds: readonly string[];
}

/** 解析排程檔的 rotations 區塊；格式不對的項目略過，不影響其他項目。 */
export function parseLimitedPoolRotations(raw: unknown): LimitedPoolRotation[] {
    const list = (raw as { rotations?: unknown } | null | undefined)?.rotations;
    if (!Array.isArray(list)) return [];
    const result: LimitedPoolRotation[] = [];
    for (const item of list) {
        const entry = item as Partial<Record<keyof LimitedPoolRotation, unknown>> | null;
        if (entry === null || typeof entry !== 'object') continue;
        const { poolId, anchorMs, periodDays, generalIds } = entry;
        if (typeof poolId !== 'string' || poolId.length === 0) continue;
        if (typeof anchorMs !== 'number' || !Number.isFinite(anchorMs)) continue;
        const days = periodDays === undefined ? 7 : periodDays;
        if (typeof days !== 'number' || !Number.isFinite(days) || days <= 0) continue;
        if (!Array.isArray(generalIds) || generalIds.length === 0 || !generalIds.every((id) => typeof id === 'string' && id.length > 0)) continue;
        result.push({ poolId, anchorMs, periodDays: days, generalIds: [...(generalIds as string[])] });
    }
    return result;
}

/** nowMs 落在第幾期（anchor 之前是負數期，一樣照名單循環）。 */
export function rotationPeriodIndex(rotation: LimitedPoolRotation, nowMs: number): number {
    return Math.floor((nowMs - rotation.anchorMs) / (rotation.periodDays * DAY_MS));
}

/** 第 index 期的時間窗與焦點武將。 */
export function rotationWindowAt(rotation: LimitedPoolRotation, index: number): LimitedPoolWindow {
    const span = rotation.periodDays * DAY_MS;
    const count = rotation.generalIds.length;
    const pick = ((index % count) + count) % count;
    const startMs = rotation.anchorMs + index * span;
    return { poolId: rotation.poolId, startMs, endMs: startMs + span, featuredGeneralIds: [rotation.generalIds[pick]] };
}

/**
 * 展開從本期起連續 periods 期的時間窗；畫面長時間開著跨期時，下一期已經在清單裡，不必重讀排程。
 */
export function expandLimitedPoolRotations(rotations: readonly LimitedPoolRotation[], nowMs: number, periods = 8): LimitedPoolWindow[] {
    if (!Number.isFinite(nowMs)) return [];
    const result: LimitedPoolWindow[] = [];
    for (const rotation of rotations) {
        const first = rotationPeriodIndex(rotation, nowMs);
        for (let i = 0; i < Math.max(1, periods); i++) result.push(rotationWindowAt(rotation, first + i));
    }
    return result;
}
