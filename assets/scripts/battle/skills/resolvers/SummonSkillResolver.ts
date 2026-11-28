// @spec-source → 戰場召喚招式召喚物數量存活與五路站位規格書 (doc_spec_1359)；PROG-2-10253
import { Faction } from '../../../core/config/Constants';
import type { BattleSkillRequest, SkillExecutionResult } from '../../../shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../BattleSkillProfiles';
import type { BattleSkillExecutionContext, BattleSkillResolver } from '../BattleSkillResolver';
import { pickSummonCell, summonAllowedCount } from '../../shared/SummonRule';

/**
 * 召喚（summon，PROG-2-10253）：在施放者前方（其次後方、再其次靠中間的空路）生成短命小兵隊。
 * 無空格或同陣營召喚物已達上限時施放失敗（applied=false，呼叫端不扣 SP）。
 * 召喚物固定出生路、不可換路；生成當回合不可行動（由 spawnSummon 內部處理）。
 */
export class SummonSkillResolver implements BattleSkillResolver {
  public canResolve(request: BattleSkillRequest): boolean {
    return resolveBattleSkillProfile(request.battleSkillId)?.effectKind === 'summon';
  }

  public execute(request: BattleSkillRequest, context: BattleSkillExecutionContext): SkillExecutionResult {
    const requestId = `${request.ownerUid}:${request.battleSkillId}`;
    const profile = resolveBattleSkillProfile(request.battleSkillId);
    const fail = (blockedReason: string): SkillExecutionResult => ({
      requestId, battleSkillId: request.battleSkillId, applied: false, blockedReason, deltas: [], battleLogLines: [],
    });
    const spec = profile?.summon;
    if (!profile || profile.effectKind !== 'summon' || !spec) return fail('missing-skill-profile');
    if (!context.spawnSummon || !context.getBoardCells) return fail('summon-unsupported');

    const casterFaction = request.ownerUid === Faction.Enemy ? Faction.Enemy : Faction.Player;
    const casterCell = context.getCasterCell?.(casterFaction);
    if (!casterCell) return fail('no-target');

    const alive = context.getFactionUnits(casterFaction).filter((u) => !u.isDead() && u.summonedBy !== null).length;
    const allowed = summonAllowedCount(alive, spec);
    if (allowed <= 0) return fail('summon-cap-reached');

    const cells = context.getBoardCells();
    const grid = {
      lanes: cells.reduce((m, c) => Math.max(m, c.lane + 1), 0),
      depths: cells.reduce((m, c) => Math.max(m, c.depth + 1), 0),
    };
    const casterUnitId = context.getCasterUnitId?.(casterFaction) ?? null;
    const picked: Array<{ lane: number; depth: number }> = [];
    const deltas: SkillExecutionResult['deltas'] = [];
    const battleLogLines: string[] = [];
    for (let i = 0; i < allowed; i++) {
      const cell = pickSummonCell(casterFaction, casterCell.lane, casterCell.depth, grid, (l, d) => context.isCellFreeForPush?.(l, d) ?? false, picked);
      if (!cell) break;
      const unit = context.spawnSummon(casterFaction, spec, cell.lane, cell.depth, casterUnitId);
      if (!unit) break;
      picked.push(cell);
      deltas.push({ unitUid: unit.id, notes: `summon:${spec.troop}:${cell.lane},${cell.depth}` });
      battleLogLines.push(`${profile.battleLogKey ?? request.battleSkillId}:${unit.id}`);
    }
    if (!deltas.length) return fail('no-target');

    context.emitSkillEffect(request.battleSkillId, casterFaction);
    return { requestId, battleSkillId: request.battleSkillId, applied: true, deltas, battleLogLines };
  }
}
