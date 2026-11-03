<!-- 分片：cross-ref-code / battle -->
# 代碼索引分片：Battle

> 入口：`docs/cross-ref/cross-ref-code.md`（doc_index_0001）。欄位說明見入口。

#### Battle Controllers (`assets/scripts/battle/controllers/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleController.ts | doc_spec_0040, doc_data_0001, doc_spec_0012 | D: BattleResult, DeployOutcome; F: 部署驗證、戰鬥結算、TileBuff 計算; C: DEFAULT_STATS |
| EnemyAI.ts | doc_spec_0020, doc_data_0002 | F: decideDeploy（35% 剋制偏向） |
| BattleFlowStateMachine.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| WeatherItemUseFlow.ts | doc_spec_0041 | 概: 戰場天氣道具的庫存扣除流程（PROG-2-0932 / APT-15） |

#### Battle Models (`assets/scripts/battle/models/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleState.ts | doc_spec_0040, doc_data_0001 | D: GridCell, TileBuff, TerrainGrid; C: 5×8 grid |

#### Battle Views (`assets/scripts/battle/views/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| AwakeningReveal.ts | doc_spec_0009 | F/概: `formatAwakeningReveal()` 戰後覺醒在結算窗揭示「🔓 鎖頭碎裂！【覺醒】X」（PROG-2-1133）|
| BattleScene.ts | doc_spec_0040, doc_spec_0161, doc_art_0003, doc_spec_0038, doc_spec_0030 | D: EncounterConfig; 概: 戰鬥場景進入點；正式讀取 `tacticSlots[] / ultimateSlots[]`，載入 battle skill metadata，並把戰法摘要 / 奧義列表推入 HUD |
| BattleSceneLoader.ts | doc_spec_0040, doc_spec_0038, doc_spec_0030 | D: EncounterConfig, BattleSkillMetadata; 概: 由 `tactic-library.json` / `ultimate-definitions.json` 建立戰法摘要與奧義執行資料 |
| TurnFlowManager.ts | doc_spec_0040, doc_spec_0038 | 概: 戰中行為流程；`onTactics()` 直接使用正式戰法摘要，不再顯示 placeholder toast |
| BoardRenderer.ts | doc_spec_0040 | 概: 5×8 棋盤渲染 |
| UnitRenderer.ts | doc_art_0003 | D: UnitView, GeneralView; 概: GLB 動態載入 |
| SceneBackground.ts | doc_tech_0015 | 概: 分層相機（BG/3D/UI） |
| SpriteFrameAnimator.ts | — | 概: 幀動畫工具（無直接規格書對應） |
| BattleFlowVfx.ts | doc_ui_0001 | 概: （無檔頭說明） |
| BattlePresentationTiming.ts | doc_ui_0001 | 概: BattlePresentationTiming.ts |
| BattleSceneCapture.ts | doc_ui_0001 | 概: （無檔頭說明） |
| BattleSceneFlow.ts | doc_ui_0001, doc_spec_0040 | 概: 管理 BattleScene 的場景級流程。 |
| BattleSceneGambitSummary.ts | doc_spec_0039, doc_ui_0001 | 概: （無檔頭說明） |
| BattleSceneSetup.ts | doc_index_0007 | 概: 將 TroopType enum 轉換為繁體中文兵種名稱。 |
| BattleSkillTargetingFlow.ts | doc_ui_0001 | 概: 管理「技能選目標」的互動狀態機。 |
| BattleTutorialHint.ts | doc_spec_0031 | 概: 首戰教學的提示浮窗（薄 View） |
| BattleUIBridge.ts | doc_ui_0001, doc_spec_0015 | 概: 戰鬥 UI 連結器 |
| BattleUIInitializer.ts | 未標出處 | 概: 戰鬥 UI 元件自動建立輔助函式 |

#### Battle Views / Effects (`assets/scripts/battle/views/effects/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BuffGainEffectPool.ts | doc_spec_0010 | D: EffectSlot, BuffEffectConfig; 概: 法陣+圖示+粒子池 |
| BuffEffectPrefabController.ts | doc_spec_0010 | 概: Prefab 結構驗證（Ring/Icon/Spark/Accent） |
| BuffParticleProfileConfig.ts | doc_tech_0015 | D: BuffParticleProfile |

#### Battle (`assets/scripts/battle/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleTypes.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |

#### Battle / Orchestrators (`assets/scripts/battle/orchestrators/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleRuntimeOrchestrator.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |

