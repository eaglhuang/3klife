# AI Atomic Framework Roadmap — 里程碑 Phase 0-7 詳細規格（§8+）

> 這是 `AI_Atomic_Framework_Roadmap.md` 的「里程碑 Phase 0-7 詳細規格（§8+）」分片。完整索引見 `../AI_Atomic_Framework_Roadmap.md`。

## 8. 里程碑總覽

建議分成 7 個階段。

---

# Phase 0：治理前置與問題凍結

## 目標

先不要讓 AI 繼續亂修老系統。

先凍結目前狀態，建立保護網。

---

## Deliverables

### 0.1 Active Spec Freeze

建立：

```text
docs/ai_atomic_framework/active_spec.md
```

內容：

- 哪份規格是 active。
- 哪些 plan 是 historical。
- 哪些工具 deprecated。
- 哪些路徑不能改。
- 哪些 legacy 腳本只能 adapter，不可直接重寫。
- AI 修改前必讀哪些文件。

---

### 0.2 Legacy Snapshot

建立：

```text
artifacts/legacy_baseline/
```

保存：

- 當前所有關鍵腳本 hash。
- 當前測試結果。
- 當前 fixture 結果。
- 當前 screenshot / summary / metrics。
- 當前 known failures。

---

### 0.3 Regression Matrix 初版

建立最小回歸矩陣：

```text
regression/
  baseline.json
  suites/
    html_to_ucuf_gacha_ds3.json
    html_to_ucuf_button_family.json
    html_to_ucuf_text_layout.json
```

即使一開始分數低，也要先記錄。

重點是可重現。

---

## Acceptance

- AI 知道目前不能直接大改 legacy。
- 每次改動前後能知道是否退轉。
- 有最低限度的 baseline。
- 所有舊 plan 被標記 historical。
- 所有 active rule 有唯一入口。

---

# Phase 1：Atomic Framework MVP

## 目標

建立最小可用 Atomic Manager。

它可以：

1. 讀 spec。
2. 建工作區。
3. 呼叫 AI 產生 code。
4. 跑 test。
5. 驗證 output。
6. 註冊 stable atomic。

---

## 1.1 Atomic Spec Schema

先定義最小 schema。

欄位：

```json
{
  "atomicId": "000001",
  "name": "string",
  "kind": "compute | effect | adapter | manager",
  "description": "string",
  "inputSchema": {},
  "outputSchema": {},
  "sideEffects": {},
  "dependencyPolicy": {},
  "performanceBudget": {},
  "testPolicy": {},
  "legacyIntegration": {},
  "status": "draft | testing | stable | deprecated"
}
```

---

## 1.2 Atomic Manager CLI

最小 CLI：

```bash
atomic-manager create --spec atomic_specs/atomic_000001.json
atomic-manager implement --id 000001
atomic-manager test --id 000001
atomic-manager validate --id 000001
atomic-manager register --id 000001
```

---

## 1.3 工作區結構

開發工作區：

```text
atomic_workbench/
  atoms/
    atomic_000001/
      spec.json
      index.ts
      types.ts
      test.ts
      validation-report.json
```

注意：

這只是 AI 施工空間，不一定是 runtime 結構。

---

## 1.4 產出規則

每個原子 AI 交付時必須包含：

- index.ts
- test.ts
- types.ts
- validation-report.json
- performance-report.json
- dependencies-report.json

缺一不可。

---

## Phase 1 Acceptance

- 能用 AI 產生至少 3 個 compute atom。
- 每個 atom 都能獨立 test pass。
- Manager 能註冊 stable atom。
- Manager 能拒絕不符合 schema 的 atom。
- Manager 能拒絕 forbidden import。
- Manager 能拒絕未授權副作用。
- Manager 能產生 registry.json。

---

# Phase 2：Legacy 注入式整合

## 目標

讓新原子可以被既有老系統呼叫。

不是先重寫老系統，而是先建立內部 API。

---

## 2.1 Atomic Interface

建立：

```ts
// src/legacy/AtomicInterface.ts
export const AtomicInterface = {
  parseHtmlToDom: parseHtmlToDom_atomic_000001,
  extractTypography: extractTypography_atomic_000002
};
```

舊系統只呼叫 interface，不直接呼叫底層原子。

---

## 2.2 Atomic Registry Script

建立或更新：

```ts
// src/legacy/_atomic_registry.ts

export function parseHtmlToDom_atomic_000001(input: Readonly<ParseHtmlInput>): ParseHtmlOutput {
  // atomic implementation
}

export function extractTypography_atomic_000002(input: Readonly<ExtractTypographyInput>): ExtractTypographyOutput {
  // atomic implementation
}
```

