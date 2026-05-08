# AI 原子框架開發計畫書 — Checklist、風險與驗證

> 這是 `AI原子框架開發計畫書.md` 的「Checklist、風險與驗證」分片。完整索引見 `docs/ai_atomic_framework/AI原子框架開發計畫書.md`。

## 執行 Checklist（每張 ATM 卡通用）

### 開工序列
```bash
node tools_node/task-lock.js check  ATM-X-NNNN
node tools_node/task-lock.js lock   ATM-X-NNNN <agent-name> --files <擬動清單>
node tools_node/doc-id-registry.js --assign docs/agent-briefs/tasks/ATM/ATM-X-NNNN.md
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

6. **shard 註冊**：`docs/tasks/.shardrc.json` 新增 `{"name":"tasks-atm","title":"ATM Tasks","pattern":"^ATM-"}`；`docs/tasks/tasks-atm.json` 後續由 ATM-0-0013 收斂為 thin index 與 `tasks-atm-part-*.json`。

7. **rollback 安全**：`inject-plan.js` 與 `rollback-plan.js` 必須對稱輸出兩份 patch JSON；regression-matrix 在 hash 變更時要求 owner 簽名（`atm-cli lock --sign --by <agent>`）才能更新 baseline，避免「跑紅就改 baseline」。

### §6.1 Schema versioning policy（v0.2.1 補強）

第一個 breaking schema change 觸發時若無遷移策略，全 ecosystem 的 atom 集體失效。為防止此問題：

1. **`atmSchemaVersion` 為必填欄位**：所有 atom spec 必含 `"atmSchemaVersion": "v1"`（或 `v2.0` 格式），由 `schemas/atomic-spec.schema.json` 強制。
2. **Schema major bump（v1 → v2）**：必須提供 `atm migrate --schema v1-to-v2` 自動轉換腳本；舊 schema 至少保留 1 個 minor 版本，給 adopter 遷移窗口。
3. **Schema minor bump**：純 additive（加新 optional 欄位），不破壞既有 atom；CI 不擋舊 schema atom。
4. **每次 schema 變動 PR 必伴隨**：migration guide + 自動轉換腳本 + ≥10 個既有 atom 的轉換驗證測試。

完整 versioning lifecycle 與 cross-language roadmap 詳見 [`upstream-versioning-policy.md`](upstream-versioning-policy.md)。

---

## 風險與防範

| 風險 | 防範 |
|---|---|
| **過度工程化**：框架還沒救到 Legacy 就先變成另一個巨大老系統 | 先 ATM-0~3 做 core + adapter MVP；DB / molecule bundler / 向量索引一律後置到 ATM-6 的 optional plugin 決策；每個框架功能也要原子化（dogfooding），並由 `ATM-2-0050` 的 coverage manifest + validator 防止只停留在文件承諾 |
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
| `docs/agent-briefs/tasks/ATM/ATM-{0..6}-NNNN.md` | 71 張任務卡 | 已由 task-card-opener 建立，含 v0.2、alpha0/alpha1、Default Governance Bundle 與 Agent Operating Layer 補強卡 |
| `docs/tasks/.shardrc.json` | shard 路由 | 修改（加 tasks-atm）— ATM-0-0001 |
| `docs/tasks/tasks-atm.json` | ATM 任務 thin index 入口 | 已收斂 — ATM-0-0013 |
| `docs/遊戲規格文件/系統規格書/名詞定義文件.md` | 系統代號真相 | 修改（加 ATM 條目）— ATM-0-0002 |
| `docs/ai_atomic_framework/AI_Atomic_Framework_Roadmap.md` | 上游開源 roadmap | 修改 — ATM-0-0003 |
| `docs/ai_atomic_framework/AI原子框架開發計畫書.md` | 3KLife downstream adopter plan | 修改 — ATM-0-0004 |
| `docs/ai_atomic_framework/open-source-extraction-plan.md` | 開源拆出 checklist | 新建 — ATM-0-0005 |
| `AI-Atomic-Framework/README.md`、`packages/*`、`schemas/*` | 上游 repo core/package/schema | 由 ATM-1/ATM-2 在新 repo 實作 |
| `tools_node/adapters/atm-3klife/*`、`atm.config.*` | 3KLife ProjectAdapter / local config | 由 ATM-3 實作 |
| `docs/ai_atomic_framework/cocos-runtime-adapter-policy.md` | Cocos runtime adapter 邊界 | 新建 — ATM-3-0005 |
| `docs/ai_atomic_framework/html-to-ucuf-case-study.md` | H2U reference case study | 已建 — ATM-4-0001 |
| `docs/ai_atomic_framework/h2u-regression-matrix.md` | H2U baseline / regression matrix | 新建 — ATM-4-0002 |
| `docs/QUICK_START.md`、`docs/API.md`、`docs/ADAPTER_GUIDE.md` | 上游開源文件 | 由 ATM-5 在新 repo 實作 |
| `docs/ecosystem/*`、`docs/RFC_PROCESS.md` | 生態擴張與 RFC 文件 | 由 ATM-6 在新 repo 實作 |

---

## 執行流程提醒

- 本計畫的第一張卡 **ATM-0-0001**（shard 路由註冊）必須先做完，否則任何 ATM-* 任務卡都無法被 task-card-opener 識別。
- ATM-0-0002（名詞定義新增 ATM prefix）也是啟動條件，缺它 doc-id-registry 會報衝突。
- 任務數不再使用 47 / 53 / 69 舊快照；以 `docs/tasks/tasks-atm.json` thin index summary、`tasks-atm-part-*.json` 內容分片與本文件的 71 張任務卡分布為準。時間盒改為：W1=ATM-0+1+alpha0 schema seed，W2=ATM-2 alpha0 gate，W3=ATM-3 shadow adapter + alpha1 schema，W4=ATM-4 dry-run case + ATM-5/6 OSS 補件。
- 每張卡開工前依 CLAUDE.md 硬規則 #0：**check → lock → 改 frontmatter**，不可省略。
- 不允許把 ATM-4 的 case atom 抽取與 H2U-REFACTOR-0001/0002 的 draft-builder 拆檔同時做，避免時序衝突；case study 只能透過 dry-run inject plan 推進。

---
