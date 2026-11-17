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
  /**
   * 玩家單回合部署上限。對齊 AI 規格單回合上限 3 支（總PM 2026-11-16 裁決）。
   * 原為 1，部署後程式自動結束回合，玩家一回合只能下一張卡、來不及看結果。
   */
  MAX_PLAYER_DEPLOY_PER_TURN: 3,
  /**
   * 單回合自動前進格數上限（戰場數值）。原本寫死在 BattleAutoMovePhase.ts，改由此處調整。
   * 原因：騎兵加成疊加無上限，一回合可橫越全場，玩家看不懂也沒有應對空間。
   */
  maxMoveCellsPerTurn: 3,
  /**
   * 部隊攻擊敵方主將是否走與部隊相同的傷害管線（防禦、地形、暴擊、殘局等）。
   * 原因：舊行為直接扣攻擊力，不受防禦與地形影響，與部隊打部隊的規則不一致（PROG-2-9304）。
   * 規格（數值系統 E-3 / F-1）未定義主將對部隊攻擊的專屬公式，暫定套用部隊管線。設 false 回到舊行為。
   */
  generalDamageUsesUnitPipeline: true,
  /**
   * 主將防禦 = 統率 × 此係數。主將沒有防禦欄位，統率是「部隊 HP/防禦」的來源（數值系統 §統率），
   * 0.3 與 E-12 的 LEA×0.3 權重一致；暫定值。
   */
  generalDefensePerLea: 0.3,
  /**
   * 管線開啟時，部隊攻擊力乘上此倍率後才扣防禦（只作用於打主將）。
   * 原因：防禦為扣減式，主將防禦 ≈ 統率×0.3 約 20~29，直接套用會讓多數部隊對主將只打出 2~12 點，
   * 戰鬥打不完。1.5 讓典型部隊（騎 40／步 35／弓 30）對全部 235 名武將的平均傷害，落在舊行為的約 86%~102%
   * （騎 102%／步 95%／弓 86%，攻方無武將加成）。高統率主將（曹操統率 92）受傷較少：騎 80%／步 69%／弓 57%。
   * 暫定值，用來維持戰鬥長度，之後依實測調整。
   */
  generalDamageMultiplier: 1.5,
  /**
   * 部隊打主將的保底傷害比例：傷害至少為 max(1, round(攻擊力 × 此值))（總PM 2026-11-16 裁決）。
   * 原因：防禦為扣減式，攻擊被地塊效果削弱的部隊扣完主將防禦只剩 1 點，首戰實測我方主將每回合只掉 1 血。
   */
  generalMinDamageRatio: 0.2,
  /**
   * 部隊每次打出傷害（打部隊或打主將），所屬主將獲得的 SP（總PM 2026-11-16 裁決：造成傷害也給 SP）。
   * 原因：SP 原本只來自擊殺，雙方不交戰時整場 0 SP，奧義永遠放不出來。5 次命中約等於 1 次擊殺（SP_PER_KILL 20）。
   * 敵方另乘難度表的 SP 倍率。暫定值。
   */
  spPerDamagingHit: 4,
  /**
   * 部隊接敵：斜前方或側面一格有敵軍時停下來打。**已關閉，不可再打開**（PROG-2-9336，使用者 2026-11-17 裁示）。
   * 設計意圖：五路推進的格子兵種玩法，小兵只跟同一路正面撞上的敵軍交戰，旁邊經過的不打，
   * 藉此放大兵種互剋與路線卡位；只有武將棋子經過旁邊才會跟小兵互打。
   * 「雙方錯身而過不交戰」要靠敵軍出兵路線、教學引導、路上增益格的位置來解決，不可用側邊接敵。
   */
  troopEngageAdjacent: false,
  /**
   * 小兵主動打旁邊的敵方武將棋子：前進途中走到敵方武將棋子正旁邊（同一排左右）就停下來，輪到攻擊就打它；
   * 停在武將斜角時攻擊階段本來就打得到，能不能走到武將旁邊仍由壓制區（FORM-09）決定
   * （使用者 2026-11-17 裁示，PROG-2-9340）。
   * 只對「武將棋子」生效；小兵對小兵仍然只打同一路正面（見上面的 troopEngageAdjacent），不可順手放寬。
   */
  troopEngageAdjacentGeneral: true,
  /**
   * 計謀是否還要求主將 SP 滿。關閉＝只扣計謀點、施放後不清空 SP。
   * 依據：SPEC-BAT-STRAT01 寫計略點數「獨立於武將個人怒氣/TP之外」；DISABLED_SP 只管戰法（總PM 2026-11-16 裁決）。
   * 沒有出征帳本（沒有計謀點可扣）的戰鬥仍照舊要求 SP，免得計謀變成無限施放。
   */
  seedTacticRequiresFullSp: false,
  /** 首戰教學戰：開場我方主將 SP 直接給滿，讓新玩家第一場就能放一次奧義（總PM 2026-11-16 裁決） */
  tutorialStartSpFull: true,
  /** 首戰教學戰：開場計謀點直接給滿。原因：預設開場 12 點、一招 30 點，要到第 5 回合才放得出第一招；一般戰鬥不動（總PM 2026-11-16 裁決） */
  tutorialStartTacticFull: true,
  /**
   * 首戰教學戰：戰法不檢查發動條件（兵種、天氣、鄰格）。
   * 原因：初始名將第一格戰法多半是「火攻」，要起風才能發動，教學戰整場不起風，計謀鈕按了 8 回合都沒反應；一般戰鬥照舊檢查（PROG-2-9329）
   */
  tutorialIgnoreTacticConditions: true,
  /**
   * 首戰教學戰：我方主將棋子走到己方數來第幾排就發起單挑邀請（一般戰鬥要走到敵陣最後一排，也就是第 8 排）。
   * 原因：主將最快第 3 回合上場，走到最後一排要 7 回合以上，教學戰第 7～9 回合就結束，新玩家永遠遇不到單挑（總PM 2026-11-16 裁決 A，PROG-2-9331）
   */
  tutorialDuelInviteRow: 5,
  /** 首戰教學戰：敵將一律接受我方發起的單挑，新玩家才看得到單挑演出，也不會因為敵將拒絕讓敵軍整場減半（總PM 2026-11-17 裁決，PROG-2-9335） */
  tutorialEnemyAlwaysAcceptsDuel: true,
  /**
   * 首戰教學戰：單挑打到一方主將生命剩這個比例就分勝負，不打死。
   * 我方輸了不判負只扣主將血；我方贏了重創敵主將但戰鬥繼續，免得第 4 回合就結束（總PM 2026-11-17 裁決，PROG-2-9335）。
   * 三成版線上 7 場我方全勝且幾乎無戰損，改五成讓單挑不再一次打掉敵主將七成血（總PM 2026-11-17 裁決，PROG-2-9340）。
   */
  tutorialDuelHpFloorRatio: 0.5,
  /** 兵種動態相剋（拒馬槍陣、縱深突襲、高地射程；doc_spec_0309 §3）總開關。首戰教學戰一律不啟用（使用者 2026-11-17 裁決，PROG-2-9368） */
  troopCounterTacticsEnabled: true,
  /**
   * 通用奧義：主將沒有可用的奧義槽、也沒有主技能時的退路，免得奧義選單只顯示「未配置奧義」。
   * 原因：235 位武將中 221 位沒有奧義資料，六位初始名將只有張飛有。專屬奧義定案後自然蓋過這個退路（總PM 2026-11-16 裁決）。
   * coefficient 取 0.6：低於專屬全屏奧義最常用的 0.72，通用招不該比專屬招強。
   */
  genericUltimate: { skillId: 'generic-all-out-charge', name: '全軍突擊', coefficient: 0.6 },
  /**
   * 甘寧專屬奧義「百騎劫營」的傷害係數：打敵軍最後排並暈 1 回合。
   * 原因：原本只暈不傷，劫營卻沒有戰果；只打一排，所以係數比全屏招常用的 0.72 高一點（總PM 2026-11-16 裁決，PROG-2-9330）。
   */
  ganNingNightRaidCoefficient: 0.8,
  /**
   * 首戰教學戰：敵方每回合出兵數，索引 = 回合數 - 1，超出陣列就不再出兵。
   * 原因：原本只在第 2、4、6 回合各出 1 隊，實跑時敵方同時在場最多 2 隊、我方 10 隊以上，沒有壓力。
   * 目標是敵方同時在場 4～6 隊，玩家仍能在 10 回合內打贏（總PM 2026-11-16 裁決）。第 1 回合留給玩家練習部署。
   * 7 隊版實跑（26610ff4f）敵方同場 6 隊、我方被打到剩 3 隊，只靠回合上限判勝，所以降為 5 隊。
   * 5 隊版實跑（53b8119e9，兩場）敵方第 7 回合起 0 隊、我方 13 隊沒有戰損，所以改 6 隊並把後兩隊排到第 6、7 回合，讓敵方到第 7 回合都還有部隊（PROG-2-9330）。
   * 6 隊加對路出兵版實跑（8a24bb5d2，7 場）全勝、我方平均只損 0.86 隊，敵方同場最多 2～4 隊對我方 7～9 隊，
   * 多場我方殘血存活。改 8 隊：第 3 回合多 1 隊、第 5 回合不再空窗（總PM 2026-11-17 裁決，PROG-2-9344）。
   * 驗收目標：我方戰損 2～4 隊、勝在第 8～10 回合；若我方被打到剩 3 隊以下或敗場超過 1 場，退為 [0,2,1,1,1,1,1]。
   */
  tutorialEnemyDeployByTurn: [0, 2, 2, 1, 1, 1, 1] as readonly number[],
  /**
   * 首戰教學戰：敵軍出在「我方有兵、敵方還沒對上」的那一路，讓雙方在同一路正面撞上。
   * 原因：小兵只打同一路正面（使用者定的設計），敵軍照一般策略選路時常和我方錯開，
   * 線上 7 場我方平均只損 0.14 隊，新玩家看不到兵種互剋（使用者 2026-11-17 裁示，PROG-2-9340）。
   * 只改教學戰的選路，不動交戰規則，也不影響一般戰鬥。
   */
  tutorialEnemyMeetsPlayerLane: true,
  /** 首戰教學戰：玩家每回合派兵上限。比一般戰鬥少 1 隊，讓軍勢不會在前 2、3 回合就派光（總PM 2026-11-16 裁決）。 */
  tutorialPlayerDeployPerTurn: 2,
  /** 首戰教學戰：敵主將血量倍率，讓十回合內有機會真的打贏（總PM 2026-11-16 裁決） */
  tutorialEnemyGeneralHpRatio: 0.5,
  /**
   * 首戰教學戰：出征軍勢至少補到這個數，補上的兵力不扣城市兵源。
   * 原因：首戰軍勢 3000 只夠派 5 隊，第 3 回合起玩家無兵可派；8000 又能派到 12 隊，敵軍全場只有 6 隊，幾乎沒有戰損。
   * 5000 大約派到第 4 回合共 7～8 隊，後半段要靠場上部隊、計謀與奧義（總PM 2026-11-17 裁決，PROG-2-9334）。
   */
  tutorialSortiePoolMin: 5000,
  // 規格《戰場大回合推進狀態機》：回合數超過 30 裁定攻方撤退失敗
  TURN_LIMIT: 30,
  // 首戰教學戰的回合上限：十回合內必分勝負，不讓新玩家磨空城池；用盡算敵軍退兵、我方獲勝（總PM 裁定）
  TUTORIAL_TURN_LIMIT: 10,
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
  AptitudeDialogue:  "aptitude-dialogue",
  /** 戰場關係事件（名將契合、義兄弟合攻，PROG-2-1420）：payload { turn, hit: RelationEventHit } */
  RelationEventTriggered: "relation-event-triggered",
  BattleEnded:       "battle-ended",
  GameModeChanged:   "game-mode-changed",
  UnitDeployed:      "unit-deployed",
  UnitDamaged:       "unit-damaged",
  /** 適性命中判定落空（PROG-2-0080）：payload { attackerId, targetId, hitRate } */
  UnitAttackMissed:  "unit-attack-missed",
  /** 史實合攻觸發（KIN-09 演出）：payload { attackerId, helperId, targetId }，於追加傷害前發出 */
  KinComboAttack:    "kin-combo-attack-triggered",
  UnitDied:          "unit-died",
  UnitMoved:         "unit-moved",
  UnitHealed:        "unit-healed",
  GeneralDamaged:    "general-damaged",
  GeneralDamagedVisualCommitted: "general-damaged-visual-committed",
  GeneralSpChanged:  "general-sp-changed",
  GeneralSkillUsed:  "general-skill-used",
  LastSpurtEntered: "last-spurt-entered",
  StaminaExhausted: "stamina-exhausted",
  TallySpiritInserted: "tally-spirit-inserted",
  GeneralSkillEffect:"general-skill-effect",
  FortressDamaged:   "fortress-damaged",
  UiBackRequested:   "ui-back-requested",
  BuffApplied:       "buff-applied",
  /** 奧義自身爆發開始／結束（SYS-SKILL-ULT-0001）：{ faction, phase, ultimateId, turns } */
  SelfBurstChanged:  "self-burst-changed",
  /** 落石擊破／火燒掠奪入帳（戰法系統 §H-3，PROG-2-1852）：{ lane, depth, source, gain } */
  StageSalvageGained: "stage-salvage-gained",
  /** 奧義全隊增益開始／結束（SYS-SKILL-ULT-0002）：{ faction, phase, ultimateId, turns } */
  TeamAuraChanged:   "team-aura-changed",
  /** 奧義團隊回復結算（SYS-SKILL-ULT-0003）：{ faction, ultimateId, outcomes } */
  TeamRecovered:     "team-recovered",
  /** 奧義敵方全體減益開始／結束（SYS-SKILL-ULT-0004）：{ faction（被減益方）, phase, debuff } */
  MassDebuffChanged: "mass-debuff-changed",
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
  TallyDeployed:        "tally-deployed",        // payload: string (虎符模板 id)
  BattleSkillNotice:    "battle-skill-notice",   // payload: string (戰法與奧義要進戰報的句子，PROG-2-1780、PROG-2-1781)
  TroopCounterLine:     "troop-counter-line",    // payload: string (剋制戰鬥句，PROG-2-1772)
  AutoBattleToggled:    "auto-battle-toggled",   // payload: boolean (isEnabled)
  DelegateToggled:      "delegate-toggled",      // payload: boolean (要求開或關)
  BattleSpeedToggled:   "battle-speed-toggled",  // payload: number  (1 | 2)
  ShowSettingsRequested:"show-settings-requested",
  /** 設定面板確認撤退：戰場橋接層判定我方戰敗（PROG-2-1890） */
  RetreatRequested:     "retreat-requested",
  /** 彈出系統通知 (Toast)：{ text: string } */
  ShowToast:            "show-toast",
};



