// @spec-source → 奧義系統.md §F-6-2（ult-cao-cao-4 對酒當歌：全軍精力回復 20%）
import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';

/** 精力回復（vitality，對酒當歌）：所屬陣營武將回復精力上限 × vitalityRestoreRatio，封頂精力上限 */
export class VitalityRestoreSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'vitality';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'vitality') {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    // 施放者陣營：有戰場單位用單位陣營；否則 ownerUid 即陣營代號（同 MoraleSkillResolver）
    const casterFaction = context.getUnit(request.ownerUid)?.faction ?? (request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player);
    const ratio = profile.vitalityRestoreRatio ?? 0;
    const restored = context.restoreFactionVitality?.(casterFaction, ratio) ?? false;
    if (!restored) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'no-target', deltas: [], battleLogLines: [] };
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas: [], battleLogLines: [`vitality:+${ratio}`] };
  }
}
