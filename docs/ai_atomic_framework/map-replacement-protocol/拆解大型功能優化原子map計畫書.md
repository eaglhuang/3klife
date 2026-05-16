<!-- doc_id: doc_other_0133 -->
# 拆解大型功能優化原子map計畫書

## 0. 核心結論

本計畫要把 ATM 既有的 atomic map 能力正式升級為「大型功能替代表面」。當新功能或 legacy 大功能需要拆解時，ATM 不應只產生一批孤立 atom，而應把這些 atom 串成 canonical atomic map，讓 map 承接原本大型功能的入口、資料流、控制流、品質目標、驗證證據與替代生命週期。

本計畫不是引入一套平行框架，也不是把 Atomic Design 五層架構搬進 ATM；它的核心是把 ATM 已有的 governance primitives 串成 product-level replacement protocol：atom 負責最小能力，map 負責組合語義，upgrade proposal 負責審查，test/propagation 負責驗證，rollback proof 負責退場安全。

## 1. ATM 目前已具備的基礎

目前 ATM repo 已經具備 map replacement 的主要骨架：

1. `atomic_workbench/maps/<mapId>/` 已是 canonical map 工作區，與 `atomic_workbench/atoms/<atomId>/` 平行。
2. `create-map` 已能透過 `generateAtomicMap()` 建立 map，產出 `map.spec.json`、`map.integration.test.ts`、`map.test.report.json`，並寫入 registry。
3. `atomic-map.schema.json` 已有 `members`、`edges`、`entrypoints`、`qualityTargets`、`mapHash`、`semanticFingerprint`。
4. `test --map <mapId>` 已能執行 canonical map integration test。
5. `test --propagate <atomId>` 已能找出引用某 atom 的下游 maps 並跑 propagation integration。
6. `upgrade --target map --map <id>` 已能把 map 作為 proposal target，並產生 map-bump 類型的 decomposition decision。
7. `rollback-proof.schema.json` 已支援 `targetKind: map`，可作為 map replacement 退場或回滾證據。

因此本計畫的方向是演進，不是重寫。ATM 目前可視為已達「map 作為 governed artifact」階段；下一步是讓 map 成為新功能或 legacy 大功能的正式替代契約。

## 2. 設計原則

### 2.1 Map 是大型功能的治理替代表面

大型功能被拆解後，不應只留下多個 atom。必須有一個 map 代表新的功能表面，並成為後續治理、測試、演進與回滾的中心。

例如：`legacy://app/checkout.py` 不應只拆成 `ATM-CHECKOUT-0001`、`ATM-CHECKOUT-0002`、`ATM-CHECKOUT-0003`；它還需要一個 `ATM-MAP-0007` 表示 checkout replacement map。

### 2.2 Atom 負責能力，Map 負責組合語義

Atom 描述最小治理單元能做什麼；Map 描述這些 atom 如何形成完整功能，包括入口、資料流、控制流、品質目標、legacy replacement target 與驗證證據。

### 2.3 Evidence-gated，不直接替換

Map 建立成功不代表可以取代大型功能。任何宣稱 replacement 的 map，都必須有 integration evidence 與 equivalence evidence。缺少 equivalence evidence 時，replacement mode 不能超過 draft。

### 2.4 Replacement rollout 與 registry status 分離

Registry status 的 `draft / validated / active / deprecated / expired` 是 registry lifecycle；replacement 的 `draft / shadow / canary / active / legacy-retired` 是 rollout lane。兩者相關但不可混用。

### 2.5 不過早做 runtime engine

短期只支援 documented / delegated execution。Map integration test、equivalence runner、upgrade proposal 與 adapter evidence 已足以支撐 MVP。完整 orchestrated runtime 應等 agent-execute 與 map execution contract 成熟後再接入。

## 3. Schema 0.2.0 最小擴充

`atomic-map.schema.json` 目前 root、member、edge 都是 `additionalProperties:false`，且 `specVersion` 固定 `0.1.0`。因此任何新增欄位都必須走正式 schema bump，而不是直接把欄位塞進現有 spec。

第一階段只建議加入最小欄位：

1. `members[].role`：描述 atom 在 map 中的角色，例如 `entry-adapter`、`validator`、`domain-rule`、`side-effect-adapter`、`orchestrator`。
2. `edges[].edgeKind`：描述邊的語意，例如 `data-flow`、`control-flow`、`event-flow`、`validation`、`fallback`、`side-effect`、`rollback`。
3. `replacement.legacyUris`：使用 ATM 已有的 `legacy://` URI 語意指向被替代的大功能入口。
4. `replacement.mode`：作為 replacement rollout lane，允許 `draft`、`shadow`、`canary`、`active`、`legacy-retired`。
5. `replacement.evidenceRefs`：列出 integration、equivalence、rollback、human review 等證據路徑或 ID。

