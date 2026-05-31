# ATM (AI-Atomic-Framework) AAO 任務開發實務操作指南

> **版本**：2026-05-31 更新版 — 整併 0064 → 0100 累積實戰教訓 + map-replacement-protocol v2-r2 + 雙代理派工範本 + 雙 repo 治理紀律。原版（單 repo 視角）已不足以涵蓋當前作業。
>
> **適用對象**：承接 AAO 系列任務的 AI Agent（Antigravity / Codex / Claude Code / 其他）+ 派工的 Captain。

---

## 0. 雙 repo 治理結構（必懂）

| Repo | 角色 | 容納 |
|---|---|---|
| **AI-Atomic-Framework (AAF)** | Framework（上游）| CLI 程式碼、schemas、hooks、原子 registry、map registry、`.atm/history/` ledger 與 evidence |
| **3KLife** | Adopter（下游）| `docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-XXXX-*.task.md` 任務卡、`docs/tasks/tasks-*.json` ledger 分片、`tools_node/task-lock.js` 跨 repo 鎖工具 |

**closure_authority 兩種**：
- `target_repo`：實作在 AAF、開卡 metadata 在 3KLife。最常見。
- `adopter`：純 3KLife 端設計或評估卡（如 D2 adapter spec、純文件補強）。

---

## 1. 動手前的硬前置紀律

### 1.1 【必做】Task ID 衝突檢查（0097 教訓）

```bash
git -C C:\Users\User\3KLife log --oneline --grep="TASK-AAO-XXXX"
git -C C:\Users\User\AI-Atomic-Framework log --oneline --grep="TASK-AAO-XXXX"
```

兩邊**皆為空**才繼續。任一有結果 → **停手回報 Captain**，不擅自重派同號或開重複卡。

> **背景**：TASK-AAO-0097 曾出現雙 window 並行派工造成兩張同號卡共存，事後 cleanup 為 0098。

### 1.2 上鎖三部曲（3KLife 端）

```bash
# 1. 確認無衝突
node tools_node/task-lock.js check <task-id>

# 2. 正式上鎖（owner 寫真實 actor 名稱）
node tools_node/task-lock.js lock <task-id> Antigravity

# 3. 透過 ATM CLI 更新 ledger 狀態（不要手動編輯 .atm/history/tasks/*.json！）
node atm.mjs tasks reserve --task <task-id> --actor Antigravity --json
node atm.mjs tasks promote --task <task-id> --actor Antigravity --json
# 進入 ready → next --claim 後狀態自動轉 running
```

⚠️ **禁止手動編輯** `.atm/history/tasks/<task-id>.json` 的 `status` 欄位。0100 教訓：曾有代理因 task card 用了非 routable 狀態，直接改 ledger JSON 繞過狀態機。正解是用 `atm tasks reset --task <id>` CLI 修復。

### 1.3 Status 值對照表（**核心**）

| 來源 | 合法值 |
|---|---|
| **Governance 主 schema**（`work-item.schema.json` enum）| `planned` / `locked` / `running` / `verified` / `done` / `blocked` |
| **Tasks import 端**（`tasks.ts`）| `planned` / `open` / `in_progress` / `reserved` / `ready` / `running` / `review` / `blocked` / `abandoned` / `done` |
| **`next --claim` 可派發**（routable 子集）| `open` / `planned` / `ready` / `blocked` / `waiting_target_evidence` / `reserved` |

**Phase 0 開卡建議**：`status: open` 或 `status: planned`（routable）。
**避免**：`in_progress`、`in-progress`（非 routable，會卡住 claim、需 `tasks reset`）。
**`running`**：是 `next --claim` 後 ledger 自動轉入的狀態，**不需手動寫**。

### 1.4 嚴守 ScopePaths 隔離

