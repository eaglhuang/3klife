# AI Atomic Framework Optimized Roadmap v0.2 — MVP 路線與原則（§2–§4）

> 這是 `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 的「MVP 路線與原則（§2–§4）」分片。完整索引見 `docs/ai_atomic_framework/AI_Atomic_Framework_Optimized_Roadmap_v0.2.md`。

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

---

## 4. 技術選型建議（強調鬆耦合與獨立性）

### 核心原則（最重要）
**Core Framework 必須保持極度單純、完全獨立、不耦合任何外部大型專案。**

- **絕不硬依賴** GitHub Spec Kit、Atomic Agents、LangGraph、PR-Agent 等任何外部開源工具。
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
- **Living Spec 同步**：自建輕量同步器，或透過 `SpecProviderAdapter` 與 GitHub Spec Kit 概念對接

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
| GitHub Spec Kit      | `SpecProviderAdapter`            | 需要更豐富的 spec 格式時 | 只借用概念與部分 schema，Core 有自己的 Atomic Spec 格式 |
| Atomic Agents        | `OrchestratorAdapter`            | 想用現成 agent pipeline 時 | 理念最接近，可作為 Manager 的可選後端 |
| PR-Agent (Qodo)      | `CodeReviewAdapter`              | 需要額外 AI code review 層時 | 補強 Police 的可選工具 |
| LangGraph            | `WorkflowAdapter`                | 複雜 stateful workflow 時 | 僅在需要時使用 |

這樣設計後，即使某個外部工具停止維護或 breaking change，**Core 完全不受影響**，使用者只要切換或移除對應 adapter 即可。

---

**結論**：v0.2 嚴格遵守「**Core 極簡 + Adapter 鬆耦合**」原則，既能享受 2026 年生態的成熟成果，又能保持框架本身的單純性、獨立性與長期可維護性。

---