---

## 2.3 Atomic Location Index

建立：

```json
{
  "000001": {
    "name": "parseHtmlToDom",
    "functionName": "parseHtmlToDom_atomic_000001",
    "scriptPath": "src/legacy/_atomic_registry.ts",
    "interfacePath": "src/legacy/AtomicInterface.ts",
    "interfaceName": "AtomicInterface.parseHtmlToDom",
    "usedBy": [
      "host-project/src/legacy-entry.ts"
    ]
  }
}
```

---

## 2.4 Legacy Adapter Node

不是所有舊功能一開始都能純化。

所以新增：

```json
{
  "kind": "adapter",
  "sideEffects": {
    "allowed": true,
    "reason": "Wrap existing legacy function for strangler migration."
  }
}
```

Legacy Adapter 負責把髒系統包起來。

之後再逐步從 Adapter 裡抽出純 Atom。

---

## 2.5 Strangler Migration Flow

一個舊功能的遷移流程：

```text
Legacy huge function
  ↓
Legacy Adapter Atomic
  ↓
Extract pure sub-atomic
  ↓
Replace one internal branch with AtomicInterface call
  ↓
Run regression
  ↓
Repeat
  ↓
Legacy function becomes thin wrapper
  ↓
Remove wrapper
```

---

## Phase 2 Acceptance

- 舊系統可以呼叫至少 1 個 atomic function。
- 原子 function 透過 AtomicInterface 暴露。
- location index 可查到 function 被注入哪個 script。
- 改 atomic 時可自動更新 registry 與 interface。
- regression matrix pass 或只出現已知 gap。
- 不需要手動改 code，所有修改由 AI 透過 Manager 完成。

---

# Phase 3：性能安全層

## 目標

避免原子化之後性能變差。

---

## 3.1 顆粒度規則

不要把過小操作做成原子。

不建議：

- add
- subtract
- clamp
- simple getter
- 一行判斷
- 每 frame 極高頻呼叫的小算術

建議原子層級：

- parse one concept
- map one style domain
- validate one contract
- transform one medium-size structure
- compute one business decision
- produce one patch
- wrap one legacy boundary

---

## 3.2 禁止 Deep Copy 大物件

錯誤：

```ts
const cloned = JSON.parse(JSON.stringify(gameState));
```

正確：

```ts
function calcPatch(input: Readonly<GameStateView>): GameStatePatch {
  return {
    type: "UpdateScore",
    delta: 10
  };
}
```

原則：

- input 用 Readonly。
- output 回傳 patch / command / result。
- 不複製整個 legacy state。
- 不傳大型 mutable runtime instance 給 compute atom；例如遊戲引擎 node、scene object 或 web framework instance。

---

## 3.3 Async Policy

Compute Atom：

```json
{
  "allowAsync": false
}
```

Effect Atom：

```json
{
  "allowAsync": true
}
```

規則：

- 純運算禁止 async。
- 讀檔、截圖、DB、LLM call 才能 async。
- Atomic Map 要偵測 async waterfall。
- 可並行的 effect node 要批次執行。

---

## 3.4 靜態綁定，避免字串 Dispatcher

避免：

```ts
AtomicAPI.call("parseHtmlToDom", input);
```

建議：

```ts
AtomicInterface.parseHtmlToDom(input);
```

原因：

- 靜態引用利於 TypeScript 檢查。
- 利於 bundler tree-shaking。
- 避免 JIT megamorphic de-optimization。
- 利於 IDE 與 AI 查找使用點。
- 利於 location index。

---

## 3.5 Performance Budget

每個 atom 必須有 budget：

```json
{
  "maxRuntimeMs": 5,
  "maxAllocatedBytes": 8192,
  "maxInputSizeBytes": 100000,
  "maxOutputSizeBytes": 100000,
  "allowDeepClone": false,
  "allowAsync": false
}
```

Performance Police 要跑：

- 單次 runtime
- 多次 runtime p95
- allocation estimate
- hot path warning
- async warning
- deep clone pattern scan
- large object pass warning

---

## Phase 3 Acceptance

- 原子化後關鍵流程無明顯性能下降。
- 所有 hot-path atom 有 performance budget。
- 無未授權 deep clone。
- 無 compute atom 使用 async。
- 無字串 dispatcher。
- interface 靜態綁定生成成功。

---