#### Battle / Runtime (`assets/scripts/battle/runtime/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAutoResolve.ts | 未登錄：使用者裁定 2026-10-25（戰鬥先用自動模擬數值結果直接跳結算）；PROG | 概: 戰鬥「自動」鈕的數值結算（純 TS，不依賴 cc）。 |
| BattleCombatResolver.ts | doc_spec_0040, doc_tech_0015, doc_spec_0041 | 概: 水域合攻（PM 暫定，PROG-2-0584）：攻擊方站在河流格且有 naval-combined-attack 時， |
| BattleDuelResolver.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleGeneralDuelFlow.ts | doc_index_0007 | 概: 單挑最多交手回合數（暫定，規格未定義）。達上限仍雙方存活 → 平局，單挑結束、不產生死亡、不套用懲罰。 |
| BattleRuntimeContext.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleRuntimeContract.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleSkillDispatcher.ts | doc_spec_0038, doc_spec_0040 | 概: 根據武將的 skillId 分發至具體技能實作。 |
| BattleSoloBreach.ts | doc_spec_0038 | 概: 回合開始重算單騎破陣：帶者（武將化身單位）正交 1 格無存活友軍則 ATK ×1.3，否則 ×1。 |
| BattleTileBuffLifecycleManager.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |
| BattleTurnManager.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleUnitSpawner.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleVictoryResolver.ts | doc_spec_0040, doc_tech_0015 | 概: 營帳佔領（夜襲／埋伏場景，PM 暫定）：回合結束時，我方任一存活單位站在營帳格上即勝利。 |

#### Battle / Runtime / Phases (`assets/scripts/battle/runtime/phases/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAutoMovePhase.ts | doc_spec_0040, doc_tech_0015 | 概: 七進七出（Ghost_Move）：沿前進方向找最遠的有效終點，穿過敵軍不停下，每個穿過的敵軍各扣一次傷害。 |
| BattleCombatPhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleEnemyDeployPhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattlePhaseExecutor.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleSpecialResolvePhase.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| BattleTileEffectPhase.ts | doc_spec_0044, doc_spec_0041 | 概: （無檔頭說明） |

#### Battle / Runtime / Tempo (`assets/scripts/battle/runtime/tempo/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleTempoController.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |
| TurnBasedTempoController.ts | doc_spec_0040, doc_tech_0015 | 概: （無檔頭說明） |

#### Battle / Shared (`assets/scripts/battle/shared/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleAudio.ts | doc_index_0007 | 概: 戰鬥音效邏輯鍵。 |
| BattleSceneMode.ts | doc_index_0007 | 概: @spec-source → 見 docs/cross-reference-index.md |
| BattleTacticBehavior.ts | doc_spec_0038 | 概: 依目前天氣重算水攻淹沒範圍（PROG-2-0407）： |
| EnemyTacticBoard.ts | doc_spec_0038 | 概: 敵方選技的戰場數值來源（純邏輯，不依賴 cc） |
| EnemyTacticCandidates.ts | doc_spec_0038 | 概: 敵方戰法候選來源（純邏輯，不依賴 cc） |
| EnemyTacticNumbers.ts | doc_spec_0038 | 概: 敵方戰法數值填入與選技（純邏輯，不依賴 cc） |
| ForcedMoveTile.ts | doc_spec_0044 | 概: 位移格的推移判定（純邏輯，不依賴 cc） |
| FormationZone.ts | doc_spec_0038 | 概: 八陣圖持續防禦區（PROG-2-0760／0761）。 |
| GhostMovePath.ts | doc_spec_0038 | 概: 七進七出的穿透路徑規則（純邏輯，不依賴 cc） |
| HazardVisualSkin.ts | doc_spec_0044 | 概: Hazard 格子的 Decal 與 VFX 換皮掛點（純邏輯，不依賴 cc） |
| Morale.ts | doc_spec_0038 | 概: 士氣持續回合（PROG-2-0770，暫定值，記在待辦檔）。 |
| PushMove.ts | doc_spec_0038 | 概: 戰法位移（push，PROG-2-0767）純邏輯。 |
| SceneGambitTrigger.ts | doc_spec_0039 | 概: 場景戰法發動判定（WBS v7 SCN-03，PROG-2-0596） |
| StealthTile.ts | doc_spec_0044 | 概: 掩體格的隱蔽判定（純邏輯，不依賴 cc） |
| TacticAiRules.ts | doc_spec_0038, doc_data_0002 | 概: 戰法 AI 選技規則（純邏輯，不依賴 cc） |
| TacticDamageEstimate.ts | doc_spec_0038 | 概: 戰法預估傷害（純邏輯，不依賴 cc） |
| TacticVfxHooks.ts | doc_spec_0038 | 概: 戰法特效與掠奪飄字的程式掛點（純邏輯，不依賴 cc） |
| TallyPassive.ts | doc_spec_0012 | 概: 虎符被動的通用掛點（不依賴 cc） |
| TileStateRules.ts | doc_spec_0044 | 概: 格子狀態分類（WBS GRD-01，血統與戰場格子規格；PROG-2-0589 依實際時機校正）。 |
| UnitDot.ts | doc_spec_0038 | 概: 單位持續傷害（毒箭，PROG-2-0766）。 |
| WisdomMeter.ts | doc_spec_0039 | 概: 軍師智謀能量累積（WBS v7 SCN-10 純邏輯，PROG-2-0616） |

