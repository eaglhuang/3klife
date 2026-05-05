<!-- doc_id: doc_other_0028 -->
# AI 原子框架（ATM）開發計畫書

> 版本：v0.2 · 3KLife downstream adopter plan（對齊 upstream `https://github.com/eaglhuang/AI-Atomic-Framework`）
> 文件位置：`docs/ai_atomic_framework/AI原子框架開發計畫書.md`
> 上游理論藍圖：使用者提供的 `AI_Atomic_Framework_Roadmap.md`（外部來源）
> 上游開源 repo：`https://github.com/eaglhuang/AI-Atomic-Framework`
> 本文件定位：3KLife 如何作為第一個 reference adopter / adapter case study 導入 ATM；ATM upstream 需自帶通用治理契約與 Default Governance Bundle，`task-lock`、`compute-gate`、`doc-id-registry`、Cocos 與 html-to-ucuf 則是 3KLife adapter 能力，不是 ATM core 前提。

---

## Context

`html-to-ucuf` skill 已歷經 5 次大改（plan1 → plan5），但 gacha-ds3 在 Cocos Editor 端 final gate adjustedScore 仍卡在 ~0.62。根因不是「某段程式碼寫得不好」，而是**典型 AI Vibe Coding 失控症狀**：

- 3091 行 `draft-builder.js` 單檔多責（HTML 遍歷、型別推理、字體/背景/運動解析）
- 規則 plan2/3/4/5 並列漂移，無 active/historical 治理
- acceptance 模糊（沒給「95%」明確公式 — 已由 H2U-REFACTOR-0006 補入四維度量化）
- 單畫面 over-fit（PROG-2-0010 才開始補 multi-fixture matrix）
- AI 每次都嘗試解決所有層級問題（HTML 轉換錯 + Cocos renderer 邊界 + 美術 assetization 邊界）

H2U-REFACTOR-0001~0006 已開出處理「拆檔 / 規則治理」，PROG-2-0010/0011 處理「multi-fixture matrix / selector trace」。但這些都是**單點修補**，無法防止下一輪 AI 改動再次失控。**真正缺的是「原子化治理框架」**：契約優先、AI 受控加工、hash lock、regression matrix、漸進注入 Legacy。

本計畫的目標不再是把 ATM core 直接長在 3KLife 裡，而是把 3KLife 定義成第一個 **downstream adopter**：上游 `AI-Atomic-Framework` 提供通用 Core / Default Governance Bundle / CLI / Plugin SDK；3KLife 只實作 `ProjectAdapter` 與 `Language/RuntimeAdapter`，再用 html-to-ucuf 作為 reference case study 驗證框架是否能治理真實 legacy。

---

## 上游先自舉、downstream 後驗證

本計畫正式採用 `upstream self-hosting first`。在上游 `AI-Atomic-Framework` 先完成 standalone 自舉、通過 self-hosting alpha gate 以前，3KLife 只能扮演 tracking repo 與 downstream adopter 規劃場，不得充當上游開發前提。

硬規則如下：

1. 上游 repo 開發時不得使用 3KLife 內部工具腳本，例如 `task-lock`、`compute-gate`、`doc-id-registry`、`shard-manager`。
2. 上游 `packages/core`、reference plugins 與 protected surfaces（README / AGENTS / docs / examples / templates）不得帶入 3KLife、Cocos、html-to-ucuf 或其他 adopter 私有資訊。
3. 第一輪 smoke 必須在 standalone upstream repo 完成；AI agent 只讀 README / AGENTS / `.atm/profile` 即可完成 first task、scope lock、artifact/log/evidence 與 first atom 驗證。
4. 只有通過 self-hosting alpha gate，才允許進入 3KLife ProjectAdapter、Cocos runtime adapter 與 html-to-ucuf case study。

因此，ATM-1 與 ATM-2 的首要責任是上游自舉、文件中立性與 boundary guard；ATM-3 與 ATM-4 則一律視為 downstream-only phase。

---

## 獨立 Repo 與 3KLife 分工

| 層級 | 位置 | 職責 | 禁止事項 |
|---|---|---|---|
| Upstream Core | `https://github.com/eaglhuang/AI-Atomic-Framework` | Atomic Spec / Registry / HashLock / Manager / Police / Regression schema / governance contracts / Plugin SDK / CLI protocol | 不得引用 3KLife、Cocos、html-to-ucuf、task-lock、compute-gate、doc-id-registry |
| Agent Operating Layer | upstream README / AGENTS template / `.atm/profile` / project probe（規劃） | 讓使用者把 ATM 放在專案根目錄後，任意 AI agent 讀 README/AGENTS 就能啟動 adopt、開卡、鎖 scope、跑 guard 與保存 artifacts/logs/evidence | 不得綁定 Copilot、Claude、OpenAI、特定 IDE 或特定模型 |
| Default Governance Bundle | upstream `packages/plugin-task-cards/*`、`plugin-doc-index/*`、`plugin-doc-shard/*`、`plugin-state-files/*`、`plugin-artifacts/*`、`plugin-logs/*`、`plugin-rule-guard/*`、`adapter-local-fs-git/*`（規劃） | 提供空白 repo 可直接使用的 task / scope lock / doc index / shard / md/json state / artifact / log / rule guard / evidence workflow，預設落在 `.atm/` | 不得沿用 3KLife 任務卡 ID、doc_id 類別、中文 shard 或 Cocos/H2U domain 規則 |
| Project Adapter | 本 repo `tools_node/adapters/atm-3klife/`（規劃） | 將 3KLife 的 task-lock、compute-gate、doc-id-registry、shard-manager、task-card-opener、encoding / scope / import guard 接到 upstream adapter interface | 不得把 adapter 規則反推回 core；不得搬動現有治理工具作為第一步 |
| Language / Runtime Adapter | 本 repo `tools_node/adapters/atm-3klife/language-node/` 與後續 Cocos adapter | 描述 Node / Cocos 的測試、build、import 掃描與 runtime integration | Cocos Component / Node / Prefab 不可直接變成 compute atom |
| Case Study | 本 repo html-to-ucuf / H2U fixtures | 驗證 ATM 能否逐步 strangler 一個真實 legacy toolchain | 不得成為 ATM core 的預設 domain |

