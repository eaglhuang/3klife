<!-- doc_id: doc_index_0001 -->
# Cross-Reference: 代碼索引（代碼 ↔ 規格書 雙向映射）

> 這是 doc_index_0007 的 B 節分片。完整索引見 `docs/cross-reference-index.md (doc_index_0007)` (doc_index_0007)。
> 最後更新請參考母檔 Header。
>
> **doc_id 查詢**：用 `node tools_node/resolve-doc-id.js <搜尋詞>` 查文件代號，或瀏覽 `docs/doc-id-registry.md (doc_other_0006)` (doc_other_0006)。
> ⚠️ **壓縮版（doc_id 索引）**：中文名稱已移除，查詢名稱請用 resolve-doc-id.js。人類可讀進度 → `docs/cross-ref/cross-ref-進度.md (doc_index_0017)` (doc_index_0017)

## B. 代碼索引（代碼 ↔ 規格書 雙向映射）

### B-1. 代碼 → 規格書

> 每個 .ts 檔對應的規格書來源，標示資料結構(D) / 公式(F) / 常數(C) / 概念(概) 的引用類型。

> **已拆分（PROG-2-1613）**：B-1 表格依目錄分到 `docs/cross-ref/code/` 分片；本檔只留入口。找某個 .ts 檔：先看下表挑分片，或 `grep -rn 檔名 docs/cross-ref/code/`。

| 分片 | 涵蓋目錄 | 大小 |
|---|---|---|
| `code/core-systems-1.md` | Core Systems（NurtureSystem.ts ～ JournalLog.ts） | 174 行 / ~21 KB |
| `code/core-systems-2.md` | Core Systems（JournalReaction.ts ～ YearReport.ts） | 174 行 / ~20 KB |
| `code/core-shared.md` | Core Models、Shared Contracts、Core Data、Core Config、Core Utils、Core Managers、Core Storage、Core Services、Core Serialization、Core / Dialogue、Shared、Shared / Interfaces | 155 行 / ~12 KB |
| `code/battle.md` | Battle Controllers、Battle Models、Battle Views、Battle Views / Effects、Battle、Battle / Orchestrators、Battle / Runtime、Battle / Runtime / Phases、Battle / Runtime / Tempo、Battle / Shared、Battle / Skills、Battle / Skills / Adapters、Battle / Skills / Resolvers | 167 行 / ~12 KB |
| `code/ui.md` | UI Components、UI Core、UI Core Panels、UI Panels、UI Layers & Scenes、Ui / Components / Character-Ds3、Ui / Components / Gacha-Ds3、Ui / Components / General-Detail、Ui / Components / Portrait、Ui / Dev、Ui / Platform / Cocos、Ui / Platform / Unity、UI Core Interfaces、UI Platform Adapters | 283 行 / ~29 KB |
| `code/ui-spec-json.md` | UI Spec JSON | 77 行 / ~11 KB |
| `code/tools.md` | Tools、Build Tools、UCUF Compiler / Orchestrator、Agent Skills | 87 行 / ~7 KB |

### B-2. 共用 base 框架 ↔ 現有程式檔（PROG-2-9200）

> 框架 → 現有程式（可抽取或將被取代的來源）。程式 → 規格見 `code/*.md` B-1；框架規格為 doc_spec_1182～1188。路徑除標示 `server/`、`shared/` 者外皆在 `assets/scripts/` 下。

