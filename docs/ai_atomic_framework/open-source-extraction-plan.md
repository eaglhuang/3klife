<!-- doc_id: doc_other_0030 -->
# AI Atomic Framework 開源拆出計畫

> 目標 repo：`https://github.com/eaglhuang/AI-Atomic-Framework`
> 本文件用途：把 3KLife 內的 ATM 規劃拆成「上游開源框架」與「3KLife adapter / case study」兩條線，避免 core framework 與本專案治理工具耦合。

---

## 1. 拆分原則

### 1.1 Core 必須保持獨立

上游 `AI-Atomic-Framework` 不得引用：

- 3KLife 專案路徑或任務卡 ID 規則。
- `tools_node/task-lock.js`、`compute-gate.js`、`doc-id-registry.js`。
- Cocos Creator、html-to-ucuf、gacha-ds3、draft-builder 等 domain 細節。
- 任一 LLM provider、DB、browser automation、遊戲引擎作為必備依賴。

Core 只定義契約、流程與 plugin interface。ATM upstream 另外提供 Agent Operating Layer 與 Default Governance Bundle 作為官方預設體驗，但這些仍是可替換的 bootstrap/profile/plugin，不可被 `packages/core` 直接 import。

本計畫另加四條 hard gate：

- 上游 repo 開發時不得使用 3KLife 內部工具腳本，例如 `task-lock`、`compute-gate`、`doc-id-registry`、`shard-manager`。
- 上游 `packages/core`、reference plugins 與 protected surfaces（README / AGENTS / docs / examples / templates）不得 import、shell out、copy、mirror 3KLife 私有實作，也不得把 3KLife、Cocos、html-to-ucuf 寫成前提敘事。
- 第一輪 smoke 與 first atom proof 必須在 standalone upstream repo 完成，不得先靠 3KLife 做成功示範。
- 3KLife 只能在 Phase C 起作為 downstream adapter 驗證場，不得回頭充當 Phase B 以前的上游前提。

### 1.1.1 v0.2 MVP 邊界

開源拆出採納 v0.2 的務實化方向：先交付能在空白 repo 跑通的最小 core，再逐步接 adapter 與 case study。

- v0.1 alpha 必備：Atomic Spec schema、CLI `init/status/validate`、JSON Registry、HashLock、basic Police、Plugin SDK、Agent Operating Layer、Default Governance Bundle、LocalGitAdapter、JS/TS LanguageAdapter、hello-world example。
- v0.1 alpha 不必備：LangGraph / Atomic Agents / PR-Agent / pgvector / OpenTelemetry / Prometheus / Deno sandbox / full Living Spec sync。
- optional plugin 必須獨立成 package，命名以 `adapter-*` 或 `plugin-*` 表示，不可被 `packages/core` import。
- 所有 first implementation 工具選型，例如 TypeScript、Zod、Vitest、Commander、ts-morph，都只能寫成推薦，不得寫成 Atomic Spec 的語義前提。

### 1.1.2 Default Governance Bundle 邊界

ATM 不能只交付 atom runner；開源 repo 必須自帶一套不依賴 3KLife 的預設治理套件，讓空白 repo 也能完成 task、scope lock、doc index、shard、rule guard、encoding、context budget 與 evidence workflow。

| 能力 | upstream 預設套件 | reference layout |
|---|---|---|
| work item / task card | `packages/plugin-task-cards` | `.atm/tasks/*.md`、`.atm/tasks/tasks.json` |
| scope lock | `packages/adapter-local-fs-git` | `.atm/locks/*.json` |
| document index | `packages/plugin-doc-index` | `.atm/index/*.json` |
| large file shard | `packages/plugin-doc-shard` | `.atm/shards/*.json` |
| Markdown / JSON state file | `packages/plugin-state-files` | `.atm/state/*.md`、`.atm/state/*.json` |
| artifact / generated output | `packages/plugin-artifacts` | `.atm/artifacts/*.json`、`.atm/artifacts/files/*` |
| system log / run log | `packages/plugin-logs` | `.atm/logs/*.json`、`.atm/logs/snapshots/*` |
| rule guard / gate result | `packages/plugin-rule-guard` | `.atm/rules/*.json`、`.atm/reports/*.json` |
| encoding guard | `packages/plugin-encoding` | `.atm/reports/encoding/*.json` |
| context budget / summarization guard | `packages/plugin-context-budget` | `.atm/reports/context-budget/*.json`、`.atm/state/context-summary/*.md` |
| validation evidence / handoff | `packages/plugin-task-cards` 或 `packages/plugin-evidence` | `.atm/evidence/*.json` |

這些套件是官方 default profile，可由 host project 替換成 GitHub Issues、Jira、Linear、Notion、3KLife 或其他 adapter。`packages/core` 只依賴 governance contracts，不依賴任何 default plugin 實作。

其中 `plugin-rule-guard`、`plugin-encoding` 與 `plugin-context-budget` 構成最小 Agent Governance Bundle：

