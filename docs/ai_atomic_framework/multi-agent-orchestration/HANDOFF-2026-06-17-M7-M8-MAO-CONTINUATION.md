# MAO M7/M8 Worker Handoff — Closeback Continuation

Created: 2026-06-17  
Owner: cursor-composer-2.5（上一輪 worker）  
Thread title（建議新對話）: `MAO M7/M8 — 0037 起接續`  
Planning repo: `C:\Users\User\3KLife`  
Target repo: `C:\Users\User\AI-Atomic-Framework`  
Status: active continuation — 0036 / 0038 已關；下一條主線從 0037 或 0049 起

---

## New Thread Opening Prompt

**請開一個新的 Cursor 對話**，第一則訊息貼以下內容（或直接 `@` 本檔）：

```text
請把這個新對話標題設為：MAO M7/M8 — 0037 起接續

你是 MAO M7 closeback / operator recovery 的 continuation worker。
不要假設任何先前聊天歷史；只依本機 workspace 與交接文件開始。全程使用繁體中文。

Planning repo: C:\Users\User\3KLife
Target repo: C:\Users\User\AI-Atomic-Framework

第一步（必做）：
1. 讀 C:\Users\User\3KLife\docs\agent-identity-map.md，執行 actor adopt（editor=cursor, model=composer-2.5 或你實際使用的 model）
2. 讀 C:\Users\User\3KLife\docs\keep.summary.md
3. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\multi-agent-orchestration\HANDOFF-2026-06-17-M7-M8-MAO-CONTINUATION.md（本檔全文）
4. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\multi-agent-orchestration\README.md
5. 讀 C:\Users\User\3KLife\docs\ai_atomic_framework\multi-agent-orchestration\tasks\README.md
6. 從 target repo 執行：
   node atm.mjs next --prompt "Continue MAO M7 from TASK-MAO-0037 after 0036 and 0038 close" --json
7. 若 next 回傳 ATM_USER_NOTICE 或 evidence.userNotice，先展示給使用者
8. 讀 evidence.nextAction.playbook 後才 claim / 編輯 / close

開場先回報：
- 0036 / 0038 ledger 狀態（應為 done / released）
- 兩個 repo 的 dirty 摘要
- 你建議的下一張卡（0037 vs 0049）與理由
- 第一個要執行的 governed 命令

硬規則（不可違反）：
- 禁止 git checkout -- / git restore 清掉其他 agent 或別 task 的 WIP
- 禁止 git reset --hard、git clean、--no-verify、--force（除非使用者明確授權且任務卡允許）
- taskflow open 必須帶完整 --output，否則會錯誤解析成 TASK-MAO-XXXX-new-task.task.md
- 接任務前：check → lock → 更新任務卡 frontmatter（見 CLAUDE.md / AGENTS.md）
- 不要 commit 除非使用者明確要求
- MAO 0001～0010 不必重開；M7 止血 close/scope，M8 才接 live logical routing
```

---

## Core Rules

| 規則 | 說明 |
| --- | --- |
| 雙 repo | Planning 在 3KLife；實作與 close 在 AI-Atomic-Framework |
| ATM 命名 | ATM 是產品/CLI/治理名稱；AI-Atomic-Framework 是 repo 名，不要簡稱成 AAF |
| 並行衝突 | 不同 task 可共用 worktree；靠 per-task claim、direction lock、scopePaths 收窄，不是物理 worktree 隔離 |
| 0038 WIP 教訓 | 上一輪曾誤用 checkout 還原 0038 測試；使用者已從 release/atm-root-drop/ 恢復。後續 **禁止** 用 checkout 清別人 dirty |
| Historical close | delivery 已 commit 但 close 當下 worktree 有 foreign dirty 時，用 `--historical-delivery <sha>` |
| Scope glob | `taskflowPathMatches` 不支援 `**`；用目錄尾 `/` 或明列 `targetAllowedFiles` |
| Bug 024/025 | `actor adopt --model` 與 `taskflow open` 缺 `--output` 的已知問題見 backlog |

---

## What Just Happened（本輪摘要）

### 已完成

| Task | 狀態 | 備註 |
| --- | --- | --- |
| **TASK-MAO-0036** | done / released | CLI result contract + exit code policy |
| **TASK-MAO-0038** | done / released | Closeback orchestration route correctness（agent-007 曾 in-progress，已 release 並關完） |

