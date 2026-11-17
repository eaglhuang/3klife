// @spec-source → doc_spec_0454（再探揭露與 AI 委任）；大廳系統 E-9 §3、§4；PROG-2-9128（總PM裁決）
/**
 * HallMissionActions — 任務詳情「再探」「等待」與耗費條的純邏輯（不依賴 cc）。
 *
 * - 再探：情報度未滿 100 才可用；耗糧草（耗費放 lobby-hub.json 的 Recon.Cost_Grain），成功後情報度直接到 100。
 * - 等待：本季先不處理，任務保留到下一季；不耗費、不失效、不改任務；同任務同一季只算一次。
 * - 耗費條：讀任務自己的 Costs，不用視窗預設值。
 * 狀態寫入由 GameSession 負責，這裡只回答「能不能做、結果是什麼」。
 *
 * Unity 對照：像一組 static 規則函式，場景拿結果決定扣資源、存檔與提示。
 */
import { HALL_INTEL_FULL_PERCENT, getHallTaskIntelRevealPercent } from './HallTaskIntel';
import type { HallTask, LobbyHub } from './LobbyHubSchema';

/** 資料沒寫 Recon.Cost_Grain 時的預設再探糧草耗費（總PM裁決 50） */
export const HALL_RECON_COST_GRAIN_DEFAULT = 50;

export const HALL_RECON_FULL_TEXT = '情報已完整';
export const HALL_WAIT_KEPT_TEXT = '已保留至下一季';
export const HALL_WAIT_ALREADY_TEXT = '此任務本季已保留至下一季';

/** 再探耗費（糧草）：取自大廳資料，缺值或非法時用預設。 */
export function hallReconCostGrainOf(hub: Readonly<Pick<LobbyHub, 'Recon'>> | null | undefined): number {
    const value = hub?.Recon?.Cost_Grain;
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : HALL_RECON_COST_GRAIN_DEFAULT;
}

/** 任務目前情報度：資料底值與存檔紀錄取較大者（存檔只會往上加）。 */
export function effectiveHallIntelPercent(task: Readonly<Pick<HallTask, 'Intel_Reveal_Percent'>>, saved: number | undefined): number {
    const base = getHallTaskIntelRevealPercent({ Intel_Reveal_Percent: task.Intel_Reveal_Percent });
    const extra = typeof saved === 'number' && Number.isFinite(saved) ? Math.max(0, Math.min(saved, HALL_INTEL_FULL_PERCENT)) : 0;
    return Math.max(base, extra);
}

export type HallReconPlan =
    | { kind: 'full'; text: string }
    | { kind: 'insufficient'; text: string; need: number; have: number }
    | { kind: 'ok'; costGrain: number; intelAfter: number };

/** 再探計畫：已滿不扣、糧不足不扣不升，其餘扣糧並把情報度提到 100。 */
export function planHallRecon(currentIntelPercent: number, grain: number, costGrain: number): HallReconPlan {
    if (currentIntelPercent >= HALL_INTEL_FULL_PERCENT) return { kind: 'full', text: HALL_RECON_FULL_TEXT };
    if (!(grain >= costGrain)) {
        return { kind: 'insufficient', text: `糧草不足，再探需要 ${costGrain}（目前 ${Math.max(0, Math.floor(grain))}）`, need: costGrain, have: Math.max(0, Math.floor(grain)) };
    }
    return { kind: 'ok', costGrain, intelAfter: HALL_INTEL_FULL_PERCENT };
}

export type HallWaitPlan = { kind: 'kept'; text: string } | { kind: 'already'; text: string };

/** 等待計畫：本季第一次按記錄一次；同任務同季再按只提示、不重複計。 */
export function planHallWait(taskId: string, season: number, waited: Readonly<Record<string, number>>): HallWaitPlan {
    return waited[taskId] === season
        ? { kind: 'already', text: HALL_WAIT_ALREADY_TEXT }
        : { kind: 'kept', text: HALL_WAIT_KEPT_TEXT };
}

/** 耗費條各欄的滿格參考值（只影響長條比例，不是規則數值）。 */
export const HALL_COST_BAR_SCALE = Object.freeze({ GRAIN: 2000, TROOPS: 500, SILVER: 2000, TIME_MINUTES: 240 });

export interface HallCostBarState {
    costFoodValueLabel: string;
    costFoodRatio: number;
    costTroopValueLabel: string;
    costTroopRatio: number;
    costSilverValueLabel: string;
    costSilverRatio: number;
    costTimeValueLabel: string;
    costTimeRatio: number;
}

function ratioOf(value: number, scale: number): number {
    return Math.max(0, Math.min(1, value / scale));
}

function timeLabelOf(minutes: number): string {
    if (minutes <= 0) return '無';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} 分鐘`;
    return m === 0 ? `${h} 小時` : `${h} 小時 ${m} 分`;
}

/** 任務 Costs → 詳情窗耗費條的文字與比例。 */
export function hallCostBarStateOf(costs: Readonly<HallTask['Costs']>): HallCostBarState {
    return {
        costFoodValueLabel: costs.GRAIN.toLocaleString('en-US'),
        costFoodRatio: ratioOf(costs.GRAIN, HALL_COST_BAR_SCALE.GRAIN),
        costTroopValueLabel: costs.TROOPS.toLocaleString('en-US'),
        costTroopRatio: ratioOf(costs.TROOPS, HALL_COST_BAR_SCALE.TROOPS),
        costSilverValueLabel: costs.SILVER.toLocaleString('en-US'),
        costSilverRatio: ratioOf(costs.SILVER, HALL_COST_BAR_SCALE.SILVER),
        costTimeValueLabel: timeLabelOf(costs.TIME_MINUTES),
        costTimeRatio: ratioOf(costs.TIME_MINUTES, HALL_COST_BAR_SCALE.TIME_MINUTES),
    };
}

/** 存檔用：任務 id → 0~100 整數，非法項目丟棄。 */
export function normalizeHallIntel(raw: unknown): Record<string, number> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, number> = {};
    for (const [taskId, value] of Object.entries(raw as Record<string, unknown>)) {
        if (taskId.length > 0 && typeof value === 'number' && Number.isFinite(value)) out[taskId] = Math.max(0, Math.min(HALL_INTEL_FULL_PERCENT, Math.floor(value)));
    }
    return out;
}

/** 存檔用：任務 id → 按等待的那一季（非負整數），非法項目丟棄。 */
export function normalizeHallWaitSeasons(raw: unknown): Record<string, number> {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const out: Record<string, number> = {};
    for (const [taskId, value] of Object.entries(raw as Record<string, unknown>)) {
        if (taskId.length > 0 && typeof value === 'number' && Number.isInteger(value) && value >= 0) out[taskId] = value;
    }
    return out;
}