# Phase 4：Police 治理系統

## 目標

當原子數量開始增加，防止系統變成「原子垃圾場」。

---

## 4.1 瘦身警察

功能：

- 檢查 dead code。
- 檢查 unused variable。
- 檢查 unreachable branch。
- 檢查過度 defensive code。
- 檢查重複邏輯。
- 檢查 AI 生成的廢話註解。
- 檢查 spec 中沒有要求的功能。

工具：

- TypeScript Compiler API
- ESLint
- ts-prune
- dependency-cruiser
- AI reviewer

規則：

> 傳統 AST 工具先掃，AI 只處理需要語意判斷的部分。

---

## 4.2 關係警察

功能：

- 檢查 DAG 是否有 cycle。
- 檢查 orphan atom。
- 檢查 deprecated atom 是否仍被新 map 使用。
- 檢查 forbidden dependency。
- 檢查 adapter 是否被 compute atom 反向依賴。
- 檢查跨層 import。

規則：

- Atom 不依賴 Organism。
- Compute 不依賴 Effect。
- Low-level 不依賴 high-level。
- Legacy Adapter 只能在邊界層使用。

---

## 4.3 去重警察

功能：

- 檢查是否有相似 spec。
- 檢查是否有相似 I/O。
- 檢查是否有相似描述。
- 檢查是否有相似 code embedding。
- 建議 reuse / merge / deprecate。

初期可以不做 DB，只做文字搜尋。

超過 100 個 atom 後，引入：

- PostgreSQL
- pgvector
- embedding
- semantic search

去重流程：

```text
new atomic intent
  ↓
query registry
  ↓
query vector index
  ↓
if similarity > 0.90
    suggest reuse
  else if 0.75~0.90
    require human/AI architect decision
  else
    allow new atom
```

---

## 4.4 索引警察

功能：

- 登記每個原子。
- 登記每個原子在哪個 script。
- 登記誰呼叫它。
- 登記哪個 map 用它。
- 登記它的版本。
- 登記它是否 deprecated。
- 登記它的 hash。
- 登記它的 performance metrics。

目標：

> AI 要開發新功能前，必須先查 Registry，不准重造輪子。

---

## 4.5 規格漂移警察

功能：

- 檢查 active spec。
- 檢查 historical spec 是否被引用。
- 檢查 task 是否引用 deprecated plan。
- 檢查 code comment 是否出現舊規則。
- 檢查 registry metadata 與實際 code 是否一致。

這是用來防止前面 `plan1 ~ plan5` 那種規則漂移問題。

---

## 4.6 測試完整性警察

功能：

- 每個 atom 是否有 test。
- fixture 數量是否足夠。
- 是否有 negative case。
- 是否有 legacy case。
- 是否有 performance test。
- 是否有 integration test。
- 是否有 regression matrix entry。
- mutation testing 是否能抓到錯誤。

---

## 4.7 Known Gap 警察

用於任何 target runtime、資產管線或 legacy wrapper 的已知能力限制。

區分：

```json
{
  "knownGapType": "runtime-limitation | assetization-required | temporary-tool-gap | accepted-design-drift",
  "scoreImpactPolicy": "ignore | cap | count | requireApproval",
  "mustHaveTaskId": true,
  "expiresAt": "2026-12-31"
}
```

重要：

> known gap 不能變成永久逃避測試的白名單。

---

## Phase 4 Acceptance

- 每次註冊 atom 前 Police 自動跑。
- Police report 產出 JSON。
- 不合格 atom 不可 stable。
- deprecated atom 不可被新 map 引用。
- 相似度過高 atom 會被阻止。
- active spec drift 會被阻止。

---

# Phase 5：通用 Regression Framework 與 Domain Scoring Plugin

## 目標

建立可被不同專案套用的 regression matrix 與 scoring plugin protocol。Core 只定義 fixture、result、delta、known gap 與退轉阻擋格式；實際分數公式由 domain scoring plugin 提供。

例如視覺轉換專案可以定義 pixel / structure / text score；後端 API 可以定義 contract compatibility / latency / error budget；資料管線可以定義 schema drift / row coverage / deterministic output。

---

## 5.1 Fidelity Score Spec

Core 定義 scoring plugin contract；domain adapter 可建立自己的 scoring spec，例如：

```text
docs/domain-scoring-spec.md
```

定義：

```text
finalScore =
  w1 * pixelSimilarity
+ w2 * structureCoverage
+ w3 * componentCoverage
+ w4 * textLayoutAccuracy
+ w5 * assetBoundaryCorrectness
- unresolvedGapPenalty
```

