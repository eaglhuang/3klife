# AI 原子框架開發計畫書 — 里程碑與補強路線

> 這是 `AI原子框架開發計畫書.md` 的「里程碑與補強路線」分片。完整索引見 `docs/ai_atomic_framework/AI原子框架開發計畫書.md`。

## 里程碑（ATM-0 ~ ATM-6）+ 已開任務卡清單

目前已建立 **71 張** ATM Markdown 任務卡，`docs/tasks/tasks-atm.json` 現為 thin index 入口，內容分散於 `docs/tasks/tasks-atm/tasks-atm-part-*.json`，Markdown 卡位於 `docs/agent-briefs/tasks/ATM-*.md`。分布為 ATM-0 14、ATM-1 10、ATM-1.5 3、ATM-2 12、ATM-2.5 3、ATM-3 13、ATM-4 6、ATM-5 5、ATM-6 5。後續新增卡仍必須透過 `task-card-opener` 與 `doc-id-registry`，並重建 `docs/tasks/tasks-atm/tasks-atm-part-*.json`；不得手動複製 `doc_id`。舊文中的 47 / 53 / 69 只保留為歷史快照，不再作為規劃真相。

### ATM-0：3KLife governance bootstrap（14 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-0-0001~0002 | shard 與名詞定義 | 建立 `ATM-*` task shard 與唯一系統代號來源。 |
| ATM-0-0003~0004 | upstream / downstream 文件解耦 | 將 Roadmap 改成上游開源框架，將本文件改成 3KLife adopter plan。 |
| ATM-0-0005~0006 | extraction checklist / task template | 建立開源拆出 checklist 與後續任務卡模板。 |
| ATM-0-0007~0008 | v0.2 技術選型與 3KLife 校正矩陣 | 將 Core 極簡、無硬依賴與 adapter 技術棧校正寫回正式計畫。 |
| ATM-0-0009 | Default Governance Bundle 切分重規劃 | 將 ATM 補強為具備通用 task/index/shard/artifact/log/rule/evidence 的完整治理框架，同時保留 3KLife 工具以 adapter 接入。 |
| ATM-0-0010 | Self-hosting first 邊界與中立性 guard 落地 | 將 upstream self-hosting first、docs neutrality 與 neutrality/boundary guard 正式寫入主文件與任務分工。 |
| ATM-0-0011 | Context budget 治理補強與文件回寫 | 將 context budget 提升為 upstream governance primitive，並與 encoding / neutrality 收斂成 Agent Governance Bundle。 |
| ATM-0-0012~0014 | cross-shard lock / tasks-atm auto-parts / 瘦身再開工收斂 | 補 task-lock cross-shard 檢查、tasks-atm auto-parts 讀取層，並將 active/companion/historical、alpha0/alpha1、OSS 實務缺口與 H2U dry-run gate 寫回規劃。 |

### ATM-1：上游 repo skeleton 與 self-hosting alpha0 gate（10 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-1-0001~0002 | product charter / monorepo skeleton | 在 `https://github.com/eaglhuang/AI-Atomic-Framework` 建立 README、package skeleton 與開源基本契約。 |
| ATM-1-0003~0004 | schema / CLI MVP | 定義 Atomic Spec、Registry、Regression Matrix schema，並提供 `init/status/validate` CLI。 |
| ATM-1-0005~0007 | LocalGitAdapter / JS LanguageAdapter / examples | 讓框架在無 3KLife governance 的空白 repo 也能跑 hello-world 與 legacy-strangler 範例。 |
| ATM-1-0008 | Zero-install Agent Bootstrap Pack | 建立 README/AGENTS/profile/project probe，讓任意 AI agent 讀文件後能自動開卡、鎖 scope、跑治理流程。 |
| ATM-1-0009 | Self-hosting alpha proof | 在 standalone upstream repo 證明 first task、scope lock、artifact/log/evidence 與 first atom smoke 都可不靠 3KLife 完成。 |
| ATM-1-0010 | Upstream docs neutrality audit | 全盤掃描 README/AGENTS/docs/examples/templates，確保上游文件不夾帶 adopter 私有資訊。 |

### ATM-2：Core Manager、Registry、HashLock、Police、Governance Bundle（12 卡）

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

### ATM-3：3KLife adapter 導入（downstream-only，需待 self-hosting alpha0 gate）（13 卡）

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

## v0.2.1 補強：開源獨立自舉路徑（B0–B3 sub-phasing 與新增任務卡）

對應 `open-source-extraction-plan.md` §3.0「Phase B 預備」。本補強解決原 ATM-1 / ATM-2 的「Bootstrap Paradox」問題（AI 寫第一行 code 時無治理可遵循），將上游 repo skeleton 拆為四個 sub-phase。

### Sub-phase 與任務卡映射

