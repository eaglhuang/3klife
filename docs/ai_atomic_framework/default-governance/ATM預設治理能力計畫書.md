<!-- doc_id: doc_other_0165 -->
# ATM 預設治理能力計畫書

## 0. 核心結論

ATM 預設治理能力是 Default Governance Bundle 的可替換參考實作，不是 ATM core 的硬依賴，也不是 host repository 的最高規則來源。它的任務是把大型專案中反覆被證明有效的一般治理能力整理成可安裝、可關閉、可調參、可版本化、可驗證、可回滾的 default profile，讓新專案能快速取得一組保守而可靠的治理起點。

本計畫只處理框架中立能力。任何採用者專案的私有術語、領域規則、產品流程、模型偏好或內部代號，都不能成為 upstream framework contract。若需要保留採用者案例，只能放在 internal case study 或 host adapter 文件，不得寫入公開 Default Governance Bundle 的核心規格。

核心定位如下：

1. **可選**：每個能力都必須能以 `enabled: false` 或等價設定關閉。
2. **可調參**：閾值、路徑、掃描範圍、enforcement level 與摘要策略不得硬編成唯一真相。
3. **可替換**：host 已有治理系統時，ATM 應提供 mapping adapter，而不是要求 host 放棄原系統。
4. **可版本化**：Default Governance Profile、capability、policy 與 migration 都要能判斷 supported / deprecated / unsupported / unknown。
5. **可回滾**：任何寫入 `.atm/` 或 host 檔案的升級都要先產生 dry-run plan、backup 與 rollback evidence。
6. **不中立污染**：公開文件只使用 host repository、adopter、project memory、document identity、task card adapter 等通用語彙。

## 1. 範圍與非目標

### 1.1 範圍

本計畫補足下列 Default Governance Bundle 能力：

- Document Identity：文件代號、文件索引、registry shard 與 resolve / search。
- Document Sharding：大型 Markdown / JSON 文件分片、stub index、auto-parts 與 shard health。
- WorkItem / Task Card：JSON WorkItem 與 optional Markdown task card adapter。
- Scope Lock / Task Scope Guard：lock、conflict detection、allowed / forbidden files 與 dirty tree 判讀。
- Context Budget：token / artifact / image / structured diff 的節流策略。
- Encoding Guard：UTF-8 BOM、U+FFFD、mojibake、touched / staged file scan。
- Handoff / Turn Artifact：context summary、validation evidence、turn report 與 continuation prompt。
- Project Memory：host-local 長期共識摘要、分片與衝突邊界。
- Version / Migration：profile version、capability version、policy version、dry-run upgrade、backup 與 rollback。

### 1.2 非目標

本計畫不做下列事項：

- 不把 Default Governance Bundle 變成 `packages/core` 的 hard dependency。
- 不重新定義 Atomic Spec、Atom Registry、Atom Map、ScopeLock、Evidence 或 UpgradeProposal 的 core semantics。
- 不讓 Project Memory、host rules 或 agent-specific instructions 蓋過 AtomicCharter、ATMChart、schema gate 或 registry lifecycle。
- 不要求所有 host repository 使用同一種 task id、同一個文件目錄、同一組 token 閾值或同一份共識文件格式。
- 不把採用者專案的領域知識、產品策略或私有流程寫入 upstream public docs。

## 2. 權威階層

Default Governance Bundle 必須遵守下列權威順序：

| 層級 | 內容 | 衝突處理 |
|---|---|---|
| 1 | AtomicCharter | 最高框架不變式；衝突需 waiver flow。 |
| 2 | ATMChart / default governance rules | 框架規則摘要、hash freshness 與 version gate。 |
| 3 | Core schema / registry lifecycle / validators | 決定資料是否可被 promotion / release 接受。 |
| 4 | Host project rules / adapter policy | host 可加嚴，但不能靜默違反上層規則。 |
| 5 | Project Memory / host consensus summary | 記錄長期共識與工作偏好；只能補充，不可覆蓋上層。 |
| 6 | Agent / user overlays | 單次偏好或模型工作方式；最低權威。 |

若 Project Memory 或 host rules 與 ATMChart / AtomicCharter 衝突，`doctor`、rule guard 或 review advisory 應輸出 conflict finding，要求 host 更新 policy、申請 waiver 或修正記憶內容。衝突不得由 agent 靜默解讀。

## 3. Profile 版本模型

Default Governance Bundle 需要一個可演進的 profile version surface。建議資料模型如下：