- 只改任務卡 `scopePaths` / `allowedFiles` 聲明的檔。
- 發現其他檔小缺陷 → **停手回報 Captain**，不順手重構（會打破 Scope 隔離、close 失敗）。
- 忽略 pre-existing untracked（`.playwright-mcp/` / `scratch/` / `*.tmp.json` / `tmp-*.mjs`），不要加入 staging。
- **禁止建立 allowedFiles 外的任何檔案**（含 `docs/` — 0096 教訓：曾為了通過 deliverableGate 在 docs/ 雙寫文件）。

---

## 2. 雙代理派工範本（防外卡 mirror commit）

任何 `closure_authority=target_repo` + 需要 AAF 代碼改動的卡 → **必拆雙代理**。

物理切斷 Phase 1 代理碰 3KLife task card 的可能性。已驗證 7 連勝（0089/92/93/95/96/98/99）。

### Phase 0 — Agent #1（3KLife 開卡專用）

```
allowedFiles 嚴格白名單：
- C:\Users\User\3KLife\docs\ai_atomic_framework\atm-agent-first-operability\tasks\
  TASK-AAO-XXXX-*.task.md（新建）
- C:\Users\User\3KLife\docs\tasks\tasks-aao.json（ledger 分片）

❌ 禁碰：任何 AAF 路徑、任何其他 3KLife 路徑
❌ 禁止：status mirror commit、Phase 2 close commit、做 Phase 1 實作

工作：
1. Task ID 衝突檢查
2. 建 task card（status=open 或 planned）
3. 回寫 ledger 分片
4. 1 commit：docs(aao): open TASK-AAO-XXXX
5. 停手回報 Captain
```

### Phase 1 — Agent #2（AAF 實作專用）

```
allowedFiles 嚴格白名單：
- 僅 AAF 真實要改檔 + 新檔
- .atm/history/evidence/TASK-AAO-XXXX.closure-packet.json
- .atm/history/evidence/TASK-AAO-XXXX.json
- .atm/history/tasks/TASK-AAO-XXXX.json
- .atm/history/evidence/git-head.jsonl（自動）

❌ 禁碰：**所有 3KLife 路徑**（含 task card、ledger、tools_node、docs）

工作：實作 + closure ledger，AAF 嚴格 2 commits
  - Commit 1: feat/fix/refactor/chore(aao): TASK-AAO-XXXX <摘要>
  - Commit 2: chore(aao): record task closure ledger for TASK-AAO-XXXX
```

### Phase 2 — Captain 統合

- 3KLife 卡保持 `in_progress`（或 Captain 派專屬 1-purpose sidecar 關卡）
- Phase 1 代理**永不**接觸 3KLife status

### 例外：單代理場景

- **3KLife-only 設計卡**（如 0092 adapter spec、純文件評估）：單代理即可
- **AAF-only 切片卡**（如 0095 wave 3-A）：仍走雙代理（Phase 0 開卡 + Phase 1 實作）

---

## 3. 雙階段閉環提交規約（AAF 嚴格 2 commit）

### 3.1 第一階段 — Delivery（feat/fix/refactor）

```bash
# 1. Staging
git add <修改代碼檔> <測試檔> atomic_workbench/atomization-coverage/path-to-atom-map.json

# 2. ATM 提交包裝器（自動補 ATM-Actor / ATM-Task / ATM-Session trailers）
node atm.mjs git commit \
  --actor Antigravity \
  --task <TASK-ID> \
  --message "feat(aao): <你的訊息>" \
  --json

# 記下 Commit SHA
```

### 3.2 第二階段 — Closure（chore 帳本）

```bash
# 1. 跑 validators 並錄製 evidence
node atm.mjs evidence run \
  --task <TASK-ID> \
  --actor Antigravity \
  --command "npm run typecheck" \
  --validators typecheck \
  --json

# 重複各 validator：validate:cli / validate:git-head-evidence / hook pre-commit

# 2. 正式 close，引用 delivery commit SHA 為 historical-delivery
node atm.mjs tasks close \
  --task <TASK-ID> \
  --actor Antigravity \
  --status done \
  --historical-delivery <Delivery-SHA> \
  --json

# 3. Staging 帳本檔
git add .atm/history/tasks/ .atm/history/evidence/ .atm/history/task-events/

# 4. ATM wrapper 帶 ATM-Actor/Task/Claim/Session trailers
node atm.mjs git commit \
  --actor Antigravity \
  --task <TASK-ID> \
  --message "chore(aao): record task closure ledger for <TASK-ID>" \
  --json
```

