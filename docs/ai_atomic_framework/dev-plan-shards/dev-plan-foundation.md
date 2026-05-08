# AI 原子框架開發計畫書 — 目標、原理、結構

> 這是 `AI原子框架開發計畫書.md` 的「目標、原理、結構」分片。完整索引見 `docs/ai_atomic_framework/AI原子框架開發計畫書.md`。

## 目標

1. **上游可開源**：ATM core、Agent Operating Layer 與 Default Governance Bundle 可以從本 repo 拆出並獨立發布；使用者理論上只要把 ATM 放在專案根目錄，讓任意 AI agent 讀 README/AGENTS，就能在空白 repo `init / adopt / status / validate / task / lock / guard / artifact / log / evidence`。
2. **Adapter-first 導入**：3KLife 只透過 adapter 使用 upstream，不把 `task-lock / compute-gate / doc-id-registry / shard-manager` 寫進 core。
3. **可量化北極星**（先 alpha0，再 alpha1）：alpha0 證明空白 repo 可用最小 CLI + schema + Registry + HashLock + hello-world atom + 最小 task/lock/evidence 跑通；alpha1 再補 Default Governance Bundle。3KLife 只以 adapter shadow mode 驗證至少 1 個 html-to-ucuf 低風險 helper atom，並且 H2U self-test 不退轉。
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

2026-05-08 補強：`ATM-3-0015` 只解決 task card lifecycle；全 ATM framework 還需要一個總控 coverage gate。`ATM-2-0050` 以 `docs/ai_atomic_framework/framework-function-atomization-manifest.md` 盤點所有 Layer 2 framework functions，要求每項都映射到 atom / atomic map / adapter facade / 正式例外，並用 validator 防止新功能繞過原子化；其中 police / governance gates 必須是 active routed surfaces，輸出 `trigger / scope / severity / action` 的 machine-readable findings。

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
| 5 | atom ID 用 `atomic_000001` | 名詞定義文件強制 `{prefix}-{子系統}-{流水號4位}` | atom 用 `ATM-{bucket}-{NNNN}`（例如 `ATM-CORE-0001`）；dot-notation 只保留在 `logicalName`，例如 `atom.core-seed`；函數名可保留語意前綴，但家目錄名稱必須直接等於 Atomic ID |
| 6 | `atomic_workbench/` 在 repo root | upstream 已由 ATM-2-0013 收斂 canonical atom home | 預設一律保留 `atomic_workbench/atoms/ATM-CORE-0123/` 這種格式；3KLife 若要 local mirror 只能透過 adapter 明確 override，不可改寫 core default |
| 7 | DB-first 索引 | 無 DB 基建 | ATM-7 才討論，前期僅 JSON registry |
| 8 | 沒提 encoding | 本專案有 encoding-integrity 嚴格規則 | scaffold-atom 產出檔案必須走 UTF-8 without BOM；compute-gate 必跑 encoding-touched |

---

ATM-2-0013 之後，家目錄規則應視為 active plan 的固定契約：預設 per-atom home 一律是 `atomic_workbench/atoms/ATM-CORE-0123/` 這種格式，而且資料夾名稱必須與 Atomic ID 完全相同。`tools_node/atomic-framework/` 這類路徑只代表控制面與 adapter 工具所在位置，不再代表 atom 本身的預設 home。

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
    scaffold-atom.js                 從 spec 產 atom 骨架到 atomic_workbench/atoms/ATM-CORE-0123/
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
  fixtures/
    legacy-baseline/                 ATM-0 凍結的 active spec / legacy snapshot 鏡像

atomic_workbench/                    canonical per-atom home（default sandbox root）
  atoms/
    ATM-CORE-0123/
      atom.spec.json
      impl.js
      test.js
      fixtures/
      atom.test.report.json
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