本文件後續所有 `tools_node/atomic-framework/`、`tools_node/_atomic_registry/`、`compute-gate --profile atm` 等規劃，均視為 3KLife adapter / local workbench，不是上游框架原始碼真相。上游 Default Governance Bundle 的 reference layout 以 `.atm/` 為準，3KLife 只透過 adapter 映射既有 `docs/agent-briefs/tasks/`、`docs/tasks/*.json` 與 doc-id registry。
上游 repo 的 README / AGENTS / docs / examples / templates 則必須維持 adopter-neutral；3KLife、Cocos、html-to-ucuf 與本地治理工具只能存在於 downstream tracking docs、adapter 文件或 case study 範圍。

---

## v0.2 companion 採納矩陣

`AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` 的方向可以採納，但必須依 3KLife downstream adopter 邊界分類：

| v0.2 主張 | 3KLife 採納方式 | 任務落點 |
|---|---|---|
| Core 極簡、無硬依賴 | 直接採納；上游 core 不得硬依賴 3KLife、Cocos、LangGraph、pgvector 或 Deno sandbox | ATM-0-0007、ATM-1-0001 |
| Zero-install Agent Bootstrap | 採納；ATM 應可放入任意 repo 根目錄，AI agent 讀 README/AGENTS 後自動完成 project probe、開第一張 task、套 default guards | ATM-1-0008 |
| Default Governance Bundle | 採納；ATM 不能只剩 atom runner，需有通用 task/index/shard/artifact/log/rule/evidence 預設套件，但不得進 core hard dependency | ATM-0-0009、ATM-2-0007、ATM-2-0008、ATM-2-0009 |
| Self-hosting alpha / docs neutrality / boundary guard | 採納；先在 standalone upstream repo 通過 alpha gate，再以 docs neutrality audit 與 rule guard 持續防止 adopter 私有資訊回流 | ATM-1-0009、ATM-1-0010、ATM-2-0010 |
| Agent Governance Bundle（encoding / context budget / neutrality） | 採納；將編碼防災、context budget 節流與 docs neutrality 收斂成 upstream 可替換的 agent governance bundle，而非 3KLife 私有守則 | ATM-0-0011、ATM-2-0011 |
| 6 週 MVP | 採納為節奏參考；對齊 ATM-0~ATM-5，並以補強卡擴充既有任務 | ATM-0-0007、ATM-5-0001 |
| PEV Loop | 採納為所有 ATM 卡的標準工作語彙 | ATM-5-0005 |
| Living Spec | 先列 optional feature；MVP 只要求變更提示，不要求自動雙向同步 | ATM-5-0005 |
| Performance Budget Police | 延後，不阻塞 v0.1 alpha；只在 hot path atom 或原子數量成長後啟用 | ATM-6-0004 |
| Capability Sandbox、審計日誌、Observability | 延後為 security / observability plugin，不進 core 必備依賴 | ATM-6-0005 |
| html-to-ucuf reference case | 採納為 3KLife case study；Cocos Node、Prefab、Component 只能是 wrapper/adapter，不進 compute atom | ATM-3-0005、ATM-4-0006 |

因此，v0.2 不是要把本計畫改回「工具導向」或「H2U 導向」。它只補強 MVP 節奏、治理摩擦控制與 optional plugin 分層。

### 3KLife adapter 技術棧校正矩陣（細版）

下表把「採納 / 降級 / 延後」拆到工具級，避免後續在 upstream repo 與 3KLife downstream workbench 之間再次混線：

