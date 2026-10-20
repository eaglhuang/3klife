import type { BattleSkillRequest, SkillExecutionResult } from '../../shared/SkillRuntimeContract';
import type { BattleSkillExecutionContext, BattleSkillResolver } from './BattleSkillResolver';
import { moduleTagsOfSkill } from './BattleSkillModuleTags';
import { resolveBattleSkillProfile } from './BattleSkillProfiles';

export class BattleSkillExecutor {
  constructor(private readonly resolvers: BattleSkillResolver[]) {}

  public execute(
    request: BattleSkillRequest,
    context: BattleSkillExecutionContext,
  ): SkillExecutionResult {
    const resolver = this.resolvers.find((candidate) => candidate.canResolve(request));
    if (!resolver) {
      return {
        requestId: `${request.ownerUid}:${request.battleSkillId}`,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'no-resolver',
        deltas: [],
        battleLogLines: [`No resolver for ${request.battleSkillId}`],
      };
    }

    const result = resolver.execute(request, context);
    return { ...result, moduleTags: moduleTagsOfSkill(resolveBattleSkillProfile(request.battleSkillId)) };
  }
}
