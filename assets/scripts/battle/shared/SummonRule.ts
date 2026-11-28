// @spec-source → 戰場召喚招式召喚物數量存活與五路站位規格書 (doc_spec_1359)；PROG-2-10253
// 召喚招式的純規則：生成格排序、同時存活上限、到期判定。不碰 cc，不改五路對撞（召喚物生成後就是一般小兵，固定出生路）。
import { Faction } from '../../core/config/Constants';

/** 召喚物兵種限盾／步／弓（裁決 11/28 問 5＝A）；值對應 TroopType 字串 */
export const SUMMON_TROOPS = ['shield', 'infantry', 'archer'] as const;
export type SummonTroop = (typeof SUMMON_TROOPS)[number];

/** 召喚招式資料（掛在 BattleSkillProfile.summon） */
export interface SummonSpec {
  troop: SummonTroop;
  /** 單次召喚隊數（裁決：1） */
  count: number;
  /** 存活回合，含召喚當回合（裁決：4） */
  durationTurns: number;
  /** 同陣營同時存活的召喚物上限（裁決：3） */
  maxAlive: number;
  /** 攻防占基礎比例（裁決：0.4；現行 militia 即 40%） */
  statScale: number;
}

export interface SummonGrid {
  lanes: number;
  depths: number;
}

/** 格子是否可生成：沒人占、不是阻擋地形／水流格（由呼叫端注入） */
export type SummonCellFree = (lane: number, depth: number) => boolean;

/** 往敵方前進的深度方向：玩家從 depth 0 往上推，敵方相反 */
export function summonForwardStep(faction: Faction): 1 | -1 {
  return faction === Faction.Player ? 1 : -1;
}

/**
 * 選召喚物生成格（規格 §2.3）：
 * ① 施放者所在路、前方第一個空格 → ② 同路後方第一個空格 → ③ 其他路中最靠中間者（同距取小路號）。
 * 不可生成在敵方底線格（避免直接斬首）。找不到回 null（施放失敗，不扣 SP）。
 * excluded：同一次施放已選走的格（多隊召喚時避免重複）。
 */
export function pickSummonCell(
  faction: Faction,
  casterLane: number,
  casterDepth: number,
  grid: SummonGrid,
  isFree: SummonCellFree,
  excluded: ReadonlyArray<{ lane: number; depth: number }> = [],
): { lane: number; depth: number } | null {
  const step = summonForwardStep(faction);
  const enemyBaseDepth = step === 1 ? grid.depths - 1 : 0;
  const ok = (lane: number, depth: number): boolean =>
    lane >= 0 && lane < grid.lanes && depth >= 0 && depth < grid.depths
    && depth !== enemyBaseDepth
    && !excluded.some((c) => c.lane === lane && c.depth === depth)
    && isFree(lane, depth);

  for (let d = casterDepth + step; d >= 0 && d < grid.depths; d += step) {
    if (d === enemyBaseDepth) break;
    if (ok(casterLane, d)) return { lane: casterLane, depth: d };
    break; // 只看緊鄰前方第一格；被占就改後方，不跳過人往前塞
  }
  for (let d = casterDepth - step; d >= 0 && d < grid.depths; d -= step) {
    if (ok(casterLane, d)) return { lane: casterLane, depth: d };
    break;
  }
  const center = (grid.lanes - 1) / 2;
  const lanes: number[] = [];
  for (let l = 0; l < grid.lanes; l++) if (l !== casterLane) lanes.push(l);
  lanes.sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
  for (const lane of lanes) {
    // 該路上離施放者深度最近的空格
    let best = -1;
    let bestDist = Infinity;
    for (let d = 0; d < grid.depths; d++) {
      if (!ok(lane, d)) continue;
      const dist = Math.abs(d - casterDepth);
      if (dist < bestDist) { bestDist = dist; best = d; }
    }
    if (best >= 0) return { lane, depth: best };
  }
  return null;
}

/** 同陣營召喚物已達上限（裁決問 2＝A：施放失敗、不扣 SP） */
export function summonCapReached(aliveCount: number, spec: Pick<SummonSpec, 'maxAlive'>): boolean {
  return aliveCount >= spec.maxAlive;
}

/** 本次最多還能召喚幾隊（受單次隊數與上限雙重限制；0＝施放失敗） */
export function summonAllowedCount(aliveCount: number, spec: Pick<SummonSpec, 'maxAlive' | 'count'>): number {
  return Math.max(0, Math.min(spec.count, spec.maxAlive - aliveCount));
}

/** 到期回合：召喚當回合算第 1 回合，durationTurns＝4 時在第 5 回合開始時消失 */
export function summonExpireTurn(summonTurn: number, durationTurns: number): number {
  return summonTurn + Math.max(1, Math.floor(durationTurns));
}

export function isSummonExpired(expireTurn: number | null | undefined, currentTurn: number): boolean {
  return expireTurn !== null && expireTurn !== undefined && currentTurn >= expireTurn;
}

/** 敵方 AI 判斷召喚所需的戰況（規格 §2.5） */
export interface SummonAiSituation {
  /** 是否有可生成的空格（pickSummonCell 有解） */
  hasFreeCell: boolean;
  /** 己方存活召喚物隊數 */
  aliveSummons: number;
  /** 己方／對手在場部隊數（不含主將） */
  ownTroops: number;
  opposingTroops: number;
  /** 己方沒有部隊的空路數 */
  emptyOwnLanes: number;
  /** 某路己方被對手壓到底線前 2 格 */
  laneUnderPressure: boolean;
  /** 高智 AI（HIGH 以上）才會「補被壓制的那一路」；低智只在部隊數落後時用 */
  highIq: boolean;
}

/** AI 召喚打分：0＝不用；>0 才進候選（規格 §2.5：無空格／已達上限／敵方沒有部隊 → 不用） */
export function summonAiValue(spec: Pick<SummonSpec, 'maxAlive'>, s: SummonAiSituation): number {
  if (!s.hasFreeCell || summonCapReached(s.aliveSummons, spec) || s.opposingTroops <= 0) return 0;
  const behind = s.ownTroops < s.opposingTroops;
  if (!s.highIq) return behind ? 30 : 0;
  return (behind ? 20 : 0) + (s.emptyOwnLanes >= 1 ? 10 : 0) + (s.laneUnderPressure ? 30 : 0);
}
