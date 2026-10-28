// @spec-source → 奧義系統.md（ult-cao-cao-2 唯才是舉：立即復活一名已陣亡友軍，50% HP）；PROG-2-1334
import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';

/** 復活：把施放者陣營一名陣亡兵放回戰場（原格，被占則最近空格），血量為最大 HP 的 reviveHpRatio */
export class ReviveSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'revive';
  }

  public execute(
    request: BattleSkillRequest,
    context: BattleSkillExecutionContext,
  ): SkillExecutionResult {
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    if (!profile || profile.effectKind !== 'revive') {
      return {
        requestId,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'missing-skill-profile',
        deltas: [],
        battleLogLines: [`Missing revive skill profile for ${request.battleSkillId}`],
      };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const revived = context.reviveFallenFriendly?.(casterFaction, profile.reviveHpRatio ?? 0.5) ?? null;
    if (!revived) {
      return {
        requestId,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'no-target',
        deltas: [],
        battleLogLines: [`${request.battleSkillId} found no fallen friendly to revive`],
      };
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return {
      requestId,
      battleSkillId: request.battleSkillId,
      applied: true,
      deltas: [{ unitUid: revived.id, notes: `revive:${request.battleSkillId}` }],
      battleLogLines: [`${request.battleSkillId}:revive:${revived.id}:${revived.currentHp}`],
    };
  }
}