```json
{
  "schemaVersion": "atm.defaultGovernanceProfile.v0.1",
  "profileId": "default-local-governance",
  "profileVersion": "0.1.0",
  "generatedAt": "<iso-date>",
  "releaseTrain": {
    "frameworkVersion": "0.0.0",
    "atmChartVersion": "0.1.0",
    "minimumFrameworkVersion": "0.0.0"
  },
  "capabilities": {
    "documentIdentity": { "enabled": true, "version": "0.1.0", "mode": "advisory" },
    "documentSharding": { "enabled": true, "version": "0.1.0", "mode": "advisory" },
    "taskCards": { "enabled": false, "version": "0.1.0", "mode": "adapter" },
    "scopeLock": { "enabled": true, "version": "0.1.0", "mode": "local-enforced" },
    "contextBudget": { "enabled": true, "version": "0.1.0", "mode": "advisory" },
    "encodingGuard": { "enabled": true, "version": "0.1.0", "mode": "local-enforced" },
    "handoff": { "enabled": true, "version": "0.1.0", "mode": "advisory" },
    "projectMemory": { "enabled": false, "version": "0.1.0", "mode": "host-local" }
  },
  "migration": {
    "strategy": "none",
    "fromVersion": null,
    "notes": "Initial default governance profile."
  }
}
```

版本狀態應沿用 ATMChart / release train 的語意：

| 狀態 | 行為 |
|---|---|
| `supported` | 可正常 verify / doctor / welcome。 |
| `deprecated` | 可通過但警告，必須提供 migration hint。 |
| `unsupported` | 阻擋 official onboarding / release path；只允許 read-only diagnostic 或 explicit upgrade plan。 |
| `unknown` | 不可自動套用；要求更新 compatibility matrix 或手動指定 policy。 |

## 4. 能力矩陣

| Capability | Default | 可關閉 | 可調參 | 建議落點 | 中立性風險 |
|---|---:|---:|---:|---|---|
| Document Identity | on | yes | yes | `DocumentIndex` + default plugin | 中；ID 分類不得綁 host 類別。 |
| Document Sharding | on/advisory | yes | yes | `ShardStore` + shard manager plugin | 低；分片策略通用。 |
| JSON WorkItem | on | no | limited | core contract + `TaskStore` | 低；已是 ATM 基礎。 |
| Markdown Task Card Adapter | off | yes | yes | host adapter / default plugin | 中；frontmatter 欄位需可映射。 |
| Scope Lock | on | yes | yes | `LockStore` + CLI | 低；enforcement level 可調。 |
| Task Scope Guard | on/advisory | yes | yes | rule guard / validator | 中；allowed files 規則需 host mapping。 |
| Context Budget | on/advisory | yes | yes | `ContextBudgetGuard` | 低；閾值必須 policy 化。 |
| Encoding Guard | on | yes | yes | `RuleGuard` / CLI | 低；通用且低風險。 |
| Handoff / Turn Artifact | on/advisory | yes | yes | `ContextSummaryStore` / `RunReportStore` | 低；schema 需穩定。 |
| Project Memory | off | yes | yes | host-local optional capability | 高；最容易誤蓋框架規則。 |

## 5. Document Identity

Document Identity 用於讓文件在搬移、改名與分片後仍保有穩定身份。它不應假設 host 的文件類別，也不應強迫所有 host 使用同一命名格式。

### 5.1 契約

- 每份被追蹤文件可有一個 immutable `documentId`。
- `documentId` 與 path 分離；path 變動時 ID 不變。
- registry 應支援 machine-readable shard 與 human-readable projection。
- assign / resolve / search 都必須 deterministic。
- 禁止因 full rebuild 重新分配既有 ID。

### 5.2 Profile 參數

```json
{
  "documentIdentity": {
    "enabled": true,
    "idPattern": "doc_<category>_<NNNN>",
    "categories": ["tech", "spec", "task", "index", "other"],
    "registryPath": ".atm/catalog/index/documents.json",
    "shardPath": ".atm/catalog/shards/documents",
    "immutableIds": true,
    "fullRebuildPolicy": "preserve-existing"
  }
}
```

### 5.3 驗證

- Duplicate ID fail。
- Missing tracked document warning。
- Path moved but ID unchanged pass。
- Full rebuild renumber attempt fail。

## 6. Document Sharding

Document Sharding 是 context budget 的配套能力。它讓大型文件能以 stub / shard / auto-parts 方式被 agent 按需讀取。

### 6.1 支援模式

- `markdown-heading`：依標題層級分片。
- `json-array`：依陣列元素分片。
- `json-object-key`：依 key 或 namespace 分片。
- `manual`：host 自行維護 shard，但 ATM 提供 health check。

### 6.2 Profile 參數

```json
{
  "documentSharding": {
    "enabled": true,
    "defaultMode": "advisory",
    "warnTokens": 6000,
    "hardTokens": 18000,
    "indexFileName": "index.json",
    "autoParts": {
      "enabled": true,
      "maxEntriesPerPart": 200
    }
  }
}
```