### 0036 交付摘要（target repo）

- `packages/cli/src/commands/shared.ts` — result contract（severity, exitCode, blocking, diagnostics）
- `packages/cli/src/atm.ts` — 出口對齊 contract
- `docs/cli-error-policy.md`、`docs/testing-strategy.md`、`docs/troubleshooting.md`
- `tests/cli/cli-result-contract.test.ts`
- 8 個 `tests/cli-fixtures/help-snapshots/*.json`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

### 0036 關鍵 commits

| Repo | SHA | 說明 |
| --- | --- | --- |
| Target | `7bac147c0` | 0036 主交付 |
| Target | `cdcfc1357` | 補 atm.ts |
| Target | `742334b69` | 補 help snapshots（先前漏 commit 導致 validate:cli 失敗） |
| Target | `f7f59e5f8` | close TASK-MAO-0036 target governance bundle |
| Planning | `4bfa0206` | close TASK-MAO-0036 planning bundle |

Historical close 範例：

```bash
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs taskflow close --task TASK-MAO-0036 --actor cursor-composer-2.5 --historical-delivery 742334b69 --write --json
```

### 0036 close 曾遇 blockers（供下一位參考）

| Blocker | 解法 |
| --- | --- |
| `ATM_TASKFLOW_CLOSE_HISTORICAL_DELIVERY_REQUIRED` | `--historical-delivery <delivery-sha>` |
| Scope 含 0038 的 `taskflow-close-orchestration.test.ts` dirty | 收窄 0036 scopePaths + historical close |
| `upgrade.json` glob / targetAllowedFiles | 修正 scopePaths，不用 `**` |
| Stale direction lock 仍含 `tests/cli/` | release claim → emergency force re-import → 再 claim |
| `ATM_TASK_SCOPE_EXPANSION_REQUIRED`（0038 檔在 worktree） | 用 `tasks claim` 直接 claim，不改 0038 檔 |
| `ATM_TASK_CLOSE_DIRTY_WORKTREE` | 收窄 scope + 刷新 lock |
| `validate:cli` 失敗 | 補 commit help snapshots |

Planning 卡已修正：`scopePaths` 從 `tests/cli/` 改為單檔 `tests/cli/cli-result-contract.test.ts`；新增 `targetAllowedFiles` 明列 deliverables。

---

## MAO 0001～0010 vs M7/M8（共識，勿重開）

**結論：不必重開 TASK-MAO-0001～0010。**

- 0001～0010 的 conflict matrix / route admit **尚未接到 live claim 路徑**（0010 benchmark 多為離線）
- 本輪觀察到的「多路由失敗感」主要來自：**同一 worktree 上不同 task scope 重疊** + **close 路徑未 hardened**，不是 broker 搶同一張 claim
- **M7（0036～0045 + 0049）**：止血 close、scope audit、result contract、historical close、commit bundle
- **M8（0046～0048）**：freeze runtime、patch envelope handoff、event replay benchmark

做完 M7 + M8 可達「同一 repo 下的治理式互不干擾」（非每 agent 一 worktree）。

### Reconciliation 待辦（非重開卡）

見 `tasks/README.md` reconciliation 小節（若存在）：0001 / 0002 / 0006 等 historical reconcile 以 ledger 對齊為主，不另開 0001～0010 實作波次。

---

## Recommended Execution Order

### M7（README 建議）

```
0049（scope add audit）— 可與 0036 並行；0036 已完成 → 0049 可優先或與 0037 並行
0036 ✅ done
0038 ✅ done
0037 → 0039 → 0040 → 0041 → 0042 → 0043 → 0044 → 0045
```

**下一張建議主線：`TASK-MAO-0037`**（Protected override audit ledger）  
**治理 companion：`TASK-MAO-0049`**（Task scope add audit lane）— 可減少 emergency scope 誤用

### M8（0036 結果 contract 就緒後）

```
0046（freeze runtime）→ 0047（patch envelope handoff）→ 0048（event replay benchmark）
```

---

## Next Task Quick Reference

### TASK-MAO-0037

- 卡檔：`docs/ai_atomic_framework/multi-agent-orchestration/tasks/TASK-MAO-0037-protected-override-audit-ledger.task.md`
- status: **planned**
- depends_on: TASK-MAO-0036 ✅
- 主 scope：`emergency.ts`、`hook.ts`、`git-governance.ts`、`atm.ts`、help snapshots、docs

