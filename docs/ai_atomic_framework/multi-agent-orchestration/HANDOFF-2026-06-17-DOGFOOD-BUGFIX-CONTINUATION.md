# MAO Dogfood / Bugfix Worker Handoff — 0041–0042 收工後接續

Created: 2026-06-17  
Owner: cursor-composer-2.5（上一輪 worker）  
Thread title（建議新對話）: `MAO M7 — 0043 起接續 / backlog 0066·0070`  
Planning repo: `C:\Users\User\3KLife`  
Target repo: `C:\Users\User\AI-Atomic-Framework`  
Status: **0041 / 0042 / 0052 dogfood 已收**；quick-repair **0065 / 0067 / 0069** 與 **0068** 已 upstream 落地；下一條主線 **0043+** 或 **0014–0022 batch**

---

## New Thread Opening Prompt

**請開一個新的 Cursor 對話**，第一則訊息貼以下內容（或直接 `@` 本檔）：

```text
請把這個新對話標題設為：MAO M7 — 0043 起接續 / backlog 0066·0070

你是 MAO M7 closeback / operator ergonomics 的 continuation worker。
不要假設任何先前聊天歷史；只依本機 workspace 與交接文件開始。全程使用繁體中文。

Planning repo: C:\Users\User\3KLife
Target repo: C:\Users\User\AI-Atomic-Framework

第一步（必做）：
1. 讀 C:\Users\User\3KLife\docs\agent-identity-map.md，執行 actor adopt（editor=cursor, model=composer-2.5 或你實際使用的 model）
2. 讀 C:\Users\User\3KLife\docs\keep.summary.md
3. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\multi-agent-orchestration\HANDOFF-2026-06-17-DOGFOOD-BUGFIX-CONTINUATION.md（本檔全文）
4. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\ATM_BUG_OPTIMIZATION_BACKLOG.md（§2026-06-17 dogfood 區）
5. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\broker-collision-evidence\parallel-0041-0042-coordination.md
6. 從 target repo 執行：
   node atm.mjs next --prompt "Continue MAO M7 from TASK-MAO-0043 after 0041/0042 dogfood close" --json
7. 若 next 回傳 ATM_USER_NOTICE 或 evidence.userNotice，先展示給使用者
8. 讀 evidence.nextAction.playbook 後才 claim / 編輯 / close

開場先回報：
- 0041 / 0042 / 0052 planning + AAF ledger 狀態
- 兩個 repo 的 dirty 摘要（尤其 AAF 上是否有別 agent 的 TASK-MAO-0014 WIP）
- 開放 backlog：0066、0070
- 你建議的下一張卡與理由
- 第一個要執行的 governed 命令

硬規則（不可違反）：
- 禁止 git checkout -- / git restore 清掉其他 agent 或別 task 的 WIP
- 禁止 git reset --hard、git clean、--no-verify、--force（除非使用者明確授權且任務卡允許）
- 接任務前：node tools_node/task-lock.js check → lock → 更新任務卡 frontmatter（見 CLAUDE.md / AGENTS.md）
- AAF 框架檔編輯前：framework-mode claim --files ... → 收工 release
- release/ 目錄被 .gitignore；onefile / root-drop 需 git add -f
- 不要 commit 除非使用者明確要求
- close 一律走 taskflow：pre-close → close dry-run（讀 writeReadinessHint）→ close --write
```

---

## 本輪已完成（摘要）

### 平行 dogfood：TASK-MAO-0041 + TASK-MAO-0042

| 項目 | 狀態 |
|------|------|
| Broker 碰撞實驗 | `parallel-0041-0042`；runId `c393df1d-f9ab-4331-ac3e-3182df57ac45` |
| Territory split | 見 `broker-collision-evidence/parallel-0041-0042-coordination.md` |
| TASK-MAO-0041 | planning `done`；evidence bundle + directory deliverables |
| TASK-MAO-0042 | planning `done`；validator scope taxonomy |
| TASK-MAO-0052 | planning `done`；`next` playbook 改教 taskflow close 三階段 |

### Quick repair + AAO-0136 slice（AAF upstream）

| Bug | 狀態 | AAF commit |
|-----|------|------------|
| BUG-ATM-0065 | fixed | `6abae8040`（depends_on 模板清理） |
| BUG-ATM-0067 | fixed | `6abae8040`（git-head-evidence hint） |
| BUG-ATM-0069 | fixed | `6abae8040`（staged non-bundle restore hint） |
| BUG-ATM-0068 | fixed | `00519573b`（`detectHistoricalDeliveryCommit` + dry-run SHA promotion） |
| root-drop steward | synced | `68f515a2e` |

