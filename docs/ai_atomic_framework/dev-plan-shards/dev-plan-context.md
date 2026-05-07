# AI 原子框架開發計畫書 — Context 與分工決策

> 這是 `AI原子框架開發計畫書.md` 的「Context 與分工決策」分片。完整索引見 `docs/ai_atomic_framework/AI原子框架開發計畫書.md`。

<!-- doc_id: doc_other_0028 -->
# AI 原子框架（ATM）開發計畫書

> 版本：v0.3 · 瘦身再開工 / 3KLife downstream adopter plan（對齊 upstream `https://github.com/eaglhuang/AI-Atomic-Framework`）
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

本計畫正式採用 `upstream self-hosting first`。在上游 `AI-Atomic-Framework` 先完成 standalone 自舉、通過 self-hosting alpha0 gate 以前，3KLife 只能扮演 tracking repo 與 downstream adopter 規劃場，不得充當上游開發前提。

硬規則如下：

1. 上游 repo 開發時不得使用 3KLife 內部工具腳本，例如 `task-lock`、`compute-gate`、`doc-id-registry`、`shard-manager`。
2. 上游 `packages/core`、reference plugins 與 protected surfaces（README / AGENTS / docs / examples / templates）不得帶入 3KLife、Cocos、html-to-ucuf 或其他 adopter 私有資訊。
3. 第一輪 smoke 必須在 standalone upstream repo 完成；AI agent 只讀 README / AGENTS / `.atm/profile` 即可完成 first task、scope lock、artifact/log/evidence 與 first atom 驗證。
4. 只有通過 self-hosting alpha0 gate，才允許進入 3KLife ProjectAdapter shadow mode、Cocos runtime adapter 與 html-to-ucuf dry-run case study。

因此，ATM-1 與 ATM-2 的首要責任是上游自舉、文件中立性與 boundary guard；ATM-3 與 ATM-4 則一律視為 downstream-only phase。

---

## 2026-05-06 瘦身再開工補強決策

ATM 規劃不放棄完整治理生態，但第一個成功標準必須瘦身：先證明空白 repo 可跑通一顆 hello-world atom，再讓 3KLife 以 adapter shadow mode 驗證一顆低風險 helper atom 不退轉。完整 Default Governance Bundle、multi-agent confidence、H2U case study 與 OSS 生態文件都不能反過來阻塞 alpha0。

### 文件真相收斂

先建立 active / companion / historical 三態，不再讓多份 plan 並列漂移：

| 狀態 | 文件 | 規則 |
|---|---|---|
| active | 本文件、`open-source-extraction-plan.md`、`upstream-versioning-policy.md`、`3klife-consumption-roadmap.md`、`3klife-coexistence-plan.md`、`3klife-tooling-fate.md`、`multi-agent-compatibility-matrix.md`、`ATM_cross_reference.md` | 只從這些文件讀取當前執行規則；若新增決策，先補 active 文件。 |
| companion | `AI_Atomic_Framework_Optimized_Roadmap_v0.2.md` | 保留為務實化分析來源；只透過本文件採納矩陣轉成 active 規則。 |
| historical | `AI_Atomic_Framework_Roadmap.md` 與未被 active 採納的早期 plan2/3/4/5 敘事 | 只能當背景與理論來源，不得直接作為開工準則。 |

任務數以可機器驗證的現況為準：ATM Markdown 任務卡目前為 71 張（ATM-0 14 / ATM-1 10 / ATM-1.5 3 / ATM-2 12 / ATM-2.5 3 / ATM-3 13 / ATM-4 6 / ATM-5 5 / ATM-6 5），`docs/tasks/tasks-atm.json` 已於 ATM-0-0013 收斂為 thin index，完整內容移至 `docs/tasks/tasks-atm/tasks-atm-part-*.json`；後續只以 thin index summary + part shards 作為規劃真相。舊文中的 47 / 53 / 69 都視為歷史快照，不再作為規劃真相。

名詞修正：`D2 / D3` 是 `ATM_cross_reference.md` 的文件路由 Domain，不是開發 phase；`ATM-7` 僅代表 DB/vector/advanced orchestrator 類的未開卡後置討論，不屬於本輪 alpha0/alpha1 任務 shard。

### alpha0 / alpha1 拆分

