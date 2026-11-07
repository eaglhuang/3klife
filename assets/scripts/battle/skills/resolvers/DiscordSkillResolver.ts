// @spec-source → WBS SCN-09；PROG-2-1972 #14 暫定裁決；PROG-2-1985
import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';
import { DISCORD_TURNS, pickDiscordPartner } from '../special/SpecialDiscordRule';

/** 離間：自動瞄準一名敵兵，2 格內有同伴才讓它倒戈 controlTurns 回合，兩隊互攻 */
export class DiscordSkillResolver implements BattleSkillResolver {
  constructor(private readonly targetSelector = new BattleSkillTargetSelector()) {}

  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'discord';
  }

  public execute(
    request: BattleSkillRequest,
    context: BattleSkillExecutionContext,
  ): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    const blocked = (blockedReason: string, line: string): SkillExecutionResult => ({
      requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason, deltas: [], battleLogLines: [line],
    });
    if (!profile || profile.effectKind !== 'discord') {
      return blocked('missing-skill-profile', `Missing discord skill profile for ${request.battleSkillId}`);
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const turns = profile.controlTurns ?? DISCORD_TURNS;
    const [target] = this.targetSelector.selectTargets(request, profile, context);
    const partner = target ? pickDiscordPartner(target, context.getFactionUnits(target.faction)) : null;
    if (!target || !partner) return blocked('no-target', `${request.battleSkillId} found no enemy pair to sow discord`);
    if (target.controlResistChance > 0 && (context.randomSource?.() ?? Math.random()) < target.controlResistChance) {
      return blocked('control-resisted', `${request.battleSkillId}:resisted:${target.id}`);
    }
    if (!context.controlUnit?.(target, casterFaction, turns)) {
      return blocked('no-target', `${request.battleSkillId} found no enemy pair to sow discord`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return {
      requestId,
      battleSkillId: request.battleSkillId,
      applied: true,
      deltas: [{ unitUid: target.id, notes: `discord:${request.battleSkillId}:${partner.id}:${turns}` }],
      battleLogLines: [`${request.battleSkillId}:discord:${target.id}:${partner.id}:${turns}`],
    };
  }
}
