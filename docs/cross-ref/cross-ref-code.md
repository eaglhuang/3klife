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
| 買賣商店（doc_spec_1183） | `core/systems/ItemShopPricing.ts`、`WishPool.ts`、`DestinyShop.ts`、`GachaCurrency.ts`、`WarehouseCapacity.ts`（擴容價）；`ui/core/ShopMainController.ts`、`DestinyShopController.ts` |
| 物品庫存（doc_spec_1184） | `core/systems/PlayerInventory.ts`、`ItemDef.ts`、`InventoryProjection.ts`、`BagDomain.ts`、`GeneralBackpack.ts`、`GearEquipFlow.ts`、`GearDefinitions.ts`、`GearLockDecompose.ts`、`WarehouseCapacity.ts`、`ItemExpiry.ts`、`ItemUseFlow.ts`、`ItemEffectDispatcher.ts`、`TreasureCodex.ts`；`ui/core/ItemBagController.ts`、`WarehousePanelController.ts`；`server/schema/bag11-equip-row.ts` |
| 任務（doc_spec_1185） | `core/mission/`（MissionTypes／Resolver／Balance／Branch／Intel／Fitness／Spawn／Save／Loader／Rng 等）、`core/systems/HallMissionLoop.ts`、`HallMissionData.ts`、`DispatchJobs.ts`、`GovernanceAssignment.ts`、`ExtremeTaskBoard.ts`、`LegacyAchievement.ts`、`SeasonPass.ts` |
| 獎勵（doc_spec_1186） | `core/systems/ExtremeTaskDrop.ts`、`GachaDraw.ts`、`GachaSystem.ts`、`MilestoneRewards.ts`、`BattleAftermath.ts`、`StageSalvageSettlement.ts`、`GiftBundle.ts`、`WishPool.ts`；`core/mission/MissionTypes.ts`（效果帳本）；`ui/core/GachaFullScreenPanel.ts` |
| 技能（doc_spec_1187） | `shared/skill-runtime.ts`（SkillRuntimeContract）、`battle/skills/`（BattleSkillProfiles、BattleSkillResolverFactory、resolvers／adapters）、`core/systems/TacticLearning.ts`、`TacticLoadout.ts`、`TacticCastTpCost.ts`、`TacticTriggerRate.ts`、`TacticCondition.ts`；資料 `assets/resources/data/master/tactic-library.json` |
| 劇情演出（doc_spec_1188） | `core/systems/OpeningFlowController.ts`、`NewPlayerOpening.ts`、`DestinyOpening.ts`、`JournalEvents.ts`、`EventSystem.ts`、`NurtureEvents.ts`、`BondingStoryLines.ts`、`StoryStripCells.ts`、`FarewellLetterInbox.ts`；`ui/core/OpeningIntroController.ts`、`SeasonEventPopupController.ts`；`shared/cutin/*` |
