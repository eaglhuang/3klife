// @spec-source → 動態人際關係建立狀態機與戰場治理共鳴事件規格書 doc_spec_0576 §3.1（義兄弟同陣士氣 +20）；戰場相鄰合攻聯動與情誼共鳴規格書 doc_spec_0323；PROG-2-10204
/**
 * KinBattleEffects — 結義／戰友關係在戰場上的三項效果判定（純邏輯，不依賴 cc）。
 *
 *   1. 義兄弟同陣士氣：來源武將與出戰名單內另一位武將互為義兄弟（史實 SWORN 或動態 DYNAMIC_SWORN）
 *   2. 生死相隨：戰友（COMRADE）或義兄弟的部隊相鄰時，一方受致命傷害，另一方有機率介入分攤
 *   3. 合攻關係來源：動態義兄弟視同史實義兄弟（合攻倍率 1.3，多重關係取 Max）
 *
 * 戰場端只傳「兩位武將 id」進來問，不需要知道關係表的細節。
 * Unity 對照：像一張 RelationLookup 查表，戰鬥系統只問「這兩人是不是兄弟／戰友」。
 */
import type { HistoricalRelation } from './KinRelation';
import type { HistoricalPairTable } from './HistoricalPairs';

/** 動態關係的最小形狀（DynamicRelation 與 snapshot() 結果皆符合，測試可直接塞字面量）。 */
export interface KinPairLike {
    uidA: string;
    uidB: string;
    type: string;
}

/** 義兄弟同陣士氣加成（規格 §3.1）：部署時 morale 至少為此值。 */
export const SWORN_DEPLOY_MORALE = 20;
/** 生死相隨：致命傷害時援護者介入的機率（PM 指定 50%）。 */
export const KIN_RESCUE_CHANCE = 0.5;
/** 生死相隨：援護者分攤的傷害比例（被救者承受其餘 70%）。 */
export const KIN_RESCUE_SHARE_RATIO = 0.3;
/** 動態義兄弟合攻倍率：與史實義兄弟一致（規格 §1：1.3）。 */
export const DYNAMIC_SWORN_COMBO_MOD = 1.3;

const SWORN_TYPES: readonly string[] = ['SWORN', 'DYNAMIC_SWORN'];
const BONDED_TYPES: readonly string[] = ['SWORN', 'DYNAMIC_SWORN', 'COMRADE'];

function dynamicTypeBetween(dynamic: ReadonlyArray<KinPairLike>, a: string, b: string, types: readonly string[]): boolean {
    return dynamic.some((r) => types.includes(r.type) && ((r.uidA === a && r.uidB === b) || (r.uidA === b && r.uidB === a)));
}

/** 兩位武將是否互為義兄弟：史實表 SWORN 或動態 DYNAMIC_SWORN／SWORN。同一人回傳 false。 */
export function areSwornBrothers(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    a: string | null,
    b: string | null,
): boolean {
    if (!a || !b || a === b) return false;
    if (table?.relationBetween(a, b)?.type === 'SWORN') return true;
    return dynamicTypeBetween(dynamic, a, b, SWORN_TYPES);
}

/** 兩位武將是否為戰友或義兄弟（生死相隨資格）。同一人回傳 false。 */
export function areKinBonded(
    table: HistoricalPairTable | null,
    dynamic: ReadonlyArray<KinPairLike>,
    a: string | null,
    b: string | null,
): boolean {
    if (!a || !b || a === b) return false;
    if (table?.relationBetween(a, b)?.type === 'SWORN') return true;
    return dynamicTypeBetween(dynamic, a, b, BONDED_TYPES);
}

/** 動態義兄弟轉成合攻用的關係列（只帶合攻倍率；戰友不給合攻）。沒有動態義兄弟回傳空陣列。 */
export function dynamicComboRelationsBetween(dynamic: ReadonlyArray<KinPairLike>, a: string | null, b: string | null): HistoricalRelation[] {
    if (!a || !b || a === b || !dynamicTypeBetween(dynamic, a, b, ['DYNAMIC_SWORN'])) return [];
    return [{
        relationId: `DYNAMIC_SWORN:${a < b ? a : b}|${a < b ? b : a}`,
        templateA: a,
        templateB: b,
        type: 'SWORN',
        epBonus: 0,
        extraEffects: { comboAttackRateMod: DYNAMIC_SWORN_COMBO_MOD },
        loreKey: '',
    }];
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

/** 生死相隨分攤：援護者承受 floor(傷害 × 30%)，被救者承受其餘。 */
export function kinRescueSplit(damage: number): { helperDamage: number; rescuedDamage: number } {
    const helperDamage = Math.max(0, Math.floor(damage * KIN_RESCUE_SHARE_RATIO));
    return { helperDamage, rescuedDamage: damage - helperDamage };
}