| 框架（doc_id） | 現有程式檔（可抽為 base 或將轉為包裝） |
|---|---|
| 共通 API 層（doc_spec_1182 第 5 章） | `core/gacha/GachaApi.ts`、`core/gacha/LocalGachaApi.ts`、`core/mission/service/IMissionService.ts`、`core/mission/service/OfflineMissionService.ts`（既有 adapter 型態）；`core/systems/SyncManager.ts`、`SyncHash.ts`、`NetworkService.ts`、`GachaSyncRecord.ts`、`core/storage/CloudSyncGuard.ts`；`core/services/PlayerSaveService.ts`、`core/managers/GameSession.ts`（直接改數值與存檔，P0 遷移對象）；`server/src/sync.ts`、`sync-limits.ts`、`sync-security.ts`、`server/schema/sync06-patch-whitelist.ts`、`shared/protocols.ts` |
| 共通底層工具層（doc_spec_1182 第 11、12 章 FND-M；PROG-2-9202） | `shared/foundation/`：`Sha256.ts`（雜湊，自 `core/systems/SyncHash.ts` 搬入）、`DeterministicRng.ts`（確定性亂數會話）、`WeightedTable.ts`（加權表）、`Condition.ts`（條件評估）、`GameClock.ts`（季時鐘與遞減）；測試 `tests/Foundation.test.ts`；示範替換：`core/systems/nurture/AcademyDeterministicRng.ts` |
| 物品庫存 base 最小版（doc_spec_1184、doc_spec_1182 第 12 章 ITM-M；PROG-2-9203） | `shared/item/`：`ItemConfig.ts`（持有者／容器／物品定義設定型別與預設）、`ItemRules.ts`（發放預檢、堆疊上限、溢出折金、綁定、帳本與 itemMeta 正規化）；`core/api/localserver/ItemCommands.ts`（item.grant／consume／settlePeriodic／count／list／ledger）；設定 `resources/data/item-config.json`；家庭倉庫＝`GameSession.itemAuthority()` 接 PlayerInventory | 入學令改走 item.* 命令（LobbyScene 入學）；`NurtureService.admission` 只留舊培育入口 |
| 獎勵 base 最小版（doc_spec_1186、doc_spec_1182 第 12 章 RWD-M；PROG-2-9205） | `shared/reward/`：`RewardConfig.ts`（獎池／套件設定型別與正規化）、`RewardRules.ts`（加權抽取＋保底、縮放、懲罰上限、rewardMeta 正規化）、`RewardPresentation.ts`（演出 adapter 介面與 instant／chest 內建）；`core/api/localserver/RewardCommands.ts`（reward.roll／claim／pools／pity，入帳走 item.* 命令層與錢包 port，可 registerRewardEffect 掛宿主效果）；設定 `resources/data/reward-config.json`；狀態＝`GameSession.rewardAuthority()`（存檔欄位 rewardMeta） | 戰後里程碑戰法筆記改走 reward.claim（`GameSession._claimMilestoneNotes`）；錯誤碼 E320～E328；轉蛋、極限任務掉落、任務結算尚未接入；測試 tests/RewardBase.test.ts |
| 劇情（演出）base 最小版（doc_spec_1188、doc_spec_1182 第 12 章 STY-M；PROG-2-9208） | `shared/story/`：`StoryConfig.ts`（劇本節點圖 scene／choice／branch／effects／end 設定型別與正規化）、`StoryRules.ts`（storyMeta：旗標、已看、打斷佇列、已完成實例；單一優先序排序）、`StoryPresentation.ts`（演出 adapter：cue 註冊表、popup 內建、單一佇列播放器）；`core/api/localserver/StoryCommands.ts`（story.trigger／choose／available／pending／seen／flags，後果走 reward.claim，可 registerStoryEffect 掛宿主效果）；設定 `resources/data/story-config.json`；狀態＝`GameSession.storyAuthority()`（存檔欄位 storyMeta）；學府文案查詢 `core/systems/nurture/AcademyStoryTexts.ts` | 學府打斷種類名稱與結業訊息改讀劇情資料（`AcademyFlowView.interruptKindText`）；錯誤碼 E340～E348；開場、日報、羈絆、傳記等尚未遷入；測試 tests/StoryBase.test.ts |
| 人員占用精簡版（doc_spec_1182 第 10～12 章 OCC-M 中立版；PROG-2-9207） | `shared/occupancy/`：`OccupancyTypes.ts`（占用種類：可寫 academy／mentorAssign、唯讀六處 governance／hallMission／dispatch／mercenary／expedition／medical）、`OccupancyService.ts`（登記表、互斥、冪等 acquire／release、轉接器查詢、filterFree）；`core/api/localserver/OccupancyCommands.ts`（occupancy.query／acquire／release）；狀態＝`GameSession.occupancyHost`（存檔欄位 occupancy，學府占用由學府紀錄對帳） | 修業中武將從任務牆（MissionBlock occupied）、派遣、傭兵候選排除；錯誤碼 E330～E334；`check-api-bypass` 新增 skill-write 規則；測試 tests/OccupancyBase.test.ts |
| 任務最小版（doc_spec_1185／doc_spec_1182 第 12 章 QST-M；PROG-2-9209） | `shared/quest/`：`QuestTypes.ts`（定義、實例、存檔狀態、QuestError）、`QuestConfig.ts`（quest-config.v1 正規化）、`QuestService.ts`（同步領域邏輯：accept／advance／clearGate／pause／resume／tick／beginSettle／abandon）、`AcademyQuest.ts`（taskKind=academy 常數與 adapter 介面）；`core/api/localserver/QuestCommands.ts`（task.query／accept／advance／clearGate／pause／resume／settle／abandon／tick）；定義＝`assets/resources/data/quest-config.json`（ACADEMY_36）；狀態＝`GameSession.questAuthority`（存檔欄位 questState） | 結算走 reward.claim（grantKey=`quest:<qid>:settle`）、占用走 occupancy.acquire／release；錯誤碼 E350～E359；學府實際改接屬 A0（6a）；測試 tests/QuestBase.test.ts |
| 買賣商店（doc_spec_1183） | `core/systems/ItemShopPricing.ts`、`WishPool.ts`、`DestinyShop.ts`、`GachaCurrency.ts`、`WarehouseCapacity.ts`（擴容價）；`ui/core/ShopMainController.ts`、`DestinyShopController.ts` |
| 物品庫存（doc_spec_1184） | `core/systems/PlayerInventory.ts`、`ItemDef.ts`、`InventoryProjection.ts`、`BagDomain.ts`、`GeneralBackpack.ts`、`GearEquipFlow.ts`、`GearDefinitions.ts`、`GearLockDecompose.ts`、`WarehouseCapacity.ts`、`ItemExpiry.ts`、`ItemUseFlow.ts`、`ItemEffectDispatcher.ts`、`TreasureCodex.ts`；`ui/core/ItemBagController.ts`、`WarehousePanelController.ts`；`server/schema/bag11-equip-row.ts` |
| 任務（doc_spec_1185） | `core/mission/`（MissionTypes／Resolver／Balance／Branch／Intel／Fitness／Spawn／Save／Loader／Rng 等）、`core/systems/HallMissionLoop.ts`、`HallMissionData.ts`、`DispatchJobs.ts`、`GovernanceAssignment.ts`、`ExtremeTaskBoard.ts`、`LegacyAchievement.ts`、`SeasonPass.ts` |
| 獎勵（doc_spec_1186） | `core/systems/ExtremeTaskDrop.ts`、`GachaDraw.ts`、`GachaSystem.ts`、`MilestoneRewards.ts`、`BattleAftermath.ts`、`StageSalvageSettlement.ts`、`GiftBundle.ts`、`WishPool.ts`；`core/mission/MissionTypes.ts`（效果帳本）；`ui/core/GachaFullScreenPanel.ts` |
| 技能（doc_spec_1187） | `shared/skill-runtime.ts`（SkillRuntimeContract）、`battle/skills/`（BattleSkillProfiles、BattleSkillResolverFactory、resolvers／adapters）、`core/systems/TacticLearning.ts`、`TacticLoadout.ts`、`TacticCastTpCost.ts`、`TacticTriggerRate.ts`、`TacticCondition.ts`；資料 `assets/resources/data/master/tactic-library.json` |
| 劇情演出（doc_spec_1188） | `core/systems/OpeningFlowController.ts`、`NewPlayerOpening.ts`、`DestinyOpening.ts`、`JournalEvents.ts`、`EventSystem.ts`、`NurtureEvents.ts`、`BondingStoryLines.ts`、`StoryStripCells.ts`、`FarewellLetterInbox.ts`；`ui/core/OpeningIntroController.ts`、`SeasonEventPopupController.ts`；`shared/cutin/*` |