每一項都要明確定義：

- rawPixelScore
- adjustedScore
- pixelSSIM
- structureMatch
- componentCoverage
- textLayoutAccuracy
- assetizationCorrectness
- knownGapHandling
- blockerTaxonomy
- ownerBucketTaxonomy

---

## 5.2 Owner Bucket

所有 residual zone 必須歸類：

```text
converter-layout
converter-style
runtime-renderer
assetization-required
runtime-limitation
known-gap
capture-environment
manual-design-drift
legacy-wrapper-gap
```

---

## 5.3 Multi-Fixture Matrix

至少三個 fixture：

| Fixture | 用途 | 初期門檻 | 最終門檻 |
|---|---|---:|---:|
| minimal-contract | 基礎契約 | 1.00 | 1.00 |
| edge-case-set | 邊界案例 | 0.90 | 0.98 |
| legacy-strangler | 舊系統相容 | 0.80~0.90 | 0.95 或 blocker taxonomy |

重點：

- 先求穩定可重現。
- 再求 owner bucket 正確。
- 最後才求 0.95。

---

## 5.4 Selector Trace

每個 residual 必須能追到：

- source DOM selector
- CSS property
- UCUF node
- style slot
- runtime renderer
- owner bucket
- next fix
- expected score impact

範例：

```json
{
  "zoneId": "gacha.banner.titleGlow",
  "owner": "assetization-required",
  "sourceDomSelectors": [".banner-title", ".banner-title::before"],
  "cssProperties": ["text-shadow", "background"],
  "ucufNodes": ["BannerTitle", "BannerTitleGlow"],
  "styleSlots": ["text", "shadow", "background"],
  "problem": "multi-layer text-shadow cannot be represented by runtime renderer",
  "recommendedAction": "assetize title glow",
  "expectedScoreImpact": 0.03
}
```

---

## Phase 5 Acceptance

- 三個 fixture 都能跑 formal workflow。
- 每個 workflow 產出 summary。
- 每個 residual top 20 都有 selector trace。
- 每個 residual 都有 owner bucket。
- known gap 結構化，不是文字備註。
- 單一 flagship fixture 不再作為唯一成功標準。
- 改一個 fixture 不可讓其他 fixture 無聲退轉。

---

# Phase 6：Reference Case Study：用 Atomic Framework 接管一個 Legacy 系統

## 目標

提供一個完整但可替換的 reference case study，展示如何用 AI Atomic Framework 逐步接管一個高風險 legacy 系統。

本文件可用 html-to-ucuf 作為第一個案例，但案例不能反向污染 core framework。

不是一次重寫整個 legacy script。

而是將它逐步包裝、抽離、替換。

---

## 6.1 第一個 Legacy Adapter

建立：

```json
{
  "atomicId": "010001",
  "name": "legacyDraftBuilderAdapter",
  "kind": "adapter",
  "description": "Wrap existing legacy behavior behind atomic interface.",
  "sideEffects": {
    "allowed": true,
    "reason": "Legacy compatibility boundary."
  }
}
```

作用：

- 對外提供穩定 input/output。
- 內部仍然 call 舊 legacy implementation。
- 先不改其內部行為。
- 建立 baseline test。

---

## 6.2 抽離第一個純 Atom：Typography

目標：

- 不碰整個 legacy script。
- 只抽 `typography` 一小塊。

流程：

```text
legacyDraftBuilderAdapter
  ↓
find typography-related logic
  ↓
create Atomic Spec: extractTypography
  ↓
AI implements atom
  ↓
test against legacy fixtures
  ↓
replace legacy internal call with AtomicInterface.extractTypography
  ↓
run regression matrix
```

---

## 6.3 抽離順序建議

從低風險到高風險：

1. color parsing
2. length parsing
3. typography extraction
4. border / radius mapping
5. background extraction
6. asset boundary classification
7. layout box mapping
8. interactions
9. motion
10. final UCUF tree assembly

不要先動 layout 主幹。

不要先動最複雜的 gacha-specific rule。

---

## 6.4 每次抽離的驗收

每次只能抽一個功能域。

必須：

- 新增 atomic spec。
- 新增 atomic test。
- 新增 legacy fixture。
- 更新 AtomicInterface。
- 更新 location index。
- 跑原子測試。
- 跑 molecule test。
- 跑 regression matrix。
- 比較分數與 summary。
- 不可降低其他 fixture。
- 如降低，必須有 owner bucket 與 rollback plan。

