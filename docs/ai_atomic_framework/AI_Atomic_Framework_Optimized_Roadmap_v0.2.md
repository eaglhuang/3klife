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

## 2. 優化後的 6 週最小可行路線圖

### Week 1：Freeze + Baseline + 最小 Spec Schema
**目標**：保護現況，建立可重現的起點。  
**Deliverables**：
- `docs/active_spec.md`（標記 active vs historical plan）
- `artifacts/legacy_baseline/`（關鍵腳本 hash、fixture 結果、screenshot）
- `regression/minimal_matrix.json`（至少 3 個 fixture：minimal-contract、edge-case、legacy-strangler）
- `schemas/atomic-spec.schema.json` + Zod 驗證器
- `templates/atomic-task-card.md`

**驗收**：AI 知道「不能直接大改 legacy」，每次修改前後可比對 baseline。

### Week 2：Atomic Manager MVP（極簡版）
**目標**：建立可運作的最小 Manager。  
**核心功能**（只做 4 個 CLI 指令）：
```bash
atomic-manager create --spec atomic_specs/000001.json
atomic-manager implement --id 000001          # 呼叫 AI + 限制 allowed files
atomic-manager test --id 000001
atomic-manager register --id 000001          # 通過後更新 JSON Registry + Git HashLock
```
**技術**：
- TypeScript + Zod + Vitest
- 工作區：`atomic_workbench/atoms/ATM-CORE-0123/`（ATM-2-0013 後 canonical home；資料夾名稱直接等於 Atomic ID）
- 基本 Police：forbidden import（dependency-cruiser）、schema 驗證、test pass 檢查

**驗收**：能用 AI 產生並註冊第一個 compute atom（例如 `normalizeCssColor`）。

### Week 3：Legacy 注入第一個原子
**目標**：讓舊系統能呼叫新原子。  
**Deliverables**：
- `src/legacy/AtomicInterface.ts`（靜態介面）
- `src/legacy/_atomic_registry.ts`（注入函數，命名 `feature_atomic_000001`）
- `atomic_location_index.json`
- 替換 legacy 中 1 個 call site
- 更新 regression matrix 並比對分數

**驗收**：舊系統可透過 `AtomicInterface.xxx()` 呼叫原子，且 3 個 fixture 無退轉。

### Week 4：Performance & Safety 層 + Adapter 範例
**目標**：避免原子化後性能變差或不安全。  
**新增**：
- Performance Budget（maxRuntimeMs、maxAllocatedBytes、no deep clone、compute no async）
- 簡單 Performance Police（單次 + p95 runtime、allocation 估計）
- Capability Sandbox 雛形（Deno isolate）
- Python + C# 最小 Language Adapter 範例

**驗收**：熱路徑原子通過 performance budget，無未授權 deep clone 或 async compute。

### Week 5：Police v0.5 + Living Spec 機制
**目標**：開始治理原子數量成長。  
**新增**：
- 關係警察（DAG cycle 檢查 + 跨層 import）
- 去重警察（文字相似度 + 簡單 embedding 查詢）
- Living Spec 同步器（AI 修改 code 時自動建議更新 spec 相關欄位）
- PEV Loop 內建於 Manager

**驗收**：原子數達 10+ 時，Police 自動跑且不合格者不可 stable。

### Week 6：Reference Case Study 開頭 + 完整文件
**目標**：用 html-to-ucuf 作為第一個公開案例，驗證整套流程。  
**Deliverables**：
- 至少 5 個低風險 compute atom（color、length、typography、border、background）
- Domain Scoring Plugin 雛形（pixel + structure + text）
- Owner Bucket + Known Gap 結構化記錄
- 完整 README、QUICK_START、ARCHITECTURE、ADAPTER_GUIDE
- GitHub Actions 範例（自動 regression on PR）

**最終驗收**：Legacy 透過 AtomicInterface 呼叫多個原子，regression matrix 穩定或僅有已知 gap，且可回滾。

---

## 3. 保留與強化的核心設計原則

### 3.1 契約優先，程式碼其次（完全保留）
每個原子必須先有完整 Atomic Spec（input/output schema、side effect policy、performance budget、test policy、hashLock）。

