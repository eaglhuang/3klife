// @spec-source → 關卡設計系統.md (doc_spec_0049) §D-4 軍師 HUD、§I 互動物件回收（PROG-2-1599）
/**
 * StrategistHudSource — 從戰場狀態組出軍師 HUD 的輸入（純邏輯，不依賴 cc）
 *
 * 只讀已在場上的格子效果與回收累計：落石 → 落石機關、營帳 → 營帳、埋伏陷阱 → 陷阱；
 * 本回合危害只列場上正在作用的（火場、水流、深水／陷阱）。對策缺口目前沒有資料來源，由呼叫端補。
 * 場景戰法戰鬥另帶參謀常駐行（主戰場UI §6.3，PROG-2-1758）：戰場沒有獨立參謀官，以我方主將的姓名與智力代表。
 * 戰場 HUD 尚無欄位節點；PROG-2-1744 先由 BattleUIBridge 每回合以 strategistHudLogLine 寫進戰場日誌（內容沒變不重寫）。
 *
 * Unity 對照：像 HUD Presenter 的資料轉接器，把 BattleState 轉成 ViewModel。
 */
import type { BattleState } from '../models/BattleState';
import type { InteractiveObjectKind, InteractiveObjectView, StrategistHudInput } from '../../core/systems/StrategistHud';
import { FIRE_RAID_TILE_NOTE, FLOODGATE_TILE_NOTE, ROCK_SLIDE_TILE_NOTE } from './StageSalvage';
import { AMBUSH_TRAP_TILE_NOTE } from './BattleTacticBehavior';
import { BattleTactic } from '../../core/config/Constants';
import { battleTacticLabel } from '../../shared/BattleEntryParams';
import { sceneGambitGateOf } from './SceneGambitTrigger';

/** 格子備註 → 互動物件類別 */
const OBJECT_KIND_BY_NOTE: Readonly<Record<string, InteractiveObjectKind>> = {
  [ROCK_SLIDE_TILE_NOTE]: 'Rockfall_Node',
  [FLOODGATE_TILE_NOTE]: 'Floodgate',
  'scene-gambit:camp': 'Camp_Target',
  [AMBUSH_TRAP_TILE_NOTE]: 'Trap_Cluster',
};

/** playerIntel：玩家累積情報（GameSession.intel）；有傳且戰法設情報門檻時，參謀常駐行附「情報 目前 / 門檻」（PROG-2-1760） */
export function strategistHudInputOf(state: BattleState, missingCounters: readonly string[] = [], playerIntel?: number): StrategistHudInput {
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
  // 已擊破的落石格已從場上移除，依累計數補列「已回收」（PROG-2-1745）
  for (let i = 0; i < (state.recoveredRockSlides ?? 0); i++) interactiveObjects.push({ kind: 'Rockfall_Node', state: 'recovered' });
  // 已佔領的水門已從場上移除，依累計數補列「已回收」（PROG-2-1863）
  for (let i = 0; i < (state.capturedFloodgates ?? 0); i++) interactiveObjects.push({ kind: 'Floodgate', state: 'recovered' });
  // 已被敵軍踩中的陷阱已從場上移除，依累計數補列「已觸發」（PROG-2-1750）
  for (let i = 0; i < (state.triggeredAmbushTraps ?? 0); i++) interactiveObjects.push({ kind: 'Trap_Cluster', state: 'triggered' });
  const gate = sceneGambitGateOf(state.battleTactic);
  const intel = gate && gate.intelThreshold > 0 && playerIntel !== undefined && Number.isFinite(playerIntel)
    ? { current: Math.max(0, Math.floor(playerIntel)), required: gate.intelThreshold }
    : undefined;
  return {
    hazardsThisTurn: Array.from(hazards),
    interactiveObjects,
    salvage: { ...state.stageSalvage },
    missingCounters,
    executing: state.battleTactic !== BattleTactic.Normal && state.playerGeneral
      ? { name: state.playerGeneral.name, int: state.playerGeneral.int, tactic: battleTacticLabel(state.battleTactic), ...(intel ? { intel } : {}) }
      : undefined,
  };
}
