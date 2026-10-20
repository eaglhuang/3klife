// @spec-source → 見 docs/cross-reference-index.md
export const GAME_CONFIG = {
  GRID_LANES: 5,
  GRID_DEPTH: 8,
  /** [P2-N1] 糧草初始值（名詞：糧草 = Food，見名詞定義文件） */
  INITIAL_FOOD: 30,
  /** [P2-N1] 每回合補充糧草量（Food） */
  FOOD_PER_TURN: 10,
  /** [P2-N1] 糧草上限（Food） */
  MAX_FOOD: 50,
  /** 技能狀態提示（閃現）顯示毫秒數；原本漏定義，HUD 用它算 scheduleOnce 延遲 */
  SKILL_STATUS_DISPLAY_MS: 2000,
  MAX_PLAYER_DEPLOY_PER_TURN: 1,
  MAX_ENEMY_DEPLOY_PER_TURN: 1,
  TURN_LIMIT: 50,
  AI_COUNTER_STRATEGY_CHANCE: 0.35,
  // 武將化身單挑：暴擊與閃躲參數（對應 E-11/E-14）
  GENERAL_BASE_CRIT_CHANCE: 0.05,         // 基礎暴擊率 5%（與 E-11 baseCrit 對應）
  GENERAL_MAX_CRIT_CHANCE: 0.50,          // 暴擊率上限 50%
  GENERAL_CRIT_DAMAGE_MULTIPLIER: 1.5,    // 暴擊傷害倍率 1.5x（E-11 crit_damage）
  GENERAL_BASE_DODGE_CHANCE: 0.03,        // 基礎閃躲率 3%
  GENERAL_MAX_DODGE_CHANCE: 0.40,         // 閃躲率上限 40%
};

import { Faction, TroopType, TerrainType, Weather, BattleTactic, TurnPhase, StatusEffect, SceneName } from "../../shared/CommonEnums";
export { Faction, TroopType, TerrainType, Weather, BattleTactic, TurnPhase, StatusEffect, SceneName };



/** 剋制表（key 剋 value）：依 兵種（虎符）系統.md 五角剋制（PROG-2-0343，PM 裁定規格優先） */
export const TROOP_COUNTER_MAP: Partial<Record<TroopType, TroopType>> = {
  [TroopType.Cavalry]: TroopType.Shield,
  [TroopType.Shield]: TroopType.Archer,
  [TroopType.Archer]: TroopType.Infantry,
  [TroopType.Infantry]: TroopType.Pikeman,
  [TroopType.Pikeman]: TroopType.Cavalry,
};

/** 機械（暫定對應工兵 Engineer）被近戰攻擊時的倍率（兵種（虎符）系統.md；暫定，見待辦檔） */
export const SIEGE_TROOP_TYPE = TroopType.Engineer;
export const MELEE_TROOP_TYPES: ReadonlySet<TroopType> = new Set([TroopType.Cavalry, TroopType.Infantry, TroopType.Pikeman, TroopType.Shield]);
export const SIEGE_MELEE_MULTIPLIER = 1.5;

export const COUNTER_MULTIPLIER = 1.3;
export const DISADVANTAGE_MULTIPLIER = 0.8;
export const MIN_DAMAGE = 1;

// 地形修正值數據同步於 assets/resources/data/terrain.json（REV-02），由 tests/TerrainConfig.test.ts 交叉比對。
export const TERRAIN_ATTACK_MOD: Record<TerrainType, number> = {
  [TerrainType.Plain]: 0,
  [TerrainType.River]: 0,
  [TerrainType.Mountain]: 0,
  [TerrainType.Fortress]: 0,
  [TerrainType.Desert]: 0.15,
  [TerrainType.Forest]: 0.1,
};

export const TERRAIN_DEFENSE_MOD: Record<TerrainType, number> = {
  [TerrainType.Plain]: 0,
  [TerrainType.River]: 0.05,
  [TerrainType.Mountain]: 0.15,
  [TerrainType.Fortress]: 0.25,
  [TerrainType.Desert]: 0,
  [TerrainType.Forest]: 0,
};

export const TROOP_DEPLOY_COST: Record<TroopType, number> = {
  [TroopType.Cavalry]: 15,
  [TroopType.Infantry]: 15,
  [TroopType.Shield]: 15,
  [TroopType.Archer]: 15,
  [TroopType.Pikeman]: 15,
  [TroopType.Engineer]: 20,
  [TroopType.Medic]: 20,
  [TroopType.Navy]: 20,
};

/** 每擊殺一個敵方單位，武將獲得的能量 */
export const SP_PER_KILL = 20;

export const WEAK_ATTACK_MULTIPLIER = 0.7;


export const EVENT_NAMES = {
  TurnPhaseChanged:  "turn-phase-changed",
  WeatherChanged:    "weather-changed",
  BattleEnded:       "battle-ended",
  GameModeChanged:   "game-mode-changed",
  UnitDeployed:      "unit-deployed",
  UnitDamaged:       "unit-damaged",
  /** 適性命中判定落空（PROG-2-0080）：payload { attackerId, targetId, hitRate } */
  UnitAttackMissed:  "unit-attack-missed",
  UnitDied:          "unit-died",
  UnitMoved:         "unit-moved",
  UnitHealed:        "unit-healed",
  GeneralDamaged:    "general-damaged",
  GeneralDamagedVisualCommitted: "general-damaged-visual-committed",
  GeneralSpChanged:  "general-sp-changed",
  GeneralSkillUsed:  "general-skill-used",
  GeneralSkillEffect:"general-skill-effect",
  FortressDamaged:   "fortress-damaged",
  UiBackRequested:   "ui-back-requested",
  BuffApplied:       "buff-applied",
  TileBuffSpawned:   "tile-buff-spawned",
  TileBuffConsumed:  "tile-buff-consumed",
  // 武將單挑系統
  GeneralDuelStart:  "general-duel-start",
  GeneralDuelChallenge: "general-duel-challenge",
  GeneralDuelAccepted:  "general-duel-accepted",
  GeneralDuelRejected:  "general-duel-rejected",
  DuelPenaltyApplied:   "duel-penalty-applied",
  // 武將快覽彈窗
  /** BattleHUD 頭像點擊 → 廣播意圖（攜帶 side / isEnemy），BattleScene 負責轉換為完整資料後回灌 */
  RequestGeneralQuickView: "request-general-quickview",
  /** BattleScene 填入完整 GeneralQuickViewData 後廣播，GeneralQuickViewPanel 監聽 */
  ShowGeneralQuickView: "show-general-quickview",
  /** 奧義選擇：ActionCommandPanel 觸發，payload: { skillId: string } */
  UltimateSkillSelected: "ultimate-skill-selected",
  // 戰鬥控制列
  AutoBattleToggled:    "auto-battle-toggled",   // payload: boolean (isEnabled)
  BattleSpeedToggled:   "battle-speed-toggled",  // payload: number  (1 | 2)
  ShowSettingsRequested:"show-settings-requested",
  /** 彈出系統通知 (Toast)：{ text: string } */
  ShowToast:            "show-toast",
};



