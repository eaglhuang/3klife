import { Faction, GAME_CONFIG } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { FORMATION_ZONE_TURNS, FORMATION_ZONE_MULTIPLIER, type FormationZone } from '../../shared/FormationZone';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { squareCells } from '../SkillGridGeometry';

/**
 * 八陣圖（PROG-2-0761）：以施放者腳下為中心，3x3 區域成為持續防禦區。
 * PM 暫定：區域持續 3 回合；施放者陣亡即移除（由 BattleTileEffectPhase 推進）。
 */
export class FormationZoneSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'tile-buff';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile || profile.effectKind !== 'tile-buff') {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-skill-profile', deltas: [], battleLogLines: [] };
    }

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const center = context.getCasterCell?.(casterFaction) ?? null;
    const casterUnitId = context.getCasterUnitId?.(casterFaction) ?? null;
    if (!center || !casterUnitId || !context.addFormationZone) {
      return { requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason: 'missing-caster-position', deltas: [], battleLogLines: [`${request.battleSkillId} has no caster position`] };
    }

    const cells = squareCells(center.lane, center.depth, 1, GAME_CONFIG.GRID_LANES, GAME_CONFIG.GRID_DEPTH);
    for (const cell of cells) {
      const zone: FormationZone = {
        id: `formation-${cell.lane}-${cell.depth}`,
        lane: cell.lane,
        depth: cell.depth,
        zoneFaction: casterFaction,
        casterUnitId,
        defenseMultiplier: FORMATION_ZONE_MULTIPLIER,
        remainingTurns: FORMATION_ZONE_TURNS,
      };
      context.addFormationZone(zone);
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return {
      requestId,
      battleSkillId: request.battleSkillId,
      applied: true,
      deltas: [],
      battleLogLines: [`${profile.battleLogKey ?? request.battleSkillId}:${cells.length}`],
    };
  }
}
