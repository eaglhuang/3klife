<!-- doc_id: doc_other_0028 -->
# AI 原子框架（ATM）開發計畫書

> 版本：v0.1 · 對齊 3KLife 既有治理基建（task-lock / compute-gate / doc-id-registry / shard 路由）
> 文件位置：`docs/ai_atomic_framework/AI原子框架開發計畫書.md`
> 上游理論藍圖：使用者提供的 `AI_Atomic_Framework_Roadmap.md`（外部來源）
> 落地對象：本專案 `tools_node/` 工具鏈（特別是 `html-to-ucuf` skill 的 legacy strangler）

---

## Context

`html-to-ucuf` skill 已歷經 5 次大改（plan1 → plan5），但 gacha-ds3 在 Cocos Editor 端 final gate adjustedScore 仍卡在 ~0.62。根因不是「某段程式碼寫得不好」，而是**典型 AI Vibe Coding 失控症狀**：

- 3091 行 `draft-builder.js` 單檔多責（HTML 遍歷、型別推理、字體/背景/運動解析）
- 規則 plan2/3/4/5 並列漂移，無 active/historical 治理
- acceptance 模糊（沒給「95%」明確公式 — 已由 H2U-REFACTOR-0006 補入四維度量化）
- 單畫面 over-fit（PROG-2-0010 才開始補 multi-fixture matrix）
- AI 每次都嘗試解決所有層級問題（HTML 轉換錯 + Cocos renderer 邊界 + 美術 assetization 邊界）

H2U-REFACTOR-0001~0006 已開出處理「拆檔 / 規則治理」，PROG-2-0010/0011 處理「multi-fixture matrix / selector trace」。但這些都是**單點修補**，無法防止下一輪 AI 改動再次失控。**真正缺的是「原子化治理框架」**：契約優先、AI 受控加工、hash lock、regression matrix、漸進注入 Legacy。

本計畫的目標是建立 **ATM（Atomic Framework）**，先用 AI 在嚴格契約中自舉一個最小可用的 Manager + Police + Registry，再用它逐步原子化 html-to-ucuf 工具鏈，最後讓 Legacy 透過 AtomicInterface 呼叫穩定原子，避免「方法論不夠」導致的第六次大改。

---

## 目標

1. **約束 AI 的工程框架**：把 AI 從「自由工程師」改成「受控純函數加工機」，只能依 spec 寫 atom、依 test 修到 pass、依 manager 指令做局部替換。
2. **可量化北極星**（3-4 週內達成）：在 `tools_node/_atomic_registry/` 中至少 3 個正式 atom（normalizeCssColor / parseCssLength / parseFragmentList）通過 ≥5 fixtures + ≥2 negative + 1 legacy case；hash-lock baseline 已簽；`draft-builder.js` 至少 1 個呼叫點切到 AtomicInterface；`html-to-ucuf-active-contract` 與 `html-to-ucuf-fidelity-contract` 兩 self-test groups 與切換前 diff = 0。**達成此事件 = ATM 自舉成功**。
3. **長期目標**：讓 ATM 治理框架最終「吞噬」html-to-ucuf legacy，把 `draft-builder.js` 從巨大不穩腳本，變成可治理原子系統。
4. **明確排除**：本計畫不在這個範圍追 0.95 pixel parity、不重寫 draft-builder 主幹（H2U-REFACTOR-0001/0002 負責）、不引入 PostgreSQL/pgvector/LangGraph（後置到 ATM-7）。

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
| **與本專案治理體系融合** | 重造輪子又一套 lock/gate/encoding | 沿用 task-lock / compute-gate / doc-id-registry / encoding-touched，不另起爐灶 |

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

## 里程碑（ATM-0 ~ ATM-7）+ 完整任務卡清單

共 **39 張**，每張先寫 doc_id（`node tools_node/doc-id-registry.js --assign <path>`），加入 `tasks-atm.json` 後再開工。