### 6.3 驗證

- Shard index stale fail。
- Missing shard warning / fail 取決於 enforcement mode。
- Parent stub 與 shard count 不一致 fail。
- Auto-parts 超過 threshold 時建議 rebuild。

## 7. WorkItem / Task Card

ATM 的 canonical task contract 仍是 `WorkItem`。Markdown task card 只是 optional adapter，服務於已經習慣以 Markdown frontmatter 管任務的 host。

### 7.1 Adapter 原則

- `WorkItem` 欄位必須可由 task card frontmatter 映射。
- Host 可自訂 task id pattern。
- `allowed_files` / `forbidden_files` 是 scope guard metadata，不是 core requirement。
- Notes protocol 可標準化為 append-only event log，但內容語言與欄位可由 host adapter 翻譯。

### 7.2 建議 frontmatter mapping

| Markdown 欄位 | ATM 欄位 | 必填 |
|---|---|---:|
| `task_id` | `workItemId` | yes |
| `title` | `title` | yes |
| `status` | `status` | yes |
| `owner` | `owner` | no |
| `blocked_by` | `dependencies` | no |
| `allowed_files` | scope policy | no |
| `forbidden_files` | scope policy | no |
| `related_plan` | evidence / externalRef | no |

## 8. Scope Lock / Scope Guard

Scope Lock 是 Default Governance Bundle 的核心能力，但 enforcement level 必須可設定。

| Mode | 行為 |
|---|---|
| `off` | 不檢查 lock，只保留其他治理能力。 |
| `advisory` | `doctor` 警告缺 lock，但不阻擋。 |
| `local-enforced` | CLI / hook 可阻擋本機提交。 |
| `ci-enforced` | CI gate 阻擋 merge / release。 |

Task Scope Guard 應支援：

- lock existence check。
- file ownership overlap check。
- allowed / forbidden files check。
- dirty tree separation check。
- stale lock / released lock detection。
- cross-shard duplicate task detection。

## 9. Context Budget

Context Budget 是 agent runtime hygiene，不是內容審查。它只回答一件事：目前是否應先摘要、分片或減少 inline artifacts，再繼續工作。

### 9.1 Policy 參數

```json
{
  "contextBudget": {
    "enabled": true,
    "unit": "tokens",
    "warningTokens": 12000,
    "summarizeTokens": 20000,
    "hardStopTokens": 28000,
    "maxInlineArtifacts": 2,
    "largeDocumentStrategy": "summarize-first",
    "structuredDiffStrategy": "summarize-before-read",
    "imageStrategy": "thumbnail-first"
  }
}
```

### 9.2 與 Sharding 的關係

Context Budget 可建議產生 shard，但不直接改寫文件。實際分片仍由 Document Sharding capability 或 host adapter 執行，並留下 run report。

## 10. Encoding Guard

Encoding Guard 應成為第一批正式 upstream 的 default capability，因為它通用、低風險、易驗證。

### 10.1 檢查項

- UTF-8 BOM。
- U+FFFD replacement character。
- 常見 mojibake pattern。
- Non-UTF-8 decode failure。

### 10.2 Profile 參數

```json
{
  "encodingGuard": {
    "enabled": true,
    "include": ["**/*.md", "**/*.json", "**/*.ts", "**/*.js", "**/*.ps1"],
    "exclude": ["node_modules/**", "dist/**", "release/**"],
    "mode": "local-enforced",
    "scan": "touched"
  }
}
```

## 11. Handoff / Turn Artifact

Handoff 能力應建立在既有 `ContextSummaryStore`、`RunReportStore` 與 `EvidenceStore` 上，避免另起第二套歷史資料庫。

### 11.1 Handoff record 應包含

- `workItemId`。
- `summary`。
- `changedFiles`。
- `validationEvidence`。
- `remainingRisks`。
- `nextActions`。
- `budgetDecision`。
- `artifactPaths`。
- `resumeCommand`。

### 11.2 原則

- Handoff 是 continuation aid，不是任務完成證明。
- Validation evidence 仍以 EvidenceStore / run reports 為準。
- 大型 diff 應先 structured summary，再引用 artifact path。

## 12. Project Memory / Host Consensus

Project Memory 是 keep-like 能力的中立抽象。它是一種治理能力，但不是框架規則，也不是 ATMChart 的替代品。

### 12.1 需要搬的是模式，不是內容

應搬入 ATM 的是：

- 長期共識摘要的 contract。
- 摘要優先讀取策略。
- 分片與索引策略。
- conflict detection。
- authority boundary。

不應搬入 ATM 的是：

- host 的領域規則。
- host 的產品決策。
- host 的人員 / agent 身份表。
- host 的專有流程與內部用語。
- host 的任務命名慣例。