---

## Phase 6 Acceptance

- 目標 legacy script 不再一次被大改。
- 每次只替換一個內部功能區塊。
- 舊系統能繼續運作。
- 原子數逐步增加。
- Legacy Adapter 越來越薄。
- Regression Matrix 防止退轉。
- 最後才考慮拆掉舊腳本。

---

# Phase 7：企業級擴張

## 目標

當框架穩定後，導入 DB、向量索引、跨專案重用。

---

## 7.1 PostgreSQL / pgvector

啟用時機：

- 原子數 > 100。
- 多個專案共用。
- AI 經常重造輪子。
- 查 registry JSON 變慢。
- 需要語意搜尋。

資料表建議：

```sql
atomic_specs
atomic_versions
atomic_dependencies
atomic_usages
atomic_metrics
atomic_embeddings
atomic_maps
legacy_injections
police_reports
regression_runs
```

---

## 7.2 Semantic Reuse Flow

AI 開發新原子前：

```text
intent
  ↓
query text registry
  ↓
query vector registry
  ↓
if exact match: reuse
if near match: propose extend / compose
if no match: create new
```

---

## 7.3 Atomic Merge

當發現兩個原子高度相似：

1. 生成 merge proposal。
2. 建立新 atomic spec v2。
3. 合併 tests。
4. 新原子通過所有舊 tests。
5. 舊原子標 deprecated。
6. 更新 maps。
7. 保留 backwards compatibility。
8. 不能直接刪除。

---

## 7.4 Atomic Split

當原子過大：

觸發條件：

- 行數 > 300
- cyclomatic complexity > 10
- fixture 數過多
- 多個不相關 output
- performance budget 失敗
- AI Police 判斷多職責

流程：

```text
analyze atom
  ↓
propose split plan
  ↓
generate child specs
  ↓
generate child tests
  ↓
preserve original test as integration test
  ↓
implement child atoms
  ↓
update atomic map
  ↓
run all tests
  ↓
deprecate or wrap original atom
```

重要：

> 原 atom 的舊 test 必須保留為 integration test，否則 split 可能破壞行為。

---

# 9. 任務卡模板

每個 AI Agent 任務都必須用以下格式。

```md
# Atomic Task: <name>

## Atomic ID
000123

## Goal
一句話描述此原子要完成什麼。

## Non-Goals
明確列出不能做什麼。

## Input Contract
貼上 input schema。

## Output Contract
貼上 output schema。

## Allowed Files
- atomic_workbench/atoms/atomic_000123/index.ts
- atomic_workbench/atoms/atomic_000123/test.ts

## Forbidden Files
- src/legacy/**
- docs/active_spec.md
- any registry file unless Manager command says so

## Allowed Dependencies
- zod
- local utility types

## Forbidden Dependencies
- fs
- child_process
- puppeteer
- process.env
- global mutable state

## Performance Budget
- maxRuntimeMs:
- maxAllocatedBytes:
- allowAsync:
- allowDeepClone:

## Test Fixtures
- fixture_001
- fixture_002
- fixture_003

## Validation Commands
```bash
npm run atomic:test -- 000123
npm run atomic:validate -- 000123
npm run regression:affected -- 000123
```

## Acceptance Criteria
- All atomic tests pass.
- Output validates against schema.
- No forbidden import.
- No mutation of input.
- Performance budget pass.
- Registry can locate atomic function.
- No regression failure outside known gaps.
```

---

# 10. AI Prompt 模板

```text
You are implementing one atomic function inside AI Atomic Framework.

You must obey the Atomic Spec exactly.

Rules:
1. Modify only the files listed in Allowed Files.
2. Do not modify registry, legacy scripts, or maps directly.
3. Do not import forbidden dependencies.
4. Do not read global variables.
5. Do not mutate input objects.
6. Do not use async unless the spec allows it.
7. Do not deep clone large inputs.
8. Return only data matching Output Schema.
9. Add or update tests only inside this atomic workspace.
10. The task is complete only when all validation commands pass.

Your goal:
<goal>

Atomic Spec:
<spec>

Test fixtures:
<fixtures>

Now implement the atomic function and tests.
```

---

# 11. Atomic Manager 的修改流程

任何修改都必須經過 Manager。

禁止 AI 自己直接改 Legacy。

流程：