⚠️ **絕對禁止繞 hook**：`--no-verify` / `--force` / `SAFE_MODE` 任何形式。標準 `git commit` 會被 pre-commit 擋住、必須走 `node atm.mjs git commit` wrapper。

### 3.3 3KLife 端 commit 數限制

- `closure_authority=target_repo` 卡：**3KLife 嚴格 1 commit**（Phase 0 開卡）
- ❌ status mirror commit（純翻 `planned`→`done` 無實質變更）
- ❌ Phase 2 close commit（鏡像 AAF closure）
- 過去違規：0064 / 0075 / 0077 / 0088（雙代理範本前）

---

## 4. Leaf-by-Leaf Governed Extraction Workflow（sanguo-rag 實證 pattern）

此 workflow 適用於拆解大型 legacy 檔案（>1000 LOC）。已在 3klife-npc-brain 對 Python pipeline 驗證、在 AAF 對 TS 驗證（0098 起）。

### 4.1 Workflow 步驟

```
Step 0  candidates rank（讓 ATM 自己選 target）
Step 1  Captain-approved leaf boundary
Step 2  Dry-run proposals（behavior.atomize、0 host mutation）
Step 3  Extract to helper module（保 re-export 維持向後相容）
Step 4  Smoke evidence（governance dry-run + leaf behavior）
Step 5  Rollback-ready proof（full patch + git apply --check --reverse exit 0）
Step 6  Actual-patch-evidence 彙整
```

### 4.2 Step 0：Candidates Rank

```bash
node atm.mjs candidates rank \
  --cwd "C:\Users\User\AI-Atomic-Framework" \
  --include "packages/cli/src/commands/**/*.ts" \
  --goal "MRP leaf extraction" \
  --max-file-lines 1000 \
  --limit 10 \
  --json
```

輸出 4 份報告到 `.atm/history/reports/candidates/`：
- `candidate-ranking-<TS>.json` — top-N 排序
- `candidate-ranking-<TS>.source-inventory.json` — 來源盤點
- `candidate-ranking-<TS>.police-family.json` — police 風險訊號
- `candidate-ranking-<TS>.guidance-drift-police.json` — 漂移偵測

### 4.3 Step 2：behavior.atomize Dry-Run

```bash
node atm.mjs upgrade --propose --dry-run \
  --behavior behavior.atomize \
  --legacy-target "legacy://packages/cli/src/commands/<source>.ts#L<start>-L<end>" \
  --json
```

`--dry-run` = **零 host mutation**，只產 `atm.guidedLegacyDryRunProposal` 進 queue，等 human review。

### 4.4 Step 4-6：Evidence 三件套（命名規則）

放 `.atm/history/reports/`，命名 `<type>.<atom-or-function-name>.<YYYYMMDD-HHMMSS>.<ext>`：

```
smoke-evidence.<LeafName>.<TS>.log              # governance dry-run 結果
smoke-evidence.<LeafName>.leaf.<TS>.log         # leaf behavior smoke
rollback-ready.full.<LeafName>.<TS>.patch       # 完整 rollback patch
rollback-ready-proof.<LeafName>.<TS>.json       # git apply --check --reverse exit 0 證明
actual-patch-evidence.<LeafName>.<TS>.json      # 彙整 + 引用前 4 個
```

---

## 5. Batch Leaf Extraction（0099 / 0100 pattern）

### 5.1 何時用批次

