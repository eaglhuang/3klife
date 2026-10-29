// @spec-source → 關卡設計系統.md (doc_spec_0049) §D-4 軍師 HUD、§I 互動物件回收（PROG-2-1599）
/**
 * StrategistHudSource — 從戰場狀態組出軍師 HUD 的輸入（純邏輯，不依賴 cc）
 *
 * 只讀已在場上的格子效果與回收累計：落石 → 落石機關、營帳 → 營帳、埋伏陷阱 → 陷阱；
 * 本回合危害只列場上正在作用的（火場、水流、深水／陷阱）。對策缺口目前沒有資料來源，由呼叫端補。
 * 畫面（BattleScene HUD）尚未接，接的時候呼叫 buildStrategistHudSummary(strategistHudInputOf(state))。
 *
 * Unity 對照：像 HUD Presenter 的資料轉接器，把 BattleState 轉成 ViewModel。
 */
import type { BattleState } from '../models/BattleState';
import type { InteractiveObjectKind, InteractiveObjectView, StrategistHudInput } from '../../core/systems/StrategistHud';
import { FIRE_RAID_TILE_NOTE, ROCK_SLIDE_TILE_NOTE } from './StageSalvage';
import { AMBUSH_TRAP_TILE_NOTE } from './BattleTacticBehavior';

/** 格子備註 → 互動物件類別 */
const OBJECT_KIND_BY_NOTE: Readonly<Record<string, InteractiveObjectKind>> = {
  [ROCK_SLIDE_TILE_NOTE]: 'Rockfall_Node',
  'scene-gambit:camp': 'Camp_Target',
  [AMBUSH_TRAP_TILE_NOTE]: 'Trap_Cluster',
};

export function strategistHudInputOf(state: BattleState, missingCounters: readonly string[] = []): StrategistHudInput {
  const interactiveObjects: InteractiveObjectView[] = [];
  const hazards = new Set<string>();
  for (const effect of state.tileEffects.values()) {
    const kind = effect.notes ? OBJECT_KIND_BY_NOTE[effect.notes] : undefined;
    if (kind) interactiveObjects.push({ kind, state: 'alive' });
    if (effect.notes === FIRE_RAID_TILE_NOTE || effect.state === 'hazard-fire') hazards.add('火場延燒');
    else if (effect.state === 'river-current' && (effect.damagePerTurn ?? 0) > 0) hazards.add('深水');
    else if (effect.state === 'river-current' && effect.notes === 'scene-gambit:flood-attack') hazards.add('水流推移');
    else if (effect.notes === AMBUSH_TRAP_TILE_NOTE) hazards.add('埋伏陷阱');
  }
  return {
    hazardsThisTurn: Array.from(hazards),
    interactiveObjects,
    salvage: { ...state.stageSalvage },
    missingCounters,
  };
}