暫緩加入完整 `execution.orchestrated`，避免尚未成熟的 runtime engine 進入 map schema 核心。

## 4. Hash 與 semantic fingerprint 規則

目前 `mapHash` 實際只吃 `members`、`edges`、`entrypoints`；`qualityTargets` 目前進入 `semanticFingerprint`，但不進 `mapHash` payload。新增 replacement metadata 前必須明確定義 hash 邊界。

建議規則如下：

1. 結構性欄位進 `mapHash`：members、edges、entrypoints、member role、edge kind。
2. 語義品質欄位進 `semanticFingerprint`：qualityTargets、entrypoints、可驗證的 semantic contract。
3. rollout 狀態不進 `mapHash`：`replacement.mode` 應進 lineage/report，而不是改一次 rollout 就讓 mapHash 改變。
4. replacement target 可進 mapHash：`replacement.legacyUris` 屬於替代契約的一部分，應被 hash-lock 觀測。
5. evidence refs 不宜直接進 mapHash：證據會隨驗證重跑而更新，應由 report/lineage 管理。

## 5. Map equivalence report

現有 `test-report.schema.json` 與 `regression-matrix.schema.json` 偏 atom-oriented，不能直接承載 map equivalence。因此應新增 map-oriented report schema，但復用既有 regression case、metrics、evidence 的語意形狀。

建議新增：`schemas/governance/map-equivalence-report.schema.json` 或 `schemas/reports/map-equivalence-report.schema.json`。

核心欄位：

1. `schemaId: atm.mapEquivalenceReport`
2. `specVersion: 0.1.0`
3. `mapId`
4. `legacyUris`
5. `fixtures`
6. `cases[]`
7. `summary`
8. `metrics`
9. `knownDivergences[]`
10. `passed`
11. `artifacts[]`
12. `evidence[]`

語意要求：每個 fixture 必須能比較 legacy output 與 map output；若存在允許差異，必須列入 `knownDivergences` 並由 review gate 接受。

## 6. CLI 工作流

### 6.1 Create map

現有 `create-map` 只接受 CLI JSON 字串。後續可新增：

1. `create-map --spec <path>`：從完整 draft map spec 建立。
2. `create-map --from-plan <path>`：從 decomposition plan 建立。

短期不必一次實作兩者；優先支援 `--spec`，因為它最符合 deterministic artifact workflow。

### 6.2 Map integration

沿用既有：`node atm.mjs test --map <mapId> --json`。

### 6.3 Map equivalence

建議擴充 test command：`node atm.mjs test --map <mapId> --equivalence-fixtures <path> --json`。

若選擇新增 `--map-equivalence <mapId>`，必須同步修改 `test.ts` 的 mutual exclusion 規則，避免和現有 `--map`、`--propagate`、`--spec`、`--atom` 衝突。

### 6.4 Propagation

沿用既有：`node atm.mjs test --propagate <atomId> --json`。

任何 active/canary replacement map 的 member atom 發生重要變更時，必須跑 propagation。

### 6.5 Upgrade proposal

`upgrade-map-propose.ts` 目前只是薄 wrapper，真正 gate 在 `packages/core/src/upgrade/propose.ts`。因此 replacement gate 應在 `propose.ts` 中新增 input kind 與 automated gate。

需要新增 input kind：

1. `map-equivalence`
2. `rollback-proof`

Active replacement 必須有 passing map equivalence report；legacy-retired 必須有 rollback proof 或 retirement proof。

## 7. Replacement lifecycle

Replacement lifecycle 是 map replacement 的 rollout lane，不取代 registry status。

1. `draft`：map 已建立，但尚未宣稱可替代功能。
2. `shadow`：map 與 legacy 並行執行，只比對輸出，不影響正式結果。
3. `canary`：map 接小範圍場景或測試流量，仍保留 rollback path。
4. `active`：map 成為正式功能入口。
5. `legacy-retired`：原 legacy 入口退場，或只保留為已過期 lineage evidence。

轉移規則：

1. `draft -> shadow`：需要 map integration pass。
2. `shadow -> canary`：需要 map equivalence pass，且 known divergences 可接受。
3. `canary -> active`：需要 map equivalence pass、propagation pass、review-advisory pass、human review approved。
4. `active -> legacy-retired`：需要 rollback proof 或 retirement proof，且 caller/entrypoint 風險已清空。

