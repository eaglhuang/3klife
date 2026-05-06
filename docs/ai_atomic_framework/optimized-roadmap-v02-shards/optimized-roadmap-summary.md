# AI Atomic Framework Optimized Roadmap v0.2 — 摘要與問題（§0–§1）

> 這是 `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 的「摘要與問題（§0–§1）」分片。完整索引見 `docs/ai_atomic_framework/AI_Atomic_Framework_Optimized_Roadmap_v0.2.md`。

<!-- doc_id: doc_other_0031 -->
# AI Atomic Framework 優化藍圖 v0.2

> **狀態**：Companion analysis / 務實化補充。本文不是唯一真相文件；正式執行以 `AI_Atomic_Framework_Roadmap.md`、`AI原子框架開發計畫書.md`、`open-source-extraction-plan.md` 與 `tasks-atm.json` 為準。本文可用來補強 MVP 節奏、Core 極簡原則、PEV Loop、Living Spec 與 optional plugin 分層。

**版本**：v0.2（基於原 v0.1 規劃優化）  
**日期**：2026-05-05  
**目的**：將原「AI Atomic Framework Roadmap」調整為更務實、可快速落地、同時保留核心哲學的版本。  
**核心理念保留**：契約優先、原子化治理、Strangler Pattern 漸進注入、HashLock 防漂移、Regression Matrix 防退轉、自舉 dogfooding。  
**主要調整方向**：降低 MVP 門檻、強化與 2026 現實生態整合（Spec-Driven Development + Harness Engineering）、補充缺失的安全性與可觀測性、提供 6 週最小可行路線。

---

## 0. 執行摘要

原規劃極具遠見，精準解決 AI Vibe Coding 的痛點（上下文污染、規則漂移、單畫面過擬合、Legacy 難以重構）。但 v0.1 存在 **過度工程化** 風險：自舉假設過高、MVP 階段一次上太多 Police 與層級、Legacy 注入假設過窄、早期治理摩擦過大。

**v0.2 優化後的核心價值**：
- **6 週內可看到第一個可穩定注入 Legacy 的原子**。
- 與 2026 年主流趨勢（Spec-Driven Development、Harness Engineering、Atomic Agents）高度整合。
- 保留「AI 只在嚴格契約中工作」的哲學，但允許極小量 seed code 啟動。
- 強調 **Living Spec + PEV Loop（Plan-Execute-Verify）** 作為 Manager 內建模式。
- 補強安全性、成本控制、可觀測性與多語言支援，並把 `encoding guard`、`context budget guard` 視為可獨立治理的 Agent Governance Bundle。

**最終目標不變**：讓任何 host project 都能透過 Adapter 逐步將混亂 Legacy 轉為可治理的原子系統。

---

## 1. 原規劃的主要問題與優化對策

### 1.1 自舉過於理想化
**問題**：假設 AI 能可靠完成複雜的 meta-orchestration（Manager 本身），風險極高，容易 bootstrap 失敗。  
**對策**：
- 保留「人工只寫 spec + 審核 + 下指令」哲學。
- 允許 **極小量 seed code**（≤300 行 TS 的最小 Manager shell + CLI）。
- 第一個原子即用來「吃掉」seed code，實現真正自舉。

### 1.2 MVP 階段過度複雜
**問題**：一次定義 10 種 Police、5 層原子結構、完整 Regression + Known Gap Taxonomy，導致分析癱瘓。  
**對策**：
- 嚴格分層：MVP 只做 **Spec + Manager 核心 4 指令 + JSON Registry + 基本 Police（forbidden import + schema + test pass）**。
- Police 與高階功能（去重、語意搜尋、完整 Performance Police）延後至原子數 >30 後再啟用。

### 1.3 Legacy 注入假設過窄
**問題**：範例重度依賴單一 `_atomic_registry.ts` + function mangling，對非 JS/TS 系統不友好。  
**對策**：
- 把「注入策略」完全交給 **Language Adapter + Project Adapter**。
- Core 只產出「可驗證的 Injection Plan + structured diff」，實際寫檔/PR/ patch 由 adapter 決定。
- 提供 Python、C#、Unity 最小 adapter 範例。

### 1.4 早期治理摩擦過高
**問題**：每個原子都要跑多道 Police + 多 fixture Regression，破壞 AI 快速迭代優勢。  
**對策**：
- Police 分批啟用（MVP 只開最關鍵 3 項）。
- 採用「傳統 AST 工具先掃 + AI 只處理語意判斷」混合模式。
- 引入 **PEV Loop**：Plan（spec）→ Execute（AI 實作）→ Verify（test + police + regression）作為標準流程，自動化大部分檢查。

### 1.5 缺失的重要面向
**補充項目**：
- **安全性**：Capability 執行沙箱（Deno/WebContainer）、權限控管、審計日誌、prompt injection 防護。
- **可觀測性**：OpenTelemetry tracing + Prometheus metrics + 簡單 dashboard（原子呼叫熱點、成本、regression 趨勢）。
- **成本控制**：LLM call caching、重用策略、預算機制，以及 `context budget guard` 的 summarize / hard-stop 流程。
- **編碼防災**：UTF-8 without BOM、BOM / replacement char / mojibake guard 不應只存在於 host project，應被提升成 upstream 可替換 plugin。
- **Context Budget**：重量文件、批次圖片、長篇 log、compare board 與大型 artifact 需要正式的 budget policy、summary contract 與超額 hard-stop；不能只靠 agent 臨場判斷。
- **Living Spec**：Spec 與 code 雙向同步（參考 Augment Intent 模式）。
- **多語言支援**：明確的 Adapter SDK 契約 + 至少 3 種語言範例。

---