```text
request change
  ↓
manager creates/update atomic spec
  ↓
manager creates workbench
  ↓
AI implements atom
  ↓
atomic test
  ↓
police validation
  ↓
performance validation
  ↓
registry update
  ↓
legacy injection if needed
  ↓
regression matrix
  ↓
hash lock
  ↓
commit
```

---

# 12. Legacy 注入流程

```text
stable atom
  ↓
manager reads injection plan
  ↓
generate function name: <feature>_atomic_<id>
  ↓
insert or update function in _atomic_registry.ts
  ↓
export via AtomicInterface
  ↓
replace selected legacy call site
  ↓
update atomic_location_index.json
  ↓
run affected tests
  ↓
run regression matrix
  ↓
lock hash
```

---

# 13. 不退轉機制

## 13.1 Hash Lock

每個 stable atom 記錄：

- spec hash
- code hash
- test hash
- generated interface hash
- injected script hash

如果 AI 誤改 stable atom：

- Manager 偵測 hash mismatch。
- 阻止後續流程。
- 要求建立 v2 或 unlock request。

---

## 13.2 Versioning

不要直接覆蓋高依賴原子。

建議：

```text
atomic_000001@1.0.0 stable
atomic_000001@1.1.0 candidate
atomic_000001@2.0.0 breaking
```

---

## 13.3 Rollback

每次 injection 必須可回滾。

记录：

- before patch
- after patch
- affected files
- affected maps
- affected fixtures
- test result

---

## 13.4 Regression Summary

每次變更輸出：

```json
{
  "changeId": "change_2026_000001",
  "atomicId": "000123",
  "tests": {
    "atomic": "pass",
    "molecule": "pass",
    "regression": "pass"
  },
  "performance": {
    "p95RuntimeMs": 3.2
  },
  "affectedLegacyFiles": [],
  "knownGaps": [],
  "scoreDelta": {
    "buttonFamily": 0.0,
    "textLayout": 0.01,
    "gachaDs3": -0.002
  }
}
```

---

# 14. 檔案結構建議

```text
AI-Atomic-Framework/
  packages/
    core/
      src/
        spec/
        registry/
        hash-lock/
        manager/
        regression/
    cli/
      src/commands/
    plugin-sdk/
      src/adapters/
      src/capabilities/
      src/police/
    adapter-local-git/
    language-js/
  schemas/
    atomic-spec.schema.json
    registry.schema.json
    regression-matrix.schema.json
  templates/
    atom.spec.template.json
    atom.test.template.ts
    adapter.template.ts
  examples/
    hello-world/
    molecule-pipeline/
    legacy-strangler-minimal/
  docs/
    QUICK_START.md
    ARCHITECTURE.md
    SPEC_GUIDE.md
    ADAPTER_GUIDE.md
    PLUGIN_SDK.md
    MIGRATION.md
    LIFECYCLE.md
  LICENSE
  CONTRIBUTING.md
  CHANGELOG.md
```

Host project 應只保留 adapter、workbench、local registry 與實際 runtime integration。這些檔案不是 core framework 的一部分。

---

# 15. Reference Case Study：對 html-to-ucuf 的具體救援策略

本章是 3KLife / html-to-ucuf reference case study。它可用來證明框架能救援一個真實的 AI vibe coding legacy 系統，但不屬於 core framework。

---

## 15.1 先不要做的事

不要立刻：

- 重寫整個 `draft-builder.js`
- 拆成 5 個大模組
- 強追 gacha-ds3 0.95
- 新增大量例外規則
- 直接修 pixel diff
- 讓 AI 根據畫面感覺調參
- 同時開 8 張重構卡一起做

這會重演第六次大改。

---

## 15.2 先做的事

1. 凍結 active spec。
2. 建立 fidelity score spec。
3. 建立 multi-fixture regression。
4. 建立 legacy adapter。
5. 建立 first atomic extraction。
6. 每次只抽一個功能域。
7. 每次都跑 regression。
8. 每次都更新 owner bucket。
9. 所有 gap 結構化。
10. 讓 Atomic Framework 逐步吞噬舊系統。

---

## 15.3 第一批救援原子

建議從低風險開始：

```text
atomic_010001 normalizeCssColor
atomic_010002 parseCssLength
atomic_010003 parseFontWeight
atomic_010004 extractTypographyStyle
atomic_010005 mapBorderRadius
atomic_010006 classifyBackgroundLayer
atomic_010007 detectAssetizationRequired
atomic_010008 buildKnownGapRecord
atomic_010009 computeFidelityScore
atomic_010010 assignResidualOwnerBucket
```

這些比直接拆 `draft-builder.js` 安全很多。

