<!-- doc_id: doc_other_0114 be assigned by registry） -->
# Performance Budget Police — ATM Optional Governance Plugin

> **Role**: adopter-scope optional plugin — 3KLife 對 ATM 性能預算與成本控制的策略宣告  
> **Maintainer**: vs-insiders-gpt-5.3-codex（ATM-6-0004）  
> **Dependency**: `ATM-5-0005`（plugin ecosystem bootstrap）

---

## 1. Purpose

本政策定義在 ATM 框架中引入的 optional governance plugin：性能預算（Performance Budget）、LLM call caching 與成本預算管理。  
核心目標：在 multi-agent execution 與 long-running task 場景下，對 token consumption、API call latency、artifact size 進行可觀測與可控制的度量。

---

## 2. 性能預算三軸線

### 2.1 Token Budget（核心）

- **定義**：單個 task execution 或 multi-turn handoff 流程的最大 token 消耗上限。
- **測量點**：
  - Prompt token（system message + context + user query）
  - Completion token（model response）
  - Cached token（若啟用 prompt caching）
  - Artifact upload token（若有非 text 資源）
- **Warning 與 Hard Stop**：
  - Yellow（60% of budget）：記錄警告，繼續執行
  - Orange（80% of budget）：回傳 summarize-before-continue 訊號
  - Red（100% of budget）：hard-stop，拒絕後續 API call
- **預算級別**：
  - Per-turn：單個 Agent turn 預設 10k token （可配置）
  - Per-task：整個 task 執行預設 50k token （可配置）
  - Per-session：Session 全生命週期預設 200k token （可配置）

### 2.2 Latency Budget（次要）

- **定義**：API response latency 與 total execution time 的上限。
- **測量點**：
  - API latency（from request to first token / final token）
  - Artifact processing latency（文件讀寫、asset transformation）
  - Gate execution latency（compute-gate、encoding check、rule guard）
- **Warning 閾值**：
  - Single API call > 30s：yellow
  - Single API call > 60s：orange
  - Per-task total > 5 minutes：red
- **用途**：偵測網路抖動、模型過載或 task 設計不當。

### 2.3 Artifact Budget（可選）

- **定義**：生成與儲存的 artifact、log、screenshot 累積大小上限。
- **測量點**：
  - Generated artifact total size（image、report、evidence）
  - Log file accumulation
  - Temp file cleanup
- **Hard limit**：Per-task 500 MB；超過時自動 cleanup old artifacts 或 compress。

---

## 3. LLM Call Caching 策略

### 3.1 Cacheable Content

下列內容**可**進行 prompt caching（重複利用相同 system message、知識庫讀取結果）：

- System message / instruction deck（通常 2-5k token）
- Keep consensus 與 documentation context（可預先 warm cache）
- Regression baseline / snapshot library（cross-run 重用）
- Plugin interface manifest 與 default profile

### 3.2 Non-Cacheable Content

下列內容**不**進行 caching，每次 fresh API call：

- User query / prompt（task-specific input）
- Real-time context（current file state、git status）
- Artifact 與 execution evidence（per-run 生成）

### 3.3 Cache Hit 預期

- 第 1 turn：cache miss（populate phase）
- 第 2+ turn：70-80% cache hit ratio 預期，若低於 50% 則檢視 cache key 設計
- Cache TTL：預設 5 minutes；long-running session 可延至 1 hour
- Cache invalidation：task lock 變更、keep.md 更新、plugin profile 修改時自動清除

---

## 4. Cost Control Policy

### 4.1 Cost Per Component

| Component | Token/Call Ratio | Est. Cost/Call |
|---|---|---|
| system-prompt + context | 5-8k token | ~$0.001-0.002 |
| task turn (avg) | 15-25k token | ~$0.003-0.005 |
| gate execution (compute) | 10-20k token | ~$0.002-0.004 |
| artifact generation (per artifact) | 5-10k token | ~$0.001-0.002 |

**Per-run estimated cost** = 5 × system + 2 × task_turn + 1 × gate + 0.5 × artifact ≈ $0.05 - 0.10 / typical run

### 4.2 Cost Attribution & Reporting

每個 task execution 生成 `cost-report.json`：

```json
{
  "taskId": "ATM-6-0004",
  "timestamp": "2026-05-10T...",
  "tokenBreakdown": {
    "systemPrompt": 5000,
    "context": 8000,
    "userQuery": 2000,
    "completion": 3500,
    "cached": 1200
  },
  "costSummary": {
    "totalTokens": 19700,
    "estimatedCost": 0.045,
    "cacheHitRatio": 0.15,
    "apiCallCount": 1
  },
  "hotPathAtoms": [
    {
      "atomId": "normalizeCssColor",
      "callCount": 12,
      "avgTokenPerCall": 120,
      "totalCost": 0.003
    }
  ]
}
```

### 4.3 Hot Path Atom Measurement

定義常用 atom 與其平均成本：

1. **Trigger**：當某 atom 在 session 中被呼叫 > 3 次時，啟動 profiling
2. **Measurement**：記錄 token in/out、latency、error rate
3. **Action**：若 hot path atom 單次成本 > 0.01 USD，標記為 optimization candidate
4. **Report**：季度 hot path 分析，提出成本最高的 atoms 與優化提案

---

## 5. Plugin Boundary

本政策對應的 optional plugin 包含：

| Plugin Module | Role | Provider |
|---|---|---|
| `plugin-budget-meter` | 計量 token / latency / artifact | default （可替換） |
| `plugin-cache-manager` | 管理 prompt cache / 計算 hit ratio | optional （可禁用） |
| `plugin-cost-reporter` | 生成 cost-report.json | optional （可禁用） |
| `plugin-hot-path-profiler` | 量測常用 atom 成本 | optional （可禁用） |

這些 plugin 不修改 core framework 行為，只提供觀測層與報告層。

---

## 6. Integration with ATM Governance

- **Pre-flight Gate**：讀取 budget profile，warning if 超過前期成本預估
- **In-flight Guard**：每次 API call 後檢查累計消耗，觸發 orange/red 警報
- **Post-flight Checkpoint**：生成 cost-report，計算 hot path atoms 與 cache hit ratio

---

## 7. Backward Compatibility

- ATM core framework **不依賴** 本 plugin；cost budget 為 optional 功能
- 若 plugin 禁用，framework 行為完全不變
- 既有 ATM 專案可無縫啟用或禁用本 plugin，不需改 core code

---

*由 vs-insiders-gpt-5.3-codex 透過 ATM-6-0004 建立 | 2026-05-10*
