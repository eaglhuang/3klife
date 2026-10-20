import { Faction, StatusEffect } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';

/**
 * 緩速（slow）：目標施加 Slow，下一回合移動力減少（PROG-2-0765）。
 * 移動階段既有的 Slow 判定以 1 格懲罰計算，與規格 Move - 1 相同。
 */
export class SlowSkillResolver implements BattleSkillResolver {
  constructor(private readonly targetSelector = new BattleSkillTargetSelector()) {}

  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'slow';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'slow') {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const targets = this.targetSelector.selectTargets(request, profile, context);
    if (!targets.length) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    const turns = profile.statusTurns ?? 1;
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (const unit of targets) {
      if (unit.isDead()) continue;
      context.applyBuff(unit, StatusEffect.Slow, turns);
      deltas.push({ unitUid: unit.id, notes: `slow:${request.battleSkillId}` });
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${turns}`);
    }
    if (!deltas.length) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'all-targets-dead', deltas: [], battleLogLines: [] };
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
