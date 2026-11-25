// @spec-source → 戰鬥增益減益效果堆疊與治療結算規格書.md（doc_spec_0359）§3 燃燒；PROG-2-9726（使用者 11/22 裁決）
import { EVENT_NAMES } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { TroopUnit } from '../../core/models/TroopUnit';
import type { BattleState } from '../models/BattleState';
import { BURN_CONFIG, BURN_STATUS_ID, applyUnitBurn } from '../shared/BurnStatus';

/**
 * 讓單位燃燒（火格結算、火攻戰法命中共用）：疊層／刷新回合後送 BuffApplied，
 * 由 BattleUIBridge 排進戰鬥動畫佇列飄「燃燒」字；頭頂圖示由 UnitStatusIcons 讀 state.unitBurns。
 * 已陣亡單位不處理；單位身上沒有蔓延邏輯（BURN_CONFIG.burn.spreads 固定 false）。
 */
export function igniteUnit(state: BattleState, unit: TroopUnit): void {
  if (unit.isDead()) return;
  const burn = applyUnitBurn(state.unitBurns, unit.id, BURN_CONFIG);
  services().event.emit(EVENT_NAMES.BuffApplied, { unitId: unit.id, effect: BURN_STATUS_ID, turns: burn.remainingTurns, stacks: burn.stacks });
}