| 規模 | 卡 | 備註 |
|---|---|---|
| 1 leaf | pilot（如 0098 isFrontmatterScalar）| 試水溫、驗證 workflow |
| 3 leaves | small batch（如 0099）| 3× throughput、累積 batch envelope 經驗 |
| 10 leaves | full batch（如 0100）| 配合 atom map 形成，**ROI 必為正**（tasks.ts 必淨縮減）|

### 5.2 Batch ROI 鐵律

抽小 leaf（< 30 LOC）會被 import overhead 吃掉 ROI（0099 教訓：tasks.ts 反增 6 行）。
**正解**：按 LOC 降序選 leaves、優先抽大葉、必要時組成 cluster module（多 leaves 同主題打包）。

### 5.3 Batch Envelope 命名

```
batch-evidence.TASK-AAO-XXXX.<TS>.json          # 彙整全 N leaves 結構特徵
rollback-ready.batch.TASK-AAO-XXXX.<TS>.patch   # 整批 patch
roi-report.TASK-AAO-XXXX.<TS>.json              # tasks.ts LOC delta + helper LOC 統計
```

### 5.4 中途失敗處理

- Step 2 dry-run 任一失敗 → 停手回報（**0 host mutation 安全**）
- Step 3 apply 階段某 leaf 失敗 → 停手回報，告知已完成 N/M leaves
- dogfood 退步 → 停手回報

---

## 6. Atom Map Formation（v2-r2 map-replacement-protocol）

累積 N 個 leaf atoms 後，包成 canonical map：

### 6.1 手寫 decomposition-plan.json

對齊 `schemas/governance/decomposition-plan.schema.json`：

```json
{
  "legacyUris": ["legacy://packages/cli/src/commands/<source>.ts"],
  "proposedMapId": "ATM-MAP-<NAME>-0001",
  "proposedMembers": [
    {"atomId": "atm.foo-helper-map", "version": "0.1.0"},
    ...
  ],
  "proposedEdges": [...],
  "entrypoints": [...],
  "notes": "<context>"
}
```

### 6.2 Map 形成 CLI 鏈

```bash
# 驗 plan schema
node atm.mjs spec --validate plans/<plan>.json --json

# 形成 map.spec.json
node atm.mjs create-map --from-plan plans/<plan>.json --json

# 跑 map integration test
node atm.mjs test --map <mapId> --json

# (可選) equivalence test
node atm.mjs test --map <mapId> --equivalence-fixtures <fixtures> --json
```

### 6.3 Replacement Lane Transitions（v2-r2 完整 lifecycle）

```bash
node atm.mjs replacement-lane transition --map <mapId> --to shadow --evidence ...
# → canary → active → legacy-retired（需 rollback-proof 或 retirement-proof）
```

### 6.4 Rescue / Rollback

```bash
node atm.mjs rescue diagnose --json
# 8 actions: police / diagnose / rebuild-registry / reload-atoms / rebuild-maps /
#           replay-lineage / clear-cache / factory-reset

node atm.mjs rollback --plan --map <mapId>   # dry-run
node atm.mjs rollback --apply --map <mapId>  # 實際 rollback
```

---

## 7. Captain Condition Review SOP（代理回報後必做）

每張卡 close 後，Captain **平行派 2-3 支 haiku sidecar 核實**（**不信代理自報**）：

| Sidecar | 任務 |
|---|---|
| A | AAF `git log -8` + 每 commit `show --stat` → 確認 commits 數 / 訊息 / 觸碰路徑無 3KLife / 無 `--no-verify` |
| B | 3KLife `git log -10` filter TASK-AAO-XXXX → 確認 commit 數 / 無 mirror / task card status |
| C | 程式碼/檔案抽查：deliverable 存在 / atom_id 登記 / closure packet 完整 / change scope-tight |

**裁定**：
- ✅ **Full PASS**：接受
- ⚠️ **條件接受**：功能正確但治理違規 → 記治理債、不退回
- ❌ **退回重做**：僅當功能破損時

紀律：「**不重做、不退回功能正確的卡**」。

---

