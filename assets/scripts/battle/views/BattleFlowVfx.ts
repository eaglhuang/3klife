// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；PROG-2-1429 依建檔紀錄補標出處
import { Vec3 } from "cc";
import { SkillSourceType } from "../../shared/SkillRuntimeContract";

export const BATTLE_FLOW_FX = {
  hitDefault: 'battle_hit_default',
  hitNightRaid: 'battle_hit_night',
  deathBurst: 'battle_death_burst',
  deathSmoke: 'battle_death_vanish',
  forcedMove: 'battle_forced_move',
  skillSeed: 'battle_skill_seed',
  skillUltimate: 'battle_skill_ultimate',
  battleWin: 'battle_win',
  battleLose: 'battle_lose',
  battleDraw: 'battle_draw',
} as const;

export interface BattleFlowEffectSystem {
  getEffectDef(effectKey: string): unknown;
  playFullEffect(effectKey: string, position: Vec3): void;
  playBlock(effectKey: string, position: Vec3, override?: unknown, duration?: number): void;
}

export interface BattleFlowBoardRenderer {
  getCellWorldPosition(lane: number, depth: number, yOffset?: number): Vec3 | null | undefined;
  getBoardMetrics(): { center: Vec3 } | null | undefined;
}

export function resolveBattleUnitHitEffectKey(damageSource?: string): string {
  return damageSource === 'night-raid-opening-strike'
    ? BATTLE_FLOW_FX.hitNightRaid
    : BATTLE_FLOW_FX.hitDefault;
}

export function resolveBattleGeneralSkillEffectKey(sourceType?: SkillSourceType): string {
  return sourceType === SkillSourceType.Ultimate
    ? BATTLE_FLOW_FX.skillUltimate
    : BATTLE_FLOW_FX.skillSeed;
}

export function resolveBattleResultEffectKey(result: string): string | null {
  if (result === 'player-win') return BATTLE_FLOW_FX.battleWin;
  if (result === 'enemy-win') return BATTLE_FLOW_FX.battleLose;
  if (result === 'draw') return BATTLE_FLOW_FX.battleDraw;
  return null;
}

export function playBattleFlowEffectAtCell(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  effectKey: string,
  lane: number | null | undefined,
  depth: number | null | undefined,
  duration = 1.0,
  yOffset = 0.08,
): void {
  if (lane === null || lane === undefined || depth === null || depth === undefined) {
    return;
  }

  const position = boardRenderer?.getCellWorldPosition(lane, depth, yOffset);
  if (!position) {
    return;
  }

  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, position);
    return;
  }

  effectSystem.playBlock(effectKey, position, undefined, duration);
}

export function playBattleFlowEffectAtBoardCenter(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  effectKey: string,
  duration = 1.5,
): void {
  const metrics = boardRenderer?.getBoardMetrics();
  if (!metrics) {
    return;
  }

  const center = metrics.center.clone();
  center.y += 0.16;

  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, center);
    return;
  }

  effectSystem.playBlock(effectKey, center, undefined, duration);
}

/**
 * 主將技能光效：打在施放技能的那位主將身上，玩家看得出是誰放的（PROG-2-9365，使用者裁決）。
 * 以前固定打在棋盤正中央，和施放者沒有關聯。拿不到主將位置時（棋盤還沒建好）退回棋盤中央，光效不漏播。
 */
export function playBattleGeneralSkillEffect(
  effectSystem: BattleFlowEffectSystem,
  boardRenderer: BattleFlowBoardRenderer | null | undefined,
  casterPosition: Vec3 | null | undefined,
  effectKey: string,
  duration = 1.5,
): void {
  if (!casterPosition) {
    playBattleFlowEffectAtBoardCenter(effectSystem, boardRenderer, effectKey, duration);
    return;
  }
  if (effectSystem.getEffectDef(effectKey)) {
    effectSystem.playFullEffect(effectKey, casterPosition);
    return;
  }
  effectSystem.playBlock(effectKey, casterPosition, undefined, duration);
}
