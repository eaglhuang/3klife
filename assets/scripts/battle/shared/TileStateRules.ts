import type { TileEffect } from '../models/BattleState';

/**
 * 格子狀態四類（WBS GRD-01，血統與戰場格子規格）：
 * normal 無效果；hazard 進格扣血；force-move 進格被推移；stealth 進格隱蔽。
 * 分類由既有 TileEffect 欄位推導，規則表是資料，不寫死在執行路徑。
 */
export type TileStateKind = 'normal' | 'hazard' | 'force-move' | 'stealth';

export interface TileStateRule {
  readonly kind: TileStateKind;
  readonly damagesOnEnter: boolean;
  readonly pushesOnEnter: boolean;
  readonly hidesOnEnter: boolean;
}

export const TILE_STATE_RULES: Readonly<Record<TileStateKind, TileStateRule>> = {
  normal: { kind: 'normal', damagesOnEnter: false, pushesOnEnter: false, hidesOnEnter: false },
  hazard: { kind: 'hazard', damagesOnEnter: true, pushesOnEnter: false, hidesOnEnter: false },
  'force-move': { kind: 'force-move', damagesOnEnter: false, pushesOnEnter: true, hidesOnEnter: false },
  stealth: { kind: 'stealth', damagesOnEnter: false, pushesOnEnter: false, hidesOnEnter: true },
};

/** 由 TileEffect 欄位推導四類之一；沒有效果或只是裝飾的格子為 normal。 */
export function tileStateKindOf(effect: TileEffect | null | undefined): TileStateKind {
  if (!effect) return 'normal';
  if ((effect.damagePerTurn ?? 0) > 0) return 'hazard';
  if (effect.forcedMoveDirection) return 'force-move';
  if (effect.state === 'ambush-field') return 'stealth';
  return 'normal';
}

export function tileStateRuleOf(effect: TileEffect | null | undefined): TileStateRule {
  return TILE_STATE_RULES[tileStateKindOf(effect)];
}