### ATM-0 治理前置（6 卡）— 啟動條件

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-0-0001 | shard 路由註冊 ATM- 前綴 | P0 | – | `.shardrc.json` 加 `{"name":"tasks-atm","pattern":"^ATM-"}` + 空 `tasks-atm.json` | `node tools_node/check-task-scope.js` 對 ATM-* 任務通過 |
| ATM-0-0002 | 名詞定義新增 ATM prefix | P0 | – | `名詞定義文件.md` 58–83 行表格新增 ATM 條目 | doc-id-registry 不報衝突 |
| ATM-0-0003 | 落地計畫書到專案 | P0 | 0001 | `docs/ai_atomic_framework/AI原子框架開發計畫書.md`（本文件） | doc_id 已分配、encoding pass |
| ATM-0-0004 | active-spec freeze 文件 | P0 | 0003 | `docs/ai_atomic_framework/active-spec.md`（凍結 plan5 / rule registry / regression baseline） | 列出 deprecated plans |
| ATM-0-0005 | Legacy baseline 鏡像 | P0 | 0001 | `tools_node/atomic-framework/fixtures/legacy-baseline/` 拷貝 plan5 active fixtures | 與 self-test 兩 baseline diff = 0 |
| ATM-0-0006 | ATM 任務卡模板 | P0 | 0001 | `docs/agent-briefs/atm-task-template.md` | task-card-opener 一次帶入所有 frontmatter |

### ATM-1 Manager MVP（7 卡）— 框架自舉

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-1-0001 | spec.schema.json 草案 | P0 | 0-0003 | AJV schema 含 inputSchema/outputSchema/dependencyPolicy/hashLock | ajv compile 通過 + 負例 fixture |
| ATM-1-0002 | parse-spec.js | P0 | 1-0001 | `manager/parse-spec.js` + unit test | 對 3 個示範 spec 產 normalized model |
| ATM-1-0003 | scaffold-atom.js | P0 | 1-0002 | 從 spec 產 _workbench atom 三件組（spec/impl/test 骨架） | idempotent；不覆寫人寫程式 |
| ATM-1-0004 | run-atom-tests.js | P0 | 1-0003 | fixture loop runner（PASS/FAIL JSON report） | 故意失敗 fixture 回 exitCode=1 |
| ATM-1-0005 | hash-lock.js | P0 | 1-0002 | `lib/atomic-framework/hash-lock.js` 三段 sha256 | 修一行 impl 必偵測 codeHash drift |
| ATM-1-0006 | atm-cli.js 入口 | P0 | 1-0002~5 | `atm spec/scaffold/test/lock/status` 子命令 | `atm status` 列出 0 atoms 不 crash |
| ATM-1-0007 | atomic-registry.json shape | P1 | 1-0006 | registry.schema + 空 registry | manifest-merger 合併兩個空 registry 通過 |

### ATM-2 Police v0（5 卡）— 治理閘門

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-2-0001 | forbidden-import checker | P0 | 1-0006 | AST 掃 require/import vs spec.dependencyPolicy | 違規回 exit=1 + fixture |
| ATM-2-0002 | side-effect checker | P0 | 1-0006 | 偵測 fs.write / globalThis / process.env 寫入 | 純/副作用 fixture 各 pass/fail |
| ATM-2-0003 | registry-consistency checker | P0 | 1-0007 | 比對 registry vs `_atomic_registry/generated/` | 漂移時報具體缺漏 atom |
| ATM-2-0004 | police 接入 compute-gate | P0 | 2-0001~3 | `compute-gate-config.json` 新增 `atm-police` + `atm-hash-lock` gate + `atm` profile | `compute-gate --profile atm` 通過 |
| ATM-2-0005 | finalize-agent-turn 鈎入 | P1 | 2-0004 | finalize-agent-turn 偵測 task.id 開頭 ATM- 即跑 atm profile | ATM 卡 finalize 失敗即時回報 |

### ATM-3 第一批 atom（5 卡）— 證明可運作

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-3-0001 | normalizeCssColor atom | P0 | 1-0006, 2-0004 | 從 draft-builder 鄰近色彩 helper 抽純函式 | 5 fixtures + 2 negative + 1 legacy case 全 PASS |
| ATM-3-0002 | parseCssLength atom | P0 | 3-0001 | 統一 parsePx (L1716) + parseSvgNumber (L1328) + resolveLength (L1733) | px/em/%/svg 全覆蓋 fixture |
| ATM-3-0003 | parseFragmentList atom | P1 | 3-0001 | 抽 draft-builder L869 parseFragmentList | legacy fixture diff = 0 |
| ATM-3-0004 | html-parser adapter atom | P1 | 3-0001 | 把 `html-parser.js` 296 行包成 adapter（Legacy Adapter 模式） | self-test active-contract 持平 |
| ATM-3-0005 | atomic-map：plan5-baseline | P1 | 3-0001~4 | 4 個 atom 串成 baseline pipeline map | integration test 通過 |

