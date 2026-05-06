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

- alpha0 必備：Atomic Spec schema、Registry schema、HashLock、CLI `init/status/validate`、hello-world atom、最小 WorkItem / ScopeLock / Artifact / Evidence / ContextSummary schema、basic deterministic Police、LocalGitAdapter、JS/TS LanguageAdapter、最小 task/lock/evidence smoke。
- alpha0 不必備：完整 Default Governance Bundle、完整 Agent Operating Layer、LangGraph / Atomic Agents / PR-Agent / pgvector / OpenTelemetry / Prometheus / Deno sandbox / full Living Spec sync、multi-agent hard gate、H2U case study。
- alpha1 補齊：Default Governance Bundle reference plugins、Agent Operating Layer 完整 root-drop workflow、context budget / encoding / rule / evidence plugins、AdapterReport schema、multi-agent confidence report、release checklist。
- optional plugin 必須獨立成 package，命名以 `adapter-*` 或 `plugin-*` 表示，不可被 `packages/core` import。
- 所有 first implementation 工具選型，例如 TypeScript、Zod、Vitest、Commander、ts-morph，都只能寫成推薦，不得寫成 Atomic Spec 的語義前提。

alpha0 的唯一北極星是：空白 repo 可跑通 hello-world atom，並留下最小 task / lock / artifact / evidence / context summary；3KLife 只能在 alpha0 全綠後以 shadow adapter 驗證一顆低風險 helper atom，不直接替換既有 CLI 行為。

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

### 1.1.4 Self-Hosting Alpha0 Gate

在進入任何 downstream adapter 或 case study 之前，上游必須先通過 standalone self-hosting alpha0 deterministic gate。最低驗收如下：

1. 在空白 repo 或 sandbox repo 中，AI agent 只讀 README / AGENTS / `.atm/profile` 即可完成 `atm init --adopt` 或等效 bootstrap。
2. 可建立第一張 task、鎖定 scope、寫入 state、保存 artifact / log / evidence。
3. 可在不依賴 3KLife 工具、Cocos 或 html-to-ucuf 的前提下，完成第一顆 atom 的 smoke validation。
4. alpha0 deterministic gate 未通過前，不得開始 3KLife ProjectAdapter shadow mode、Cocos runtime adapter 或 html-to-ucuf dry-run case study。

### 1.1.5 Docs Neutrality / Boundary Guard

除了設計原則，ATM upstream 還需要一個持續執行的 neutrality / boundary guard：

- deterministic 規則：掃 `source / docs / examples / templates / prompt assets` 中的 protected surfaces、banned terms、硬編碼路徑與 host-specific 命名。
- optional semantic audit：用來標記隱性耦合敘事、stale example、類 dead-doc；它只產生 `warn` / `needs-review`，不單獨充當 hard fail 裁決。
- source dead code 仍以靜態分析器與 import graph 為主；LLM 只補語意與文件漂移檢查，不取代確定性檢查。

### 1.1.5.1 Neutrality Scanner 落地細節

§1.1.5 的 neutrality / boundary guard 必須具現為 **可機器執行的工具**，作為上游第一個正式 atom（規劃為 `ATM-CORE-0003 = neutralityScanner`）。落地形式：

1. **`packages/plugin-rule-guard/neutrality-scanner.{ts,js}`**
   - 黑名單詞（必擋）：`3KLife`, `Cocos`, `cocos-creator`, `html-to-ucuf`, `gacha`, `UCUF`, `draft-builder`, `eaglhuang/3KLife`
   - 黑名單路徑（必擋）：`tools_node/`, `assets/scripts/`, `docs/agent-briefs/`, 任何中文檔名
   - 掃描範圍：`packages/core/`, `packages/cli/`, `packages/plugin-*/`, `schemas/`, `templates/`, `examples/`, `docs/`
   - 輸出：JSON report，列出每個違規檔案 + line + matched term

2. **`.github/workflows/neutrality.yml`**
   - 觸發：每次 PR 與 push to main
   - 行為：跑 neutrality-scanner，失敗即 block merge
   - PR comment 自動標出違規行

3. **與 §1.1.5 的關係**
   - §1.1.5 的「optional semantic audit」（LLM 補檢）為 `warn` / `needs-review`，不阻擋 PR
   - 本工具的「deterministic 黑名單」是 `block`，必須通過