### 3.2 Git 是真相來源，DB 是索引層（微調）
- MVP：純 Git + JSON Registry
- 原子數 >80 後：引入 PostgreSQL + pgvector（用於語意去重與相似 atom 推薦）

### 3.3 開發期虛擬隔離，執行期 Legacy 注入（保留並強化）
- 工作區：`atomic_workbench/atoms/ATM-CORE-0123/`
- 注入後：函數進入 `_atomic_registry.ts`，透過 `AtomicInterface` 暴露
- 新增：**Injection Plan** 必須包含 rollback patch 與 affected maps 清單

### 3.4 新增：PEV Loop 作為標準流程
```
Plan（spec + task card）
  ↓
Execute（AI 只改 allowed files）
  ↓
Verify（test + police + regression + hash）
  ↓
Converge（更新 registry + living spec + commit）
```

### 3.5 Harness Engineering 對齊（新增核心原則）
- **Context**：Atomic Spec + Active Spec + Registry
- **Constraint**：Police + Performance Budget + Allowed/Forbidden Files
- **Convergence**：HashLock + Regression Matrix + Strangler 逐步收斂

進一步落地時，建議把下列三者收斂成 **Agent Governance Bundle**：

- `encoding guard`：避免文字檔被 BOM、replacement char、mojibake 寫壞。
- `context budget guard`：控制重量文件、圖片、log、artifact 的讀取與傳遞，必要時先 summarize，再決定是否 hard-stop。
- `docs neutrality / boundary guard`：阻止 adopter 私有資訊與隱性耦合敘事回流 upstream。

這三者都屬於 Harness 的「Constraint」層，但它們服務的對象是 agent 的工作包絡本身，而不是單一原子函式，所以應以可替換 plugin / adapter 存在，而不是被塞進 core 純計算語義。

### 3.6 CAR / HarnessCard 精煉（2026-05-08）

預印本的 CAR（Control / Agency / Runtime）比本文件原先的 Context / Constraint / Convergence 更適合拿來對外說明 ATM 的 agent harness 角色。後續文件應把兩者分工清楚：Context / Constraint / Convergence 可保留為工程收斂習慣，CAR 則作為架構報告與 release 溝通語彙。

ATM 對 CAR 的採納方式如下：

- **Control**：Atomic Spec、scope lock、rule guard、validation gate、allowed/forbidden files。
- **Agency**：Plugin SDK、ProjectAdapter、LanguageAdapter、CapabilityAdapter、tool/action policy。
- **Runtime**：ContextSummary、Artifact / Log / RunReport / Evidence stores、budget policy、handoff/replay。

HarnessCard 不應被做成 alpha0 必填 schema；較務實的路徑是先產生 `HarnessCard-lite` 或 `AgentRunProfile` 報告，收進 `.atm/reports/` 或 typed evidence。這份報告只描述一輪 agent work envelope 的 base model/profile、control artifacts、runtime policy、action substrate、execution topology、feedback stack、observability/evaluation 與 known risks。如此可提高跨 repo、跨 adapter、跨模型比較性，同時避免早期 core 被 reporting schema 綁死。

---

## 4. 技術選型建議（強調鬆耦合與獨立性）

### 核心原則（最重要）
**Core Framework 必須保持極度單純、完全獨立、不耦合任何外部大型專案。**

- **絕不硬依賴** 任何外部規格工具、agent pipeline、workflow engine、AI review 工具等外部開源工具。
- 所有外部工具**只能透過 Plugin SDK / Adapter 介面** 以鬆耦合方式接入。
- 使用者可以**完全不安裝任何外部工具**，框架依然能完整運作（使用內建的簡單實作）。
- 這樣才能同時達成「**保持單純 + 可選增強 + 易維護**」三大目標。

### MVP 階段（Week 1–3）—— 極度純淨版
只使用最輕量、穩定、維護成本極低的基礎工具：

- **語言與執行**：TypeScript 5.x + Node.js 22+
- **Schema 驗證**：Zod（輕量、型別安全）
- **測試與覆蓋率**：Vitest（現代、快速）
- **AST 分析**：ts-morph（TypeScript 官方生態，穩定）
- **依賴關係檢查**（可選）：dependency-cruiser（MVP 可先用簡單 import 規則）
- **CLI 框架**：Commander.js（極輕量）
- **執行沙箱（Capability）**：Deno（內建隔離，無需額外容器）
- **版本控制與 HashLock**：純 Git + JSON Registry + conventional commits + pre-commit hook