| 能力層 | v0.2 推薦或提案 | 3KLife 現況 / 最近端對應 | 上游 ATM 定位 | 本計畫決策 |
|---|---|---|---|---|
| Schema 驗證 | Zod | 既有 JSON Schema + AJV + JSON 真相檔 | Core 只要求 Atomic Spec 可機器驗證，不綁特定 validator | **直接採納語義、降級實作綁定**：upstream first implementation 可用 Zod；3KLife adapter 維持 JSON Schema + AJV，不回改整個 repo |
| CLI 框架 | Commander.js | 現況偏 `node tools_node/*.js` 與手寫 argv parser | Core 只固定 CLI protocol，不固定 CLI library | **降級為 reference stack**：upstream 可用 Commander；3KLife 只需 command bridge，不必 retrofit |
| 測試 runner | Vitest | 現況以 `compute-gate`、自測腳本、mocha/ts-node 類 Node 工作流為主 | Core 要求 regression matrix 與可重跑 fixture，不綁 runner | **直接採納測試語義、降級 runner 選型**：new repo 可用 Vitest；3KLife 不全面改 runner |
| AST / 靜態分析 | ts-morph | 本 repo 仍以 Node 工具鏈與 parser 包裝為主 | Language Adapter 能力，不是 core 語義 | **降級為 JS/TS adapter 實作細節**：先服務 upstream reference adapter，不反推全專案 |
| 注入 / 改檔策略 | Injection Plan + structured diff | 現況已由 `task-lock`、`apply_patch`、注入計畫工具治理 | Core 只能產 plan，不直接動 host project | **直接採納**：3KLife ProjectAdapter 負責套 patch；core 不直接碰 `assets/scripts` |
| Agent bootstrap | README / AGENTS / project probe / default profile | 3KLife 目前靠 `.github/instructions`、skills、AGENTS.md、CLAUDE.md 與 keep.summary 啟動 agent 流程 | Agent Operating Layer + Default Governance Bundle | **新增分層**：upstream 提供模型無關的 root-drop bootstrap；3KLife 以 adapter 對應既有指令檔 |
| Governance primitives | task cards / scope lock / doc index / shard / artifact / log / rule guard / evidence | 3KLife 已有 task-lock、task-card-opener、doc-id-registry、shard-manager、compute-gate、artifacts、logs 等成熟實作 | Core contract + Default Governance Bundle reference plugins | **新增分層**：upstream 定義通用 schema 與 `.atm/` reference layout；3KLife 只做 mapping，不搬工具 |
| Project governance | task-lock / compute-gate / doc-id / encoding | 都是本 repo 既有治理基礎設施 | 3KLife ProjectAdapter / local workbench | **降級為 downstream adapter 實作**：明確禁止反推成 upstream hard dependency |
| Context budget / summary governance | `check-context-budget.js`、`generate-context-summary.js`、`report-turn-usage.js` | 已有 context budget guard、summary 與用量報告工具 | `plugin-context-budget` + `ContextBudgetAdapter` | **直接採納治理語義、降級宿主數值**：upstream 定義 budget policy、summary/hard-stop/report contract；3KLife 閾值與 keep 規則只留 adapter |
| Orchestration | LangGraph / Atomic Agents / 內建 pipeline | 現況沒有必要硬依賴 | Optional OrchestratorAdapter | **延後**：只有 Atomic Map 真的出現複雜 stateful workflow 時才接 |
| Index / 語意搜尋 | PostgreSQL + pgvector | 前期沒有 DB 基建，現況以 JSON registry 為主 | Optional VectorIndexAdapter | **延後**：atom 數量與跨 repo 搜尋需求成形後再評估 |
| Observability | OpenTelemetry + Prometheus | 現況以 compute-gate、artifact JSON、log 摘要為主 | Optional ObservabilityAdapter | **延後**：alpha 不納入必備依賴，只先保留事件與 metrics hook |
| Capability Sandbox | Deno / WebContainer | 現況以 task-lock、gate、能力白名單與 repo 規範控風險 | Optional CapabilityAdapter | **延後**：先定 capability schema 與 audit log 欄位，不先引入新 runtime sandbox |
| Code Review augmentation | PR-Agent / Qodo 類工具 | 現況無必要硬依賴 | Optional CodeReviewAdapter | **延後**：可接，但只能當 Police 之外的可選外掛 |
| Runtime / language adapter | Python / C# / Unity / Cocos 範例 | 3KLife 真實 host 是 Node toolchain + Cocos runtime | LanguageAdapter + ProjectAdapter | **直接採納邊界**：Cocos `Node` / `Component` / `Prefab` / `Scene` 只留在 wrapper；就像 Unity `GameObject` / `MonoBehaviour` 一樣，不能進 compute atom |
| html-to-ucuf / H2U 案例 | Legacy strangler case | 本 repo 已有真實高壓工具鏈 | Downstream case study | **直接採納為案例、禁止升格成 core domain** |
| AI vendor / provider | 任意 LLM provider | 本 repo 不應綁單一模型或供應商 | Optional provider adapter | **直接採納 vendor-neutral 原則**：spec、registry、manager 不綁模型品牌 |

細版矩陣的結論只有三條：

1. upstream repo 可以有自己的 first implementation stack，但那只是「參考實作」，不是 Atomic Spec 的語義前提。
2. ATM upstream 必須有 Default Governance Bundle，否則它只會是 atom runner；但 bundle 必須是可替換 plugin，不得污染 core。
3. ATM upstream 必須提供 Agent Operating Layer，讓任意 AI agent 只靠 README/AGENTS 與 `.atm/profile` 就能知道如何開卡、鎖 scope、跑 guard、保存 artifacts/logs/evidence。
4. 3KLife 這套 `task-lock / compute-gate / doc-id / encoding / shard-manager / artifacts / logs / tools_node/atomic-framework` 是 downstream adopter 的 ProjectAdapter 與 local workbench，不是上游 core 本體。
5. Cocos runtime 物件必須維持在 adapter / wrapper 邊界，不能像把 Unity `GameObject` 直接塞進 pure function 一樣，污染 compute atom 的可驗證性。

---

## 目標

1. **上游可開源**：ATM core、Agent Operating Layer 與 Default Governance Bundle 可以從本 repo 拆出並獨立發布；使用者理論上只要把 ATM 放在專案根目錄，讓任意 AI agent 讀 README/AGENTS，就能在空白 repo `init / adopt / status / validate / task / lock / guard / artifact / log / evidence`。
2. **Adapter-first 導入**：3KLife 只透過 adapter 使用 upstream，不把 `task-lock / compute-gate / doc-id-registry / shard-manager` 寫進 core。
3. **可量化北極星**（3-4 週內達成）：上游 repo 有最小 CLI + schema + LocalGitAdapter + hello-world atom；3KLife adapter 能套用同一份 spec 驗證至少 1 個 html-to-ucuf 低風險 atom，並且 H2U self-test 不退轉。
4. **長期目標**：讓 ATM core 成為可被任何 AI vibe coding 專案安裝的開源框架；3KLife 則成為展示 legacy strangler 的高壓案例。
5. **明確排除**：本計畫不在 core v0.1 內追 0.95 pixel parity、不重寫 draft-builder 主幹、不把 Cocos / Puppeteer / pgvector / LangGraph 內建進 core。

## ATM 獨立可啟動的最小通用層

ATM 若要達到「下載後放在任意專案根目錄，AI agent 讀 README 就能開始工作」，上游不能只交付 atom runtime，至少要自帶下列通用層。這些能力都必須是 model-neutral、host-neutral、可替換 adapter，不得綁死 3KLife 或任何特定 IDE。