## 8. 歷程踩坑點與避坑指南（Lessons Learned）

### 8.1 編譯漂移（Build Drift）

**現象**：改了 `packages/cli/src/commands/` 但 `node atm.mjs` 還跑舊代碼。
**原因**：`atm.mjs` 走 `release/atm-onefile/atm.mjs` 或編譯快取。
**解法**：**改完必跑** `npm run build`。

### 8.2 EPERM 與臨時工作區

**現象**：`createTempWorkspace()` 在 Windows / 沙盒觸發 EPERM。
**解法**：用封裝後的 `createCliTempWorkspace('your-prefix')`（在 `packages/cli/src/temp-workspace.ts`）。

### 8.3 Trailing Whitespace 擋 commit

**現象**：`git diff --check` 或 pre-commit 拒絕提交。
**解法**：編輯後手動或工具清行末空格，先過 `git diff --check`。

### 8.4 Validator Auto-Link（TASK-AAO-0063）

`evidence run` 若不指定 `--validators`，會自動掃描 command pattern 鏈結驗證器：
- `npm run typecheck` → `typecheck` validator
- `npm run validate:*` → 對應 validator
- `node --strip-types scripts/validate-*.ts --mode validate` → 對應 validator

**手動 `--validators` 優先**（覆蓋 auto-detect）。

### 8.5 Scope Drift 偽合理化（0096 教訓）

**現象**：代理為了通過某個 gate，自行擴大 scope（如 0096 在 `docs/` 雙寫 cross-check.md）。
**解法**：派工單明文「allowedFiles 外建任何檔即停手回報，不擅自擴 scope」。

### 8.6 雙 Window 並行派工 Task ID 撞號（0097 教訓）

**現象**：Captain 不知道 user 已在另一 window 派同號卡，重派造成雙開。
**解法**：派工前必跑 Task ID 衝突檢查（§1.1）。

### 8.7 手動改狀態檔繞 CLI（0100 教訓）

**現象**：代理直接編輯 `.atm/history/tasks/<id>.json` 把 `status: in_progress` 改 `open`。
**正解**：用 `node atm.mjs tasks reset --task <id> --actor <a> --json` 走 CLI 狀態機。

### 8.8 跳步驟跳 evidence（0100 教訓）

**現象**：派工單指定 Step 0-9，代理跳過 6-9（plan / create-map / test --map / batch envelope）。
**解法**：派工單加「步驟化 validator」— 每 Step 完成必驗該 Step 才能進下一 Step。

---

## 9. 常用命令備忘（Cheat Sheet）

### 9.1 上鎖 / 開卡 / 關卡

```bash
node tools_node/task-lock.js check <id>
node tools_node/task-lock.js lock <id> <actor>
node tools_node/task-lock.js unlock <id> <actor>

node atm.mjs tasks reserve --task <id> --actor <a>
node atm.mjs tasks promote --task <id> --actor <a>
node atm.mjs tasks reset --task <id> --actor <a>      # 復原狀態為 open
node atm.mjs tasks close --task <id> --actor <a> --status done --historical-delivery <SHA>
```

### 9.2 Claim / 派發

```bash
node atm.mjs next --claim --task <id> --actor <a> --json
node atm.mjs lock check / acquire / release
```

### 9.3 Evidence

```bash
node atm.mjs evidence missing --task <id> --json
node atm.mjs evidence run --task <id> --actor <a> --command "<cmd>" --validators <v> --json
node atm.mjs evidence add --task <id> --actor <a> --validator <v> --status pass --json
```

### 9.4 Candidates / Atomize / Map

```bash
node atm.mjs candidates rank --cwd <repo> --include <glob> --goal "<text>" --json
node atm.mjs upgrade --propose --dry-run --behavior behavior.atomize \
  --legacy-target "legacy://<path>#L<s>-L<e>" --json
node atm.mjs spec --validate <plan.json> --json
node atm.mjs create-map --from-plan <plan.json> --json
node atm.mjs create-map --spec <map.spec.json> --json
node atm.mjs test --map <mapId> --json
node atm.mjs test --map <mapId> --equivalence-fixtures <fixtures> --json
node atm.mjs replacement-lane transition --map <id> --to shadow --evidence <ref>
node atm.mjs rescue diagnose --json
node atm.mjs rollback --plan --map <id>
node atm.mjs rollback --apply --map <id>
```

