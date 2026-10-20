import { Faction } from '../../../core/config/Constants';
import { BattleSkillTargetMode, type BattleSkillRequest, type SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { GAME_CONFIG } from '../../../core/config/Constants';
import { BattleSkillDamageResolver } from '../BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { BattleSkillTargetSelector } from '../BattleSkillTargetSelector';
import { crossCellsForAll } from '../SkillGridGeometry';
import { FIRE_HAZARD_DAMAGE_PER_TURN } from '../SkillEffectFormulas';

export class ProjectedDamageSkillResolver implements BattleSkillResolver {
  constructor(
    private readonly targetSelector = new BattleSkillTargetSelector(),
    private readonly damageResolver = new BattleSkillDamageResolver(),
  ) {}

  public canResolve(request: BattleSkillRequest): boolean {
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (profile?.effectKind && profile.effectKind !== 'damage') {
      return false;
    }
    return profile != null && [
      BattleSkillTargetMode.EnemyAll,
      BattleSkillTargetMode.EnemySingle,
      BattleSkillTargetMode.Line,
      BattleSkillTargetMode.Fan,
      BattleSkillTargetMode.Tile,
      BattleSkillTargetMode.Area,
      BattleSkillTargetMode.AdjacentTiles,
    ].includes(profile.targetMode);
  }

  public execute(
    request: BattleSkillRequest,
    context: BattleSkillExecutionContext,
  ): SkillExecutionResult {
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    if (!profile) {
      return {
        requestId: `${request.ownerUid}:${request.battleSkillId}`,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'missing-skill-profile',
        deltas: [],
        battleLogLines: [`Missing battle skill profile for ${request.battleSkillId}`],
      };
    }

    const casterFaction = this.resolveCasterFaction(request);
    const caster = context.getCasterGeneral(casterFaction);
    if (!caster) {
      return {
        requestId: `${request.ownerUid}:${request.battleSkillId}`,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'missing-caster-general',
        deltas: [],
        battleLogLines: [`Missing caster general for ${request.battleSkillId}`],
      };
    }

    const targets = this.targetSelector.selectTargets(request, profile, context);
    if (!targets.length) {
      return {
        requestId: `${request.ownerUid}:${request.battleSkillId}`,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'no-target',
        deltas: [],
        battleLogLines: [`${request.battleSkillId} found no target`],
      };
    }

    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    let hitCount = 0;
    // 多段技能（如趙家槍法）：每段對全部目標各結算一次，段數由 hitStageMultipliers 決定
    const stageCount = profile.hitStageMultipliers?.length ?? 1;

    for (let stage = 0; stage < stageCount; stage += 1) {
      for (const unit of targets) {
        if (unit.isDead()) {
          continue;
        }

        const damage = this.damageResolver.resolveDamage(profile, caster, unit, context, hitCount, stage);
        hitCount += 1;
        context.applyDamage(unit, damage, casterFaction);
        deltas.push({ unitUid: unit.id, deltaHp: -damage });
        battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}:${damage}`);
        if (profile.resetSelfOnKill && unit.isDead()) {
          // 威震華夏（PROG-2-0773）：致命一擊後施放者行動重置，再行動 1 次（首擊倍率維持 1）
          const casterUnitId = context.getCasterUnitId?.(casterFaction) ?? null;
          const casterUnit = casterUnitId ? context.getUnit(casterUnitId) : null;
          if (casterUnit && !casterUnit.isDead()) {
            context.registerActionReset(casterUnit, request.battleSkillId, 1, 1);
            deltas.push({ unitUid: casterUnit.id, notes: `reset-on-kill:${request.battleSkillId}` });
          }
        }
      }
    }

    if (!hitCount) {
      return {
        requestId: `${request.ownerUid}:${request.battleSkillId}`,
        battleSkillId: request.battleSkillId,
        applied: false,
        blockedReason: 'all-targets-dead',
        deltas: [],
        battleLogLines: [`${request.battleSkillId} skipped because all targets were dead`],
      };
    }

    // 火計連環（PROG-2-0757）：每個目標的十字相鄰格（含自身）化為火場
    if (profile.hazardCross && context.setTileHazard) {
      const centers = targets.map((unit) => ({ lane: unit.lane, depth: unit.depth }));
      for (const cell of crossCellsForAll(centers, GAME_CONFIG.GRID_LANES, GAME_CONFIG.GRID_DEPTH)) {
        context.setTileHazard(cell, FIRE_HAZARD_DAMAGE_PER_TURN);
      }
    }

    context.emitSkillEffect(request.battleSkillId, casterFaction);

    return {
      requestId: `${request.ownerUid}:${request.battleSkillId}`,
      battleSkillId: request.battleSkillId,
      applied: true,
      deltas,
      battleLogLines,
    };
  }

  private resolveCasterFaction(request: BattleSkillRequest): Faction {
    return request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
  }
}
