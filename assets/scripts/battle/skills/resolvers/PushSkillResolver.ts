import { Faction, GAME_CONFIG } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { forcedMoveBlockedDamageRatio } from '../../shared/ForcedMoveTile';
import { pushAway } from '../../shared/PushMove';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { squareCells } from '../SkillGridGeometry';

/**
 * 位移（push）：以施放者為中心 pushRadius（預設 3x3）內的敵軍遠離施放者 pushSteps 格（PROG-2-0767）。
 * 遇障礙即停；受阻時依未走完的步數扣最大 HP（每步 5%，上限 20%，PM 暫定）。
 */
export class PushSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'push';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'push' || !context.isCellFreeForPush || !context.pushUnitTo) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const center = context.getCasterCell?.(casterFaction) ?? null;
    if (!center) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-caster-position', deltas: [], battleLogLines: [] };
    }

    const cellKeys = new Set(
      squareCells(center.lane, center.depth, profile.pushRadius ?? 1, GAME_CONFIG.GRID_LANES, GAME_CONFIG.GRID_DEPTH)
        .map((c) => `${c.lane},${c.depth}`),
    );
    // 空城計（PROG-2-0777）：施放者主將智力須高於該敵軍所屬武將，否則不位移
    const casterInt = profile.pushRequiresIntAdvantage ? context.getCasterGeneral(casterFaction)?.int : undefined;
    const targets = context.getOpposingUnits(casterFaction)
      .filter((unit) => !unit.isDead() && cellKeys.has(`${unit.lane},${unit.depth}`))
      .filter((unit) => {
        if (!profile.pushRequiresIntAdvantage) return true;
        const targetInt = context.getCasterGeneral(unit.faction)?.int;
        return casterInt !== undefined && targetInt !== undefined && casterInt > targetInt;
      });
    if (!targets.length) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    const steps = profile.pushSteps ?? 1;
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (const unit of targets) {
      const plan = pushAway(unit, center, steps, context.isCellFreeForPush);
      if (plan.movedSteps > 0) {
        context.pushUnitTo(unit, plan.lane, plan.depth);
        deltas.push({ unitUid: unit.id, notes: `push:${plan.movedSteps}` });
      }
      // 受阻傷害（PM 暫定，PROG-2-0768）：未走完的每一步扣最大 HP 5%，上限 20%，與地形強制位移一致
      if (plan.blocked && context.applyDamage) {
        const ratio = forcedMoveBlockedDamageRatio(steps - plan.movedSteps);
        const damage = Math.round(unit.maxHp * ratio);
        if (damage > 0) {
          context.applyDamage(unit, damage, casterFaction);
          deltas.push({ unitUid: unit.id, deltaHp: -damage, notes: 'push-blocked' });
        }
      }
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${plan.movedSteps}`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