| 通用層 | 上游預設能力 | 3KLife 對應 adapter |
|---|---|---|
| Agent bootstrap | README / AGENTS template、`.atm/profile.json`、`atm init --adopt`、project probe、auto first task recipe | `.github/instructions`、AGENTS.md、CLAUDE.md、keep.summary 與 task-lock 開工規則 |
| Task / scope governance | `.atm/tasks/*.md`、`.atm/tasks/tasks.json`、`.atm/locks/*.json`、task lifecycle、scope lock | `task-card-opener.js`、`task-lock.js`、`check-task-scope.js` |
| Markdown / JSON state | `.atm/state/*.md|*.json`、schema validation、state diff summary、large-state sharding policy | `docs/*.md`、`docs/tasks/*.json`、doc-id registry、task shards |
| Document index / shard | `.atm/index/*.json`、`.atm/shards/*`、resolve / rebuild / validate | `doc-id-registry.js`、`shard-manager.js`、cross-reference index |
| Artifacts / generated files | `.atm/artifacts/files/*`、artifact manifest、preview summary、cleanup / retention policy | `artifacts/`、turn artifacts、UI QA compare boards、generated reports |
| Logs / run snapshots | `.atm/logs/snapshots/*`、log query / summarize / redact、run stdout/stderr capture | Cocos project logs、browser/editor logs、terminal output 摘要 |
| Reports / evidence / handoff | `.atm/reports/*.json`、`.atm/evidence/*.json`、validation evidence、context summary、handoff bundle | `compute-gate` reports、validation_evidence、handoff/context summary tools |
| Context budget / summarization | `.atm/reports/context-budget/*.json`、`.atm/state/context-summary/*.md`、重量文件/圖片 budget policy、summarize/hard-stop workflow | `check-context-budget.js`、`generate-context-summary.js`、`report-turn-usage.js` |
| Rule / gate runner | default rule guard、encoding guard、context budget guard、import/scope guard、command capability policy | `compute-gate.js`、encoding checks、import-boundary、UI/H2U rule guards、context budget guard |
| Adapter discovery | Local FS/Git fallback adapter、host capability registry、language/runtime adapter probe | 3KLife ProjectAdapter、Node/Cocos adapter、html-to-ucuf case adapter |

因此，ATM 的「可獨立跑起來」定義不是只要 `npm install` 後能執行一個 atom，而是要能讓 AI agent 在任何 repo 內自動形成固定工作包絡：Project Probe → Create Task → Lock Scope → Plan → Edit → Capture Artifacts/Logs → Run Guards → Write Evidence → Unlock/Close Task。Core 只定義契約與 lifecycle；Default Governance Bundle 提供 `.atm/` reference implementation；各專案再用 adapter 映射到自己的任務、文件、log 與 artifact 系統。
其中 `plugin-rule-guard`、`plugin-encoding`、`plugin-context-budget` 應被視為同一組 Agent Governance Bundle：前者負責 policy/boundary，第二個負責文字完整性，第三個負責上下文預算、摘要節流與超額 hard-stop。

---

## 解決問題的原理

| 原理 | 對應病徵 | 落地方式 |
|---|---|---|
| **契約優先 (spec > code)** | AI 重寫 code 時不知道規則 | Atomic Spec JSON Schema + AJV validate；改 code 必動 specHash |
| **AI 受控加工機** | AI 自由改檔造成全局副作用 | task-lock + 任務卡 frontmatter 限定 `allowed_files` + Police 拒絕 forbidden import |
| **Git 真相 + JSON registry** | DB 同步成本高、信任成本高 | 真相在 Git 檔案；registry.json 為索引層；DB 後置 |
| **開發期沙盒 + 執行期注入** | 過度資料夾化讓 Legacy 無法漸進整合 | `_workbench/` 是 AI 沙盒；`_atomic_registry/` 是 runtime 產物；Legacy 透過 AtomicInterface.js 接入 |
| **不退轉：hash lock + regression matrix** | AI 修一處退三處 | sha256(spec/code/test) 三段鎖；compute-gate 加 `atm-hash-lock` gate |
| **單點切入 + strangler 漸進** | 一次大改五次失敗 | 第一批 atom 從 html-parser.js + 純 helper 切入，避開 draft-builder 主幹 |
| **Adapter 而非耦合** | 開源框架若綁死單一專案就無法移植 | 3KLife 以 ProjectAdapter 包裝 task-lock / compute-gate / doc-id-registry / encoding-touched |
| **治理預設可替換** | 框架若沒有 task/index/shard/guard/evidence 會空心化；若硬綁 3KLife 又無法開源 | upstream 提供 Default Governance Bundle；host project 可用 Jira/GitHub Issues/Notion/3KLife adapter 替換 |
| **Agent 可自啟動** | 使用者若還要人工告訴 AI 怎麼開卡/存 artifact/讀 log，ATM 就沒有真正落地 | upstream 提供 README/AGENTS/bootstrap profile/project probe，讓任意模型照文件即可啟動治理流程 |

---

## 與本專案的相容性分析（Roadmap 必須校正的 8 點）

Roadmap 是通用理論藍圖，與本專案落地實況有 8 點需校正：

| # | Roadmap 寫法 | 本專案實況 | 校正 |
|---|---|---|---|
| 1 | TS + Zod + Vitest | Node + AJV + mocha/ts-node | spec 用 `.json` + JSON Schema；CLI 用 `.js` |
| 2 | `src/legacy/AtomicInterface.ts` | 沒有 `src/legacy/` 目錄 | 改放 `tools_node/_atomic_registry/AtomicInterface.js`，由 inject-plan.js 生成 |
| 3 | AI 直接改 Legacy | 有 task-lock + check-task-scope + import-boundary | Manager **只產 patch plan**，由人/特定 ATM 卡 apply |
| 4 | 用 `tsc / eslint / vitest` 當 gate | 用 compute-gate.js 統管所有 gate | Police 改寫成 `atm-police` gate，掛上 finalize-agent-turn |
| 5 | atom ID 用 `atomic_000001` | 名詞定義文件強制 `{prefix}-{子系統}-{流水號4位}` | atom 用 `ATM-{bucket}-{NNNN}`；函數名 `<name>_atom_{bucket}_{seq}` |
| 6 | `atomic_workbench/` 在 repo root | repo root 已混亂 | 收進 `tools_node/atomic-framework/_workbench/` |
| 7 | DB-first 索引 | 無 DB 基建 | ATM-7 才討論，前期僅 JSON registry |
| 8 | 沒提 encoding | 本專案有 encoding-integrity 嚴格規則 | scaffold-atom 產出檔案必須走 UTF-8 without BOM；compute-gate 必跑 encoding-touched |

---

## 目錄結構規劃（四區）

上游開源 repo 需先具備通用 governance reference layout，3KLife local workbench 再透過 adapter 對接：