對應任務：上游 `ATM-2-0012 neutralityScanner atom + CI`（將在 `AI原子框架開發計畫書.md` 補入）。

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

### 2.1 Monorepo Toolchain：pnpm + Turborepo（alpha 預設）

§2 列出 16 個 packages 一定要 monorepo workspace。經比較選定 **pnpm + Turborepo** 為 alpha 預設工具鏈：

| 工具 | Pros | Cons | 對 ATM 適配度 |
|---|---|---|---|
| **pnpm + Turborepo** ✅ | 強符號連結、incremental build、cache 跨 CI、原生 monorepo | 需學習 Turbo config | **alpha 採用** |
| npm workspaces | 零工具依賴 | 無 build cache、跨 package script orchestration 弱 | 太陽春 |
| Yarn 4 + Nx | 強 task graph | 工具鏈龐大、學習曲線陡 | 過度工程 |
| Lerna + npm | 老牌穩定 | Lerna 已邊緣化 | 不推薦 |

**鎖定文件**：上游 repo `ATM-1-0001` 任務必須建立 `pnpm-workspace.yaml` + `turbo.json` 為 Phase B0 初始化前置。

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'examples/*'
```

```jsonc
// turbo.json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "test":  { "dependsOn": ["build"] },
    "atm:police":     { "cache": false },
    "atm:hash-lock":  { "cache": false },
    "atm:neutrality": { "cache": false }
  }
}
```

**升級策略**：beta 階段（v0.5+）若需更強 task graph，可考慮升 Nx；但不在 alpha 範圍。

---

## 3. 拆出階段

### Phase A：文件解耦

1. 將 `AI_Atomic_Framework_Roadmap.md` 改成上游開源 Roadmap。
2. 將 `AI原子框架開發計畫書.md` 改成 3KLife adopter plan。
3. 新增本文件作為 extraction checklist。
4. 開立 ATM 任務卡與 `tasks-atm.json` thin index / `tasks-atm-part-*.json` 分片。
5. 新增 self-hosting alpha、docs neutrality audit、neutrality/boundary guard 與 context budget guard 後續任務。

驗收：Roadmap 核心章節不再把 3KLife / Cocos / html-to-ucf 當作 core 前提；tracking docs 與未來 upstream docs 的邊界清楚分離。

### Phase B 預備：B0 / B1 / B2 / B3 Sub-phasing

Phase B 不能一次完成「core + cli + plugin-sdk + 11 plugins + Agent Operating Layer + Default Governance Bundle」— 因為 AI 寫第一行 code 時沒有 spec / hash-lock / police 可治理它（dogfooding bootstrap paradox）。Phase B 依此拆為四個 sub-phase：

| Sub-phase | 名稱 | 內容 | LOC 上限 | Gate |
|---|---|---|---|---|
| **B0** | Hand-written Seed | 純手寫 `packages/core/seed.{ts,js}`：minimum spec parser + hash-lock util + 1 個 fixture runner。**不受 ATM 治理**，明確標 `// ATM-SEED: hand-written, ungoverned, ~300 LOC max`。 | 300 | seed self-test pass |
| **B1** | Seed Dogfoods Itself | seed 用自己的 spec 格式描述自己（`atom-seed-spec.json`），跑 self-validation；產出第一份 `atomic-registry.json`，內含 `ATM-CORE-0001 = seed itself`。 | +200 | `atm verify --self` 通過 |
| **B2** | Alpha0 Minimal Core | CLI `init/status/validate`、AtomicSpec / Registry / HashLock、hello-world atom、最小 WorkItem / ScopeLock / Artifact / Evidence / ContextSummary、deterministic profile check；seed 被「ATM-CORE-0002 = treated as governed atom」收編，舊 seed code 標 `@deprecated`。 | +1500 | hello-world example + minimal evidence pass |
| **B3** | Self-Hosting Alpha0 Gate | 在空白 sandbox repo 跑 alpha0 deterministic criteria，全部出 boolean PASS；multi-agent 只產 confidence report，不作 alpha0 hard fail。 | (validation only) | `atm self-host-alpha --verify --deterministic` 全綠 |

