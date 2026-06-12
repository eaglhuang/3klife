# ATM Core Broker / Scope Lock 現況調查

**Status:** Evidence 附件
**Date:** 2026-06-10
**目的:** 在開 SDK 強化任務卡之前，確認 AAF core 現有實作邊界。

---

## 1. 調查範圍與路徑

- AAF repo 位置: `C:\Users\User\AI-Atomic-Framework`
- 核心模組: `packages/core/src/broker/`、`packages/core/src/governance/`、`packages/core/src/hash-lock/`
- SDK 模組: `packages/plugin-sdk/src/`

---

## 2. 已實作（強）

### 2.1 Broker（packages/core/src/broker/，1932 LOC）

| 檔案 | LOC | 角色 |
|---|---:|---|
| `decision.ts` | 156 | 衝突判定主邏輯 |
| `proposal.ts` | 278 | Patch proposal lifecycle |
| `steward.ts` | 279 | Neutral steward 路由 |
| `compose.ts` | 202 | Deterministic composer 合成多 proposal |
| `team-lane.ts` | 202 | Team coordination lane |
| `merge-plan.ts` | 98 | Merge plan 生成 |
| `lifecycle.ts` | 145 | Broker 狀態機 |
| `registry.ts` | 100 | Active intent registry |
| `apply-evidence.ts` | 63 | Apply 後 evidence 收集 |
| `types.ts` | 150 | 完整 schema 定義 |

**decision.ts 已實作的衝突判定階層**：
1. **CID 衝突** (atomId 或 atomCid 重疊) → `blocked-cid-conflict`
2. **Shared surfaces 衝突** (generator / projection / registry / validator / artifact 重疊) → `blocked-shared-surface`
3. **Physical file overlap** (檔案重疊但 CID disjoint) → `needs-physical-split` (route to deterministic-composer)
4. 無衝突 → `parallel-safe`

**已有的 verdict 種類** (`BrokerDecision.verdict`):
- `parallel-safe`
- `needs-physical-split`
- `blocked-cid-conflict`
- `blocked-shared-surface`
- `serial`
- `blocked-active-lease`

### 2.2 Schema (broker/types.ts)

已有完整定義:
- `WriteIntent` (v1, 0.1.0)
- `WriteIntentAtomRef` (含 atomId, atomCid, operation)
- `SharedSurfacesRecord` (generators / projections / registries / validators / artifacts)
- `BrokerDecision` (v1, 0.1.0)
- `PatchProposal` (含 anchors, validators, rollback)
- `MergePlan` (v1, 0.1.0)
- `ActiveWriteIntent` (registry entry，含 resourceKeys、leaseEpoch、expiresAt)
- `WriteBrokerRegistryDocument` (v1, 0.1.0)
- `BreakGlassHandoff` (v1, 0.1.0)

### 2.3 Scope Lock (governance/scope-lock.ts，145 LOC)

- ✅ `createScopeLockRecord(input)` / `parseScopeLockRecord(document)`
- ✅ 兩版 spec: `0.1.0` (file-only) 與 `0.2.0` (含 map selectors)
- ✅ `mapId`, `mapMembers`, `mapEdges`, `mapEntrypoints`, `legacyUris` 都有規範
- ✅ Edge kinds: `data-flow`, `control-flow`, `event-flow`, `validation`, `fallback`, `side-effect`, `rollback`
- ✅ atomId pattern: `^ATM-[A-Z][A-Z0-9]*-\d{4}$`

### 2.4 Hash Lock (hash-lock/hash-lock.ts，104 LOC)

- ✅ 已有實作（檔案存在，未深讀內部細節）

### 2.5 SDK LanguageAdapter (plugin-sdk/src/language-adapter.ts，44 LOC)

當前介面**極度精簡**：
```typescript
export interface LanguageAdapter<Profile, Request, Report> {
  readonly adapterName: string;
  readonly languageIds: readonly string[];
  detectProjectProfile(repositoryRoot: string): Promise<Profile> | Profile;
  validateComputeAtom(request: Request): Promise<Report> | Report;
}
```

只有兩個方法:
1. `detectProjectProfile()` — 偵測 repo 語言、套件管理員、common commands
2. `validateComputeAtom()` — 驗證一個已存在 atom 的 source files

---

## 3. 缺口（要新開的任務卡）

### 3.1 SDK 缺 AtomizationPlanningAdapter