### TASK-MAO-0049

- 卡檔：`docs/ai_atomic_framework/multi-agent-orchestration/tasks/TASK-MAO-0049-task-scope-amendment-audit-lane.task.md`
- 正常 audited `tasks scope add` lane

---

## Command Templates

```bash
# Pre-flight（3KLife）
cd C:\Users\User\3KLife
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop

# Actor identity（target 或 planning，依 ATM 慣例）
node atm.mjs actor adopt --editor cursor --model composer-2.5 --kind ai-agent --json

# Next action
cd C:\Users\User\AI-Atomic-Framework
node atm.mjs next --prompt "Continue MAO M7 from TASK-MAO-0037" --json

# 開卡（必帶 output — Bug 025）
node atm.mjs taskflow open --write --task TASK-MAO-0037 \
  --output "../3KLife/docs/ai_atomic_framework/multi-agent-orchestration/tasks/TASK-MAO-0037-protected-override-audit-ledger.task.md" \
  --json

# Claim 流程（若 next --claim 被 foreign dirty 擋，可試直接 claim）
node atm.mjs tasks reserve --task TASK-MAO-0037 --actor cursor-composer-2.5 --json
node atm.mjs tasks promote --task TASK-MAO-0037 --actor cursor-composer-2.5 --json
node atm.mjs tasks claim --task TASK-MAO-0037 --actor cursor-composer-2.5 --claim-intent write --files "<deliverables csv>" --json

# Historical close（delivery 已 commit 時）
node atm.mjs taskflow close --task TASK-MAO-XXXX --actor cursor-composer-2.5 --historical-delivery <sha> --write --json

# Post-flight close 前
node tools_node/compute-gate.js --profile standard --agent-feedback
node tools_node/task-lock.js unlock <task-id> <agent-name>
```

---

## Current Dirty State（交接當下快照）

交接時 worktree **可能已變**；開場務必重新 `git status`。

### AI-Atomic-Framework

- 多為 untracked `.atm/history/` task-events、evidence batches（正常 runtime 產物）
- 若看到 `release/atm-root-drop/` 或 `release/atm-onefile/` 修改，先確認是否屬於當前 task scope，勿隨意 checkout

### 3KLife

- 多張 MAO 0037～0049 任務卡可能仍為 **untracked**（已寫入磁碟但未 commit）
- `docs/tasks/tasks-mao.json`、`tasks/README.md` 可能有未 commit 更新
- 論文 `docs/ai_atomic_framework/arxiv-paper-v1/paper.md` 有本地修改（通常與 MAO 主線無關，勿混入 MAO commit）

---

## Related Documents

| 文件 | 用途 |
| --- | --- |
| [MAO README](./README.md) | M7/M8 波次總覽 |
| [tasks/README.md](./tasks/README.md) | 任務 roster 與依賴 |
| [taskflow.profile.json](./taskflow.profile.json) | MAO taskflow profile |
| [ATM_BUG_OPTIMIZATION_BACKLOG.md](../ATM_BUG_OPTIMIZATION_BACKLOG.md) | 已知 CLI/治理 bug |
| [agent-identity-map.md](../../agent-identity-map.md) | Actor adopt 入口 |
| [CAPTAIN-HANDOFF-2026-06-15](../team-agents/CAPTAIN-HANDOFF-2026-06-15-ATM-FEATURE-14-CONTINUATION.md) | Captain 線交接格式參考 |

---

## Transcript

完整對話紀錄（含 blocker 細節）：

`C:\Users\User\.cursor\projects\c-Users-User-3KLife\agent-transcripts\20f115ec-3d48-49e2-877e-8ddc0799feb9\20f115ec-3d48-49e2-877e-8ddc0799feb9.jsonl`

搜尋關鍵字：`0036`、`0038`、`historical-delivery`、`ATM_TASK_CLOSE_DIRTY_WORKTREE`、`scopePaths`。

---

## Handoff Checklist（下一位 Agent）

- [ ] actor adopt 完成
- [ ] 讀完本檔 + MAO tasks README
- [ ] `atm.mjs next` 已跑且 playbook 已讀
- [ ] 確認 0036 / 0038 為 done（若否，先報告 blocker）
- [ ] 選 0037 或 0049，執行 lock + claim
- [ ] 全程不用 checkout 清 foreign dirty
- [ ] commit 僅在使用者明確要求時進行
