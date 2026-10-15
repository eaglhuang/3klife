import { Faction, GAME_CONFIG } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { pushAway } from '../../shared/PushMove';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { squareCells } from '../SkillGridGeometry';

/**
 * 位移（push）：以施放者為中心 3x3 內的敵軍遠離施放者 pushSteps 格（PROG-2-0767）。
 * 遇障礙即停；沒有被位移的單位不扣血（規格未寫受阻傷害）。
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
      squareCells(center.lane, center.depth, 1, GAME_CONFIG.GRID_LANES, GAME_CONFIG.GRID_DEPTH).map((c) => `${c.lane},${c.depth}`),
    );
    const targets = context.getOpposingUnits(casterFaction)
      .filter((unit) => !unit.isDead() && cellKeys.has(`${unit.lane},${unit.depth}`));
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
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${plan.movedSteps}`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
