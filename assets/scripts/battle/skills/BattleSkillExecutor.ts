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
    // 只有套用成功才回報代號；被阻擋或未套用的施放回空清單（PROG-2-0772）
    const moduleTags = result.applied ? moduleTagsOfSkill(resolveBattleSkillProfile(request.battleSkillId)) : [];
    return { ...result, moduleTags };
  }
}
