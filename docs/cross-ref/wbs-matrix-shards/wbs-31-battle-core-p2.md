# 3KLife WBS 全量功能進度盤點矩陣 (v16.9) — 3.1 戰鬥核心（2/7）

> 這是 `wbs-progress-inventory-matrix.md` 的「3.1 戰鬥核心（2/7）」分片。完整索引見 `docs/cross-ref/wbs-progress-inventory-matrix.md`。

## 3.1 1. 戰鬥核心系統 (Battle Core) · 第 2/7 段

> 續上段（表頭重複）。工作包 ULT-02 起。

| ID | 里程碑 | 工作包 | 類型 | 工時 | 狀態 | 依賴 | 驗收條件 | 現況證據 | 最新核對(v16.9) |
|---|:---:|---|:---:|:---:|:---:|---|---|---|---|
| **ULT-02** | M7 | 專屬奧義綁定（templateId↔ultimateSlots，runtime generals.json） | data | 1 | 🟢 已接線 | ULT-01 | GeneralUnit.ultimateSlots 由 generals.json 載入，GeneralDetail 可查表 | assets/scripts/core/models/GeneralUnit.ts ultimateSlots；assets/scripts/ui/components/general-detail/GeneralDetailSkillsChild.ts；BattleSceneLoader.ts:511 |  |
| **ULT-03** | M7 | 轉生解鎖邏輯（1~5 轉開奧義欄位、屬性上限 1000~1500） | logic | 2 | 📄 僅資料 | ULT-02 | 依轉生次數回傳已解鎖槽位，存檔寫入 Is_Unlocked | ultimateSlots 有 isLocked 欄位；轉生/重複抽卡機制本身未見（grep reincarnation 無執行邏輯） |  |
| **ULT-04** | M7 | 精力消耗與施放前置檢查（5~10%，不足阻擋、戰鬥限用1次） | logic | 2 | 🟢 已接線 | ULT-03 | 施放扣精力百分比、精力不足提示、每場限用1次，單元測試覆蓋 | 規格 F-3-0-1 自述『驗證 SP 滿條件』未打勾；程式 BattleScene 以 SP 能量而非精力%（無 vitalityCostPct 運算） | 未開始→已接線；v16.9 協調線回報：#1267／PROG-2-1451 完成；UltimateDamage 由 BattleSkillDispatcher 呼叫 |
| **ULT-05** | M7 | 奧義傷害公式 base_power×(1+lv×0.15)×stat_modifier | logic | 1 | 🟢 已接線 | ULT-01 | 公式函式與 BattleSkillDamageResolver 整合，測試覆蓋 5 檔 base_power | assets/scripts/battle/skills/BattleSkillDamageResolver.ts；tests/BattleSkillDamageResolver.test.ts（未確認使用 ult_level×0.15 公式） | 純邏輯→已接線；#1451/#1453 UltimateDamage 接 BattleSkillDispatcher |
| **ULT-06** | M7 | Battle target policy（targetMode/manualTargeting/autoAimMode）與固定範圍直接施放 | logic | 3 | ✅ 已驗收 | ULT-01 | 12 個已綁定 battleSkillId 的 target policy 快照與 selector 一致 | assets/scripts/battle/skills/BattleSkillTargetSelector.ts；tests/BattleSkillTargetSelector.test.ts、BattleSkillProfileAutoTargeting.test.ts、BattleControllerSkillTargeting.test.ts |  |
| **ULT-07** | M7 | BattleScene 奧義按鈕列表與 SkillSourceType.Ultimate 統一入口 | ui | 3 | 🟢 已接線 | ULT-06, ULT-04 | SP 滿時按鈕可按、施放後 SP 歸零、與 legacy general skill 不混用 | assets/scripts/ui/components/UltimateSelectPopup.ts、UltimateSelectPopupComposite.ts、battle/views/BattleUIBridge.ts:495、BattleSkillTargetingFlow.ts；規格 checklist 該三項仍未勾 |  |
| **ULT-08** | M7 | UBURST/UTEAMBUFF/UTEAMHEAL/USINGLE 首批家族 resolver（P0 首批可玩包） | logic | 5 | 🟢 已接線 | ULT-06 | 四家族 unit test 通過，各自代表奧義 smoke 可施放 | assets/scripts/battle/skills/resolvers/BuffDebuffSkillResolver.ts、HealSkillResolver.ts、ProjectedDamageSkillResolver.ts；tests/BattleSkillExecutor.test.ts（含 liu-bei-rally ally-all）；65 條中僅 61 條有 battleSkillId，執行家族覆蓋不全 | 純邏輯→已接線；協調線指示：已由既有 BattleSkillProfiles 路徑覆蓋，結案 |
| **ULT-09** | M7 | UALLDEBUFF/UAREA/UCONTROL 戰場策略包 resolver | logic | 5 | 🟢 已接線 | ULT-08 | 三家族 unit test + 代表奧義（諸葛亮、周瑜、貂蟬）smoke | assets/scripts/battle/skills/resolvers/CounterSkillResolver.ts、LinkSkillResolver.ts、ResetSkillResolver.ts；tests/BattleSkillExecutor.test.ts；沉默/魅惑/偷行動條未見 | 純邏輯→已接線；協調線指示：已由既有 BattleSkillProfiles 路徑覆蓋，結案 |
| **ULT-10** | M7 | USPECIAL 高階規則包（復活、增益轉移、行動條重置、死亡觸發、場勢切換） | logic | 5 | ⚪ 未開始 | ULT-09 | 白名單特殊規則逐項單元測試，battle state 重算 | 部分 Reset/Counter resolver 可能相關，但復活/增益轉移/死亡觸發無實作 |  |
| **ULT-11** | M0 | shared runtime contract（shared/skill-runtime.ts 與 schema） | data | 1 | 🟢 已接線 | - | SkillRuntimeContract 型別與 JSON schema 同步，ultimate-definitions 加 family/coeff/duration/cinematicProfile | [v16.8 更正 2026-10-28] SkillRuntimeContract 的 family、coefficient、durationTurns 欄位由 BattleController、BattleSkillDispatcher 使用，ultimate-definitions.json 含 family |  |
| **ULT-12** | M10 | 奧義演出系統（全屏特效、鏡頭、BattleCry、HUD/battle log 文案） | ui | 5 | 🟢 已接線 | ULT-07 | 每家族至少一套 cinematicProfile 可播放，battle log 與說明一致 | [v16.5 第四批核對 2026-10-27] master #1144–#1199 已接上（已接線）；待 QA／實機驗收 |  |
| **ULT-13** | M7 | 委任/敵方 AI 按家族施放奧義規則 | logic | 3 | 🟢 已接線 | ULT-08 | AI 依家族判斷時機，測試覆蓋斬殺線/血線/敵密度 | assets/scripts/battle/controllers/EnemyAI.ts 僅處理兵種部署，無奧義決策 | 未開始→已接線；#1296 AiUltimateFamilyRule 接 BattleController |
| **ULT-14** | M9 | 血脈傳承奧義五階（星階門檻×名聲覺醒進度，命紋靈獸加成） | logic | 5 | 🟢 已接線 | ULT-02 | isBloodlineUltimateStageUnlocked 與 awakening_gain 單元測試，命頁顯示名聲/事蹟需求 | 無（grep Bloodline_Transmission/awakening 無實作） | 未開始→已接線；BloodlineTransmissionUltimate 已接 GameSession／UltimateProgress（既有呼叫端） |
| **ULT-15** | M2 | 子嗣奧義覺醒（綠色因子 level×0.05 機率，家傳奧義） | logic | 3 | ⚪ 未開始 | ULT-01 | 培育中依綠色因子等級擲覺醒，寫入 Is_Inherited 與 Source_Parent_UID | gene-dictionary.json 存在但無奧義覺醒邏輯 |  |
| **ULT-16** | M8 | 奧義升級（重複解鎖升 Lv）與奧義圖鑑 | logic | 3 | 🟢 已接線 | ULT-03 | 重複取得升級並顯示 Lv；圖鑑列出已解鎖 | [v16.4 核對 2026-10-27] 今日合併 PR 已接上 src 呼叫端（已接線）；待 QA／實機驗收 |  |
| **ULT-17** | M9 | 組合奧義（赤壁大火等跨武將）與英靈附體（祖先虛影雙發） | logic | 5 | ⚪ 未開始 | ULT-10 | 獨立子系統母規格成立後再驗收 | 規格 F-8 標示待獨立母規格；無 |  |
| **ULT-18** | M11 | 奧義 Server 表 / 存檔結構（GeneralUltimates、ult_records） | server | 2 | 🟢 已接線 | ULT-03 | 解鎖/等級/家傳旗標持久化並可同步 | 無 | 未開始→已接線；協調線確認養成線：完成（記已接線，待 QA） |
| **ULT-19** | M10 | 奧義 UI 字串與劇本（解鎖/施放/精力不足/家傳） | content | 1 | 🟢 已接線 | - | UI_ULT_* Key 進入 i18n | 無（grep UI_ULT_ 無結果） | 純邏輯→已接線（戰場線指出並核對）：ui.ultimate.* 5 鍵（charging/label/ready/unassigned/unassigned_toast）四語系檔皆有，由 ActionCommandComposite（經 BattleScenePanel）、BattleSkillTargetingFlow、BattleUIBridge 使用；劇本部分未逐項核對 |
| **GRD-01** | M7 | Tile-State Machine 底層：Normal/Hazard/Force-Move/Stealth 四狀態定義與 JSON/資料結構（Q33=D） | logic | 3 | 🟡 純邏輯 | - | 格子狀態以資料驅動，可宣告 onEnterDamage/onEnterPush/onEnterHide，單元測試覆蓋四狀態 | [v8 核對 2026-10-15] TileStateRules 四類格子狀態分類（0019881a）與測試；無 src 呼叫端 |  |
| **GRD-02** | M7 | Hazard 傷害格（火燒延燒、落石固定高傷）每回合結算 | logic | 2 | 🟢 已接線 | GRD-01 | 進入或停留 Hazard 格依 damagePerTurn 扣血，延燒規則可測 | assets/scripts/battle/runtime/phases/BattleTileEffectPhase.ts（damagePerTurn 結算）；BattleTacticBehavior.ts 建 hazard-fire/hazard-rock |  |
| **GRD-03** | M7 | Force-Move 位移格（水淹推退，受阻轉傷害） | logic | 2 | 🟢 已接線 | GRD-01 | forcedMoveDirection/steps 推移，受阻改為傷害，測試覆蓋 | [v8 核對 2026-10-15] ForcedMoveTile 由 BattleAutoMovePhase 呼叫（3133bf4d、bcdf167e）；水淹推退畫面未核對 |  |
| **GRD-04** | M7 | Stealth 掩體格（森林埋伏，進入隱蔽防遠程） | logic | 2 | 🟢 已接線 | GRD-01 | 進入 ambush-field 後遠程無法鎖定，離開失效，測試覆蓋 | [v8 核對 2026-10-15] StealthTile 接進目標選取（b6b489f4）與直接攻擊掩體判定（aba07b20）；森林埋伏畫面未核對 |  |