### ATM-4 回歸與 fidelity（6 卡）— 防退轉

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-4-0001 | regression matrix 結構 | P0 | 3-0005 | `docs/ai_atomic_framework/regression-matrix.md` + JSON | 列出 fixture × atom × owner |
| ATM-4-0002 | 補 button-family fixture | P0 | 4-0001 | `fixtures/html-to-ucuf-plan5/button-family/` | 完成 PROG-2-0010 對應遺缺 |
| ATM-4-0003 | 補 character-detail fixture | P0 | 4-0001 | `fixtures/html-to-ucuf-plan5/character-detail/` | self-test 收錄 |
| ATM-4-0004 | known-gap 標記機制 | P1 | 4-0002~3 | spec.testPolicy 加 `knownGaps[]`、報告區分 fail vs known-gap | 測試報表分欄正確 |
| ATM-4-0005 | owner bucket 註記 | P1 | 4-0001 | regression-matrix 標 owner | 出錯時自動 mention 對應 owner |
| ATM-4-0006 | hash-lock baseline 簽署 | P0 | 4-0002~3 | 對 ATM-3 全部 atom 第一次 sign | `atm lock --verify` 全綠 |

### ATM-5 Legacy dry-run injection（5 卡）— 注入演練

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-5-0001 | inject-plan.js 設計 | P0 | 4-0006 | 輸出 patch plan JSON，不寫 Legacy | dry-run 可 review、含 rollback 步驟 |
| ATM-5-0002 | AtomicInterface.js 生成器 | P0 | 5-0001 | 由 registry 產生 `_atomic_registry/AtomicInterface.js` | 函數命名符合 `<name>_atom_<bucket>_<seq>` |
| ATM-5-0003 | location-index.json | P0 | 5-0002 | inject-plan 同步寫入 usage 索引 | registry-consistency 通過 |
| ATM-5-0004 | rollback-plan.js | P0 | 5-0001 | 對應 inject 的反向 patch | dry-run 來回兩次 git diff = 0 |
| ATM-5-0005 | import-boundary 例外設定 | P1 | 5-0002 | `check-import-boundaries.js` 加白名單，允許 lib → `_atomic_registry` | gate 通過 |

### ATM-6 H2U strangler（4 卡）— 真實切片接管

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-6-0001 | 替換 normalizeCssColor 呼叫點（低風險） | P0 | 5-0004 | draft-builder 改呼叫 AtomicInterface.normalizeCssColor | self-test 兩 group 持平 |
| ATM-6-0002 | 替換 parseCssLength 呼叫點 | P0 | 6-0001 | 同上、含 svg/css 雙路徑 | pixel diff baseline 不退轉 |
| ATM-6-0003 | parseFragmentList 替換 + 灰度開關 | P1 | 6-0001 | env flag 切 legacy/atom 走法 | rollback 1 行可回 |
| ATM-6-0004 | html-parser adapter 接管 | P1 | 6-0001 | `html-parser.js` 改為 adapter delegating | active-contract 與 fidelity-contract 持平 |

### ATM-7 擴張策略（3 卡）— 規模化

| ID | 標題 | P | 依賴 | 交付物 | 驗收 |
|---|---|---|---|---|---|
| ATM-7-0001 | split / merge / deprecate 規則 | P1 | 6-* | 文件化於 `architecture.md` | 含三種範例 |
| ATM-7-0002 | embedding / DB 接入決策文件 | P2 | 7-0001 | 後置 pgvector 索引層設計（git 仍是真相） | review 通過、不影響現行 gate |
| ATM-7-0003 | molecule bundler PoC | P2 | 7-0001 | 將 atomic-map 打包為單一 bundle 給 runtime | 1 個 PoC pipeline 跑通 |