### 9.5 Atom Capsule / Map Capsule

```bash
node atm.mjs atom-capsule export --atom <id> --source <path>
node atm.mjs atom-capsule import <capsule-path>
node atm.mjs atom-capsule rollback <atom-id>
node atm.mjs atom-capsule advisories

node atm.mjs map-capsule export --map <id>
node atm.mjs map-capsule import <capsule-path>
node atm.mjs map-capsule rollback <map-id>
```

### 9.6 Hook / Score / 治理

```bash
node atm.mjs hook pre-commit --json
node atm.mjs hook pre-push --json
node atm.mjs atomize score
git diff --check
npm run build
npm run typecheck
npm run validate:cli
npm run validate:git-head-evidence
```

### 9.7 Git wrapper（必用、不可繞）

```bash
node atm.mjs git commit \
  --actor <a> \
  --task <id> \
  --message "<msg>" \
  --json
```

---

## 10. 推薦工作流程圖

### 10.1 標準 AAO 卡（leaf-by-leaf）

```
Captain 派工 ──→ Phase 0 agent（3KLife）開卡 1 commit
              ──→ Phase 1 agent（AAF）：
                    ├─ candidates rank
                    ├─ pick leaf
                    ├─ behavior.atomize dry-run
                    ├─ extract to helper + register atom
                    ├─ unit test
                    ├─ evidence 三件套
                    ├─ Commit 1 (refactor)
                    ├─ evidence run × N validators
                    ├─ tasks close
                    └─ Commit 2 (chore closure)
              ──→ Captain 平行派 2-3 haiku sidecar 核實
              ──→ 條件接受 / 全 PASS
```

### 10.2 Batch 卡（N=3 或 N=10 + map formation）

```
Captain 派工（含 batch 量 + map 形成）
   ├─ Phase 0 agent 開卡 1 commit
   └─ Phase 1 agent：
         ├─ candidates rank
         ├─ N leaves LOC-ranked
         ├─ N × dry-run（read-only stage）
         ├─ 全過 → N × apply（helper + atom register + test）
         ├─ 手寫 decomposition-plan.json
         ├─ atm spec --validate
         ├─ atm create-map --from-plan → map.spec.json
         ├─ atm test --map → map.test.report.json
         ├─ batch envelope + ROI report
         ├─ batch rollback patch + proof
         ├─ Commit 1 (refactor)
         ├─ evidence run × N validators
         ├─ tasks close
         └─ Commit 2 (chore closure)
```

---

## 11. 參考資源

- **計畫書 v2-r2**（當前準則）：`docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md`
- **計畫書 v1**（背景）：`docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書.md`
- **MRP 任務卡系列**：`docs/ai_atomic_framework/map-replacement-protocol/tasks/TASK-MRP-0000~0027.task.md`
- **AAO 任務卡系列**：`docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-XXXX-*.task.md`
- **atm-dispatch Skill**：`.agents/skills/atm-dispatch/SKILL.md`（Captain 派工/收口紀律 SOP）
- **Captain memory**：`C:\Users\User\.claude\projects\C--Users-User-AI-Atomic-Framework\memory\`

---

## 12. 變更歷史

| 日期 | 版本 | 變更 |
|---|---|---|
| 2026-05-31 | v2 | 整併 0064-0100 教訓 + 雙代理範本 + map-replacement-protocol v2-r2 + Task ID 衝突檢查 + leaf workflow + batch pattern + rescue/rollback CLI |
| (原版) | v1 | 單 repo 視角、雙階段提交、上鎖三部曲、編譯漂移 |