- ❌ 沒有 `discoverAtomCandidates(sourceFiles): AtomCandidate[]`
- ❌ 沒有 `planAtomize(candidate): AtomizationPlan`
- ❌ 沒有 `AtomCandidate` schema
- ❌ 沒有 `AtomizationPlan` / `AtomizationPlanStep` schema

### 3.2 JS Adapter 沒有 candidate discovery

- 已有 imports / entrypoint export 掃描，但**沒有 function / class candidate 輸出**
- 未實作 `AtomizationPlanningAdapter`

### 3.3 Python Adapter 有 plan，但未提升到 SDK

- Python adapter 已有 `planPythonAtomize()` (Python package 私有)
- 但這個能力**沒有正式化為 SDK contract**
- 其他語言無法 reuse 此 pattern

### 3.4 Broker 與 Candidate 之間的橋樑

- Broker 消費 `WriteIntent`，但 `WriteIntent.atomRefs` 從哪來？
- 目前必須由 caller 自行 fill atomId / atomCid
- 缺一個從 `AtomCandidate` → `WriteIntent` 的便利路徑

---

## 4. 重要發現：論文反擊面更強了

ATM **已有完整 broker 衝突判定演算法**，包含:
1. CID 衝突檢測（atomId + atomCid 雙層）
2. Shared surfaces 多維度檢測
3. Physical file overlap（這是 STORM 的核心機制）→ ATM 額外處理 **CID disjoint 時可路由到 deterministic-composer 並行寫入**
4. 與 STORM 不同：ATM 不單純拒絕，而是**進入 composer lane**讓合併器負責物理拆分

→ **ATM 已實作了我們 vision paper 主張的「比 STORM 細一層的同檔案並行能力」**

論文的 "function-level parallelism within same file" 實際上對應到 broker 的:
- `verdict: needs-physical-split`
- `lane: deterministic-composer`
- `applyMethod: patch-apply`

**這是論文最強的實作後盾。可以直接 cite 這段 decision.ts:109-141。**

---

## 5. 結論

| 項目 | 狀態 | 對論文的影響 |
|---|---|---|
| Broker 主邏輯 | ✅ 完整 | 可直接 cite 為 implementation evidence |
| CID 衝突判定 | ✅ 完整 | 論文 §3 直接對應 |
| Shared surfaces | ✅ 完整 | 論文 §3 補強 |
| Same-file CID-disjoint 路由 | ✅ 完整 | **論文最強反擊點：已有實作，非 future work** |
| Scope lock 0.2.0 | ✅ 完整 | 論文 §4 提到 governance binding 有依據 |
| AtomizationPlanningAdapter SDK | ❌ 缺 | 任務卡 #1 要補 |
| AtomCandidate schema | ❌ 缺 | 任務卡 #1 要補 |
| JS adapter candidate | ❌ 缺 | 任務卡 #2 要補 |
| Python adapter SDK 化 | ❌ 缺 | 任務卡 #3 要補 |
| AtomCandidate → WriteIntent 橋樑 | ❌ 缺 | 任務卡 #4 要補 |

**整體判斷：ATM core 80% 已完成。缺口集中在 SDK 層級，4 張任務卡可以收口。**

---

## 6. 對 SDK 強化任務卡的 scope 指引

基於現況，4 張任務卡的 scope 應為:

1. **TASK-SDK-XXXX-atomization-planning-contract**
   - 範圍: `packages/plugin-sdk/src/atomization-planning.ts` 新增
   - 不動 core/broker；只新增 optional contract
   - Schema: AtomCandidate, AtomizationPlanRequest, AtomizationPlan, AtomizationPlanningAdapter

2. **TASK-SDK-XXXX-js-adapter-candidates**
   - 範圍: `packages/language-js/src/`
   - 實作 discoverAtomCandidates() 用輕量 regex/scanner
   - 不引入新 AST 依賴

3. **TASK-SDK-XXXX-python-adapter-sdk-promotion**
   - 範圍: `packages/language-python/src/`
   - 把 planPythonAtomize() 對接到新 SDK contract
   - 補 discoverAtomCandidates() 用既有 regex

4. **TASK-SDK-XXXX-broker-candidate-bridge**
   - 範圍: `packages/core/src/broker/` (擴充，不破壞)
   - 新增 `candidateToWriteIntent(candidate, taskId, baseCommit): WriteIntent`
   - 不動 decision.ts；只是便利函式

---

**版本歷史:**
- 2026-06-10: 初稿（依任務卡 #1 要求調查）