### 12.2 與 ATMChart 的分工

| 面向 | ATMChart | Project Memory |
|---|---|---|
| 權威 | 框架規則摘要 | host 長期共識摘要 |
| 來源 | Default guards、schemas、AtomicCharter、integration manifest | host docs、team decisions、workflow notes |
| Freshness | sha256 / version gate | summary timestamp / shard index / optional digest |
| 衝突時 | 優先 | 需修正或申請 waiver |
| 預設 | official onboarding path 必備 | optional / advisory |

### 12.3 建議資料模型

```json
{
  "schemaVersion": "atm.projectMemory.v0.1",
  "memoryId": "host-consensus",
  "enabled": true,
  "authority": "host-local-advisory",
  "summaryPath": "docs/project-memory.summary.md",
  "shardIndexPath": "docs/project-memory-shards/index.json",
  "conflictPolicy": "report-conflict",
  "cannotOverride": [
    "AtomicCharter",
    "ATMChart",
    "core-schema",
    "registry-lifecycle"
  ]
}
```

### 12.4 是否預設開啟

Project Memory 不建議在 alpha0 / early default profile 中強制開啟。建議策略：

1. Default Bundle 提供 schema 與 template。
2. `atm init --adopt default` 可詢問是否建立 lightweight memory summary。
3. 未選擇時保持 disabled。
4. `doctor` 只在 host 宣告啟用後檢查 freshness / conflict。

## 13. Migration / Upgrade / Rollback

任何 Default Governance Profile 更新都必須採兩階段升級：

```bash
node atm.mjs doctor --json
node atm.mjs upgrade plan --json
node atm.mjs upgrade apply --from-plan <plan.json>
node atm.mjs upgrade rollback --backup <backup-id>
```

Upgrade plan 必須列出：

- 目前 framework / chart / governance profile version。
- capability version drift。
- 會新增、修改、刪除的檔案。
- user-modified 檔案。
- backup path。
- rollback command。
- read-only diagnostic 狀態。

Unsupported / unknown profile 不得自動改檔，只能進入 read-only diagnostic 或 explicit upgrade plan。

## 14. 中立性規則

Public framework docs 與 schema 必須遵守：

- 使用 host repository / adopter / project / domain-specific rules 等通用詞。
- 不引用任何採用者專案名。
- 不引用特定產品類型、公司、內部工具或 agent 私有流程。
- 不把 case study 寫成 default rule。
- 不在 core contract 中要求 host 採用特定文件名稱。

Internal planning docs 可以記錄來源案例，但進入 upstream 前必須做 neutrality pass。

## 15. 里程碑

| Milestone | 目標 | 主要輸出 |
|---|---|---|
| M0 | 計畫與中立性邊界 | 本計畫書、capability matrix、權威階層 |
| M1 | Profile version contract | default governance profile schema、compatibility mapping |
| M2 | Encoding / budget MVP | encoding profile、context budget policy、validators |
| M3 | Document identity / sharding | document id schema、shard config schema、health checks |
| M4 | Task adapter / scope guard | Markdown task adapter、scope policy validator |
| M5 | Handoff artifact | context summary generator、turn report schema |
| M6 | Project Memory | optional host consensus memory schema、conflict finder |
| M7 | Upgrade / rollback | dry-run plan、backup、rollback fixtures |

## 16. 後續任務拆分建議

建議後續拆成下列 task cards：

1. `TASK-DGB-0000`：Default Governance Profile 計畫定稿與中立性掃描。
2. `TASK-DGB-0001`：Profile schema 與 compatibility matrix 接線。
3. `TASK-DGB-0002`：Encoding Guard profile 升級。
4. `TASK-DGB-0003`：Context Budget policy 配置化。
5. `TASK-DGB-0004`：Document Identity registry schema / resolver。
6. `TASK-DGB-0005`：Document Sharding manager / health check。
7. `TASK-DGB-0006`：Markdown task card adapter。
8. `TASK-DGB-0007`：Scope Guard / dirty tree validator。
9. `TASK-DGB-0008`：Handoff / turn artifact schema。
10. `TASK-DGB-0009`：Project Memory optional capability 與 conflict finder。
11. `TASK-DGB-0010`：Upgrade plan / backup / rollback validation。

## 17. 完成定義

本計畫完成時應滿足：

- 每個 default capability 都可關閉、可調參、可替換。
- 每個 capability 都有 version 與 compatibility 狀態。
- Default Governance Bundle 不成為 ATM core hard dependency。
- Project Memory 不覆蓋 ATMChart / AtomicCharter。
- Public docs 通過中立性掃描。
- Upgrade / rollback flow 有 deterministic fixture。
- Host adapter 能保留自己的治理系統，只把結果映射回 ATM contract。