```
AI-Atomic-Framework/
  packages/
    core/                             Atomic lifecycle / registry / hash / policy contracts
    plugin-sdk/
      governance/                     TaskStore / LockStore / DocumentIndex / ShardStore / ArtifactStore / LogStore / RuleGuard / EvidenceStore interfaces
    agent-bootstrap/                  README/AGENTS/profile templates and project probe contract
    plugin-task-cards/                default `.atm/tasks/*` work item plugin
    plugin-doc-index/                 default `.atm/index/*` document index plugin
    plugin-doc-shard/                 default `.atm/shards/*` shard plugin
    plugin-state-files/               default `.atm/state/*` Markdown/JSON state file governance
    plugin-artifacts/                 default `.atm/artifacts/*` artifact/report store
    plugin-logs/                      default `.atm/logs/*` log snapshot/index store
    plugin-rule-guard/                default local rule guard runner
    plugin-encoding/                  default UTF-8 / BOM / replacement char guard
    plugin-context-budget/            default token/context budget + summarize/hard-stop guard
    adapter-local-fs-git/             local filesystem + git fallback adapter
  examples/
    governance-standalone/            no 3KLife dependency smoke example
    agent-bootstrap/                  root-drop README/AGENTS bootstrap smoke example
```

Default Governance Bundle 是官方預設體驗，不是 `packages/core` 的硬依賴；`packages/core` 只能 import governance contracts，不能 import reference plugin 實作。Agent Operating Layer 則是 AI 入口層，讓不同模型讀同一份 README/AGENTS 後做出一致的 Plan → Execute → Verify → Converge 流程。

### 區 1：框架工作區（AI 沙盒，CLI/Manager 入口）

```
tools_node/atomic-framework/
  README.md                          職責、入口、版本
  atm-cli.js                         主 CLI（手寫 argv parser；仿 compute-gate.js）
  manager/
    parse-spec.js                    讀 spec、AJV 驗證、回 normalized model
    scaffold-atom.js                 從 spec 產 atom 骨架到 _workbench/
    run-atom-tests.js                跑單一 atom fixture matrix
    validate-atom.js                 hash + schema + forbidden import 整合
    inject-plan.js                   產生 Legacy 注入 patch plan（不直接改檔）
    rollback-plan.js                 對應 inject 的回退指令清單
  police/
    forbidden-import.js              掃 require/import 黑名單
    side-effect.js                   AST 掃 fs/child_process/globals 寫入
    registry-consistency.js          registry vs 實檔漂移
    dependency-graph.js              dep cycle / 越權呼叫
  registry/
    atomic-registry.json             atom 清單（id/hash/status/scriptPath/usedBy）
    atomic-map.json                  pipeline 拼裝圖
    capability.json                  授權能力白名單
    regression-matrix.json           fixture × atom × owner 矩陣
  schemas/
    spec.schema.json                 Atomic Spec AJV schema
    map.schema.json                  Atomic Map schema
    registry.schema.json             registry shape
    capability.schema.json           能力白名單 schema
  _workbench/                        AI 沙盒（不進 Legacy 路徑、不被 import-boundary 牽連）
    atoms/
      ATM-3-0001-normalize-css-color/
        spec.json
        impl.js
        test.js
        fixtures/
        report.json
  fixtures/
    legacy-baseline/                 ATM-0 凍結的 active spec / legacy snapshot 鏡像
```

### 區 2：共用純邏輯（atm-cli 與 hook 共用）

```
tools_node/lib/atomic-framework/
  spec-loader.js                     I/O + AJV，回 normalized spec
  hash-lock.js                       sha256(spec/code/test) 三段鎖
  ast-utils.js                       acorn/@babel/parser 包裝（純函式）
  diff-report.js                     比對 hash-lock baseline 與當前
  manifest-merger.js                 多 atom registry 合併 + 衝突偵測
  encoding-helpers.js                重用 check-encoding-touched 核心
```

### 區 3：Runtime 原子產物（與 Legacy 共處的「正式」代碼）

```
tools_node/_atomic_registry/
  index.js                           集中 re-export 所有 atom_NNNN 函數
  AtomicInterface.js                 對外公開命名空間（parseHtmlToDom 等）
  generated/
    ATM-3-0001-normalize-css-color.js   函數名：normalizeCssColor_atom_3_0001
    ATM-3-0002-parse-css-length.js
    ATM-3-0003-html-parser-adapter.js
  location-index.json                記錄每個 atom 被誰 require、取代了哪段
```

> Legacy 檔案（如 `tools_node/lib/dom-to-ui/draft-builder.js`）只 `require('../../_atomic_registry')`，不直接引用 atom 散檔。
> import-boundary 白名單：所有模組可單向 import `_atomic_registry/AtomicInterface.js`；`_atomic_registry/generated/` 僅由 `index.js` re-export。

### 區 4：ATM 文件區

```
docs/ai_atomic_framework/
  README.md                          入口與術語對照
  AI原子框架開發計畫書.md             本計畫
  active-spec.md                     凍結中的 active spec 清單
  architecture.md                    四區圖、注入流程、雙層策略
  atomic-spec-template.md            Spec 撰寫指引（要求欄位、AJV 對應）
  hash-lock-policy.md                何時可重簽 hash、誰可解鎖
  regression-matrix.md               Fixture × Atom × Owner 矩陣與更新規則
  legacy-integration-runbook.md      inject-plan / rollback / dry-run 操作手冊
  shards/                            > 600 行交由 doc-shard-manager 拆
```

---

## 里程碑（ATM-0 ~ ATM-6）+ 已開任務卡清單

本輪已建立 **53 張** ATM 任務卡，索引在 `docs/tasks/tasks-atm.json`，Markdown 卡位於 `docs/agent-briefs/tasks/ATM-*.md`。其中 36 張是原始開源化骨架，6 張是 v0.2 companion 補強卡，5 張是 Default Governance Bundle / Agent Operating Layer 補強卡，另外 4 張用於 self-hosting alpha、docs neutrality 與 neutrality/boundary guard，2 張用於 context budget 與 Agent Governance Bundle 補強。後續新增卡仍必須透過 `task-card-opener` 與 `doc-id-registry`，不得手動複製 `doc_id`。

### ATM-0：3KLife governance bootstrap（11 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-0-0001~0002 | shard 與名詞定義 | 建立 `ATM-*` task shard 與唯一系統代號來源。 |
| ATM-0-0003~0004 | upstream / downstream 文件解耦 | 將 Roadmap 改成上游開源框架，將本文件改成 3KLife adopter plan。 |
| ATM-0-0005~0006 | extraction checklist / task template | 建立開源拆出 checklist 與後續任務卡模板。 |
| ATM-0-0007~0008 | v0.2 技術選型與 3KLife 校正矩陣 | 將 Core 極簡、無硬依賴與 adapter 技術棧校正寫回正式計畫。 |
| ATM-0-0009 | Default Governance Bundle 切分重規劃 | 將 ATM 補強為具備通用 task/index/shard/artifact/log/rule/evidence 的完整治理框架，同時保留 3KLife 工具以 adapter 接入。 |
| ATM-0-0010 | Self-hosting first 邊界與中立性 guard 落地 | 將 upstream self-hosting first、docs neutrality 與 neutrality/boundary guard 正式寫入主文件與任務分工。 |
| ATM-0-0011 | Context budget 治理補強與文件回寫 | 將 context budget 提升為 upstream governance primitive，並與 encoding / neutrality 收斂成 Agent Governance Bundle。 |

### ATM-1：上游 repo skeleton 與 self-hosting alpha gate（10 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-1-0001~0002 | product charter / monorepo skeleton | 在 `https://github.com/eaglhuang/AI-Atomic-Framework` 建立 README、package skeleton 與開源基本契約。 |
| ATM-1-0003~0004 | schema / CLI MVP | 定義 Atomic Spec、Registry、Regression Matrix schema，並提供 `init/status/validate` CLI。 |
| ATM-1-0005~0007 | LocalGitAdapter / JS LanguageAdapter / examples | 讓框架在無 3KLife governance 的空白 repo 也能跑 hello-world 與 legacy-strangler 範例。 |
| ATM-1-0008 | Zero-install Agent Bootstrap Pack | 建立 README/AGENTS/profile/project probe，讓任意 AI agent 讀文件後能自動開卡、鎖 scope、跑治理流程。 |
| ATM-1-0009 | Self-hosting alpha proof | 在 standalone upstream repo 證明 first task、scope lock、artifact/log/evidence 與 first atom smoke 都可不靠 3KLife 完成。 |
| ATM-1-0010 | Upstream docs neutrality audit | 全盤掃描 README/AGENTS/docs/examples/templates，確保上游文件不夾帶 adopter 私有資訊。 |

### ATM-2：Core Manager、Registry、HashLock、Police、Governance Bundle（11 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-2-0001~0003 | spec loader / scaffold / test runner | 建立 core manager 的最小可運作閉環。 |
| ATM-2-0004~0005 | registry / hash-lock / police | 提供 JSON-first registry、hash drift 偵測與內建 police。 |
| ATM-2-0006 | Adapter API 與 Plugin SDK | 定稿 ProjectAdapter、LanguageAdapter、Capability、InjectorPlugin 介面。 |
| ATM-2-0007 | Default Governance Bundle schema | 定義 WorkItem、TaskStore、ScopeLock、DocumentIndex、ShardStore、ArtifactStore、LogStore、RuleGuard、Evidence/Handoff 等 governance primitives。 |
| ATM-2-0008 | Local governance reference plugins | 建立 upstream 預設 `.atm/` task、lock、doc index、shard、artifact、log、rule guard 與 evidence plugins，讓空白 repo 可獨立運作。 |
| ATM-2-0009 | Artifact / Log / Evidence Store contracts | 定義 ArtifactStore、LogStore、RunReportStore、Markdown/JSON state store 與 ContextSummary，讓 AI 常用 artifacts、log 與 report 可治理與回放。 |
| ATM-2-0010 | Neutrality boundary rule guard | 建立 deterministic + optional semantic 的中立性/邊界守衛，持續攔截 adopter 私有假設回流 upstream。 |
| ATM-2-0011 | Context budget guard | 建立 context budget primitive、budget policy、summary/hard-stop/report contract，讓 ATM 可獨立治理 token/context 預算與摘要節流。 |

### ATM-3：3KLife adapter 導入（downstream-only，需待 self-hosting alpha gate）（5 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-3-0001~0002 | ProjectAdapter wrapper / local config | 把 task-lock、compute-gate、doc-id-registry、encoding 包成 3KLife adapter。 |
| ATM-3-0003~0004 | compute-gate / doc-id / encoding hook | 將上游 ATM validate/police/hash-lock 接回本 repo 的 governance。 |
| ATM-3-0005 | Cocos runtime adapter policy | 明確規定 Cocos Component 是 wrapper/adapter，純公式與 contract 才進 compute atom。 |

### ATM-4：html-to-ucuf reference case study（downstream-only）（6 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-4-0001~0002 | case study plan / regression baseline | 把 H2U 定義為 reference case study，不讓 domain fidelity formula 進 core。 |
| ATM-4-0003~0004 | 第一批低風險 atoms | 抽 normalizeCssColor、parseCssLength、parseFragmentList 等 case atoms。 |
| ATM-4-0005 | injection / rollback dry-run | 只產 patch plan 與 rollback plan，不直接改 legacy。 |
| ATM-4-0006 | H2U / Cocos runtime 邊界 | 明確界定 case study plugin、Cocos wrapper 與 compute atom 的分界。 |

### ATM-5：開源文件、Plugin SDK、alpha release（5 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-5-0001~0002 | Quick Start / API / Adapter Guide | 讓第三方專案可不用懂 3KLife 也能使用與擴充框架。 |
| ATM-5-0003~0004 | Lifecycle / Governance / v0.1 alpha | 建立 semver、breaking change、release checklist 與 npm dry-run 流程。 |
| ATM-5-0005 | Living Spec / PEV Loop | 將 Plan-Execute-Verify-Converge 與輕量 spec drift prompt 寫入開源文件。 |

### ATM-6：生態擴張與後置決策（5 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-6-0001 | Cross-project registry / DB / Vector decision | 決定 DB/vector 是否只做 optional plugin，維持 JSON-first 真相。 |
| ATM-6-0002 | Community RFC / contribution flow | 建立 issue、RFC、PR review 與 maintainer 決策流程。 |
| ATM-6-0003 | 多語言 adapter roadmap | 規劃 Python/C#/Unity/Cocos adapter 的驗證基準與先後順序。 |
| ATM-6-0004~0005 | Performance / Security optional plugins | 規劃 Performance Budget Police、成本控制、Capability Sandbox、審計與 observability 邊界。 |

---

## 執行 Checklist（每張 ATM 卡通用）

### 開工序列
```bash
node tools_node/task-lock.js check  ATM-X-NNNN
node tools_node/task-lock.js lock   ATM-X-NNNN <agent-name> --files <擬動清單>
node tools_node/doc-id-registry.js --assign docs/agent-briefs/tasks/ATM-X-NNNN.md
# 更新任務卡 frontmatter: status=in-progress / started_at / started_by_agent
```

### 進行中（每次儲存後）
```bash
node tools_node/check-encoding-touched.js
node tools_node/atomic-framework/atm-cli.js test   --atom ATM-X-NNNN   # ATM-3-0002 完成後可用
node tools_node/atomic-framework/atm-cli.js police --task ATM-X-NNNN   # ATM-3-0003 完成後可用
```

### 收工序列
```bash
node tools_node/check-encoding-touched.js
node tools_node/check-encoding-integrity.js
node tools_node/compute-gate.js --profile standard --agent-feedback
node tools_node/compute-gate.js --profile atm --agent-feedback    # ATM-3-0003 完成後加入；未完成前不得作為硬 gate
node tools_node/atomic-framework/atm-cli.js lock --atom ATM-X-NNNN --sign   # 變更 atom 且 ATM-2-0004 完成後才簽
node tools_node/finalize-agent-turn.js
node tools_node/task-lock.js unlock ATM-X-NNNN <agent-name>
# 更新任務卡 frontmatter: status=done / completed_at / 補 notes
```

> 若 finalize 失敗：修問題、回到「進行中」階段重跑，**不得 amend**，依 ATM 規範開新 commit。

---

## 不退轉機制（hash lock + regression matrix 落地）

### 要動的具體檔案

1. **hash-lock 基線**：`tools_node/atomic-framework/registry/atomic-registry.json` 每個 atom 加 `hashLock: { specHash, codeHash, testHash }`；`tools_node/lib/atomic-framework/hash-lock.js` 提供 `compute()/verify()/sign()`。`atm-cli lock` 寫入；`atm-cli verify`（CI）對齊。

2. **compute-gate 接入**：`tools_node/compute-gate-config.json` `gates[]` 新增：
   - `atm-police`（failAction=block，呼叫 `atm-cli.js police --all`）
   - `atm-hash-lock`（failAction=block，呼叫 `atm-cli.js verify --all`）

   並在 `profiles` 加 `atm` profile：`["encoding","ts-syntax","task-scope","import-boundary","atm-police","atm-hash-lock"]`。

3. **regression matrix**：`docs/ai_atomic_framework/regression-matrix.md`（人類可讀）+ `tools_node/atomic-framework/registry/regression-matrix.json`（機讀）。每個 atom 列 fixture × expected × known-gap × owner。`run-atom-tests.js` 收尾把結果寫到 `_workbench/atoms/<id>/report.json`，再由 `atm-cli summary` 聚合。

4. **finalize 鈎子**：`tools_node/finalize-agent-turn.js` 增加 `if task.id startsWith "ATM-" then run compute-gate --profile atm`；失敗即 block turn。

5. **import-boundary**：`tools_node/check-import-boundaries.js` 加白名單，允許 `tools_node/lib/**` 與 `tools_node/_atomic_registry/**` 雙向 import；其他模組僅可 import `_atomic_registry/AtomicInterface.js`。

6. **shard 註冊**：`docs/tasks/.shardrc.json` 新增 `{"name":"tasks-atm","title":"ATM Tasks","pattern":"^ATM-"}`；`docs/tasks/tasks-atm.json` 空檔（ATM-0-0001 處理）。

7. **rollback 安全**：`inject-plan.js` 與 `rollback-plan.js` 必須對稱輸出兩份 patch JSON；regression-matrix 在 hash 變更時要求 owner 簽名（`atm-cli lock --sign --by <agent>`）才能更新 baseline，避免「跑紅就改 baseline」。

---

## 風險與防範

| 風險 | 防範 |
|---|---|
| **過度工程化**：框架還沒救到 Legacy 就先變成另一個巨大老系統 | 先 ATM-0~3 做 core + adapter MVP；DB / molecule bundler / 向量索引一律後置到 ATM-6 的 optional plugin 決策；每個框架功能也要原子化（dogfooding） |
| **原子太碎造成性能差** | spec.performanceBudget 限 maxRuntimeMs / allocatedBytes；hot path atom 必跑 p95 measurement；compute atom 禁 async / deep clone |
| **AI 修改超出範圍** | 任務卡 frontmatter 寫死 `allowed_files`；task-lock + check-task-scope 禁止越界；hash-lock 偵測 stable atom 被誤改 |
| **Legacy 行為被破壞** | inject-plan dry-run；regression matrix 防止退轉；location-index 記錄每次注入位置；rollback-plan 對稱輸出 |
| **與 H2U-REFACTOR-0001/0002 衝突**（兩邊都動 draft-builder） | ATM-4 第一批 case atom **明確避開** draft-builder 主邏輯；注入前先產 dry-run plan，通過 baseline 才能 apply |
| **測試 baseline 被修紅就改** | hash-lock baseline 變更需 owner sign；regression-matrix.json 在 git diff 時觸發審查 |

---

## 驗證命令（階段性北極星）

```bash
# 1. 3KLife tracking 結構就位
ls docs/ai_atomic_framework/AI原子框架開發計畫書.md
ls docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md
ls docs/ai_atomic_framework/open-source-extraction-plan.md
ls docs/tasks/tasks-atm.json

# 2. 任務治理與 doc_id 正確
node tools_node/check-task-scope.js --task ATM-0-0001 --verbose
node tools_node/doc-id-registry.js

# 3. 上游 repo skeleton 完成後
npm test
npm run typecheck
npm run lint

# 4. 3KLife adapter 完成後
node tools_node/atomic-framework/atm-cli.js status
node tools_node/compute-gate.js --profile atm --agent-feedback

# 5. H2U case study 開始後
node tools_node/atomic-framework/atm-cli.js test --atom ATM-4-0003
node tools_node/atomic-framework/atm-cli.js police --task ATM-4-0003
```

---

## Critical Files

| 檔案 | 角色 | 動作 |
|---|---|---|
| `docs/agent-briefs/tasks/ATM-{0..6}-NNNN.md` | 47 張任務卡 | 已由 task-card-opener 建立，含 v0.2、Default Governance Bundle 與 Agent Operating Layer 補強卡 |
| `docs/tasks/.shardrc.json` | shard 路由 | 修改（加 tasks-atm）— ATM-0-0001 |
| `docs/tasks/tasks-atm.json` | ATM 任務索引 | 新建 — ATM-0-0001 |
| `docs/遊戲規格文件/系統規格書/名詞定義文件.md` | 系統代號真相 | 修改（加 ATM 條目）— ATM-0-0002 |
| `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md` | 上游開源 roadmap | 修改 — ATM-0-0003 |
| `docs/ai_atomic_framework/AI原子框架開發計畫書.md` | 3KLife downstream adopter plan | 修改 — ATM-0-0004 |
| `docs/ai_atomic_framework/open-source-extraction-plan.md` | 開源拆出 checklist | 新建 — ATM-0-0005 |
| `AI-Atomic-Framework/README.md`、`packages/*`、`schemas/*` | 上游 repo core/package/schema | 由 ATM-1/ATM-2 在新 repo 實作 |
| `tools_node/adapters/atm-3klife/*`、`atm.config.*` | 3KLife ProjectAdapter / local config | 由 ATM-3 實作 |
| `docs/ai_atomic_framework/cocos-runtime-adapter-policy.md` | Cocos runtime adapter 邊界 | 新建 — ATM-3-0005 |
| `docs/ai_atomic_framework/html-to-ucuf-case-study.md` | H2U reference case study | 新建 — ATM-4-0001 |
| `docs/ai_atomic_framework/h2u-regression-matrix.md` | H2U baseline / regression matrix | 新建 — ATM-4-0002 |
| `docs/QUICK_START.md`、`docs/API.md`、`docs/ADAPTER_GUIDE.md` | 上游開源文件 | 由 ATM-5 在新 repo 實作 |
| `docs/ecosystem/*`、`docs/RFC_PROCESS.md` | 生態擴張與 RFC 文件 | 由 ATM-6 在新 repo 實作 |

---

## 執行流程提醒

- 本計畫的第一張卡 **ATM-0-0001**（shard 路由註冊）必須先做完，否則任何 ATM-* 任務卡都無法被 task-card-opener 識別。
- ATM-0-0002（名詞定義新增 ATM prefix）也是啟動條件，缺它 doc-id-registry 會報衝突。
- 47 張卡建議 4 週時間盒：W1=ATM-0+1，W2=ATM-2+3，W3=ATM-4+5，W4=ATM-6 與 v0.1 alpha / optional plugin 決策。
- 每張卡開工前依 CLAUDE.md 硬規則 #0：**check → lock → 改 frontmatter**，不可省略。
- 不允許把 ATM-4 的 case atom 抽取與 H2U-REFACTOR-0001/0002 的 draft-builder 拆檔同時做，避免時序衝突；case study 只能透過 dry-run inject plan 推進。

---

## 附錄 A：與 Roadmap 對應表

本計畫對應 Roadmap 章節：

| Roadmap 章節 | 本計畫對應 |
|---|---|
| §1 問題背景 | Context |
| §2 願景與終局 | 目標 |
| §3 核心設計原則 | 解決問題的原理 |
| §4 核心名詞（Spec/Code/Test/Map/Manager/Registry/Capability/Police） | 目錄結構區 1-3 + ATM-1/2 |
| §5 五層結構（Atom/Molecule/Organism/Template/Page） | 區 1 manager/ + atomic-map |
| §6-7 框架自舉 + Genesis Bootstrap | ATM-0 + ATM-1 |
| §8 Phase 0-7 里程碑 | ATM-0 ~ ATM-7（已映射） |
| §9 任務卡模板 | ATM-0-0006 |
| §10 AI Prompt 模板 | manager/scaffold-atom 子任務 |
| §11-12 修改/注入流程 | 執行 Checklist + 不退轉機制 |
| §13 不退轉機制 | hash-lock + regression-matrix + finalize 鈎子 |
| §14 檔案結構 | 目錄結構規劃（四區） |
| §15 對 html-to-ucuf 的具體救援 | ATM-3 + ATM-6 |
| §16 工具選型 | 相容性分析 #1 校正（Node + AJV） |
| §17 不人工寫 code 運作方式 | 執行 Checklist |
| §18 風險與防範 | 風險與防範 |
| §19 最小可行路線圖 | ATM-0~3 W1-W2 + ATM-4~6 W3-W4 |

---

## 附錄 B：未在本計畫範圍內的事項（明確排除）

1. **不追 95% pixel parity**：本計畫不負責 PROG-2-0007 的 95% 收斂。ATM 只負責建立可驗證的「替換管道」，分數本身由 PROG-2-* / H2U-* 卡負責。
2. **不重寫 draft-builder.js 主幹**：H2U-REFACTOR-0001 已負責拆檔，ATM-3 只抽純 helper（normalizeRect / parsePx / html-parser.js），不動主幹邏輯。
3. **不引入 PostgreSQL / pgvector / LangGraph / Mastra**：ATM-7-0002 才討論，前期僅 JSON registry。
4. **不上 TS 改寫**：tools_node 維持 CommonJS Node.js，不跟著 Roadmap 用 TS。
5. **不直接讓 AI 改 Legacy**：所有 Legacy 修改必須走 inject-plan.js 產 patch，由人/特定 ATM 卡 apply。
