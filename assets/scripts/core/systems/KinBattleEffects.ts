// @spec-source → 羈絆戰場效果整併方案規格書 doc_spec_1358；動態人際關係規格 doc_spec_0576 §3.1；戰場相鄰合攻聯動與情誼共鳴規格書 doc_spec_0323；PROG-2-10204／PROG-2-10221
/**
 * KinBattleEffects — 羈絆（義兄弟／夫妻／戰友）在戰場上的單一效果模型（純邏輯，不依賴 cc）。
 *
 * 關係等級（取兩人之間最高的一種，不重複計算）：義兄弟 > 夫妻 > 戰友；師徒、主從、宿敵等其餘關係戰場無效果。
 * 四種效果各佔一條軸、同名取大不累加：
 *   ① 同陣士氣（義兄弟）  ② 近距離光環「兄弟齊心」（義兄弟，切比雪夫距離）
 *   ③ 合攻（義兄弟 26%、戰友 20%、夫妻 0）  ④ 生死相隨援護（義兄弟、夫妻、戰友）
 * 數值全部來自 kin-battle-effects.json。戰場端只傳「兩位武將 id」進來問等級。
 * Unity 對照：像一張 RelationLookup 查表，戰鬥系統只問「這兩人是什麼等級的羈絆」。
 */
import type { HistoricalPairTable } from './HistoricalPairs';
import { KIN_BATTLE_CONFIG } from './KinBattleConfig';

/** 動態關係的最小形狀（DynamicRelation 與 snapshot() 結果皆符合，測試可直接塞字面量）。 */
export interface KinPairLike {
    uidA: string;
    uidB: string;
    type: string;
}

/** 羈絆等級：NONE 在戰場上沒有任何效果。 */
export type KinLevel = 'NONE' | 'COMRADE' | 'SPOUSE' | 'SWORN';

/** 等級高低（援護者與助攻者挑選用：義兄弟 > 夫妻 > 戰友）。 */
export const KIN_LEVEL_RANK: Readonly<Record<KinLevel, number>> = { NONE: 0, COMRADE: 1, SPOUSE: 2, SWORN: 3 };

/** 義兄弟同陣士氣加成（整場常駐下限）。 */
export const SWORN_DEPLOY_MORALE = KIN_BATTLE_CONFIG.sworn.deployMorale;
/** 生死相隨：致命傷害時援護者介入的機率。 */
export const KIN_RESCUE_CHANCE = KIN_BATTLE_CONFIG.rescue.chance;
/** 生死相隨：援護者分攤的傷害比例（被救者承受其餘）。 */
export const KIN_RESCUE_SHARE_RATIO = KIN_BATTLE_CONFIG.rescue.shareRatio;

const HISTORICAL_LEVEL: Readonly<Record<string, KinLevel>> = { SWORN: 'SWORN', COUPLE: 'SPOUSE' };
const DYNAMIC_LEVEL: Readonly<Record<string, KinLevel>> = { DYNAMIC_SWORN: 'SWORN', SWORN: 'SWORN', SPOUSE: 'SPOUSE', COMRADE: 'COMRADE' };

function higher(a: KinLevel, b: KinLevel): KinLevel {
    return KIN_LEVEL_RANK[b] > KIN_LEVEL_RANK[a] ? b : a;
}

/**
 * 兩位武將（模板 id）之間的羈絆等級：史實表與動態關係並存時取最高，其餘關係與同一人為 NONE。
 * 斷義後關係已從來源移除，這裡自然回傳 NONE。
 */
export function kinLevelBetween(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    a: string | null,
    b: string | null,
): KinLevel {
    if (!a || !b || a === b) return 'NONE';
    let level: KinLevel = HISTORICAL_LEVEL[table?.relationBetween(a, b)?.type ?? ''] ?? 'NONE';
    for (const r of dynamic) {
        if (!((r.uidA === a && r.uidB === b) || (r.uidA === b && r.uidB === a))) continue;
        level = higher(level, DYNAMIC_LEVEL[r.type] ?? 'NONE');
    }
    return level;
}

/** 兩位武將是否互為義兄弟（史實 SWORN 或動態 DYNAMIC_SWORN）。 */
export function areSwornBrothers(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    a: string | null,
    b: string | null,
): boolean {
    return kinLevelBetween(table, dynamic, a, b) === 'SWORN';
}

/** 兩位武將是否有任何戰場羈絆（義兄弟、夫妻、戰友：生死相隨資格）。 */
export function areKinBonded(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    a: string | null,
    b: string | null,
): boolean {
    return kinLevelBetween(table, dynamic, a, b) !== 'NONE';
}

/** 來源武將與出戰名單內「另一位」武將互為義兄弟嗎（名單內有自己不算）。 */
export function hasSwornBrotherInLineup(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    sourceId: string | null,
    lineupIds: Iterable<string>,
): boolean {
    if (!sourceId) return false;
    for (const id of lineupIds) {
        if (areSwornBrothers(table, dynamic, sourceId, id)) return true;
    }
    return false;
}

/** 光環判定用的最小單位形狀。 */
export interface KinAuraUnit {
    readonly id: string;
    readonly faction: string;
    readonly lane: number;
    readonly depth: number;
    isDead(): boolean;
}

/** 切比雪夫距離（斜角算 1 格，與九宮格一致）。 */
export function chebyshevDistance(laneA: number, depthA: number, laneB: number, depthB: number): number {
    return Math.max(Math.abs(laneA - laneB), Math.abs(depthA - depthB));
}

/**
 * 「兄弟齊心」光環：回傳身邊（同陣營、切比雪夫距離 ≤ radius）有存活義兄弟部隊的單位 id 集合。
 * 結果是集合：同名增益只算一次，兄弟再多也不累加。levelOf 由戰場端以部隊背後武將查等級。
 */
export function kinAuraUnitIds(
    units: Iterable<KinAuraUnit>,
    levelOf: (unitIdA: string, unitIdB: string) => KinLevel,
    radius: number = KIN_BATTLE_CONFIG.aura.radius,
): Set<string> {
    const alive = Array.from(units).filter((u) => !u.isDead());
    const result = new Set<string>();
    for (let i = 0; i < alive.length; i++) {
        for (let j = i + 1; j < alive.length; j++) {
            const a = alive[i];
            const b = alive[j];
            if (a.faction !== b.faction) continue;
            if (chebyshevDistance(a.lane, a.depth, b.lane, b.depth) > radius) continue;
            if (levelOf(a.id, b.id) !== 'SWORN') continue;
            result.add(a.id);
            result.add(b.id);
        }
    }
    return result;
}

/** 生死相隨分攤：援護者承受 floor(傷害 × 30%)，被救者承受其餘。 */
export function kinRescueSplit(damage: number): { helperDamage: number; rescuedDamage: number } {
    const helperDamage = Math.max(0, Math.floor(damage * KIN_RESCUE_SHARE_RATIO));
    return { helperDamage, rescuedDamage: damage - helperDamage };
}
