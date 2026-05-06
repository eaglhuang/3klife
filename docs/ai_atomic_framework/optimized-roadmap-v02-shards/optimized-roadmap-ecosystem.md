# AI Atomic Framework Optimized Roadmap v0.2 — 生態、風險、結構（§5–§7）

> 這是 `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 的「生態、風險、結構（§5–§7）」分片。完整索引見 `docs/ai_atomic_framework/AI_Atomic_Framework_Optimized_Roadmap_v0.2.md`。

## 5. 2026 年生態對齊與定位

### 高度相關的現有框架（2026-05）
- **Atomic Agents**（BrainBlend-AI）：最接近的 atomicity 理念，可互補使用。
- **Spec-Driven Development 工具**：GitHub Spec Kit、Kiro、Tessl、Augment Intent（living spec + multi-agent）。
- **Harness Engineering**：Martin Fowler 專文 + 多篇論文 + nexu-io 指南。你的框架正是「Code-level Atomic Harness」的完美實作。
- **AI Governance**：FINOS、Databricks、ruslanmv 等（偏合規層）；Exceeds AI、Checkmarx（偏安全/ROI 追蹤）。
- **Agentic Frameworks**：LangGraph、CrewAI、AutoGen、OpenAI Agents SDK、Mastra（負責「怎麼跑」；你的框架負責「跑出來的 code 要怎麼治理」）。

**你的獨特定位**：**「原子化 Code Governance + Legacy Strangler + Self-Bootstrapping Harness」**——填補現有工具的空白，與它們高度互補而非競爭。

### 與 Harness Engineering 的對齊度
**90%+ 吻合**。  
Harness Engineering 核心三要素（Context / Constraint / Convergence）與你的 Atomic Spec + Police + HashLock/Regression/Strangler 完全對應。建議在文件中明確引用 Martin Fowler 文章與相關論文，強化學術與實務說服力。

---

## 5.5 與其他框架設計哲學比較（2026）

以下是 AI Atomic Framework 與主流相關框架的設計哲學對比：

| 框架 / 概念                  | 核心哲學                              | 主要隱喻                  | 關鍵機制                              | 對「AI Vibe Coding 失控」的解決方式          | 與 AI Atomic Framework 的關係 |
|-----------------------------|---------------------------------------|---------------------------|---------------------------------------|-----------------------------------------------|-------------------------------|
| **AI Atomic Framework** (v0.2) | **契約優先 + 原子治理 + Harness**    | 「受控純函數加工機」 + LEGO + 細胞 | Atomic Spec（契約）、Police、HashLock、Regression Matrix、Strangler 注入、PEV Loop | 把大工程拆成可驗證原子 + 嚴格邊界 + 防退轉 + 漸進替換 Legacy | —（自身） |
| **Atomic Agents** (BrainBlend-AI) | **Atomicity + 無魔法透明模組化**     | LEGO 積木                 | Single-purpose 組件、Pydantic Schema、顯式控制流、標準 Python 函數 | 強調「你的程式碼還是你的程式碼」，避免黑箱，透過可組合小組件維持可維護性 | **最接近的「原子」理念**，但聚焦在 Agent Pipeline 而非 Code Governance |
| **GitHub Spec Kit / SDD**   | **Spec 作為第一公民 + Intent-driven** | 規格書是源頭              | Constitution、Specify → Plan → Tasks → Implement、多步精煉、Agent-agnostic | 用豐富、結構化的 Spec 取代模糊提示，讓 AI 精準執行意圖 | **高度互補**：Atomic Spec 可視為 SDD 在「程式碼層」的深化版 |
| **Harness Engineering** (Martin Fowler 等) | **Feed-forward + Feedback 調節器**   | 控制系統 / Cybernetic Governor | Context + Constraint + Convergence、機械強制器、漸進揭露、Guardrails | 建立「圍繞模型的 harness」，用明確邊界與回饋迴路讓 Agent 可靠執行 | **哲學最接近**，AI Atomic Framework 可視為「Code-level 專用 Harness 實作」 |
| **LangGraph** (LangChain)   | **Stateful Graph Orchestration**     | 有向圖 / 狀態機           | Nodes + Edges + State + Persistence + Cycles | 用顯式圖結構控制複雜多步、分支、持久化流程，避免隱式混亂 | **互補而非競爭**：可用來實作 Atomic Map 的複雜執行層 |

**目前侷限與未來優化**：
- **目前侷限**：仍偏「工程治理層」，對純 Agent Pipeline 的支援需依賴 Adapter。
- **優化方向**（詳見第 9 章）：內建輕量 Atomic Pipeline 引擎、引入 Agentic Atom 概念、提供官方 Reference Adapter + 完整範例。

---

## 6. 風險控管與防範

| 風險 | 防範措施（v0.2） |
|------|------------------|
| 自舉失敗 | 極小量 seed code + 第一個原子即吃掉 seed |
| MVP 門檻過高 | 嚴格 6 週路線 + 只做 4 個 CLI 指令 |
| Legacy 注入不通用 | Adapter SDK 優先 + 多語言範例 |
| 治理摩擦殺死速度 | Police 分批 + PEV Loop 自動化 + Living Spec |
| 安全性漏洞 | Capability Sandbox + 審計日誌 + prompt guardrail |
| 成本失控 | LLM caching + 預算機制 + metrics dashboard |
| 社群採用障礙 | 完整 QUICK_START + GitHub Actions + 3 種語言 adapter 範例 |

---

## 7. 建議的專案結構（v0.2 簡化版）

```
AI-Atomic-Framework/
├── packages/
│   ├── core/                  # Spec, Registry, HashLock, Manager core
│   ├── cli/                   # 4 個核心指令
│   ├── plugin-sdk/            # Adapter SDK、Capability interface、Police interface
│   ├── adapter-local-git/     # 預設 Git adapter
│   ├── language-js/           # TS/JS reference adapter
│   └── language-python/       # Python 最小範例（Week 4）
├── schemas/
│   ├── atomic-spec.schema.json
│   └── regression-matrix.schema.json
├── templates/
│   ├── atomic.spec.json
│   └── task-card.md
├── examples/
│   ├── hello-world/
│   └── legacy-strangler-minimal/
├── docs/
│   ├── QUICK_START.md
│   ├── ARCHITECTURE.md
│   ├── HARNESS_ENGINEERING_ALIGNMENT.md   # 新增
│   └── ADAPTER_GUIDE.md
├── regression/
│   └── minimal_matrix.json
└── artifacts/                 # baseline、snapshot（.gitignore）
```

---
