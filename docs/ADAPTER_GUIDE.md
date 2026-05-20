<!-- doc_id: doc_other_0106 -->
# ATM Adapter Guide

本文件定義 ATM 在 host 專案導入時的 Adapter 實作規範，並提供 3KLife 與 standalone Default Governance Bundle 的對照做法。

## 1. 邊界與定位

ATM 文件面建議用四層看待責任：

1. Upstream Core：原子契約、registry、validator、lifecycle。
2. Agent Operating Layer：task intake、lock、context、handoff、evidence 流程。
3. Default Governance Bundle：WorkItem/ScopeLock/Evidence 等治理 primitives 與 stores。
4. Host Project Adapter：把既有工具與資料面映射成 ATM 可理解的 capability/store 介面。

核心原則：

1. `core` 不承載 domain logic。
2. Adapter 是路由 façade，不是新的超大黑盒。
3. 先 shadow-mode，再 parity，再 cutover。

## 2. Adapter 家族與責任

### 2.1 ProjectAdapter

1. 管理 work item lifecycle（prepare/finalize）。
2. 組裝 Governance stores、RuleGuard、Evidence pipeline。
3. 產生 AdapterReport（run report + typed evidence），不直接改寫 core schema。

### 2.2 LanguageAdapter

1. 提供語言層 parse/import/side-effect 掃描能力。
2. 支援 atomize/infect 前置檢查與 migration 提示。

### 2.3 Capability / Police / Injector plugin

1. Capability：受控外部能力（例如 runtime probe、工具執行）。
2. Police：deterministic gate（non-regression、contract guard）。
3. Injector：在生命週期 hook 注入策略與環境約束。

## 3. Governance Stores 對照（3KLife 現況）

以下對照落地於：

1. `tools_node/adapters/atm-3klife/project-adapter.js`
2. `tools_node/adapters/atm-3klife/governance-adapter.js`

| Store | 3KLife Runtime Path | Phase 1（shadow） | Phase 2（target） |
|---|---|---|---|
| taskStore | `docs/agent-briefs/tasks` / `docs/tasks/tasks-atm` | 委派 `task-card-opener` + tasks shards | ATM-GOV task-store atom |
| lockStore | `.task-locks` | 委派 `task-lock.js` | ATM-GOV lock-store atom |
| documentIndex | `docs/doc-id-registry-shards` | 委派 `doc-id-registry/resolve-doc-id` | ATM-GOV document-index atom |
| shardStore | `docs/tasks/tasks-atm` | 委派 `shard-manager.js` + thin index | ATM-GOV shard-store atom |
| artifactStore | `artifacts/` | Adapter 自有 artifact 寫入 | ATM-GOV artifact-store atom |
| logStore | `artifacts/atm-3-0001/logs` | 追加 adapter logs | ATM-GOV log-store atom |
| stateStore | `docs/**/*.md|json` | 讀 live；寫 shadow-writes | ATM-GOV state-store atom |
| ruleGuard | `tools_node/*guard*` | 維持既有 CLI 入口 | ATM-GOV rule map（atom-map） |
| evidenceStore | `artifacts/atm-3-0001/evidence` | JSONL 證據封存 | ATM-GOV evidence-store atom |
| contextSummaryStore | `artifacts/turn-artifacts/...` | turn summary sidecar | ATM-GOV context-summary atom |

## 4. Governance Migration Guide（既有工具 → ATM）

### Step 0：盤點現有治理面

至少盤點這些面向：

1. task card 與 task-store。
2. lock / scope 規則。
3. doc registry / shard 管理。
4. artifacts / logs / evidence。
5. rule guard / validator 入口。

### Step 1：建立 mapping matrix（必做）

輸出最少應包含：

1. storeId
2. 既有工具與檔案路徑
3. Phase 1 委派路徑
4. Phase 2 atomization 目標

### Step 2：啟用 shadow-mode

規則：

1. 預設不改寫既有 CLI 行為。
2. 所有 mutation 先鏡像為 shadow artifacts。
3. 每次 run 都要產出 AdapterReport。

### Step 3：做 parity 驗證

至少比對：

1. task/lock/doc-id/shard 行為輸出一致性。
2. rule guard 結果一致性。
3. evidence 路徑與格式一致性。

### Step 4：定義 cutover gate

可切換前，必須滿足：

1. 連續 parity 綠燈。
2. rollback route 可演練。
3. owner sign-off 與風險備註完整。

## 5. 3KLife vs Standalone Bundle 對照

