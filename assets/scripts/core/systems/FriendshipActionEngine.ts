/**
 * 友誼行為結算引擎（第 8 共用框架，PROG-2-9953；權重表資料見 PROG-2-9866）
 * 玩家行為發生 → 依 actionId 查 delta → 性格倍率 → 每季次數上限／冷卻 → 寫入 FriendshipService。
 * 友誼依「對象」分記：
 *   - 玩家↔武將：generalId（既有稀疏表）
 *   - 武將↔武將：generalId＋targetId 配對表（只存與我方接觸者，呼叫端負責不傳無關配對）
 * 純 TS、不依賴 cc；時間單位為「季」（totalSeasonsElapsed）。
 */
import type { FriendshipService } from '../services/FriendshipService';

export const FRIENDSHIP_ACTION_WEIGHTS_JSON = 'data/friendship-action-weights';

export type FriendshipPersonality = 'Loyal' | 'Brave' | 'Wise' | 'Playful';

export interface FriendshipActionDef {
    actionId: string;
    tag: string;
    delta: number;
    personalityAffected: boolean;
    perSeasonCap: number;
    cooldownSeasons: number;
}

export interface FriendshipActionTable {
    deltaMin: number;
    deltaMax: number;
    personalityModifiers: Readonly<Record<string, Readonly<Record<string, number>>>>;
    actions: Readonly<Record<string, FriendshipActionDef>>;
}

export type FriendshipActionSkipReason = 'unknown-action' | 'season-cap' | 'cooldown' | 'no-change';

/** GAME_SESSION_EVENTS.FriendshipActionApplied 的 payload（Antigravity 提親被拒等事件直接呼叫 GameSession.applyFriendshipAction 即可） */
export interface FriendshipActionAppliedPayload {
    generalId: string;
    /** 有值＝武將↔武將配對；缺省＝玩家↔武將 */
    targetId?: string;
    actionId: string;
    /** 實際寫入的變化量（未結算為 0；已含性格倍率與 −100～100 夾制） */
    delta: number;
    applied: boolean;
    newValue: number;
    reason?: FriendshipActionSkipReason;
}

export interface FriendshipActionInput {
    actionId: string;
    generalId: string;
    targetId?: string;
    season: number;
    personality?: FriendshipPersonality;
}

interface ActionCounter { season: number; count: number; last: number }
export type FriendshipActionLog = Record<string, ActionCounter>;

export function normalizeFriendshipActionTable(raw: unknown): FriendshipActionTable | null {
    const src = raw as { range?: { deltaMin?: number; deltaMax?: number }; personalityModifiers?: unknown; actions?: unknown } | null;
    if (!src || !Array.isArray(src.actions)) return null;
    const actions: Record<string, FriendshipActionDef> = {};
    for (const item of src.actions as Partial<FriendshipActionDef>[]) {
        if (!item || typeof item.actionId !== 'string' || !Number.isFinite(item.delta)) continue;
        actions[item.actionId] = {
            actionId: item.actionId,
            tag: typeof item.tag === 'string' ? item.tag : '',
            delta: Math.trunc(item.delta as number),
            personalityAffected: item.personalityAffected === true,
            perSeasonCap: Math.max(1, Math.trunc(item.perSeasonCap ?? 1)),
            cooldownSeasons: Math.max(0, Math.trunc(item.cooldownSeasons ?? 0)),
        };
    }
    const mods = (src.personalityModifiers && typeof src.personalityModifiers === 'object' ? src.personalityModifiers : {}) as FriendshipActionTable['personalityModifiers'];
    return { deltaMin: src.range?.deltaMin ?? -30, deltaMax: src.range?.deltaMax ?? 30, personalityModifiers: mods, actions };
}

/** 半數遠離 0 四捨五入 */
function roundAwayFromZero(n: number): number {
    return n < 0 ? -Math.round(-n) : Math.round(n);
}

export class FriendshipActionEngine {
    private _table: FriendshipActionTable | null = null;
    private _log: FriendshipActionLog = {};
    private _listeners: Array<(payload: FriendshipActionAppliedPayload) => void> = [];

    /** serviceOf 用函式取得，測試重置單例後不會抓到舊實例 */
    constructor(private readonly _serviceOf: () => FriendshipService, table?: FriendshipActionTable | null) {
        this._table = table ?? null;
    }

    public setTable(table: FriendshipActionTable | null): void {
        this._table = table;
    }

    public hasTable(): boolean {
        return this._table !== null;
    }

    public onApplied(listener: (payload: FriendshipActionAppliedPayload) => void): () => void {
        this._listeners.push(listener);
        return () => { this._listeners = this._listeners.filter((l) => l !== listener); };
    }

    /** 結算一次玩家行為；沒載入權重表或行為未知時什麼都不做（回傳 unknown-action，不發事件） */
    public apply(input: FriendshipActionInput): FriendshipActionAppliedPayload {
        const { actionId, generalId, targetId } = input;
        const service = this._serviceOf();
        const current = (): number => (targetId ? service.getPair(generalId, targetId) : service.get(generalId));
        const base: FriendshipActionAppliedPayload = { generalId, ...(targetId ? { targetId } : {}), actionId, delta: 0, applied: false, newValue: current() };
        const def = this._table?.actions[actionId];
        if (!this._table || !def || !generalId) return { ...base, reason: 'unknown-action' };

        const key = `${targetId ? [generalId, targetId].sort().join('|') : generalId}#${actionId}`;
        const counter = this._log[key];
        if (counter && counter.season === input.season && counter.count >= def.perSeasonCap) return this._emit({ ...base, reason: 'season-cap' });
        if (counter && counter.season < input.season && input.season - counter.last <= def.cooldownSeasons) return this._emit({ ...base, reason: 'cooldown' });

        let delta = def.delta;
        if (def.personalityAffected && input.personality) {
            const mult = this._table.personalityModifiers[input.personality]?.[def.tag];
            if (typeof mult === 'number') delta = roundAwayFromZero(def.delta * mult);
        }
        delta = Math.max(this._table.deltaMin, Math.min(this._table.deltaMax, delta));

        const before = current();
        const after = targetId ? service.addPair(generalId, targetId, delta, actionId) : service.add(generalId, delta, actionId);
        // 次數與冷卻照「有觸發」記，即使被夾制在 ±100 而實際值沒變
        this._log[key] = counter && counter.season === input.season
            ? { season: input.season, count: counter.count + 1, last: input.season }
            : { season: input.season, count: 1, last: input.season };
        const actual = after - before;
        return this._emit({ ...base, delta: actual, applied: actual !== 0, newValue: after, ...(actual === 0 ? { reason: 'no-change' as const } : {}) });
    }

    public snapshot(): FriendshipActionLog {
        return JSON.parse(JSON.stringify(this._log)) as FriendshipActionLog;
    }

    public restore(raw: unknown): void {
        this._log = {};
        if (!raw || typeof raw !== 'object') return;
        for (const [key, value] of Object.entries(raw as Record<string, Partial<ActionCounter>>)) {
            if (value && Number.isFinite(value.season) && Number.isFinite(value.count) && Number.isFinite(value.last)) {
                this._log[key] = { season: value.season as number, count: value.count as number, last: value.last as number };
            }
        }
    }

    private _emit(payload: FriendshipActionAppliedPayload): FriendshipActionAppliedPayload {
        for (const listener of this._listeners) {
            try { listener(payload); } catch { /* 個別監聽器例外不中斷結算 */ }
        }
        return payload;
    }
}