**0068 修法要點：** delivery 已 commit 後第二次 close，`writeReadinessHint.blockers[].requiredCommand` 與 `nextCommand` 會帶偵測到的 `--historical-delivery <sha>`（來源：planning `delivery_commit` → `ATM-Task` trailer git log → scoped recent commits）。

### 3KLife planning commits

| Commit | 內容 |
|--------|------|
| `36467563` | dogfood bug 匯總；0065/0067/0069 標 fixed |
| `c5a75f4c` | 0068 標 fixed；paper / MAO index / 0045–0048 / 0051 卡同步 |

**均未 push**（截至本交接撰寫時）。

---

## 開放 backlog（優先處理）

| Bug | 嚴重度 | 建議路線 |
|-----|--------|----------|
| **BUG-ATM-0066** | P1 | 開小 AAO 卡：`taskflow open --refresh` 或 claim-window 內 governed re-import，避免 `--force` + emergency lease |
| **BUG-ATM-0070** | P2 | broker `plan-batch` 同 anchor 第二個 `insertAfterHeading` 被擋；需 fixture + adapter rule |

完整條目：`docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`

---

## MAO 任務卡狀態（M7 主線）

### 已 done（本輪相關）

`0037`, `0038`, `0039`, `0040`, `0041`, `0042`, `0049`, `0050`, `0051`, `0052`

### 下一批 planned（建議接續順序）

| 卡 | 標題 | 優先級 | 備註 |
|----|------|--------|------|
| **0043** | Claim repair diagnose/write + lifecycle owner | P2 | 0044 的 depends_on |
| **0044** | Task-view dashboard over preflight summary | P2 | 依賴 0043 |
| **0045** | Closeback operator runbook | P2 | 文件向；可與 0043 平行若無 scope 衝突 |
| **0046** | Route freeze protocol runtime integration | P1 | M8 入口；0047/0048 鏈起點 |
| **0047** | Patch envelope broker handoff | P1 | depends 0046 |
| **0048** | MAO event replay benchmark | P1 | depends 0046+0047 |

索引 SSOT：`docs/tasks/tasks-mao.json` + `multi-agent-orchestration/tasks/*.task.md`

### 平行線：MAO-0014–0022 Runner Broker batch

- 規劃書（**尚未 commit**）：`PLAN-MAO-0014-0022-TWO-PHASE-BATCH.md`
- 教訓文件（**尚未 commit**）：`LESSONS-MAO-WAVE-MODE-BATCH-CLOSEBACK.md`
- AAF 上 **0015 已有 close commit**（`61f6df931`），但 planning `tasks-mao.json` 仍顯示 0014–0016 為 `planned` — **接續前先 reconcile planning index vs AAF ledger**
- AAF worktree 可見 **0014 WIP**（`runner-ref-store.ts`, `validate-runner-refs.ts` 等 untracked）— **勿覆蓋、勿 restore 別人 dirty**

---

## 關鍵路徑

| 用途 | 路徑 |
|------|------|
| Bug backlog | `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md` |
| 0041/0042 協調 SSOT | `docs/ai_atomic_framework/broker-collision-evidence/parallel-0041-0042-coordination.md` |
| MAO profile | `docs/ai_atomic_framework/multi-agent-orchestration/taskflow.profile.json` |
| 0068 實作 | `packages/cli/src/commands/tasks/historical-delivery.ts`（`detectHistoricalDeliveryCommit`） |
| Close hint | `packages/cli/src/commands/taskflow.ts`（`buildTaskflowCloseWriteReadinessHint`） |
| 上一輪 M7 handoff（0036 時代） | `HANDOFF-2026-06-17-M7-M8-MAO-CONTINUATION.md` |

---

## 3KLife — 未 commit / 未追蹤（接續可選）

### Modified（新一輪 team-agents 編輯，本交接未納入 commit）

- `docs/ai_atomic_framework/team-agents/tasks/README.md`
- `TASK-TEAM-0011` ~ `0014`, `0018`, `0019` 等卡
- `docs/tasks/tasks-team.json`, `tasks-team-part-1.json`

### Untracked（建議下一輪評估是否 commit）