- `plugin-rule-guard` 處理 protected surfaces、boundary 與 policy 型檢查。
- `plugin-encoding` 處理 UTF-8 / BOM / replacement char / mojibake 類完整性。
- `plugin-context-budget` 處理重量文件、圖片、log、artifact 的 budget policy、summarize 與 hard-stop。

### 1.1.3 Agent Operating Layer

ATM 的開源交付目標是「root-drop 可啟動」：使用者把 ATM 放在專案根目錄後，任意 AI agent 只要讀 README / AGENTS / `.atm/profile`，就能知道如何初始化、掃描專案、建立第一張 task、鎖定 scope、保存 artifacts/logs/evidence 並跑 default guards。

| 能力 | upstream 交付 | 目的 |
|---|---|---|
| model-neutral instructions | `README.md`、`AGENTS.md` template、`.atm/AGENTS.md` | 不綁 Copilot / Claude / OpenAI / IDE |
| project probe | `atm init --adopt` / `atm probe` | 偵測語言、套件管理器、測試命令、文件位置與可用 adapter |
| default profile | `.atm/profile.json` | 啟用 task / lock / index / shard / artifact / log / rule / encoding / context-budget / evidence 預設流程 |
| auto first task | `atm task create --from-agent-goal` 或 README 工作流 | 讓 AI 在開始寫功能前自動開卡 |
| run envelope | `atm run --task <id>` 或 agent prompt recipe | 包住 Plan → Execute → Verify → Converge 的固定節奏 |

### 1.1.4 Self-Hosting Alpha Gate

在進入任何 downstream adapter 或 case study 之前，上游必須先通過 standalone self-hosting alpha gate。最低驗收如下：

1. 在空白 repo 或 sandbox repo 中，AI agent 只讀 README / AGENTS / `.atm/profile` 即可完成 `atm init --adopt` 或等效 bootstrap。
2. 可建立第一張 task、鎖定 scope、寫入 state、保存 artifact / log / evidence。
3. 可在不依賴 3KLife 工具、Cocos 或 html-to-ucuf 的前提下，完成第一顆 atom 的 smoke validation。
4. alpha gate 未通過前，不得開始 3KLife ProjectAdapter、Cocos runtime adapter 或 html-to-ucuf case study。

### 1.1.5 Docs Neutrality / Boundary Guard

除了設計原則，ATM upstream 還需要一個持續執行的 neutrality / boundary guard：

- deterministic 規則：掃 `source / docs / examples / templates / prompt assets` 中的 protected surfaces、banned terms、硬編碼路徑與 host-specific 命名。
- optional semantic audit：用來標記隱性耦合敘事、stale example、類 dead-doc；它只產生 `warn` / `needs-review`，不單獨充當 hard fail 裁決。
- source dead code 仍以靜態分析器與 import graph 為主；LLM 只補語意與文件漂移檢查，不取代確定性檢查。

### 1.1.6 Context Budget Guard

`context budget` 應被提升為 upstream governance primitive，而不是只存在於某個宿主專案的 keep 或 prompt 習慣。

最低要求：

1. 能對重量文件、批次圖片、長篇 log、compare board 與大型 artifact 定義 budget policy。
2. 能在超額時輸出 `pass`、`summarize-before-continue`、`hard-stop` 三類決策之一。
3. 能保存報告與摘要，例如 `.atm/reports/context-budget/*.json`、`.atm/state/context-summary/*.md`。
4. host project 可透過 adapter 覆寫閾值，但不得把 3KLife 私有 token 規則直接寫死進 upstream default profile。

### 1.2 Adapter 承接所有宿主差異

3KLife 的治理能力必須以 adapter 呈現：

| 3KLife 能力 | ATM adapter 介面 |
|---|---|
| task-card-opener / ATM task shard | `TaskAdapter.create / update / list` |
| task-lock | `LockAdapter.check / lock / unlock / validateScope` |
| compute-gate | `GateAdapter.run` |
| doc-id-registry | `DocumentIndexAdapter.assignId / resolve / rebuild` |
| shard-manager | `ShardAdapter.split / rebuildIndex / validate` |
| artifacts / turn artifacts | `ArtifactAdapter.put / index / summarize` |
| project log / browser / editor logs | `LogAdapter.snapshot / query / summarize` |
| Markdown / JSON state files | `StateFileAdapter.read / write / validate` |
| task-scope / import-boundary | `RuleGuardAdapter.run` |
| encoding-touched | `EncodingAdapter.validate` |
| check-context-budget / summary / turn-usage | `ContextBudgetAdapter.measure / summarize / enforce` |
| html-to-ucuf regression | `RegressionPlugin.runSuite` |
| Cocos / browser capture | `CapabilityPlugin` 或 domain adapter |

---

## 2. 新 repo 建議結構