**Gate 是序列性的**：B1 不過不能進 B2；B2 不過不能進 B3；B3 不過不能進 Phase C。完整 Default Governance Bundle 其他 plugins 移到 alpha1，不再阻塞 alpha0。

對應 ATM 任務卡（在 `AI原子框架開發計畫書.md` 中拆 ATM-1 / ATM-2 為四個階段）：
- ATM-1（B0）：seed parser / seed hash-lock / seed self-test（3 卡）
- ATM-1.5（B1）：seed-as-spec / self-validation / ATM-CORE-0001 註冊（3 卡）
- ATM-2（B2 alpha0）：ATM-2-0001~0006 + ATM-2-0012 neutralityScanner；ATM-2-0007~0009/0011 先完成 schema-first 草案，但 reference plugins 進 alpha1
- ATM-2.5（B3 alpha0 gate）：sandbox alpha gate fixture / self-host-alpha deterministic verify CLI；multi-agent compatibility 降為 confidence report

### Phase B：上游 repo skeleton

1. 在 `https://github.com/eaglhuang/AI-Atomic-Framework` 建立 package metadata。
2. 建立 `packages/core`、`packages/cli`、`packages/plugin-sdk`。
3. 建立 `schemas/atomic-spec.schema.json` 與 positive / negative fixtures。
4. 建立 CLI：`init`、`status`、`validate`。
5. alpha0 只建立 Agent Operating Layer 的最小入口：README / AGENTS template、project probe、default profile 與 hello-world first task recipe。
6. alpha1 才建立完整 Default Governance Bundle：task cards、scope lock、doc index、shard、Markdown/JSON state file、artifact/log store、rule guard、encoding、context budget、evidence reference plugins。
7. 建立 `adapter-local-fs-git` / `adapter-local-git` 作為無宿主治理系統時的 fallback adapter。
8. 執行 self-hosting alpha0 proof、upstream docs neutrality audit、neutrality/boundary guard smoke 與 context budget smoke。

驗收：空白 repo 可以初始化 ATM，建立 `.atm/` governance layout，AI agent 依 README/AGENTS 開一張 task、鎖定 scope、建立 doc index、保存 artifact/log/evidence、跑 rule guard，並 validate hello-world atom；README / AGENTS / docs / examples / templates 不再夾帶 adopter 私有資訊，且 context budget guard 可對超額情境輸出 summarize 或 hard-stop。

### Phase C：3KLife adapter

只有在 Phase B self-hosting alpha0 deterministic gate、docs neutrality audit 與 neutrality/boundary guard 全綠後，才允許開始 Phase C。

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
- `docs/LIFECYCLE.md`：spec versioning、deprecation、semver（詳見 [`upstream-versioning-policy.md`](upstream-versioning-policy.md)）。
- `examples/hello-world`：最小 compute atom。
- `examples/legacy-strangler-minimal`：不含 3KLife 私有路徑的最小 legacy 接管例。

### 4.1 Examples 驗收矩陣

每個 example 必滿足明確的驗收標準（不只「能 run」），CI 跑 `verify.sh` + `expected-output.json` diff = 0 才綠：

| Example | LOC 上限 | 跑完秒數 | 必涵蓋 case | AI 完成步驟（無人工介入） |
|---|---|---|---|---|
| hello-world | 100 | < 5s | 1 atom + 5 fixtures + 2 negative + hashLock sign | 讀 README → `atm init` → `atm test` → green |
| governance-standalone | 300 | < 10s | task-lock + scope-check + encoding + context-budget all green | 讀 AGENTS.md → 開 1 task → lock → finalize |
| agent-bootstrap | 200 | < 8s | AI 只讀 `.atm/profile` 完成 init/adopt | 不需 README，profile-only |
| molecule-pipeline | 400 | < 15s | 3 atoms 串成 molecule，DAG 執行 | 讀 ARCHITECTURE → run pipeline |
| legacy-strangler-minimal | 500（含 mock legacy 50 LOC）| < 20s | 1 atom 替換 1 legacy call site，rollback 來回 | 讀 MIGRATION → inject → verify → rollback |

每個 example 必含 `verify.sh`（跑驗收命令）與 `expected-output.json`（diff = 0 條件）。

### 4.2 Open-source Operations 完整清單

