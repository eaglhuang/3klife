// @spec-source → 奧義系統.md（ult-cao-cao-3 挾天子令：控制一名敵將為我方行動 2 回合）；PROG-2-1335
import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';

/** 控制：依自動瞄準選一名敵兵，陣營切為施放者，期滿換回（BattleState.tickControlledUnits） */
export class ControlOverrideSkillResolver implements BattleSkillResolver {
  constructor(private readonly targetSelector = new BattleSkillTargetSelector()) {}

  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'control-override';
  }

  public execute(
    request: BattleSkillRequest,
    context: BattleSkillExecutionContext,
  ): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'control-override') {
      return {
        requestId,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'missing-skill-profile',
        deltas: [],
        battleLogLines: [`Missing control-override skill profile for ${request.battleSkillId}`],
      };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const [target] = this.targetSelector.selectTargets(request, profile, context);
    if (!target || !context.controlUnit?.(target, casterFaction, profile.controlTurns ?? 2)) {
      return {
        requestId,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'no-target',
        deltas: [],
        battleLogLines: [`${request.battleSkillId} found no enemy to control`],
      };
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return {
      requestId,
      battleSkillId: request.battleSkillId,
      applied: true,
      deltas: [{ unitUid: target.id, notes: `control:${request.battleSkillId}:${profile.controlTurns ?? 2}` }],
      battleLogLines: [`${request.battleSkillId}:control:${target.id}:${profile.controlTurns ?? 2}`],
    };
  }
}