**此階段完全不依賴任何外部大型框架**，依賴樹非常乾淨，維護成本最低。

### 中期（Week 4+）—— 可選增強（皆透過 Adapter）
當原子數量成長或需要更強大功能時，再透過以下方式**可選**整合：

- **Orchestration**：透過 `OrchestratorAdapter` 介面，可選擇使用 LangGraph 驅動複雜 Atomic Map（預設使用內建簡單流程引擎）
- **Indexing 與語意搜尋**：PostgreSQL + pgvector（>80 atoms 時啟用，透過 `VectorIndexAdapter`）
- **可觀測性**：OpenTelemetry + Prometheus（強烈建議，屬於基礎設施層，非「外部框架」）
- **Living Spec 同步**：自建輕量同步器，或透過 `SpecProviderAdapter` 與外部 SDD 工具概念對接

另有一組不應被拖到後期的治理基線：`encoding guard`、`context budget guard`、`docs neutrality / boundary guard`。它們應在 MVP 就有最小版本，因為這些能力不是豪華功能，而是防止 agent 失控的最小 harness。

### 外部工具整合策略（鬆耦合設計）
**所有外部整合都必須符合以下規則**：

1. Core 只定義 **介面契約**（例如 `ISpecProvider`、`IOrchestrator`、`ICodeReviewer`、`IVectorIndex`）。
2. 每個外部工具都有一個獨立的 `packages/adapter-xxx/` package，實作對應介面。
3. 使用者可透過設定檔選擇啟用哪個 adapter，或完全不啟用。
4. Core 永遠不知道外部工具的存在。

**推薦的可選整合清單（非強烈建議，而是「可參考的成熟實作」）**：

| 外部工具              | 整合方式                          | 建議時機          | 備註 |
|-----------------------|-----------------------------------|-------------------|------|
| 外部 SDD 工具        | `SpecProviderAdapter`            | 需要更豐富的 spec 格式時 | 只借用概念與部分 schema，Core 有自己的 Atomic Spec 格式 |
| Atomic Agents        | `OrchestratorAdapter`            | 想用現成 agent pipeline 時 | 理念最接近，可作為 Manager 的可選後端 |
| PR-Agent (Qodo)      | `CodeReviewAdapter`              | 需要額外 AI code review 層時 | 補強 Police 的可選工具 |
| LangGraph            | `WorkflowAdapter`                | 複雜 stateful workflow 時 | 僅在需要時使用 |

這樣設計後，即使某個外部工具停止維護或 breaking change，**Core 完全不受影響**，使用者只要切換或移除對應 adapter 即可。

---

**結論**：v0.2 嚴格遵守「**Core 極簡 + Adapter 鬆耦合**」原則，既能享受 2026 年生態的成熟成果，又能保持框架本身的單純性、獨立性與長期可維護性。

---

## 5. 2026 年生態對齊與定位

### 高度相關的現有框架（2026-05）
- **Atomic Agents**（BrainBlend-AI）：最接近的 atomicity 理念，可互補使用。
- **Spec-Driven Development 工具**：外部 SDD / living spec 工具（living spec + multi-agent）。
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
| **外部 SDD 工具**   | **Spec 作為第一公民 + Intent-driven** | 規格書是源頭              | 規則憲章、Spec → Plan → Tasks → Implement、多步精煉、Agent-agnostic | 用豐富、結構化的 Spec 取代模糊提示，讓 AI 精準執行意圖 | **高度互補**：Atomic Spec 可視為 SDD 在「程式碼層」的深化版 |
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

## 8. 下一步行動建議

1. **立即開始**：執行 Week 1（Freeze + Baseline + Spec Schema）。
2. **第一個原子**：選擇 `normalizeCssColor` 或 `parseCssLength`（低風險、易測試）。
3. **文件強化**：新增 `HARNESS_ENGINEERING_ALIGNMENT.md`，引用 Martin Fowler 文章。
4. **開源準備**：撰寫 CONTRIBUTING.md、設定 GitHub Actions（自動 regression）、採用 Apache 2.0 License（已決定）。
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