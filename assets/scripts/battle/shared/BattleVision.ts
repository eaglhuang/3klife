// @spec-source → 戰場四大主題關卡機制與戰術物資結算規格書.md（doc_spec_0353）§1 夜襲「視野受限（半徑3格）」；PROG-2-2132
/**
 * BattleVision — 玩家視野判定（純邏輯，不依賴 cc）
 *
 * 只決定畫面要不要畫出敵軍，不影響戰鬥結算與敵方 AI。
 * 視野來源：場上每支我方部隊，加上我方底線（depth 0）。沒有底線視野時，
 * 我方全滅或還沒部署會整片看不到，連敵軍逼近都無從判斷。
 */
import { Faction } from '../../core/config/Constants';

export interface VisionUnit {
  readonly faction: Faction;
  readonly lane: number;
  readonly depth: number;
  isDead(): boolean;
}

export interface VisionState {
  readonly visionRadius: number | null;
  readonly units: ReadonlyMap<string, VisionUnit>;
}

export function isUnitVisibleToPlayer(state: VisionState, target: VisionUnit): boolean {
  const radius = state.visionRadius;
  if (radius === null || target.faction === Faction.Player) return true;
  if (target.depth <= radius) return true;
  for (const viewer of state.units.values()) {
    if (viewer.faction !== Faction.Player || viewer.isDead()) continue;
    const distance = Math.abs(viewer.lane - target.lane) + Math.abs(viewer.depth - target.depth);
    if (distance <= radius) return true;
  }
  return false;
}
