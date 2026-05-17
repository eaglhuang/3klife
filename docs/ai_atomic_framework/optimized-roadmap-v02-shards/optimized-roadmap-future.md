# AI Atomic Framework Optimized Roadmap v0.2 — 下一步與未來演進（§8+）

> 這是 `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 的「下一步與未來演進（§8+）」分片。完整索引見 `docs/ai_atomic_framework/AI_Atomic_Framework_Optimized_Roadmap_v0.2.md`。

## 8. 下一步行動建議

1. **立即開始**：執行 Week 1（Freeze + Baseline + Spec Schema）。
2. **第一個原子**：選擇 `normalizeCssColor` 或 `parseCssLength`（低風險、易測試）。
3. **文件強化**：新增 `HARNESS_ENGINEERING_ALIGNMENT.md`，引用 Martin Fowler 文章。
4. **開源準備**：撰寫 CONTRIBUTING.md、設定 GitHub Actions（自動 regression）、選擇 MIT License。
5. **社群策略**：先在 X / Reddit / Hacker News 分享「AI Vibe Coding 治理框架」概念，吸引早期 adopter。

---

## 9. 未來演進方向（v0.3+ Roadmap）

### 9.1 解決「純 Agent Pipeline 支援」侷限

**目標**：讓框架同時成為「優秀的 Code Governance 工具」與「強大的 Agent Pipeline 建構平台」。

**具體優化建議**（按優先級排序）：

#### 優先級 1（強烈建議，v0.3 MVP）
- **內建輕量「Atomic Pipeline」執行層**
  - 在 `packages/core/pipeline/` 新增極簡狀態機 / DAG 引擎（不依賴 LangGraph）。
  - 支援 `Atomic Map` 直接定義 Agent Pipeline（sequential / parallel / human-in-the-loop）。
  - 提供 `runPipeline(mapId, input)` API + 完整 tracing。
  - 預設支援狀態持久化（檔案或記憶體）與錯誤重試。

#### 優先級 2
- **引入「Agentic Atom」概念**
  - 原子分為兩類：
    - Compute Atom（純函數，無副作用）
    - Agentic Atom（允許有限 Agent 行為，如 tool-calling、多輪推理），但必須在 Spec 中明確宣告 `allowedAgentBehaviors`、`maxIterations`、`requiresHumanApproval` 等欄位。

#### 優先級 3
- **強化 OrchestratorAdapter + 官方 Reference Implementations**
  - 提供三個官方 adapter：
    1. `adapter-atomic-agents`（對接 BrainBlend-AI）
    2. `adapter-langgraph`（對接 LangGraph）
    3. `adapter-builtin`（內建輕量引擎，預設推薦）
  - 新增「Agent Pipeline 快速開始」文件章節。

#### 優先級 4
- **新增完整範例**：`examples/self-governing-multi-agent-codebase`
  - 展示 Planner / Coder / Reviewer / Police 多 Agent 系統
  - 所有 Agent 都受 Atomic Spec + Police 約束
  - 展示如何用框架治理「Agent 自己寫程式」的遞迴情境

### 9.2 其他長期演進方向

- **v0.3**：完整 Agentic Extension + 與 LangGraph / Atomic Agents 雙向整合範例
- **v0.4**：分散式 Pipeline 執行（支援多節點部署） + 視覺化 Pipeline Dashboard
- **v0.5**：與主流 IDE（Cursor、Windsurf、VS Code）深度整合，Agent 直接在 IDE 中受框架治理

### 9.3 設計原則（任何演進都必須遵守）
1. Core 依然保持極簡，新增功能一律透過可選模組或 Adapter 提供。
2. 所有新功能必須有對應的 Atomic Spec + Police 約束。
3. 向後相容：v0.2 的 Legacy 治理能力永遠保留且優先。

---

*本章節新增於 2026-05-05，作為對「純 Agent Pipeline 支援」侷限的具體回應與演進藍圖。*

## 結語

v0.2 版本讓原規劃從「宏大藍圖」變成「可立即執行的 6 週 MVP」，同時完整保留核心哲學與 2026 年最前沿趨勢（Spec-Driven + Harness Engineering + Atomic Modularity）。這套框架如果落地，將成為解決「AI 產生大量 code 後如何治理、不累積 tech debt」這一企業級痛點的關鍵開源工具。

**最終成功定義不變**：
> AI 不再需要一次理解 3000 行檔案；每次只做一個可驗證的小原子；舊系統能逐步、安全地呼叫新原子；每一次改動都有完整追蹤與回滾能力。

---

**附錄 A：第一個 Atomic Spec 範例（normalizeCssColor）**

```json
{
  "atomicId": "000001",
  "name": "normalizeCssColor",
  "version": "1.0.0",
  "kind": "compute",
  "description": "將任意 CSS color 字串標準化為 rgba 物件",
  "inputSchema": {
    "type": "object",
    "required": ["color"],
    "properties": { "color": { "type": "string", "maxLength": 100 } }
  },
  "outputSchema": {
    "type": "object",
    "required": ["r", "g", "b", "a"],
    "properties": { "r": {"type": "number"}, "g": {"type": "number"}, "b": {"type": "number"}, "a": {"type": "number"} }
  },
  "sideEffects": { "allowed": false },
  "performanceBudget": { "maxRuntimeMs": 2, "maxAllocatedBytes": 1024, "allowAsync": false, "allowDeepClone": false },
  "testPolicy": { "requiredFixtureCount": 8, "mustIncludeNegativeCases": true },
  "hashLock": { "specHash": "", "codeHash": "", "testHash": "" }
}
```

---

**附錄 B：推薦閱讀（2026）**
- Martin Fowler: "Harness engineering for coding agent users"
- 外部規格驅動開發工具文件
- BrainBlend-AI/atomic-agents README
- Red Hat: "How spec-driven development improves AI coding quality"

---

*本文件由 Grok 根據原規劃分析與 2026 年最新生態撰寫，建議作為原 Roadmap 的 companion 文件使用。*