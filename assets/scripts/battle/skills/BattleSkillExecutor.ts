// @spec-source → 戰法系統.md (doc_spec_0038)；PROG-2-1429 依建檔紀錄補標出處
import type { BattleSkillRequest, SkillExecutionResult } from '../../shared/SkillRuntimeContract';
import type { BattleSkillExecutionContext, BattleSkillResolver } from './BattleSkillResolver';
import { moduleTagsOfSkill } from './BattleSkillModuleTags';
import { resolveBattleSkillProfile } from './BattleSkillProfiles';
import { BURN_CONFIG } from '../shared/BurnStatus';
import { FIRE_HAZARD_DAMAGE_PER_TURN } from './SkillEffectFormulas';
import { gridHookKindOfElement, tacticElementOfSkill } from '../shared/TacticVfxHooks';

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
    if (result.applied) this.applyFireAttackAftermath(request.battleSkillId, result, context);
    if (result.applied) this.emitGridVfx(request.battleSkillId, result, context);
    const moduleTags = result.applied ? moduleTagsOfSkill(resolveBattleSkillProfile(request.battleSkillId)) : [];
    return { ...result, moduleTags };
  }

  /** 火計／水計（PROG-2-9960 接線）：施放命中的每個格子送一次格子 hook，由 View 播 vfx-block 組合。 */
  private emitGridVfx(skillId: string, result: SkillExecutionResult, context: BattleSkillExecutionContext): void {
    if (!context.emitGridVfx) return;
    const kind = gridHookKindOfElement(tacticElementOfSkill(skillId, resolveBattleSkillProfile(skillId)?.tags));
    if (!kind) return;
    const seen = new Set<string>();
    for (const delta of result.deltas) {
      if (!delta.unitUid) continue;
      const unit = context.getUnit(delta.unitUid);
      if (!unit) continue;
      const key = `${unit.lane}:${unit.depth}`;
      if (seen.has(key)) continue;
      seen.add(key);
      context.emitGridVfx(kind, { lane: unit.lane, depth: unit.depth });
    }
  }

  /**
   * 火攻類戰法命中後（PROG-2-9726，使用者 11/22 裁決）：命中的敵方單位燃燒，並在其所在格留下火格。
   * 火攻類＝profile.tags 含 fire，或 burnOnHit。命中單位取 deltas 中有扣血或標記 fire: 的目標；
   * 火計連環／火神狩獵已自行放火格（hazardCross、push-fire），這裡不重複放。
   */
  private applyFireAttackAftermath(skillId: string, result: SkillExecutionResult, context: BattleSkillExecutionContext): void {
    const profile = resolveBattleSkillProfile(skillId);
    if (!profile || !(profile.burnOnHit || profile.tags?.includes(BURN_CONFIG.fireSkillTag))) return;
    const hitIds = new Set<string>();
    for (const delta of result.deltas) {
      if (!delta.unitUid) continue;
      if ((delta.deltaHp ?? 0) < 0 || delta.notes?.startsWith('fire:')) hitIds.add(delta.unitUid);
    }
    const ownsTile = !!profile.hazardCross || profile.effectKind === 'push-fire';
    for (const unitId of hitIds) {
      const unit = context.getUnit(unitId);
      if (!unit || unit.isDead()) continue;
      context.addUnitBurn?.(unit);
      if (!ownsTile) context.setTileHazard?.({ lane: unit.lane, depth: unit.depth }, FIRE_HAZARD_DAMAGE_PER_TURN);
    }
  }
}
