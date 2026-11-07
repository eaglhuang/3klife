// @spec-source → 戰鬥戰法目標選取流水線與投射判定規格書.md（doc_spec_0358）；PROG-2-2044
/**
 * TacticTargetingResolver — 戰法四階目標管線（純邏輯，不依賴 cc）
 *
 * 1. TCOND：兵種限制、雨雪禁火、隱身目標無真視即剔除。
 * 2. 投射：TDIR 單格；TLINE 沿方向 3 格貫穿；TFAN 前方 60° 扇形 5 格。
 * 3. 衰減：TDIR 1.0；TLINE 每格 −15%（下限 0.5）；TFAN 每格 −10%（下限 0.6）。
 * 4. 穿甲：EffectiveDef = Def × (1 − 穿透率)，常規 0.3、神兵 0.5。
 * 模式代號沿用 battle/skills/BattleSkillModuleTags 的 TDIR／TLINE／TFAN。
 */
import type { BattleSkillDamageModuleTag } from '../skills/BattleSkillModuleTags';

export interface GridCoord {
    x: number;
    y: number;
}

export const TLINE_LENGTH = 3;
export const TFAN_RADIUS = 5;
export const TFAN_HALF_ANGLE_DEG = 30;
export const PIERCING_RATIO_NORMAL = 0.3;
export const PIERCING_RATIO_DIVINE = 0.5;
export const FIRE_BLOCKING_WEATHERS: readonly string[] = ['RAINY', 'SNOW'];

export type TacticConditionFailure = 'TROOP_MISMATCH' | 'WEATHER_MISMATCH';

export interface TacticConditionInput {
    tacticType: string;
    weather: string;
    casterTroopType: string;
    /** 限定兵種；空或未給表示不限 */
    requiredTroopTypes?: readonly string[];
}

export function checkTacticCondition(input: TacticConditionInput): { ok: true } | { ok: false; reason: TacticConditionFailure } {
    const req = input.requiredTroopTypes;
    if (req && req.length > 0 && req.indexOf(input.casterTroopType) < 0) return { ok: false, reason: 'TROOP_MISMATCH' };
    if (input.tacticType === 'FIRE' && FIRE_BLOCKING_WEATHERS.indexOf(input.weather) >= 0) return { ok: false, reason: 'WEATHER_MISMATCH' };
    return { ok: true };
}

export function computeDistanceFalloff(distance: number, pattern: BattleSkillDamageModuleTag): number {
    const d = Math.max(1, Math.floor(distance));
    if (pattern === 'TDIR') return 1;
    if (pattern === 'TLINE') return Math.max(0.5, Math.round((1 - (d - 1) * 0.15) * 100) / 100);
    return Math.max(0.6, Math.round((1 - (d - 1) * 0.1) * 100) / 100);
}

function sign(n: number): number {
    return n > 0 ? 1 : n < 0 ? -1 : 0;
}

export interface PatternCell {
    coord: GridCoord;
    /** 距施放者的格數（1 起） */
    distance: number;
}

/** 投射集合（不含施放者本格） */
export function patternCells(pattern: BattleSkillDamageModuleTag, source: GridCoord, target: GridCoord): PatternCell[] {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const chebyshev = (c: GridCoord) => Math.max(Math.abs(c.x - source.x), Math.abs(c.y - source.y));
    if (pattern === 'TDIR') return dx === 0 && dy === 0 ? [] : [{ coord: { ...target }, distance: chebyshev(target) }];
    if (dx === 0 && dy === 0) return [];
    if (pattern === 'TLINE') {
        const sx = sign(dx);
        const sy = sign(dy);
        const out: PatternCell[] = [];
        for (let i = 1; i <= TLINE_LENGTH; i++) out.push({ coord: { x: source.x + sx * i, y: source.y + sy * i }, distance: i });
        return out;
    }
    const dirLen = Math.hypot(dx, dy);
    const cosLimit = Math.cos((TFAN_HALF_ANGLE_DEG * Math.PI) / 180) - 1e-9;
    const out: PatternCell[] = [];
    for (let ox = -TFAN_RADIUS; ox <= TFAN_RADIUS; ox++) {
        for (let oy = -TFAN_RADIUS; oy <= TFAN_RADIUS; oy++) {
            const len = Math.hypot(ox, oy);
            if (len === 0 || len > TFAN_RADIUS + 1e-9) continue;
            if ((ox * dx + oy * dy) / (len * dirLen) < cosLimit) continue;
            const coord = { x: source.x + ox, y: source.y + oy };
            out.push({ coord, distance: chebyshev(coord) });
        }
    }
    return out;
}

export interface TargetCandidate {
    unitId: string;
    coord: GridCoord;
    isEnemy: boolean;
    stealthed: boolean;
}

export interface ResolvedTarget {
    unitId: string;
    distance: number;
    falloff: number;
}

/** §1~§3：投射範圍內的敵軍，剔除無真視時的隱身單位，附衰減倍率；TDIR 最多 1 隊 */
export function resolveTacticTargets(
    pattern: BattleSkillDamageModuleTag,
    source: GridCoord,
    target: GridCoord,
    candidates: readonly TargetCandidate[],
    hasTruesight: boolean,
): ResolvedTarget[] {
    const out: ResolvedTarget[] = [];
    for (const cell of patternCells(pattern, source, target)) {
        for (const unit of candidates) {
            if (!unit.isEnemy || unit.coord.x !== cell.coord.x || unit.coord.y !== cell.coord.y) continue;
            if (unit.stealthed && !hasTruesight) continue;
            out.push({ unitId: unit.unitId, distance: cell.distance, falloff: computeDistanceFalloff(cell.distance, pattern) });
        }
    }
    return pattern === 'TDIR' ? out.slice(0, 1) : out;
}

export function effectiveDefense(targetDef: number, piercingRatio: number): number {
    const ratio = Math.max(0, Math.min(1, piercingRatio));
    return Math.max(0, targetDef) * (1 - ratio);
}
