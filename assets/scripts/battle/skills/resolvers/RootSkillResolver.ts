import { Faction, GAME_CONFIG, StatusEffect } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { squareCells } from '../SkillGridGeometry';

/**
 * 定身（root）：以施放者為中心的 3x3 內所有敵軍施加 Rooted（PROG-2-0764）。
 * 定身的效果由移動階段讀取，施放後該單位在 rootTurns 回合內無法移動。
 */
export class RootSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'root';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'root') {
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

    const turns = profile.rootTurns ?? 1;
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (const unit of targets) {
      context.applyBuff(unit, StatusEffect.Rooted, turns);
      deltas.push({ unitUid: unit.id, notes: `root:${request.battleSkillId}` });
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${turns}`);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