---

## 15.4 第一個成功標準

不要一開始要求 0.95。

第一個成功標準應該是：

```text
AI Atomic Framework 可以成功抽離 draft-builder 中一個低風險功能，
讓 Legacy 透過 AtomicInterface 呼叫它，
並且三個 fixture 的 regression 沒有退轉。
```

這才是救援開始。

---

# 16. 工具選型建議

---

## 16.1 MVP 階段

建議：

- TypeScript
- Zod
- Vitest
- ESLint
- TypeScript Compiler API
- simple JSON registry
- Git
- Node.js CLI

先不要上：

- PostgreSQL
- pgvector
- LangGraph
- 複雜 UI
- 多 Agent 平台
- 分散式調度

原因：

> 你要先證明原子流程能救一個小功能，不要先蓋太大的工廠。

---

## 16.2 中期

當 atomic 數量 > 50：

- dependency-cruiser
- madge
- ts-morph
- esbuild
- AST injector
- coverage tool
- mutation testing
- local semantic search

---

## 16.3 後期

當 atomic 數量 > 100 或跨專案：

- PostgreSQL
- pgvector
- LangGraph
- Mastra
- job queue
- isolated containers
- distributed regression workers

---

# 17. 你不人工寫 code 的運作方式

你說你不會人工介入寫 code。

這可以，但你必須扮演三個角色：

## 17.1 架構裁判

你決定：

- 哪些是 active spec。
- 哪些是 non-goals。
- 哪些是 known gap。
- 哪些性能不可犧牲。
- 哪些 legacy 不能直接動。

---

## 17.2 任務發包者

你負責要求 AI 產出：

- Atomic Spec
- Task Card
- Test Fixtures
- Manager Command
- Regression Report

你不是寫 code，而是寫規則。

---

## 17.3 驗收者

你只看：

- 測試是否 pass。
- regression 是否退轉。
- performance 是否變差。
- diff 是否超出範圍。
- 是否違反 active spec。
- 是否能 rollback。

---

## 17.4 每次 AI 工作的最小循環

```text
你提出需求
  ↓
AI 先產 atomic spec
  ↓
另一個 AI 審查 spec
  ↓
AI 產 test fixture
  ↓
AI 實作 code
  ↓
Manager 跑 validation
  ↓
AI 修到 pass
  ↓
Manager 注入 legacy
  ↓
Regression
  ↓
你看 summary 決定 accept / reject
```

---

# 18. 最大風險與防範

---

## 18.1 過度工程化

風險：

框架還沒救到老系統，就先變成另一個巨大的老系統。

防範：

- 先 MVP。
- 先救一個小功能。
- DB 後置。
- UI 後置。
- 多 Agent 平台後置。
- Police 分批做。
- 每個框架功能也必須原子化。

---

## 18.2 原子太碎造成性能差

防範：

- 設顆粒度規則。
- hot path 不切太碎。
- 靜態 interface。
- patch return。
- no deep copy。
- compute no async。
- performance budget。

---

## 18.3 原子太多造成管理成本高

防範：

- Registry。
- location index。
- semantic search。
- merge policy。
- deprecation policy。
- map 層級化。

---

## 18.4 AI 修改超出範圍

防範：

- allowed files。
- forbidden files。
- hash lock。
- pre-commit validator。
- Manager-only injection。
- no direct legacy edit。

---

## 18.5 Legacy 行為被破壞

防範：

- Legacy Adapter。
- baseline snapshot。
- integration test。
- regression matrix。
- rollback patch。
- incremental strangler。

---

# 19. 最小可行路線圖

如果你今天要開始，建議順序：

---

## Week 1：建立凍結與 baseline

產出：

- active_spec.md
- legacy_snapshot.json
- minimal regression matrix
- atomic spec schema v0
- atomic task template

---

## Week 2：建立 Atomic Manager MVP

產出：

- parse spec
- scaffold
- run test
- validate
- register
- registry.json

---

## Week 3：讓 AI 生成第一個非框架原子

產出：

- normalizeCssColor atom
- parseCssLength atom
- unit tests
- registry entry

---

## Week 4：接入 Legacy 第一個小功能

產出：

- _atomic_registry.js
- atomic-interface.js
- location_index.json
- one legacy call site replaced
- regression summary

---

## Week 5：建立 Police v0

產出：

- forbidden import checker
- dependency checker
- performance budget checker
- test completeness checker

---

## Week 6：開始 reference case study

產出：

