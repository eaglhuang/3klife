// @spec-source → 天賦戰法自動施放設定檔與AI決策節奏規格書.md（doc_spec_0360）；PROG-2-2046
/**
 * AiCadenceTargeting — 敵方 AI 戰法節奏冷卻、TP 保留線與四種自動索敵挑選（純邏輯，不依賴 cc）
 *
 * - §2 Tier 2 以上戰法施放後冷卻 2 回合（後兩回合只能普攻／走位）；TP 至少保留 20。
 * - §1 LowestHp 取 HP 比例最低敵軍；SupportLowAlly 取 HP <50% 中最低友軍；
 *   EnemyCluster 取覆蓋敵軍最多錨點（≥2 才採用，否則退回最近目標）；VanguardChoke 取敵前衛路徑中點。
 * 與既有 SkillRuntimeContract.BattleSkillAutoAimMode（frontmost-enemy 等幾何錨點）並存，本檔是 AI 意圖層。
 */

export type AiAutoAimIntent = 'LowestHp' | 'EnemyCluster' | 'VanguardChoke' | 'SupportLowAlly';

export const AI_TACTIC_INTERNAL_COOLDOWN = 2;
export const AI_TACTIC_COOLDOWN_MIN_TIER = 2;
export const AI_TP_RESERVE = 20;
export const SUPPORT_LOW_ALLY_HP_RATE = 0.5;
export const CLUSTER_MIN_HITS = 2;

export class AiCadenceController {
    private readonly _lastCast = new Map<string, number>();

    public canCastTactic(generalUid: string, currentTurn: number, gapTurns = AI_TACTIC_INTERNAL_COOLDOWN): boolean {
        const last = this._lastCast.get(generalUid);
        return last === undefined || currentTurn - last > gapTurns;
    }

    /** 只有 Tier 2 以上才進冷卻 */
    public recordTacticCast(generalUid: string, currentTurn: number, tier: number): void {
        if (tier >= AI_TACTIC_COOLDOWN_MIN_TIER) this._lastCast.set(generalUid, currentTurn);
    }
}

/** 施放後 TP 不得低於保留線 */
export function canAffordWithReserve(currentTp: number, tpCost: number): boolean {
    return currentTp - tpCost >= AI_TP_RESERVE;
}

export interface AimUnit {
    unitId: string;
    hp: number;
    maxHp: number;
    x: number;
    y: number;
}

function hpRate(u: AimUnit): number {
    return u.maxHp > 0 ? u.hp / u.maxHp : 0;
}

function lowest(units: readonly AimUnit[]): AimUnit | null {
    let best: AimUnit | null = null;
    for (const u of units) {
        if (u.hp <= 0) continue;
        if (!best || hpRate(u) < hpRate(best)) best = u;
    }
    return best;
}

export function pickLowestHpEnemy(enemies: readonly AimUnit[]): AimUnit | null {
    return lowest(enemies);
}

export function pickSupportLowAlly(allies: readonly AimUnit[]): AimUnit | null {
    return lowest(allies.filter((a) => hpRate(a) < SUPPORT_LOW_ALLY_HP_RATE));
}

export interface ClusterAnchor {
    x: number;
    y: number;
    hitCount: number;
}

export type ClusterPick = { kind: 'anchor'; anchor: ClusterAnchor } | { kind: 'nearest'; unit: AimUnit } | null;

/** 覆蓋 ≥2 取最多（同數取先出現者）；全場分散退回離施放者最近的敵軍 */
export function pickEnemyCluster(anchors: readonly ClusterAnchor[], enemies: readonly AimUnit[], caster: { x: number; y: number }): ClusterPick {
    let best: ClusterAnchor | null = null;
    for (const a of anchors) if (!best || a.hitCount > best.hitCount) best = a;
    if (best && best.hitCount >= CLUSTER_MIN_HITS) return { kind: 'anchor', anchor: { ...best } };
    let near: AimUnit | null = null;
    let nearDist = Infinity;
    for (const e of enemies) {
        if (e.hp <= 0) continue;
        const d = Math.max(Math.abs(e.x - caster.x), Math.abs(e.y - caster.y));
        if (d < nearDist) {
            near = e;
            nearDist = d;
        }
    }
    return near ? { kind: 'nearest', unit: near } : null;
}

/** 敵前衛行進路徑中點（前衛座標到其目標座標，取整） */
export function pickVanguardChoke(vanguard: { x: number; y: number }, destination: { x: number; y: number }): { x: number; y: number } {
    return { x: Math.round((vanguard.x + destination.x) / 2), y: Math.round((vanguard.y + destination.y) / 2) };
}
