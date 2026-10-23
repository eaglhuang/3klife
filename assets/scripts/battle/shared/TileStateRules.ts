import type { TileEffect, TileEffectState } from '../models/BattleState';

/**
 * 格子狀態分類（WBS GRD-01，血統與戰場格子規格；PROG-2-0589 依實際時機校正）。
 * normal 無效果；hazard 回合結束扣血；river-current 回合結束推移；force-move 進格推移；
 * stealth 進格隱蔽；blocked 進格阻擋（岩石）。分類由既有 TileEffect 欄位推導，規則表是資料。
 */
export type TileStateKind = 'normal' | 'hazard' | 'river-current' | 'force-move' | 'stealth' | 'blocked';

export interface TileStateRule {
  readonly kind: TileStateKind;
  readonly blocksOnEnter: boolean;
  readonly damagesOnTurnEnd: boolean;
  readonly pushesOnTurnEnd: boolean;
  readonly pushesOnEnter: boolean;
  readonly hidesOnEnter: boolean;
}

const NO_RULE = { blocksOnEnter: false, damagesOnTurnEnd: false, pushesOnTurnEnd: false, pushesOnEnter: false, hidesOnEnter: false };

export const TILE_STATE_RULES: Readonly<Record<TileStateKind, TileStateRule>> = {
  normal: { kind: 'normal', ...NO_RULE },
  hazard: { kind: 'hazard', ...NO_RULE, damagesOnTurnEnd: true },
  'river-current': { kind: 'river-current', ...NO_RULE, pushesOnTurnEnd: true },
  'force-move': { kind: 'force-move', ...NO_RULE, pushesOnEnter: true },
  stealth: { kind: 'stealth', ...NO_RULE, hidesOnEnter: true },
  blocked: { kind: 'blocked', ...NO_RULE, blocksOnEnter: true },
};

/** 固定地形格（掩體、營帳）：火場等暫時性格子狀態不覆蓋（PROG-2-0758，PM 暫定） */
const FIXED_TILE_STATES: ReadonlySet<TileEffectState> = new Set<TileEffectState>(['ambush-field', 'scene-camp']);

export function isFixedTileState(state: TileEffectState): boolean {
  return FIXED_TILE_STATES.has(state);
}

/** 由 TileEffect 欄位推導四類之一；沒有效果或只是裝飾的格子為 normal。 */
export function tileStateKindOf(effect: TileEffect | null | undefined): TileStateKind {
  if (!effect) return 'normal';
  if (effect.blocksMovement === true) return 'blocked';
  if ((effect.damagePerTurn ?? 0) > 0) return 'hazard';
  if (effect.state === 'river-current') return 'river-current';
  if (effect.forcedMoveDirection) return 'force-move';
  if (effect.state === 'ambush-field') return 'stealth';
  return 'normal';
}

export function tileStateRuleOf(effect: TileEffect | null | undefined): TileStateRule {
  return TILE_STATE_RULES[tileStateKindOf(effect)];
}
