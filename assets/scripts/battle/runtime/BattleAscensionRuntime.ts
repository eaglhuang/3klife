// @spec-source → 戰場策略相剋與即時將階晉升功能規格書 (doc_spec_0309) §4；PROG-2-9394
/**
 * BattleAscensionRuntime — 戰中升階接進戰場（不依賴 cc）。
 *
 * 名聲入帳與門檻判定沿用 InBattleAscension（純邏輯）；這裡負責把結果套到戰場狀態：
 * 將階一 補兵、將階二 全軍士氣拉滿、將階三 全隊移動力 +1、將階四 敵全體士氣 −15、將階五 全軍暴擊 +20%。
 * 戰中的名聲與將階只存在這一場，不寫回存檔（戰後名聲仍由 recordBattle 結算）。
 *
 * Unity 對照：像戰鬥中的 LevelUp 事件處理器，把升級獎勵套到場上所有單位。
 */
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import type { services } from '../../core/managers/ServiceLoader';
import type { BattleState } from '../models/BattleState';
import { applyBattleFame, mergeAscendSurges, type BattleFameSource, type IBattleAscendEvent } from '../shared/InBattleAscension';
import { maximizeMorale, shiftMorale } from '../shared/Morale';
import { ascensionLine } from '../../core/systems/NumericalScriptLines';

/** 戰中升階事件（畫面層演出用）：多帶陣營 */
export interface BattleAscendedEvent extends IBattleAscendEvent {
  faction: Faction;
}

export interface BattleAscensionContext {
  state: BattleState;
  /** 補兵：回傳實際補進兵力池的數量；沒有兵力池（非名冊出征）回 0 */
  refillTroopPool: (faction: Faction, amount: number) => number;
}

/** 這一場某陣營主將目前的名聲與將階；第一次讀時從主將資料帶入 */
export function ascensionOf(state: BattleState, faction: Faction): { generalFame: number; generalRank: number } {
  const existing = state.generalAscension.get(faction);
  if (existing) return existing;
  const general = state.getGeneral(faction);
  const seeded = { generalFame: Math.max(0, Math.floor(general?.generalFame ?? 0)), generalRank: Math.max(0, Math.floor(general?.generalRank ?? 0)) };
  state.generalAscension.set(faction, seeded);
  return seeded;
}

/**
 * 入帳戰中名聲；跨過門檻就套用激勵、發事件與戰報，回傳升階事件（沒升階回 null）。
 */
export function awardBattleFame(
  context: BattleAscensionContext,
  faction: Faction,
  sources: readonly BattleFameSource[],
  svc: ReturnType<typeof services>,
): BattleAscendedEvent | null {
  const { state } = context;
  const general = state.getGeneral(faction);
  if (!general || sources.length === 0) return null;
  const current = ascensionOf(state, faction);
  const result = applyBattleFame({ uid: general.id, name: general.name, generalFame: current.generalFame, generalRank: current.generalRank }, sources);
  state.generalAscension.set(faction, { generalFame: result.general.generalFame ?? 0, generalRank: result.general.generalRank ?? 0 });
  if (!result.event) return null;

  const merged = mergeAscendSurges(result.event.surges);
  const foe = faction === Faction.Player ? Faction.Enemy : Faction.Player;
  if (merged.troopRefill > 0) context.refillTroopPool(faction, merged.troopRefill);
  if (merged.moveBonus > 0) state.ascensionMoveBonus.set(faction, (state.ascensionMoveBonus.get(faction) ?? 0) + merged.moveBonus);
  if (merged.critRatePct > 0) state.ascensionCritBonus.set(faction, (state.ascensionCritBonus.get(faction) ?? 0) + merged.critRatePct / 100);
  state.units.forEach((unit) => {
    if (unit.isDead()) return;
    if (unit.faction === faction) {
      if (merged.moraleToMax) maximizeMorale(unit);
      if (merged.moveBonus > 0) unit.applyMoveRangeDelta(merged.moveBonus);
    } else if (unit.faction === foe && merged.enemyMoraleDelta !== 0) {
      shiftMorale(unit, merged.enemyMoraleDelta);
    }
  });

  const event: BattleAscendedEvent = { ...result.event, faction };
  svc.event.emit(EVENT_NAMES.BattleSkillNotice, ascensionLine(event.generalName, event.newRankTitle, event.surges.map((s) => s.label)));
  svc.event.emit(EVENT_NAMES.GeneralAscended, event);
  return event;
}