## 8. ScopeLock 與 map-level selector

現有 ScopeLock schema 與 `ScopeLockRecord` 只有 `files`，不能直接鎖 map members、edges、entrypoints 或 replacement target。後續應升級 ScopeLock 0.2.0。

建議新增 `selectors`：

1. `mapId`
2. `mapMembers[]`
3. `mapEdges[]`
4. `mapEntrypoints[]`
5. `legacyUris[]`

在沒有 ScopeLock 0.2.0 前，replacement 任務至少要鎖住：map spec、map integration test、equivalence report、legacy entrypoint、相關 atom spec/code/test。

## 9. Polymorph impact gate

目前 `polymorph/template.ts` 的 `propagateTemplateUpgrade()` 是輕量 helper，尚不是完整 replacement discovery/report 系統。因此 polymorph impact gate 不應被假設已存在。

後續需要補：

1. 掃描 replacement map 的 member atoms 是否屬於 polymorph template 或 instance。
2. 找出受影響 instance maps。
3. 跑 instance map propagation。
4. 產出 polymorph impact report。
5. 在 active gate 中消費該 report。

## 10. MVP 里程碑

### Milestone 1：文件定稿

新增並維護 3KLife 內部工作台文件 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`，確認 Map Replacement Protocol 的語意、非目標、schema 邊界、CLI 流程與 gate 規則。ATM repo 只保留英文公開說明 `docs/MAP_REPLACEMENT_PROTOCOL.md`。

### Milestone 2：Atomic map schema 0.2.0

擴充 `atomic-map.schema.json`、TypeScript 型別、map generator、map registry entry、generated integration test。

### Milestone 3：Map equivalence report

新增 map-oriented equivalence report schema，復用 regression case / metrics / evidence 的語意。

### Milestone 4：Test CLI

支援 map equivalence runner，產出 deterministic report。

### Milestone 5：Upgrade gates

擴充 `upgrade/propose.ts`，納入 `map-equivalence` 與 `rollback-proof` input kind。

### Milestone 6：ScopeLock 與 polymorph 後補

ScopeLock 0.2.0 與 polymorph impact gate 放在後續，避免阻塞 MVP。

## 11. 成功標準

完成後，ATM 應能回答：

1. 這個大型功能由哪個 map 代表？
2. map 的入口 atom 是誰？
3. 每個 member atom 在 map 中的 role 是什麼？
4. 每條 edge 是 data-flow、control-flow、validation 還是 side-effect？
5. 哪些 legacy URI 被這個 map 替代？
6. 哪個 report 證明 map 與 legacy 行為等價？
7. 修改某個 member atom 會影響哪些 maps？
8. canary/active/retired 的 upgrade gate 需要哪些 evidence？
9. rollback proof 或 retirement proof 在哪裡？
10. Agent 下一步應該跑哪些 deterministic checks？

## 12. 風險與避免方式

### 12.1 Map 變成文件而非治理物件

避免方式：replacement map 必須有 integration report、equivalence report 與 upgrade proposal gate。

### 12.2 Schema 變更破壞現有 0.1.0 map

避免方式：使用 specVersion 0.2.0 與 migration strategy，不直接改壞 0.1.0 validator。

### 12.3 Hash 邊界混亂

避免方式：結構欄位、語義欄位、rollout 狀態與 evidence refs 分層管理。

### 12.4 過早做 runtime engine

避免方式：MVP 只支援 documented/delegated execution，不承諾 orchestrated runtime。

### 12.5 Legacy 太早退役

避免方式：active 前需要 equivalence evidence，retired 前需要 rollback proof 或 retirement proof。

## 13. 最終建議

ATM 下一步應優先完成 Atom Map Replacement Protocol，而不是新增抽象層級。這能把 map 從「atoms 的關係圖」升級成「新功能與 legacy 大功能的正式替代表面」。

本計畫最重要的落點是：大型功能拆解後，治理中心不是單一 atom，也不是散落的 task，而是 canonical atomic map。Map 必須帶著角色、邊語義、legacy URI、equivalence evidence、rollout mode、propagation impact 與 rollback proof，才能真正接管原本的大功能。

## 14. 目標 A / B 的可達成性重新分析

本章把使用者明訂的兩個目標單獨拆出，逐點對映到 ATM 現況、缺口、與本計畫要交付的最小機制。目的是把「Map 接管大功能」從口號變成可驗證的 deterministic checklist。

### 14.1 目標 A：拆解後不是孤立 atom，而是由 atom 串成 map 接管大功能

目標原文：「新功能或 legacy 大功能被拆解後，不是變成一堆孤立 atom，而是由 atom 串成 map，讓 map 接管並取代原本的大功能。」

要可達成必須同時滿足三件事：

1. **拆解產物有強制 map 入口**：任何來自大功能的拆解流程，輸出的不只是 atoms，而是一份 `decomposition-plan`，且該 plan 必須能直接 instantiate 成一個 canonical map（`atomic_workbench/maps/<mapId>/`）。
2. **Map 必須宣告替代目標**：map 在 spec 階段就要記錄 `replacement.legacyUris[]`，否則它只是「atoms 的關係圖」，不是「替代表面」。
3. **沒有替代證據前，不准接管**：缺 equivalence / propagation / rollback evidence 時，replacement mode 不可超過 `draft`；upgrade proposal 在 `propose.ts` 應直接 block。

對映到本計畫的具體交付：

| 目標 A 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| 大功能拆解→ map 入口 | `decomposition-plan` schema + `create-map --from-plan` | M2 / M7 | TASK-MRP-0001 / 0007 |
| Map 宣告替代目標 | Schema 0.2.0 `replacement.legacyUris[]` | M2 | TASK-MRP-0002 |
| 沒證據不准接管 | `upgrade/propose.ts` 新增 `map-equivalence` / `rollback-proof` input kind | M5 | TASK-MRP-0005 |

達成判斷：以一個示範大功能（建議 `legacy://samples/checkout-mini`）走完「plan → map → integration → equivalence → shadow→canary→active」全流程，且 active gate 真的在沒 equivalence 時被拒絕一次，即視為目標 A 達成。

