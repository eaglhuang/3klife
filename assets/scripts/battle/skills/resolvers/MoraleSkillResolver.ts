import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import { applyMorale } from '../SkillEffectFormulas';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';

/** 鼓舞（morale，PROG-2-0769）：所有存活友軍士氣 +moraleBonus */
export class MoraleSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'morale';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'morale') {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const allies = context.getFactionUnits(casterFaction).filter((unit) => !unit.isDead());
    if (!allies.length) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    const bonus = profile.moraleBonus ?? 0;
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (const unit of allies) {
      unit.morale = applyMorale(unit.morale, bonus);
      deltas.push({ unitUid: unit.id, notes: `morale:+${bonus}` });
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${unit.morale}`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
