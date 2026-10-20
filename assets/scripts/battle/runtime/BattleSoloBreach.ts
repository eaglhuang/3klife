// @spec-source → 戰法系統 G-2 單騎破陣（趙雲教官靈感）；PROG-2-0794（PM 暫定裁定）
import type { TroopUnit } from '../../core/models/TroopUnit';
import { isOrthogonallyAdjacent } from '../../core/systems/FactorTacticLinkage';
import { soloAttackMultiplier } from '../skills/SkillEffectFormulas';

/** 單騎破陣的帶者：規格表列趙雲，未列的武將預設也給趙雲（PM 裁定） */
export const SOLO_BREACH_CARRIER_GENERAL_ID = 'zhao-yun';

/**
 * 回合開始重算單騎破陣：帶者（武將化身單位）正交 1 格無存活友軍則 ATK ×1.3，否則 ×1。
 * 每回合開始都會重算，所以上一回合的效果會在施放者下一回合開始時結束。
 */
export function applySoloBreachAtTurnStart(
  units: readonly TroopUnit[],
  carrierGeneralId: string | null,
  carrierUnitId: string | null,
): void {
  for (const unit of units) {
    unit.soloBreachMultiplier = 1;
  }
  if (carrierGeneralId !== SOLO_BREACH_CARRIER_GENERAL_ID || !carrierUnitId) return;

  const carrier = units.find((unit) => unit.id === carrierUnitId);
  if (!carrier || carrier.isDead()) return;

  const hasAdjacentAlly = units.some((unit) =>
    unit !== carrier
    && unit.faction === carrier.faction
    && !unit.isDead()
    && isOrthogonallyAdjacent(carrier.lane, carrier.depth, unit.lane, unit.depth));
  carrier.soloBreachMultiplier = soloAttackMultiplier(hasAdjacentAlly);
}

