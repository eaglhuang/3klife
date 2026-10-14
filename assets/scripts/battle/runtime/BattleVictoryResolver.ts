import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { BattleState } from '../models/BattleState';
import type { BattleResult } from './BattleRuntimeContract';

export function resolveBattleVictory(state: BattleState): BattleResult {
  const svc = services();
  const playerGeneral = state.playerGeneral;
  const enemyGeneral = state.enemyGeneral;

  const playerLost = (playerGeneral?.isDead() ?? false)
    || state.playerFortressHp <= 0
    || svc.battle.isTurnLimitReached();

  const enemyLost = (enemyGeneral?.isDead() ?? false)
    || state.enemyFortressHp <= 0;

  let result: BattleResult = 'ongoing';
  if (playerLost && enemyLost) result = 'draw';
  else if (playerLost) result = 'enemy-win';
  else if (enemyLost) result = 'player-win';

  // 勝負一經分出就鎖定：同一局重複判定只發一次 BattleEnded（PROG-2-0207）
  if (result !== 'ongoing' && !state.battleEndAnnounced) {
    state.battleEndAnnounced = true;
    svc.event.emit(EVENT_NAMES.BattleEnded, { result });
  }

  return result;
}

/**
 * 營帳佔領（夜襲／埋伏場景，PM 暫定）：回合結束時，我方任一存活單位站在營帳格上即勝利。
 * 不需要站住一回合；沒有營帳格或沒有我方單位在上面時回傳 null。
 */
export function resolveCampCapture(state: BattleState): BattleResult | null {
  let camp: { lane: number; depth: number } | null = null;
  for (const effect of state.tileEffects.values()) {
    if (effect.state === 'scene-camp') {
      camp = { lane: effect.lane, depth: effect.depth };
      break;
    }
  }
  if (!camp) return null;
  for (const unit of state.units.values()) {
    if (unit.faction === Faction.Player && !unit.isDead() && unit.lane === camp.lane && unit.depth === camp.depth) {
      return 'player-win';
    }
  }
  return null;
}