---

## 執行 Checklist（每張 ATM 卡通用）

### 開工序列
```bash
node tools_node/task-lock.js check  ATM-X-NNNN
node tools_node/task-lock.js lock   ATM-X-NNNN ClaudeCode_<model> --files <擬動清單>
node tools_node/doc-id-registry.js --assign docs/agent-briefs/tasks/ATM-X-NNNN.md
# 更新任務卡 frontmatter: status=in-progress / started_at / started_by_agent
```

### 進行中（每次儲存後）
```bash
node tools_node/check-encoding-touched.js
node tools_node/atomic-framework/atm-cli.js test   --atom ATM-X-NNNN   # 若是 atom 卡
node tools_node/atomic-framework/atm-cli.js police --task ATM-X-NNNN
```

### 收工序列
```bash
node tools_node/check-encoding-touched.js
node tools_node/check-encoding-integrity.js
node tools_node/compute-gate.js --profile atm    # 含 atm-police + atm-hash-lock + encoding + ts-syntax + task-scope + import-boundary
node tools_node/atomic-framework/atm-cli.js lock --atom ATM-X-NNNN --sign   # 變更 atom 才簽
node tools_node/finalize-agent-turn.js
node tools_node/task-lock.js unlock ATM-X-NNNN ClaudeCode_<model>
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
| **過度工程化**：框架還沒救到 Legacy 就先變成另一個巨大老系統 | 先 ATM-0~3 做 MVP；DB / molecule bundler / 向量索引一律後置到 ATM-7；每個框架功能也要原子化（dogfooding） |
| **原子太碎造成性能差** | spec.performanceBudget 限 maxRuntimeMs / allocatedBytes；hot path atom 必跑 p95 measurement；compute atom 禁 async / deep clone |
| **AI 修改超出範圍** | 任務卡 frontmatter 寫死 `allowed_files`；task-lock + check-task-scope 禁止越界；hash-lock 偵測 stable atom 被誤改 |
| **Legacy 行為被破壞** | inject-plan dry-run；regression matrix 防止退轉；location-index 記錄每次注入位置；rollback-plan 對稱輸出 |
| **與 H2U-REFACTOR-0001/0002 衝突**（兩邊都動 draft-builder） | ATM-3/6 第一批 atom **明確避開** draft-builder 主邏輯，從 normalizeRect / parsePx / html-parser.js 切入；ATM-6 替換時只改 call site 不改 helper |
| **測試 baseline 被修紅就改** | hash-lock baseline 變更需 owner sign；regression-matrix.json 在 git diff 時觸發審查 |

---

## 驗證命令（北極星達成判定）

```bash
# 1. ATM 結構就位
ls tools_node/atomic-framework/atm-cli.js
ls tools_node/_atomic_registry/AtomicInterface.js
ls docs/ai_atomic_framework/AI原子框架開發計畫書.md
ls docs/tasks/tasks-atm.json

# 2. ATM-3 三 atom 全部 PASS
node tools_node/atomic-framework/atm-cli.js test --atom ATM-3-0001
node tools_node/atomic-framework/atm-cli.js test --atom ATM-3-0002
node tools_node/atomic-framework/atm-cli.js test --atom ATM-3-0003

# 3. hash-lock baseline 已簽
node tools_node/atomic-framework/atm-cli.js verify --all
# 期望: 0 drift

# 4. ATM-6-0001 已切到 AtomicInterface
grep -n "AtomicInterface.normalizeCssColor" tools_node/lib/dom-to-ui/draft-builder.js

# 5. self-test 兩 group 持平
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-active-contract
node tools_node/test/dom-to-ui-self-test.js --group html-to-ucuf-fidelity-contract
# 期望: 切換前後 diff = 0

# 6. compute-gate atm profile 全綠
node tools_node/compute-gate.js --profile atm --agent-feedback
# 期望: all gates pass

