// @spec-source → 奧義系統 §F-6 SpecialRuleResolver（USPECIAL）與 §F-7 Step 4 特殊規則能力（ULT-10，PROG-2-1935）
/**
 * SpecialRuleResolver — USPECIAL 白名單特殊規則（純邏輯，不依賴 cc）。
 *
 * 規格白名單五項：復活 REVIVE、增益轉移 TRANSFER_BUFFS、行動條重置 RESET_ACTION、
 * 死亡觸發 DEATH_TRIGGER、場勢切換 FIELD_SHIFT。
 * 規格 Step 2：奧義定義只給參數不給流程，所以各規則的數值全部由 params 傳入（資料驅動），本檔不寫死數值。
 * 白名單外的 kind 一律拒絕（REJECTED），不默默生效。
 *
 * 暫定：各奧義的實際參數值與 BattleScene 接線另卡；本卡只對最小單位快照做狀態重算。
 * Unity 對照：像一個 switch 只認五種 enum 的效果處理器，每種吃 ScriptableObject 給的參數。
 */

export type SpecialRuleKind = 'REVIVE' | 'TRANSFER_BUFFS' | 'RESET_ACTION' | 'DEATH_TRIGGER' | 'FIELD_SHIFT';

export const SPECIAL_RULE_WHITELIST: readonly SpecialRuleKind[] = [
    'REVIVE', 'TRANSFER_BUFFS', 'RESET_ACTION', 'DEATH_TRIGGER', 'FIELD_SHIFT',
];

export interface SpecialRuleUnit {
    id: string;
    hp: number;
    maxHp: number;
    alive: boolean;
    /** 行動條 0~1 */
    actionGauge: number;
    buffIds: string[];
    /** 死亡觸發掛勾：死亡時要觸發的效果 id（由資料表定義） */
    deathTriggerIds: string[];
}

export interface SpecialRuleState {
    units: SpecialRuleUnit[];
    /** 目前場勢 id（null 代表無） */
    fieldStateId: string | null;
}

export interface SpecialRuleParams {
    /** REVIVE：復活後血量比例 (0,1] */
    reviveHpRatio?: number;
    /** TRANSFER_BUFFS：最多轉移幾個增益（缺值＝全部） */
    maxBuffs?: number;
    /** RESET_ACTION：重置後的行動條值 0~1 */
    actionGauge?: number;
    /** DEATH_TRIGGER：要掛上的死亡觸發效果 id */
    triggerId?: string;
    /** FIELD_SHIFT：切換到的場勢 id */
    fieldStateId?: string;
}

export interface SpecialRuleRequest {
    kind: string;
    casterId: string;
    targetIds: string[];
    params: SpecialRuleParams;
}

export type SpecialRuleOutcome = 'APPLIED' | 'NO_EFFECT' | 'REJECTED';

export interface SpecialRuleResult {
    outcome: SpecialRuleOutcome;
    state: SpecialRuleState;
    /** 實際受影響的單位 id */
    affectedIds: string[];
}

function clamp01(v: number | undefined, fallback: number): number {
    const n = Number.isFinite(v) ? (v as number) : fallback;
    return Math.min(1, Math.max(0, n));
}

function cloneState(state: Readonly<SpecialRuleState>): SpecialRuleState {
    return {
        fieldStateId: state.fieldStateId,
        units: state.units.map((u) => ({ ...u, buffIds: [...u.buffIds], deathTriggerIds: [...u.deathTriggerIds] })),
    };
}

export function isWhitelistedSpecialRule(kind: string): kind is SpecialRuleKind {
    return (SPECIAL_RULE_WHITELIST as readonly string[]).includes(kind);
}

/** 套用一條 USPECIAL 規則，回傳重算後的新狀態（不改動輸入）。 */
export function resolveSpecialRule(state: Readonly<SpecialRuleState>, request: Readonly<SpecialRuleRequest>): SpecialRuleResult {
    if (!isWhitelistedSpecialRule(request.kind)) {
        return { outcome: 'REJECTED', state: cloneState(state), affectedIds: [] };
    }
    const next = cloneState(state);
    const byId = new Map(next.units.map((u) => [u.id, u]));
    const targets = request.targetIds.map((id) => byId.get(id)).filter((u): u is SpecialRuleUnit => !!u);
    const affected: string[] = [];
    const p = request.params;

    switch (request.kind) {
        case 'REVIVE': {
            const ratio = clamp01(p.reviveHpRatio, 0);
            if (ratio <= 0) break;
            for (const u of targets) {
                if (u.alive) continue;
                u.alive = true;
                u.hp = Math.max(1, Math.round(u.maxHp * ratio));
                affected.push(u.id);
            }
            break;
        }
        case 'TRANSFER_BUFFS': {
            const caster = byId.get(request.casterId);
            if (!caster || caster.buffIds.length === 0) break;
            const limit = Number.isFinite(p.maxBuffs) ? Math.max(0, Math.floor(p.maxBuffs as number)) : caster.buffIds.length;
            const moved = caster.buffIds.splice(0, limit);
            const receivers = targets.filter((u) => u.alive && u.id !== caster.id);
            if (moved.length === 0 || receivers.length === 0) {
                caster.buffIds.unshift(...moved);
                break;
            }
            for (const u of receivers) {
                for (const b of moved) if (!u.buffIds.includes(b)) u.buffIds.push(b);
                affected.push(u.id);
            }
            affected.push(caster.id);
            break;
        }
        case 'RESET_ACTION': {
            const gauge = clamp01(p.actionGauge, 0);
            for (const u of targets) {
                if (!u.alive || u.actionGauge === gauge) continue;
                u.actionGauge = gauge;
                affected.push(u.id);
            }
            break;
        }
        case 'DEATH_TRIGGER': {
            if (!p.triggerId) break;
            for (const u of targets) {
                if (!u.alive || u.deathTriggerIds.includes(p.triggerId)) continue;
                u.deathTriggerIds.push(p.triggerId);
                affected.push(u.id);
            }
            break;
        }
        case 'FIELD_SHIFT': {
            if (!p.fieldStateId || next.fieldStateId === p.fieldStateId) break;
            next.fieldStateId = p.fieldStateId;
            affected.push(request.casterId);
            break;
        }
    }
    return { outcome: affected.length > 0 ? 'APPLIED' : 'NO_EFFECT', state: next, affectedIds: affected };
}

/** 單位陣亡時取出它身上的死亡觸發效果 id（交給上層依資料表結算）。 */
export function collectDeathTriggers(unit: Readonly<SpecialRuleUnit>): string[] {
    return unit.alive ? [] : [...unit.deathTriggerIds];
}