| Sub-phase | 名稱 | 對應任務卡群 | LOC 上限 | Gate |
|---|---|---|---|---|
| **B0** | Hand-written Seed | 原 ATM-1-0001~0007 中的 spec/CLI/HashLock 種子部分 | 300 | seed self-test pass |
| **B1** | Seed Dogfoods Itself | 新增 ATM-1.5-0001~0003 | +200 | `atm verify --self` 通過 |
| **B2** | Alpha0 Minimal Core | 原 ATM-2-0001~0006 + ATM-2-0012 的 deterministic neutrality scanner；只保留 schema / registry / hash-lock / CLI / hello-world atom / 最小 task-lock-evidence | +1500 | hello-world example + minimal evidence pass |
| **B3** | Self-Hosting Alpha0 Gate | 新增 ATM-2.5-0001~0002；ATM-2.5-0003 降級為 confidence report | (validation only) | `atm self-host-alpha --verify --deterministic` 全綠 |

Default Governance Bundle 的其他 reference plugins（完整 task cards、doc index、shard、artifact/log store、rule guard、encoding、context budget、evidence workflow）移到 alpha1，由 ATM-2-0007~0009 與 ATM-2-0011 按 schema-first 順序落地，不再阻塞 alpha0。

### 新增任務卡

#### ATM-1.5：Seed Dogfoods Itself（3 卡，新增）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-1.5-0001 | seed-as-spec | 用 seed 自己的 spec 格式描述自己（`atom-seed-spec.json`），驗證契約自包含 |
| ATM-1.5-0002 | self-validation | seed 跑自己的 self-validation；產出第一份 `atomic-registry.json` |
| ATM-1.5-0003 | ATM-CORE-0001 註冊 | 第一個受治理的 Atomic ID：seed 本身（`logicalName: atom.core-seed`）。`atm verify --self` 通過 |

#### ATM-2-0012：neutralityScanner atom + CI（新增 1 卡）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-2-0012 | neutralityScanner atom + CI | 在 `packages/plugin-rule-guard/neutrality-scanner.{ts,js}` 與 `.github/workflows/neutrality.yml` 落地 §1.1.5 的中立性自動 CI；`ATM-CORE-0003`（`logicalName: atom.plugin-rule-guard.neutrality-scanner`） |

對應 `open-source-extraction-plan.md` §1.1.5.1。

#### ATM-2.5：Self-Hosting Alpha0 Gate（3 卡，新增）

| 範圍 | 任務 | 目的 |
|---|---|---|
| ATM-2.5-0001 | self-host-alpha verify CLI | 落地 4 條 boolean criteria 的機器驗證命令 `atm self-host-alpha --verify --json` |
| ATM-2.5-0002 | sandbox repo fixture | 在空白 sandbox repo 跑完整 alpha0 deterministic gate 流程；fixture 進 `tests/fixtures/sandbox/` |
| ATM-2.5-0003 | multi-agent compatibility confidence report | 對應 [`multi-agent-compatibility-matrix.md`](multi-agent-compatibility-matrix.md)；產出 5-agent confidence report，不阻塞 alpha0 |

#### ATM-3 補強：既有治理工具 adapter 化（新增 8 卡）

對應 [`3klife-tooling-fate.md`](3klife-tooling-fate.md)。每個 adapter 卡的驗收：既有 CLI 入口行為等價（regression test）、內部走 ATM core、compute-gate atm profile 全綠。

| 範圍 | 任務 | 對象 |
|---|---|---|
| ATM-3-0006 | task-lock adapter 化 | `tools_node/task-lock.js` |
| ATM-3-0007 | compute-gate adapter 化 | `tools_node/compute-gate.js` |
| ATM-3-0008 | doc-id-registry adapter 化 | `tools_node/doc-id-registry.js` |
| ATM-3-0009 | shard-manager adapter 化 | `tools_node/shard-manager.js` |
| ATM-3-0010 | task-card-opener adapter 化 | `tools_node/task-card-opener.js` |
| ATM-3-0011 | encoding adapter 化（兩工具） | `tools_node/check-encoding-touched.js` + `check-encoding-integrity.js` |
| ATM-3-0012 | task-scope / import-boundary 規則包遷移 | `rule-pack.json` + RuleGuard adapter；同時標 `check-task-scope.js` / `check-import-boundaries.js` 為 `@deprecated` |
| ATM-3-0013 | finalize-agent-turn wrapper 接 run envelope | `tools_node/finalize-agent-turn.js` |
| ATM-3-0015 | task card system 原子 map 規劃 | `task-card-opener.js` + `task-lock.js` + task shard + `check-task-scope.js` + doc-id sync 的 end-to-end governed flow |
| ATM-2-0050 | framework function 原子化 coverage gate | 全框架 Layer 2 功能 manifest + validator；確認 CLI / registry / spec / test / evidence / police / adapter / task lifecycle / map / PEV 都有 atom / map 覆蓋 |

### 並行開發協議

`H2U-REFACTOR-* / PROG-2-*` 任務在 ATM 上游開發期間如何路由、freeze list 與仲裁順序，詳見 [`3klife-coexistence-plan.md`](3klife-coexistence-plan.md)。

### 依賴與消費路線圖

3KLife 從 ATM Phase B 上游開發到 ATM 1.0 stable 的 4-stage 演進（git submodule → npm link → npm dep → npm pin minor），詳見 [`3klife-consumption-roadmap.md`](3klife-consumption-roadmap.md)。

### Versioning Policy

完整 SemVer + Tier + Deprecation cycle + Cross-language roadmap 詳見 [`upstream-versioning-policy.md`](upstream-versioning-policy.md)。

---
