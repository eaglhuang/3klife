import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';

/** 毒箭（dot，PROG-2-0766）：目標中毒，之後每回合於其陣營的戰術階段結算 */
export class DotSkillResolver implements BattleSkillResolver {
  constructor(private readonly targetSelector = new BattleSkillTargetSelector()) {}

  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'dot';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'dot' || !context.addUnitDot) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const targets = this.targetSelector.selectTargets(request, profile, context).filter((unit) => !unit.isDead());
    if (!targets.length) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    const ratio = profile.dotMaxHpRatio ?? 0.1;
    const turns = profile.statusTurns ?? 2;
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (const unit of targets) {
      context.addUnitDot(unit, ratio, turns);
      deltas.push({ unitUid: unit.id, notes: `dot:${request.battleSkillId}` });
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${turns}`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