### 14.2 目標 B：map 從「atoms 的關係圖」升級為「正式替代表面」

目標原文：「從『map 是 atoms 的關係圖』升級成『map 是新功能 / legacy 大功能的正式替代表面』。」

「替代表面」必須同時具備四個語義承載點：

1. **結構語義**：每個 member 有 `role`，每條 edge 有 `edgeKind`，否則 map 只是無語意連線。
2. **替代契約**：`replacement.legacyUris`、`replacement.mode`、`replacement.evidenceRefs` 表達「這個 map 要替代誰、處於哪一段 rollout、有哪些證據」。
3. **可驗證等價**：必須有 `map-equivalence-report` 證明 map 與 legacy 在 fixture 集上行為等價；已知差異要明列 `knownDivergences`。
4. **退場安全**：到 `legacy-retired` 必須有 `rollback-proof` 或 retirement proof，且 caller 已清空。

對映到本計畫的具體交付：

| 目標 B 子條件 | 由哪個機制保證 | 對應里程碑 | 對應任務卡 |
|---|---|---|---|
| 結構語義 | Schema 0.2.0：`members[].role` + `edges[].edgeKind` | M2 | TASK-MRP-0002 |
| 替代契約 | Schema 0.2.0：`replacement.*` 區塊 + mapHash 邊界 | M2 | TASK-MRP-0002 |
| 可驗證等價 | `map-equivalence-report.schema.json` + `test --map --equivalence-fixtures` | M3 / M4 | TASK-MRP-0003 / 0004 |
| 退場安全 | upgrade gate 對 `active → legacy-retired` 要求 rollback-proof | M5 | TASK-MRP-0005 |

達成判斷：對示範 map 執行 `upgrade --target map`，proposal 必須能在 JSON 輸出中同時引用 `map-equivalence` 與 `rollback-proof` input kind，且 rollout lane 的 lineage 能還原 `draft → shadow → canary → active → legacy-retired` 五段轉移歷史。

### 14.3 風險再校準

1. **被誤判為「文件層計畫」**：避免方式 = 每個里程碑都必須交付可執行 deterministic check，而非僅 markdown。
2. **Atoms 已先落地，但沒有對應 map**：避免方式 = 在 `decomposition-plan` 進入時，若未指定 `mapId` 或 `replacement.legacyUris`，CLI 應 hard-fail。
3. **Equivalence fixture 寫不出**：避免方式 = MVP 階段允許 `knownDivergences[]`，但必須走 review-advisory；不可靜默忽略。
4. **rollout lane 與 registry status 被混用**：避免方式 = registry status 改變不得自動改 `replacement.mode`，反向亦然；兩者由獨立 transition validator 管理。