| 檔案 | 說明 |
|------|------|
| `HANDOFF-2026-06-17-M7-M8-MAO-CONTINUATION.md` | 舊 M7 handoff |
| **本檔** `HANDOFF-2026-06-17-DOGFOOD-BUGFIX-CONTINUATION.md` | 本輪交接 |
| `PLAN-MAO-0014-0022-TWO-PHASE-BATCH.md` | 0014–0022 批次規劃 |
| `LESSONS-MAO-WAVE-MODE-BATCH-CLOSEBACK.md` | wave mode 教訓 |
| `CID衝突解決紀錄log.md` | CID 衝突紀錄 |
| `tools_node/monitor-parallel-0041-0042.js` | dogfood 監控腳本 |
| `tools_node/run-broker-parallel-0041-0042-dogfood.js` | dogfood 執行腳本 |
| `team-agents/ATM多語言WorkerAdaptor方案.md` | worker adaptor 方案 |
| `TASK-TEAM-0031` ~ `0036` | team runtime 新卡 |

---

## AI-Atomic-Framework — worktree 警告

**大量 dirty / untracked，多屬其他 task 或 runtime 殘留，不要整包 add。**

常見類別：

- `.atm/history/evidence/TASK-MAO-0023` ~ `0034` modified
- `TASK-MAO-0014` direction lock + broker / runner-ref WIP（**codex-captain 或別 agent**）
- `broker-runs/`, `historical-batches/`, `broker-parallel-0041-0042/` runtime
- `packages/core/src/broker/runner-*` 多檔 untracked（0014–0022 線）

**接續編輯前必做：**

```bash
node atm.mjs framework-mode status --json
node atm.mjs guard git --task <task-id> --actor <actor> --json
```

若 `ATM_FRAMEWORK_STALE_LOCK_CLEANUP_REQUIRED`：先 `framework-mode release --actor <you>` 再 claim。

**Release 鏡像 commit 慣例：**

1. `npm run build`
2. `framework-mode claim --files <source,release/atm-onefile/*>`
3. commit source + `git add -f release/atm-onefile/...`
4. 另開 steward commit：`git add -f release/atm-root-drop/` → `chore(release): sync ATM root-drop artifacts`
5. `framework-mode release`

---

## Close 操作備忘（兩段式 delivery）

當 delivery 已在先前 commit 落地：

```bash
# 1. dry-run 讀 writeReadinessHint（應含 --historical-delivery <sha>）
node atm.mjs taskflow close --task TASK-MAO-XXXX --actor <actor> --profile <profile> --json

# 2. 用 promoted command 或手動帶 SHA
node atm.mjs taskflow close --task TASK-MAO-XXXX --actor <actor> --profile <profile> \
  --historical-delivery <delivery-sha> --write --json
```

若 worktree 有 foreign dirty：`--historical-delivery` + 必要時 `--waiver-out-of-scope-delivery --reason "..."`。

---

## 建議下一輪優先序（Captain 可調整）

1. **Reconcile** planning `tasks-mao.json` 與 AAF ledger（0014–0016 狀態漂移）
2. **Commit** 本交接 + PLAN + LESSONS + dogfood 腳本（若 Captain 同意）
3. **TASK-MAO-0043** claim → implement → governed close
4. 或平行開 **BUG-ATM-0066** 小 AAO slice（與 0043 語意重疊，可合併規劃）
5. **BUG-ATM-0070** 需 broker fixture，適合獨立小卡
6. **0014–0022 batch**：讀 `PLAN-MAO-0014-0022-TWO-PHASE-BATCH.md` 後再動手，避免與現場 0014 WIP 衝突

---

## 驗證命令（接續改 taskflow 時）

```bash
# AAF
node --strip-types packages/cli/src/commands/tasks/__tests__/historical-delivery.test.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
npm run typecheck
npm run validate:cli

# 3KLife health
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
```

---

## 相關 commits 速查

### 3KLife（master，ahead of origin）

```
c5a75f4c docs(atm): mark BUG-ATM-0068 fixed and sync MAO planning artifacts
36467563 docs(atm): record 0041-0042 dogfood bugs and mark 0065/0067/0069 quick repairs done
0bbb5ef6 Add broker collision evidence
19074073 docs(taskflow): close TASK-MAO-0042 planning bundle
b3086fb6 docs(taskflow): close TASK-MAO-0041 planning bundle
```

### AI-Atomic-Framework（main）

```
68f515a2e chore(release): sync ATM root-drop artifacts
00519573b fix(taskflow): promote detected historical-delivery SHA in close dry-run hints
6abae8040 fix(taskflow): quick-repair opener template, close hints, and index isolation UX
61f6df931 chore(taskflow): close TASK-MAO-0015 governance bundle
```

---

*End of handoff — 新對話請從「New Thread Opening Prompt」開始。*