# 7. atm status 健康
node tools_node/atomic-framework/atm-cli.js status
# 期望: registry / map / police 全 healthy
```

---

## Critical Files

| 檔案 | 角色 | 動作 |
|---|---|---|
| `docs/agent-briefs/tasks/ATM-{0..7}-NNNN.md` | 39 張任務卡 | 新建（ATM-0~7 開卡時） |
| `docs/tasks/.shardrc.json` | shard 路由 | 修改（加 tasks-atm）— ATM-0-0001 |
| `docs/tasks/tasks-atm.json` | ATM 任務索引 | 新建 — ATM-0-0001 |
| `docs/遊戲規格文件/系統規格書/名詞定義文件.md` | 系統代號真相 | 修改（加 ATM 條目）— ATM-0-0002 |
| `docs/ai_atomic_framework/AI原子框架開發計畫書.md` | 本計畫專案副本 | 新建（本次落地） |
| `docs/ai_atomic_framework/active-spec.md` | active 凍結清單 | 新建 — ATM-0-0004 |
| `docs/ai_atomic_framework/architecture.md` | 四區圖 | 新建 |
| `docs/ai_atomic_framework/regression-matrix.md` | 防退轉矩陣 | 新建 — ATM-4-0001 |
| `docs/ai_atomic_framework/legacy-integration-runbook.md` | 注入手冊 | 新建 — ATM-5 |
| `tools_node/atomic-framework/atm-cli.js` | 主 CLI | 新建 — ATM-1-0006 |
| `tools_node/atomic-framework/manager/{parse-spec,scaffold-atom,run-atom-tests,validate-atom,inject-plan,rollback-plan}.js` | Manager 6 模組 | 新建 — ATM-1 + ATM-5 |
| `tools_node/atomic-framework/police/{forbidden-import,side-effect,registry-consistency,dependency-graph}.js` | Police 4 模組 | 新建 — ATM-2 |
| `tools_node/atomic-framework/registry/{atomic-registry,atomic-map,capability,regression-matrix}.json` | Registry | 新建 — ATM-1-0007 |
| `tools_node/atomic-framework/schemas/*.json` | AJV schema | 新建 — ATM-1-0001 |
| `tools_node/lib/atomic-framework/{spec-loader,hash-lock,ast-utils,diff-report,manifest-merger,encoding-helpers}.js` | 共用 lib | 新建 — ATM-1 |
| `tools_node/_atomic_registry/{index,AtomicInterface}.js` | runtime 接入 | 新建 — ATM-5-0002 |
| `tools_node/_atomic_registry/generated/*.js` | runtime atom 產物 | 新建 — ATM-3 開始 |
| `tools_node/_atomic_registry/location-index.json` | 注入索引 | 新建 — ATM-5-0003 |
| `tools_node/compute-gate-config.json` | 加 atm gate + profile | 修改 — ATM-2-0004 |
| `tools_node/check-import-boundaries.js` | 加白名單 | 修改 — ATM-5-0005 |
| `tools_node/finalize-agent-turn.js` | 加 ATM 鈎子 | 修改 — ATM-2-0005 |
| `tools_node/lib/dom-to-ui/draft-builder.js` | 切到 AtomicInterface（ATM-6） | 修改 — ATM-6 |
| `fixtures/html-to-ucuf-plan5/button-family/` | 補 fixture | 新建 — ATM-4-0002 |
| `fixtures/html-to-ucuf-plan5/character-detail/` | 補 fixture | 新建 — ATM-4-0003 |

---

## 執行流程提醒

- 本計畫的第一張卡 **ATM-0-0001**（shard 路由註冊）必須先做完，否則任何 ATM-* 任務卡都無法被 task-card-opener 識別。
- ATM-0-0002（名詞定義新增 ATM prefix）也是啟動條件，缺它 doc-id-registry 會報衝突。
- 39 張卡建議 4 週時間盒：W1=ATM-0+1，W2=ATM-2+3，W3=ATM-4+5，W4=ATM-6 第一刀。ATM-7 為長期。
- 每張卡開工前依 CLAUDE.md 硬規則 #0：**check → lock → 改 frontmatter**，不可省略。
- 不允許把 ATM-3/6 的 atom 抽取與 H2U-REFACTOR-0001/0002 的 draft-builder 拆檔同時做，避免時序衝突；建議先讓 H2U-REFACTOR 卡告一段落或鎖定不動 ATM 切的那幾個 helper。

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