#### Battle / Skills (`assets/scripts/battle/skills/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleSkillDamageResolver.ts | doc_spec_0038 | 概: 精銳突擊衝鋒（PROG-2-0756）：施放者與目標在同一直線上時，基礎傷害 × chargeMultiplier。 |
| BattleSkillExecutor.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillModuleTags.ts | doc_spec_0038 | 概: 戰法傷害投射模組代號（戰法系統規格 G-6-1）。 |
| BattleSkillProfiles.ts | doc_spec_0038, doc_spec_0012 | 概: --- 虎符特殊戰法殼（PROG-2-0928，TRP-15）：規格 34 條中尚未實作效果的 23 條 --- |
| BattleSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillResolverFactory.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BattleSkillTargetSelector.ts | doc_spec_0038 | 概: 技能射程（G-1 百步穿楊）：施放者部隊的攻擊射程 ＋ rangeBonus。 |
| SkillEffectFormulas.ts | doc_spec_0038 | 概: 戰法效果純公式（WBS v8 TAC-10／TAC-11 前置，PROG-2-0751） |
| SkillGridGeometry.ts | doc_spec_0038 | 概: 戰法格子幾何純函式（PROG-2-0754） |
| SkillStatusTicks.ts | doc_spec_0038 | 概: 戰法狀態回合遞減純函式（PROG-2-0753） |

#### Battle / Skills / Adapters (`assets/scripts/battle/skills/adapters/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BattleSkillSourceTranslator.ts | doc_spec_0038 | 概: （無檔頭說明） |
| BloodlineTacticAdapter.ts | doc_spec_0038, doc_spec_0011 | 概: （無檔頭說明） |
| MentorTacticAdapter.ts | doc_spec_0027, doc_spec_0038 | 概: （無檔頭說明） |
| SceneGambitAdapter.ts | doc_spec_0039 | 概: （無檔頭說明） |
| SeedTacticAdapter.ts | doc_spec_0038 | 概: （無檔頭說明） |
| TigerTallyTacticAdapter.ts | doc_spec_0012, doc_spec_0038 | 概: （無檔頭說明） |

#### Battle / Skills / Resolvers (`assets/scripts/battle/skills/resolvers/`)

| 代碼檔 | 對應規格書 | 引用類型 |
|---|---|---|
| BuffDebuffSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| CounterSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| DotSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| FireGodHuntSkillResolver.ts | doc_spec_0038 | 概: 火神狩獵（push-fire，PROG-2-0771）：單體敵軍遠離施放者 pushSteps 格， |
| FormationZoneSkillResolver.ts | doc_spec_0038 | 概: 八陣圖（PROG-2-0761）：以施放者腳下為中心，3x3 區域成為持續防禦區。 |
| HealSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| LinkSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| MoraleSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| ProjectedDamageSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| PushSkillResolver.ts | doc_spec_0038 | 概: 位移（push）：以施放者為中心 pushRadius（預設 3x3）內的敵軍遠離施放者 pushSteps 格（PROG-2-0767）。 |
| ResetSkillResolver.ts | doc_spec_0038 | 概: （無檔頭說明） |
| RootSkillResolver.ts | doc_spec_0038 | 概: 定身（root）：以施放者為中心的 3x3 內所有敵軍施加 Rooted（PROG-2-0764）。 |
| SlowSkillResolver.ts | doc_spec_0038 | 概: 緩速（slow）：目標施加 Slow，下一回合移動力減少（PROG-2-0765）。 |