| 項目 | 3KLife Adapter | Standalone Default Governance Bundle |
|---|---|---|
| Task Intake | `task-card-opener` + ATM shards | SDK 內建 task store primitive |
| Lock | `task-lock.js` | SDK lock store primitive |
| Doc Index | `doc-id-registry.js` | SDK document index primitive |
| Shard | `shard-manager.js` | SDK shard primitive |
| Rule Guard | `run-rule-guard.js` / `compute-gate` | SDK police + guard orchestrator |
| Evidence | `artifacts/.../evidence/*.jsonl` | SDK evidence store |
| Run Report | `artifacts/.../reports/*.json` | SDK typed run-report channel |

## 6. CAR 對照（Control / Agency / Runtime）

本節只做「對照映射」，不新增 core 強制欄位。

| CAR 面向 | ATM 對應 |
|---|---|
| Control | WorkItem、ScopeLock、RuleGuard policy、release gates |
| Agency | Adapter/Plugin 決策點、proposal review、owner sign-off |
| Runtime | ArtifactStore、LogStore、EvidenceStore、ContextSummary、AdapterReport |

### 實務映射

1. WorkItem：任務狀態與依賴語義。
2. ScopeLock：變更面收斂與衝突治理。
3. Evidence/ContextSummary：可追溯與交接最小單位。
4. AdapterReport：單次執行的 typed outcome，不替代 core contract。

## 7. HarnessCard-lite 邊界（必守）

Adapter 文件只能承諾：

1. run report（結果摘要）
2. typed evidence（可機讀證據）

不能把 HarnessCard-lite 擴張成：

1. 取代 WorkItem/ScopeLock/Evidence schema
2. 改寫 core lifecycle 規範
3. 偷渡 host 專案 domain policy 進 core

## 8. 最小落地清單

1. 完成 `docs/PLUGIN_SDK.md` 契約文件。
2. 提供 `examples/hosted-adapter-impl` 可讀範例。
3. 產出 host mapping matrix 與 migration steps。
4. 以 deterministic validator 做 parity 證據。

## 9. 參考

1. `docs/agent-briefs/tasks/ATM/ATM-2-0006.md`
2. `docs/agent-briefs/tasks/ATM/ATM-3-0001.md`
3. `tools_node/adapters/atm-3klife/project-adapter.js`
4. `tools_node/adapters/atm-3klife/governance-adapter.js`

## 10. LanguageAdapter v2 Contract Snapshot

This section is a concise contract snapshot used by ATM-LANG-0100 ~ ATM-LANG-0102.

### v1 baseline (must keep)

- `detectProjectProfile(repositoryRoot)`
- `validateComputeAtom(request)`

### v2 additive surface (optional by capability)

- `scanSourceInventory(request)`
- `normalizeSymbolId(request)`
- `buildLegacyRoutePlan(request)`
- `planAtomizeDryRun(request)`
- `planInfectDryRun(request)`
- `detectRuntimeCommands(request)`
- `parseDiagnostics(request)`
- `computeEquivalenceContract(request)`
- `buildAtomicMapDecomposition(request)`

### Capability declaration

`LanguageAdapterV2` uses a capability set so core can discover support level without embedding language-specific logic.

### Schema anchors

- `schemas/language-source-inventory.schema.json`
- `schemas/language-symbol-range-reference.schema.json`
- `schemas/language-diagnostics.schema.json`
- `schemas/language-runtime-commands.schema.json`
- `schemas/language-equivalence-fixture.schema.json`
- `schemas/language-dry-run-evidence-envelope.schema.json`

## 11. Bundled vs External Discovery

Resolver discovery should keep policy explicit and auditable:

- bundled adapters are enabled by default and preferred in default source order;
- external adapters can be enabled/disabled by policy;
- external allow-list can be keyed by module name or adapter id;
- rejected discovery candidates must keep a machine-readable reason;
- fallback messages must never claim full support when capability is advisory or missing.

Recommended default source order:

1. `bundled`
2. `external`

This default can be overridden by host policy when a host needs to prioritize a vetted external adapter.

## 12. Language Adapter Author Entry Point

For programming-language adapters, use the English companion guide:

- `docs/ai_atomic_framework/universal-language-framework/universal-language-framework-plan.md`

That guide is the public author-facing entry point for `LanguageAdapter v2`. It explains:

1. how to classify support as official, advisory, or future;
2. how to declare SDK capability levels as `full`, `partial`, or `none`;
3. how a future Go adapter should structure `scanSourceInventory`, dry-run planning, diagnostics, and atomic map decomposition;
4. why validators and CLI commands must stay thin facades over package logic.

The Go material in that companion is advisory documentation, not an official bundled Go adapter package.
