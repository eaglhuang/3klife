// @spec-source → 戰場部署系統.md (doc_spec_0040)、demo_技術架構.md (doc_tech_0015)；PROG-2-1429 依建檔紀錄補標出處
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { services } from '../../core/managers/ServiceLoader';
import type { BattleState } from '../models/BattleState';
import type { BattleResult } from './BattleRuntimeContract';
import { FORTRESS_MAX_HP } from '../../core/systems/FortressBarView';
import { judgeTimeUp, type TimeUpVerdict, type TimeUpWinner } from '../../core/systems/TimeUpJudgement';

/**
 * 戰鬥怎麼結束的（PROG-2-9414）：結算窗依此挑文案。
 * general＝敗方主將倒下／fortress＝敗方城寨被破／time-up＝回合用盡／camp＝夜襲、埋伏佔領營帳。
 */
export type BattleEndCause = 'general' | 'fortress' | 'time-up' | 'camp';

export interface BattleEndedPayload {
  result: BattleResult;
  cause?: BattleEndCause;
  retreated?: boolean;
  timeUp?: boolean;
  /** 依戰果判定時的雙方分數（PROG-2-9423），結算帶出說明 */
  timeUpVerdict?: TimeUpVerdict;
  salvage?: BattleState['stageSalvage'];
}

/**
 * 對外宣告戰鬥結束：同一局只發一次 BattleEnded（PROG-2-0207），帶關卡回收快照（PROG-2-1462）。
 * 所有「分出勝負」的路徑都要經過這裡，否則結算窗不會出現、玩家卡在戰場（PROG-2-9414：營帳佔領漏發）。
 */
export function announceBattleEnd(
  state: BattleState,
  result: BattleResult,
  extra: Omit<BattleEndedPayload, 'result' | 'salvage'> = {},
): boolean {
  if (result === 'ongoing' || state.battleEndAnnounced) return false;
  state.battleEndAnnounced = true;
  const payload: BattleEndedPayload = { result, salvage: { ...state.stageSalvage }, ...extra };
  services().event.emit(EVENT_NAMES.BattleEnded, payload);
  return true;
}

/**
 * 回合用盡時誰贏（PROG-2-9423）：固定勝方直接回傳；'by-damage' 依雙方城寨與主將失血比例判定。
 * 戰場主流程與單挑流程都用這個，判定才會一致。
 */
export function resolveTimeUpWinner(state: BattleState): { winner: TimeUpWinner; verdict?: TimeUpVerdict } {
  const battle = services().battle;
  const outcome = battle.getTurnLimitOutcome();
  if (outcome !== 'by-damage') return { winner: outcome };
  const pg = state.playerGeneral;
  const eg = state.enemyGeneral;
  const verdict = judgeTimeUp({
    playerFortressHp: state.playerFortressHp,
    enemyFortressHp: state.enemyFortressHp,
    fortressMaxHp: FORTRESS_MAX_HP,
    playerGeneralHp: pg?.currentHp ?? 0,
    playerGeneralMaxHp: pg?.maxHp ?? 0,
    enemyGeneralHp: eg?.currentHp ?? 0,
    enemyGeneralMaxHp: eg?.maxHp ?? 0,
  }, battle.getTimeUpJudgement());
  return { winner: verdict.winner, verdict };
}

export function resolveBattleVictory(state: BattleState): BattleResult {
  const svc = services();
  const playerGeneral = state.playerGeneral;
  const enemyGeneral = state.enemyGeneral;

  const playerBroken = (playerGeneral?.isDead() ?? false) || state.playerFortressHp <= 0;
  const enemyBroken = (enemyGeneral?.isDead() ?? false) || state.enemyFortressHp <= 0;
  // 回合用盡：一般戰鬥判攻方（玩家）撤退落敗；教學戰判敵軍退兵、玩家獲勝。已有一方被打垮時不看回合
  const timeUp = svc.battle.isTurnLimitReached() && !playerBroken && !enemyBroken;
  const timeUpJudged = timeUp ? resolveTimeUpWinner(state) : null;
  const timeUpWinner = timeUpJudged?.winner;

  const playerLost = playerBroken || (timeUp && timeUpWinner === 'enemy-win');
  const enemyLost = enemyBroken || (timeUp && timeUpWinner === 'player-win');

  let result: BattleResult = 'ongoing';
  if (playerLost && enemyLost) result = 'draw';
  else if (playerLost) result = 'enemy-win';
  else if (enemyLost) result = 'player-win';

  if (result !== 'ongoing') {
    // 只因回合用盡而落敗時，主將與城寨都還在：結算文案要說撤退，不說「敵方突破防線」
    const retreated = timeUp && result === 'enemy-win';
    const cause: BattleEndCause = timeUp
      ? 'time-up'
      : (result === 'enemy-win' ? (playerGeneral?.isDead() ? 'general' : 'fortress')
        : result === 'player-win' ? (enemyGeneral?.isDead() ? 'general' : 'fortress') : 'general');
    announceBattleEnd(state, result, {
      cause,
      ...(retreated ? { retreated: true } : {}),
      ...(timeUp ? { timeUp: true } : {}),
      ...(timeUpJudged?.verdict ? { timeUpVerdict: timeUpJudged.verdict } : {}),
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
