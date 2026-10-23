import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { forcedMoveBlockedDamageRatio } from '../../shared/ForcedMoveTile';
import { pushAway } from '../../shared/PushMove';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';
import { FIRE_HAZARD_DAMAGE_PER_TURN } from '../SkillEffectFormulas';

/**
 * 火神狩獵（push-fire，PROG-2-0771）：單體敵軍遠離施放者 pushSteps 格，
 * 並把該敵軍「原本所在的格」設為火場（每回合傷害沿用 FIRE_HAZARD_DAMAGE_PER_TURN）。
 * 位移受阻的傷害與 PushSkillResolver 一致（PM 暫定：每步 5%，上限 20%）。
 */
export class FireGodHuntSkillResolver implements BattleSkillResolver {
  constructor(private readonly targetSelector = new BattleSkillTargetSelector()) {}

  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'push-fire';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'push-fire' || !context.isCellFreeForPush || !context.pushUnitTo) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const center = context.getCasterCell?.(casterFaction) ?? null;
    if (!center) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-caster-position', deltas: [], battleLogLines: [] };
    }

    const target = this.targetSelector.selectTargets(request, profile, context)
      .find((unit) => !unit.isDead());
    if (!target) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    // 先記下原格：擊退後火場要落在目標「原本站的格」，不是它被推去的新格
    const originCell = { lane: target.lane, depth: target.depth };
    const steps = profile.pushSteps ?? 1;
    const plan = pushAway(target, center, steps, context.isCellFreeForPush);
    const deltas: SkillExecutionResult['deltas'] = [];
    if (plan.movedSteps > 0) {
      context.pushUnitTo!(target, plan.lane, plan.depth);
      deltas.push({ unitUid: target.id, notes: `push:${plan.movedSteps}` });
    }
    if (plan.blocked && context.applyDamage) {
      const ratio = forcedMoveBlockedDamageRatio(steps - plan.movedSteps);
      const damage = Math.round(target.maxHp * ratio);
      if (damage > 0) {
        context.applyDamage(target, damage, casterFaction);
        deltas.push({ unitUid: target.id, deltaHp: -damage, notes: 'push-blocked' });
      }
    }

    context.setTileHazard?.(originCell, FIRE_HAZARD_DAMAGE_PER_TURN);
    deltas.push({ unitUid: target.id, notes: `fire:${originCell.lane},${originCell.depth}` });

    const battleLogLines = [`${profile.battleLogKey ?? request.battleSkillId}:${target.id}:${plan.movedSteps}`];
    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