```text
AI-Atomic-Framework/
	packages/
		core/
		cli/
		plugin-sdk/
		plugin-task-cards/
		plugin-doc-index/
		plugin-doc-shard/
		plugin-state-files/
		plugin-artifacts/
		plugin-logs/
		plugin-rule-guard/
		plugin-encoding/
		plugin-context-budget/
		adapter-local-fs-git/
		agent-bootstrap/
		adapter-local-git/
		language-js/
	schemas/
	templates/
	examples/
		hello-world/
		governance-standalone/
		agent-bootstrap/
		molecule-pipeline/
		legacy-strangler-minimal/
	docs/
		QUICK_START.md
		ARCHITECTURE.md
		SPEC_GUIDE.md
		ADAPTER_GUIDE.md
		PLUGIN_SDK.md
		MIGRATION.md
		LIFECYCLE.md
	LICENSE
	CONTRIBUTING.md
	CHANGELOG.md
```

第一版可用 TypeScript / Node CLI 實作，但 spec、adapter protocol 與 registry schema 必須保持語言無關。

---

## 3. 拆出階段

### Phase A：文件解耦

1. 將 `AI_Atomic_Framework_Roadmap.md` 改成上游開源 Roadmap。
2. 將 `AI原子框架開發計畫書.md` 改成 3KLife adopter plan。
3. 新增本文件作為 extraction checklist。
4. 開立 ATM 任務卡與 `tasks-atm.json` shard。
5. 新增 self-hosting alpha、docs neutrality audit、neutrality/boundary guard 與 context budget guard 後續任務。

驗收：Roadmap 核心章節不再把 3KLife / Cocos / html-to-ucf 當作 core 前提；tracking docs 與未來 upstream docs 的邊界清楚分離。

### Phase B：上游 repo skeleton

1. 在 `https://github.com/eaglhuang/AI-Atomic-Framework` 建立 package metadata。
2. 建立 `packages/core`、`packages/cli`、`packages/plugin-sdk`。
3. 建立 `schemas/atomic-spec.schema.json` 與 positive / negative fixtures。
4. 建立 CLI：`init`、`status`、`validate`。
5. 建立 Agent Operating Layer：README / AGENTS template、project probe、default profile、auto first task workflow。
6. 建立 Default Governance Bundle：task cards、scope lock、doc index、shard、Markdown/JSON state file、artifact/log store、rule guard、encoding、context budget、evidence reference plugins。
7. 建立 `adapter-local-fs-git` / `adapter-local-git` 作為無宿主治理系統時的 fallback adapter。
8. 執行 self-hosting alpha proof、upstream docs neutrality audit、neutrality/boundary guard smoke 與 context budget smoke。

驗收：空白 repo 可以初始化 ATM，建立 `.atm/` governance layout，AI agent 依 README/AGENTS 開一張 task、鎖定 scope、建立 doc index、保存 artifact/log/evidence、跑 rule guard，並 validate hello-world atom；README / AGENTS / docs / examples / templates 不再夾帶 adopter 私有資訊，且 context budget guard 可對超額情境輸出 summarize 或 hard-stop。

### Phase C：3KLife adapter

只有在 Phase B self-hosting alpha gate、docs neutrality audit 與 neutrality/boundary guard 全綠後，才允許開始 Phase C。

1. 在 3KLife 建立 `tools_node/adapters/atm-3klife/`。
2. 實作 3KLife governance adapter：task-card-opener、task-lock、compute-gate、doc-id、shard-manager、task-scope、import-boundary、encoding、context-budget。
3. 建立 3KLife local `atm.config.*`，指向上游 package 與本地 workbench。
4. 驗證同一份 atom spec 可在 standalone mode 與 3KLife adapter mode 通過。

驗收：3KLife 不 fork core，只以 adapter 消費上游 repo。

### Phase D：Reference case study

1. 將 html-to-ucuf legacy strangler 定義成 case study。
2. 建立 baseline / regression matrix / known gap plugin。
3. 抽第一批低風險 atom：normalizeCssColor、parseCssLength、parseFragmentList。
4. 透過 injection plan / rollback plan 演練，不直接手寫 legacy 修改。

驗收：至少一個 legacy call site 透過 adapter 呼叫 stable atom，self-test 不退轉。

---

## 4. 開源發布清單

- `README.md`：一句話定位、Quick Start、使用場景、非目標。
- `LICENSE`：core 建議 MIT。
- `CONTRIBUTING.md`：禁止 domain-specific logic 進 core。
- `docs/ADAPTER_GUIDE.md`：如何實作 ProjectAdapter / LanguageAdapter。
- `docs/PLUGIN_SDK.md`：Police / Capability / Injector plugin API。
- `docs/LIFECYCLE.md`：spec versioning、deprecation、semver。
- `examples/hello-world`：最小 compute atom。
- `examples/legacy-strangler-minimal`：不含 3KLife 私有路徑的最小 legacy 接管例。

---

## 5. 3KLife 回同步策略

1. 早期使用 Git dependency 或 `npm link` 導入上游 repo。
2. 上游 core 的 breaking change 必須先更新 adapter compatibility matrix。
3. 3KLife case study 的改善若具通用性，回提 upstream PR；若帶 domain 假設，只留在 3KLife adapter。
4. 每次升級 upstream package 後，必須跑 3KLife adapter gate 與 html-to-ucuf smoke regression。