| Gate | 目標 | 必備內容 | 明確排除 |
|---|---|---|---|
| alpha0 | 空白 repo 跑通 hello-world atom，並留下最小治理證據 | AtomicSpec schema、Registry schema、HashLock、CLI `init/status/validate`、hello-world atom、最小 WorkItem / ScopeLock / Artifact / Evidence / ContextSummary、deterministic profile check | 完整 Default Governance Bundle、全部 reference plugins、multi-agent hard gate、H2U legacy injection、observability/security optional plugins |
| alpha1 | 在 alpha0 成功後補齊官方預設治理體驗 | Default Governance Bundle reference plugins、Agent Operating Layer 完整化、context budget/encoding/rule/evidence plugins、adapter report、release checklist、multi-agent confidence report | 仍不得直接替換 3KLife 既有 CLI 或改 H2U legacy 主幹 |

核心 JSON schema 必須先補齊：AtomicSpec、Registry、WorkItem、ScopeLock、Artifact/Evidence、ContextSummary、AdapterReport。schema 未定稿前不得先實作大型 plugin。

### gate 與 adapter 降風險規則

- Multi-agent 驗證在 alpha0 只做 confidence gate，不作 release 阻擋；alpha0 阻擋條件只保留 deterministic profile check、schema validation、hash-lock、hello-world atom smoke 與最小 task/lock/evidence。
- 3KLife adapter 全部走 shadow / parity test；第一輪只讀既有 `task-lock`、`compute-gate`、`doc-id-registry`、shard 與 evidence 結果，不直接替換 CLI 行為。
- OSS 實務文件補齊但不阻塞 alpha0：provenance、secrets scan、release owner、package naming、threat model、cost budget、observability event taxonomy。
- H2U case study 僅在 self-hosting alpha0 全綠後啟動；第一輪只允許 dry-run injection + rollback plan，不 apply patch、不替換 legacy runtime。

### Current Gate & Alpha0 Critical Path

當前狀態：ATM-0（governance bootstrap）11/14 done → **下一階段 ATM-1（upstream skeleton）**。

Alpha0 exit 需通過的最長依賴鏈（~10 關鍵卡）：

1. `ATM-1-0001` Product charter & README
2. `ATM-1-0002` Monorepo skeleton
3. `ATM-1-0003` AtomicSpec / Registry schema v0.1
4. `ATM-1-0006` CLI `init/status/validate` 空殼
5. `ATM-1-0007` hello-world atom fixture + hash-lock
6. `ATM-1.5-0001` Seed-as-Spec（seed 以自身格式描述自己）
7. `ATM-1.5-0002` Seed 自我驗證（第一份 atomic-registry.json）
8. `ATM-2-0001` Spec loader/parser（供 Manager/Registry/Police 用）
9. `ATM-2.5-0001` Self-hosting alpha gate CLI（`atm self-host-alpha --verify`）
10. `ATM-2.5-0002` Sandbox repo fixture：空白 repo 跑完整 alpha gate

並行支線（亦為 ATM-2.5-0001 前置）：`ATM-2-0004`（Registry Manager）、`ATM-2-0005`（Police / Regression）、`ATM-2-0012`（neutralityScanner）。

**被 alpha0 阻塞的所有下游**：ATM-3（3KLife adapter）、ATM-4（H2U case study）、ATM-5（OSS docs/release）、ATM-6（ecosystem）一律等 ATM-2.5-0002 pass 後才可開工。

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
| Default Governance Bundle | 採納但移到 alpha1；ATM 不能只剩 atom runner，需有通用 task/index/shard/artifact/log/rule/evidence 預設套件，但不得阻塞 alpha0 hello-world proof，也不得進 core hard dependency | ATM-0-0009、ATM-2-0007、ATM-2-0008、ATM-2-0009 |
| Self-hosting alpha0 / docs neutrality / boundary guard | 採納；先在 standalone upstream repo 通過 alpha0 deterministic gate，再以 docs neutrality audit 與 rule guard 持續防止 adopter 私有資訊回流 | ATM-1-0009、ATM-1-0010、ATM-2-0010 |
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
| Context budget / summary governance | `check-context-budget.js`、`generate-context-summary.js`、`report-turn-usage.js` | 已有 context budget guard、summary 與用量報告工具 | `plugin-context-budget` + `ContextBudgetAdapter` | **直接採納治理語義、降級宿主數值**：upstream 定義 budget policy、summary/hard-stop/report contract；3KLife 閾值與 keep 規則只留 adapter。2026-05-08 已先落地最小切片：`ContextBudgetGuard` contract、default policy seed、report/summary contract。 |
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