- 第一批低風險 compute atom
- domain scoring plugin
- known gap plugin
- owner bucket plugin
- multi-fixture report

---

# 20. 最終成功定義

這套框架成功，不是因為它很漂亮。

成功是：

1. AI 不再需要一次理解 3000 行檔案。
2. AI 每次只做一個可驗證小功能。
3. 每個小功能都有 spec、test、hash、registry。
4. 舊系統能逐步呼叫新原子。
5. 每次替換都能跑 regression。
6. 任一改動都能定位到 atomic id。
7. 出問題能 rollback。
8. 已穩定的原子不會被下一個 AI 誤改。
9. 相似功能不會重複造輪子。
10. 任一 host project 都能從「巨大不穩的 legacy 系統」逐步變成「可治理原子系統」。

---

# 21. 給你的最終建議

不要把 AI Atomic Framework 當成一個一次做完的大平台。

它應該先是一個很小的工具：

```text
讀 spec → 叫 AI 寫一個小函數 → 跑測試 → 註冊 → 注入 legacy → 跑 regression
```

只要這條路跑通，你就有救援老系統的核心能力。

接著再長出：

- Police
- Registry
- Split
- Merge
- DB
- Vector Search
- Legacy Strangler
- Multi Agent Orchestration

最重要的原則是：

> **不要讓 AI 直接救大型 Legacy。  
> 先讓 AI 建立能約束 AI 的 Atomic Framework，  
> 再讓這個框架帶著 AI 一口一口吃掉 Legacy。**

---

## 22. 附錄：第一個 Prompt 建議

你可以先要求 AI 做這件事：

```text
請根據以下規劃，先建立 AI Atomic Framework 的 Phase 0 與 Phase 1 MVP。

限制：
1. 不要接 PostgreSQL。
2. 不要做 UI。
3. 不要做 LangGraph。
4. 不要重構 legacy。
5. 只建立 spec schema、atomic manager CLI、workbench、test runner、registry JSON。
6. 所有功能都必須以 Atomic Spec 定義。
7. 每個 manager 功能也要拆成 atomic。
8. 不允許手寫 code 假設，所有實作都要有 test。
9. 完成後輸出 validation report。

第一個目標：
用這個 framework 產生並驗證一個 normalizeCssColor atomic。
```

---

## 23. 附錄：第一批檔案清單

```text
README.md
docs/QUICK_START.md
docs/ARCHITECTURE.md
docs/SPEC_GUIDE.md
docs/ADAPTER_GUIDE.md
docs/PLUGIN_SDK.md
docs/MIGRATION.md
docs/LIFECYCLE.md

packages/core/src/spec/parse-spec.ts
packages/core/src/registry/registry.ts
packages/core/src/hash-lock/hash-lock.ts
packages/core/src/manager/scaffold.ts
packages/core/src/manager/test-runner.ts
packages/core/src/manager/validate.ts

packages/cli/src/commands/init.ts
packages/cli/src/commands/status.ts
packages/cli/src/commands/scaffold.ts
packages/cli/src/commands/validate.ts

packages/plugin-sdk/src/project-adapter.ts
packages/plugin-sdk/src/language-adapter.ts
packages/plugin-sdk/src/capability.ts
packages/plugin-sdk/src/police.ts

schemas/atomic-spec.schema.json
schemas/registry.schema.json
schemas/regression-matrix.schema.json

templates/atom.spec.template.json
templates/atom.test.template.ts
examples/hello-world/
examples/legacy-strangler-minimal/
```

---

# 結語

AI Atomic Framework 的本質不是 node flow，也不是單純低代碼，也不是普通 Agent framework。

它是：

> **為了讓 AI 在大型工程中不失控，而建立的契約化、原子化、可驗證、可回滾、可注入 Legacy 的工程治理系統。**

它最適合解決你現在遇到的問題：

- 大型工具鏈已經被 AI 改了多輪。
- 規則漂移。
- 檔案過大。
- acceptance 模糊。
- 單畫面 over-fit。
- Legacy 不可能一次重寫。
- 你希望 AI 繼續開發，但不能再放任它自由改全局。

最終策略就是：

```text
Freeze current system
  ↓
Build Atomic Framework MVP with AI
  ↓
Use it to create first stable atoms
  ↓
Inject atoms into legacy through static interface
  ↓
Run regression matrix
  ↓
Gradually strangle legacy modules
  ↓
Reach stable 95% target through measured, traceable, non-regressing changes
```

這才是從 Vibe Coding 混亂，走向 AI 工業化開發的路。