## 15. 里程碑總表與 Checklist

每個里程碑都列出可勾選的 deterministic checklist。完成判定條件 = 該 checklist 全部勾選且 `git -C AI-Atomic-Framework status --short` 中對應檔案存在或變更。

### Milestone 1：文件定稿（M1）

對應任務卡：TASK-MRP-0000

- [x] `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md` 存在且包含 §0–§16
- [x] 文件已被 ATM `README.md` 與 `docs/ARCHITECTURE.md` 引用；ATM repo 端只保留英文公開文件 `docs/MAP_REPLACEMENT_PROTOCOL.md`
- [x] 文件通過 UTF-8 編碼檢查（無 BOM、無 U+FFFD）
- [x] 目標 A、B 在 §14 有明確達成判斷
- [x] 風險清單 §12 + §14.3 已合併，沒有矛盾

執行狀態（2026-05-17）：TASK-MRP-0000 與 TASK-MRP-0001 已完成。ATM repo 已移除中文內部計畫與 TASK-MRP 任務卡，只保留英文公開說明與架構入口；後續 M2–M8 仍依 §15 順序執行。

### Milestone 2：Atomic Map Schema 0.2.0（M2）

對應任務卡：TASK-MRP-0002

- [x] `schemas/registry/atomic-map.schema.json` 的 `specVersion` 改為 `enum:["0.1.0","0.2.0"]`
- [x] 0.2.0 條件下開放 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`、`replacement.mode`、`replacement.evidenceRefs`
- [x] TypeScript 型別 `AtomicMapRecord` / `RegistryMapMemberRecord` / `RegistryMapEdgeRecord` 同步擴充
- [x] `createAtomicMapHashPayload()` 明確收錄 `members[].role`、`edges[].edgeKind`、`replacement.legacyUris`，排除 `replacement.mode` 與 `evidenceRefs`
- [x] `map-generator.ts` 在輸入提供 0.2.0 欄位時不丟欄位
- [x] 新增 0.1.0 / 0.2.0 fixture 回歸測試，並確認既有 0.1.0 generator 行為仍通過
- [x] `atomic-registry.json` map entry 序列化新欄位

執行狀態（2026-05-17）：M2 core slice 已完成並通過 `atomic-map-schema.test.ts`、`map-generator.test.ts`、`validate-schemas.ts --mode validate`。`CHANGELOG.md` 目前有既有 dirty work，本輪未碰，避免混入非本任務改動；TASK-MRP-0002 仍保留 `in-progress` 直到 changelog / release note 補齊。

### Milestone 3：Map Equivalence Report Schema（M3）

對應任務卡：TASK-MRP-0003

- [ ] 新增 `schemas/governance/map-equivalence-report.schema.json`
- [ ] schemaId = `atm.mapEquivalenceReport`，specVersion = `0.1.0`，含 `migration` 區塊
- [ ] `cases[]` 復用 regression-case 的 metric/evidence 形狀
- [ ] 必填欄位：`mapId` / `legacyUris` / `fixtures` / `cases` / `summary` / `passed`
- [ ] 至少 1 個 positive fixture + 1 個 negative fixture 存在於 `tests/schema-fixtures/`
- [ ] AJV 編譯通過、`atm spec --validate` 驗證通過

### Milestone 4：Map Equivalence Test CLI（M4）

對應任務卡：TASK-MRP-0004

- [ ] `node atm.mjs test --map <id> --equivalence-fixtures <path> --json` 可執行
- [ ] 與 `--map`、`--propagate`、`--spec`、`--atom` 的 mutual exclusion 已明列在 usage
- [ ] 產出檔案符合 `atm.mapEquivalenceReport` schema
- [ ] 任何 `case.passed=false` 且未列入 `knownDivergences` 時 CLI 回傳非零 exit code
- [ ] 報告寫入 `atomic_workbench/maps/<mapId>/map.equivalence.report.json`

### Milestone 5：Upgrade Gates（M5）

對應任務卡：TASK-MRP-0005

- [ ] `packages/core/src/upgrade/propose.ts` 新增 input kind：`map-equivalence`、`rollback-proof`
- [ ] target = map 時，`active` 需 `map-equivalence` 為 passed
- [ ] target = map 時，`legacy-retired` 需 `rollback-proof` 為 valid
- [ ] 缺 evidence 時 proposal `status:"blocked"` 且 `blockedGateNames` 包含對應名稱
- [ ] `upgrade-map-propose.ts` CLI wrapper 暴露 `--equivalence-report` / `--rollback-proof` 旗標
- [ ] 至少 1 個 negative fixture 證明 gate 真的會擋

### Milestone 6：Replacement Rollout Lane Transition（M6）

對應任務卡：TASK-MRP-0006

- [ ] 新增 `packages/core/src/registry/replacement-lane.ts`：定義合法轉移表
- [ ] `draft→shadow / shadow→canary / canary→active / active→legacy-retired` 各自有 evidence 前置條件
- [ ] 轉移寫入 map `lineage-log.json`，與 MAP-0002 寫法一致
- [ ] 違法轉移時 throw `ATM_REPLACEMENT_TRANSITION_INVALID`
- [ ] registry status 與 replacement mode 互不自動同步（雙向獨立）
- [ ] 提供 `atm replacement-lane transition --map <id> --to <mode>` CLI 子命令

### Milestone 7：Decomposition Plan → Map（M7）

對應任務卡：TASK-MRP-0007

- [ ] 新增 `schemas/governance/decomposition-plan.schema.json`
- [ ] 欄位：`legacyUris[]` / `proposedMapId` / `proposedMembers[]` / `proposedEdges[]` / `entrypoints[]` / `notes`
- [ ] `create-map --from-plan <path>` 支援讀取 plan 並建立 map
- [ ] plan 缺 `legacyUris` 或 `proposedMapId` 時 hard-fail
- [ ] 至少 1 個示範 plan（建議 `samples/checkout-mini.plan.json`）
- [ ] 走完 plan → create-map → test --map → equivalence → upgrade gate 一次

### Milestone 8：ScopeLock 0.2.0 與 Polymorph Impact（M8，可延後）

對應任務卡：TASK-MRP-0008

- [ ] `schemas/governance/scope-lock.schema.json` 升級 0.2.0：新增 `selectors`
- [ ] `selectors` 包含 `mapId` / `mapMembers[]` / `mapEdges[]` / `mapEntrypoints[]` / `legacyUris[]`
- [ ] `ScopeLockRecord` 同步擴充
- [ ] polymorph impact gate：對 replacement map 的 member atoms 掃描 template
- [ ] 產出 `polymorph-impact-report.json` 且 active gate 在報告未通過時 block
- [ ] 既有 0.1.0 lock 仍能 round-trip

## 16. 任務卡索引

所有任務卡放在 3KLife 內部工作台的 `docs/ai_atomic_framework/map-replacement-protocol/tasks/` 下。ATM repo 不保存這批內部執行卡；ATM repo 只保留英文、開源友善的 protocol 解釋文件。任務卡格式為 Markdown + YAML frontmatter，欄位與 `governance-bundle` 的 `taskStorePath` 兼容（不強制存到 `.atm/history/tasks`，避免污染現有 governance 紀錄）。

| Task ID | 標題 | 對應里程碑 | 阻擋者 | 主要交付 |
|---|---|---|---|---|
| TASK-MRP-0000 | 文件定稿與 cross-link | M1 | — | 本計畫書 + 引用 |
| TASK-MRP-0001 | Replacement Protocol 概念對齊 ARCHITECTURE | M1 | TASK-MRP-0000 | ARCHITECTURE.md 補章 |
| TASK-MRP-0002 | Atomic Map Schema 0.2.0 | M2 | TASK-MRP-0000 | schema + 型別 + generator + hash |
| TASK-MRP-0003 | Map Equivalence Report Schema | M3 | TASK-MRP-0002 | schema + fixtures |
| TASK-MRP-0004 | Map Equivalence Test CLI | M4 | TASK-MRP-0003 | CLI runner + report 落地 |
| TASK-MRP-0005 | Upgrade Gates: equivalence + rollback | M5 | TASK-MRP-0003 / TASK-MRP-0004 | propose.ts input kind + gate |
| TASK-MRP-0006 | Replacement Lane Transition | M6 | TASK-MRP-0002 | lane validator + CLI + lineage |
| TASK-MRP-0007 | Decomposition Plan → Map | M7 | TASK-MRP-0002 / TASK-MRP-0006 | plan schema + `create-map --from-plan` |
| TASK-MRP-0008 | ScopeLock 0.2.0 + Polymorph Impact | M8 | TASK-MRP-0006 | lock schema + impact report |

依賴順序建議執行：0000 → 0001 → 0002 → 0003 → 0004 → 0005 → 0006 → 0007 → 0008。其中 0003 / 0004 可在 0002 完成後並行，0008 可延後。