§4 列的是基本 docs，但完整 OSS 治理還需以下檔案（由 ATM-5 任務卡建立）：

- `SECURITY.md`：CVE 通報 email、24/72/168h 回應 SLA、PGP key
- `CODE_OF_CONDUCT.md`：採 [Contributor Covenant 2.1](https://www.contributor-covenant.org/version/2/1/code_of_conduct/)
- `.github/ISSUE_TEMPLATE/`：`bug-report.yml` / `feature-request.yml` / `spec-question.yml`
- `.github/PULL_REQUEST_TEMPLATE.md`：含 atom spec 變動 / breaking change / regression-matrix update checkbox
- `.github/workflows/ci.yml`：test + lint + neutrality + encoding
- `.github/workflows/release.yml`：changesets 自動 npm publish
- `.github/workflows/docs.yml`：auto-deploy docs 到 GitHub Pages
- `CHANGELOG.md`：採 [changesets](https://github.com/changesets/changesets) 自動聚合
- `.github/dependabot.yml`：每月 dep update PR
- GitHub Discussions：開 categories（Q&A / Show & Tell / Spec proposals / Adapter ecosystem）
- `MAINTAINERS.md`：列出 maintainer 與聯絡方式

License 定論：**MIT**（最寬鬆，適合 governance framework 廣泛採用）。

---

## 5. 3KLife 回同步策略

1. 早期使用 Git dependency 或 `npm link` 導入上游 repo。
2. 上游 core 的 breaking change 必須先更新 adapter compatibility matrix。
3. 3KLife case study 的改善若具通用性，回提 upstream PR；若帶 domain 假設，只留在 3KLife adapter。
4. 每次升級 upstream package 後，必須跑 3KLife adapter gate 與 html-to-ucuf smoke regression。

---

## 6. 3KLife Consumption Roadmap（4-stage 演進）

§5 只描述「回同步」的高層原則，但 3KLife 從 ATM Phase B 上游開發開始到 ATM 1.0 stable 後的依賴模式有 **4 個演進階段**，每階段消費形式 / 升級節奏 / 回退策略不同。詳見：

[`3klife-consumption-roadmap.md`](3klife-consumption-roadmap.md)

摘要：

| Stage | ATM 版本 | 消費形式 | 升級節奏 |
|---|---|---|---|
| S1 dev | 0.0.x（pre-alpha） | git submodule | 每次 commit pull |
| S2 alpha | 0.1 – 0.4.x | npm link / git+ssh dep | 每週 sync |
| S3 beta | 0.5 – 0.9.x | npm i ^0.5 | 每兩週 patch、每月 minor |
| S4 stable | ≥1.0.0 | npm i ~1.2 pin minor | 每季 minor、每年 major |

並行期保護：[`3klife-coexistence-plan.md`](3klife-coexistence-plan.md) 定義 freeze list / 路由協議 / cross-shard task-lock。
既有工具命運：[`3klife-tooling-fate.md`](3klife-tooling-fate.md) 定義 9 個治理工具的 Adapter / Wrapper / Replaced / Permanent 命運。

---

## 7. 多 AI Agent 兼容性

ATM upstream 必須產出多 AI agent confidence gate 測試矩陣，作為 0.1.0 alpha 的信心報告；它不再阻塞 alpha0。詳見：

[`multi-agent-compatibility-matrix.md`](multi-agent-compatibility-matrix.md)

最低 alpha0 釋出條件：deterministic profile check、schema validation、hash-lock、hello-world atom smoke 與最小 task/lock/evidence 全綠；5-agent 結果必須有報告與 issue link，但不要求 3/5 全 true。

---

## 8. Versioning & Lifecycle Policy

完整 SemVer + Tier + Deprecation cycle + Cross-language roadmap 詳見：

[`upstream-versioning-policy.md`](upstream-versioning-policy.md)

要點：
- alpha (0.0–0.1) / beta (0.2–0.9) / stable (≥1.0) / lts (規劃中)
- Deprecation 跨 2 個 minor 才移除
- 每次 minor 升級維護 `compatibility-matrix.json`
- alpha 期 README 不得宣稱 multi-language；beta 開放 LanguageAdapter SPI；1.0 官方支援 JS/TS + Python POC
