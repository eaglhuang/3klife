# 拆解大型功能優化原子map計畫書 — 基礎與原則（§0–§5）

> 這是 `拆解大型功能優化原子map計畫書.md` 的「基礎與原則（§0–§5）」分片。完整索引見 `docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`。

<!-- doc_id: doc_other_0147 -->
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
