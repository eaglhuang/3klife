// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { BattleState } from '../models/BattleState';
import type { BattleResult } from './BattleRuntimeContract';

export function resolveBattleVictory(state: BattleState): BattleResult {
  const svc = services();
  const playerGeneral = state.playerGeneral;
  const enemyGeneral = state.enemyGeneral;

  const playerBroken = (playerGeneral?.isDead() ?? false) || state.playerFortressHp <= 0;
  const enemyBroken = (enemyGeneral?.isDead() ?? false) || state.enemyFortressHp <= 0;
  // 回合用盡：一般戰鬥判攻方（玩家）撤退落敗；教學戰判敵軍退兵、玩家獲勝。已有一方被打垮時不看回合
  const timeUp = svc.battle.isTurnLimitReached() && !playerBroken && !enemyBroken;
  const timeUpWinner = svc.battle.getTurnLimitOutcome();

  const playerLost = playerBroken || (timeUp && timeUpWinner === 'enemy-win');
  const enemyLost = enemyBroken || (timeUp && timeUpWinner === 'player-win');

  let result: BattleResult = 'ongoing';
  if (playerLost && enemyLost) result = 'draw';
  else if (playerLost) result = 'enemy-win';
  else if (enemyLost) result = 'player-win';

  // 勝負一經分出就鎖定：同一局重複判定只發一次 BattleEnded（PROG-2-0207）
  if (result !== 'ongoing' && !state.battleEndAnnounced) {
    state.battleEndAnnounced = true;
    // 關卡級回收（PROG-2-1462）：戰後摘要依此結算，帶快照避免後續改動
    // 只因回合用盡而落敗時，主將與城寨都還在：結算文案要說撤退，不說「敵方突破防線」
    const retreated = timeUp && result === 'enemy-win';
    svc.event.emit(EVENT_NAMES.BattleEnded, {
      result,
      salvage: { ...state.stageSalvage },
      ...(retreated ? { retreated: true } : {}),
      ...(timeUp ? { timeUp: true } : {}),
    });
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
