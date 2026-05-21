---
doc_id: doc_other_0164
task_id: TASK-MRP-0023
title: atm do --task X（Agent 一行指令執行任務）
milestone: M23
status: done
started_at: 2026-05-21T04:15:00Z
started_by_agent: ClaudeCode_haiku-4.5
completed_at: 2026-05-21T04:35:00Z
blocked_by: [TASK-MRP-0025, TASK-MRP-0027]
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
---

# TASK-MRP-0023 — atm do --task X（Agent 一行指令執行任務）

## 目標

目前 Agent 執行一個 ATM 任務需要手動跑多個指令（`reserve → promote → claim → 各種 apply → close`）。每一步都要 Agent 記住上一步 output 並決定下一步指令，容易出錯，UX 很差。

`atm do --task X` 把任務生命週期**前段**包成一個指令，Agent 只需知道 task ID，reserve→promote→claim 自動完成。Agent 只負責執行實際工作，完成後呼叫 `complete`。

---

## 現況 vs 目標

| 現況（需要 5+ 步） | `atm do` 後（2 步） |
|--------------------|---------------------|
| `node atm.mjs reserve TASK-ID` | `node atm.mjs do --task TASK-ID --json` |
| `node atm.mjs promote TASK-ID` | ↓ 自動完成到 claimed |
| `node atm.mjs claim TASK-ID` | Agent 執行實際工作 |
| 執行實際工作... | `node atm.mjs do --task TASK-ID complete --evidence ./e.json --json` |
| `node atm.mjs close TASK-ID --evidence ./e.json` | ↓ 自動 close |

---

## CLI 設計

```bash
# 執行單一任務（自動 reserve → promote → claim）
node atm.mjs do --task TASK-MRP-0022 --json
# → { "taskId": "TASK-MRP-0022", "phase": "claimed", "hint": "Ready. Call `atm do --task X complete` when done." }

# 標記任務完成（Agent 執行完實際工作後呼叫）
node atm.mjs do --task TASK-MRP-0022 complete --evidence ./evidence.json --json
# → { "taskId": "TASK-MRP-0022", "phase": "closed", "closedAt": "..." }

# 查看目前進行中的 do session
node atm.mjs do --status --json
# → { "activeTasks": [{ "taskId": "...", "phase": "claimed", "claimedAt": "..." }] }
```

---

## 設計原則

1. **lifecycle 自動化**：`reserve → promote → claim` 自動連鎖，不需 Agent 知道順序
2. **Evidence 不自動**：`close` 仍需 Agent 提供 evidence JSON，不允許空 evidence close
3. **冪等**：如果任務已在 `claimed` 狀態，`do --task X` 直接回報 claimed，不報錯、不重置
4. **blocked 提前告知**：`blocked_by` 有未完成任務 → 立即輸出 `blockingTasks` 清單，不進入 reserve

---

## 輸入

- task card（TASK-ID.task.md）
- `--evidence <path>`：evidence JSON（complete 時必需）

## 輸出

1. `node atm.mjs do --task <id> --json`（reserve → promote → claim 自動完成）
2. `node atm.mjs do --task <id> complete --evidence <path> --json`（close）
3. `node atm.mjs do --status --json`（查看進行中任務）

## 驗收條件

- [ ] `do --task X` 後任務狀態自動到 `claimed`
- [ ] `blocked_by` 未完成 → 立即輸出 `blockingTasks`，不 reserve
- [ ] `complete --evidence` 正確 close 任務並寫入 evidence
- [ ] 任務已在 `claimed` 狀態 → 冪等，繼續，不報錯
- [ ] `do --status` 列出所有 in-progress 任務
- [ ] evidence 為空或路徑不存在 → 拒絕 complete，輸出清楚錯誤

## 影響檔案

- `packages/core/src/cli/do.ts`（新增 `do` subcommand）
- `packages/core/src/lifecycle/auto-lifecycle.ts`（新增 reserve→promote→claim 鏈）
- `tests/lifecycle/auto-lifecycle.test.ts`（新增）

## 穩定性護欄

| 風險 | 護欄 |
|------|------|
| 自動鏈鎖隱藏中間錯誤 | 每一步失敗都必須在 output 明確標記哪一步、為什麼，並停止後續步驟 |
| reserve 成功 promote 失敗 → 僵屍狀態 | 失敗時自動執行 reverse rollback（unreserve），輸出 cleaned-up 狀態 |
| 冪等覆蓋真實問題 | 已 claimed 狀態繼續時，必須顯示 `previousClaimAt`，讓 Agent 知道是延續 |
| 自動化使 evidence 品質下降 | `complete` 仍要求人工提供 evidence，不允許空 evidence；空 evidence → 拒絕 close |

## 失敗時的反向 rollback

```
reserve OK → promote FAIL
  → 自動執行 unreserve
  → 輸出 { "phase": "rolled-back-to-pristine", "failedStep": "promote", "reason": "..." }

reserve OK → promote OK → claim FAIL
  → 自動執行 unpromote, unreserve
  → 輸出 cleaned-up 狀態
```

**永遠不留下半完成的任務狀態**。

## 回滾策略

**Level 1（軟回滾）**：移除 `do.ts` 與 `auto-lifecycle.ts`；現有 reserve/promote/claim/close 各自指令完全不受影響。

**Level 2（殘留任務狀態清理）**：如果某任務卡因 `do` 失敗導致狀態混亂，使用既有 `node atm.mjs unclaim TASK-ID` 等指令手動清理。

**Level 3（災難恢復）**：使用 TASK-MRP-0027 的 `rescue diagnose` 找出所有處於僵屍狀態的任務卡。

## 2026-05-21 v2-r2 審查補充

- `atm do --task` 是 lifecycle UX，不是自動完成器；不可自動填寫 intent / impact / evidence。
- 對 locked、blocked、stale dependency 的 task 必須 fail closed，不得搶鎖或重置狀態。
- `complete` 必須讀取 M25 evidence，且 `_isValid=true` 才能 close。
- 需要 `--dry-run` 顯示將執行的 reserve / promote / claim / complete 步驟。

新增驗收：
- [ ] locked task 回傳 lock owner 與 routeHint，不進入 reserve
- [ ] blocked_by 未完成時不進入 reserve
- [ ] `_isValid=false` evidence 不能 complete
- [ ] `--dry-run` 不寫任何 task state

## Checklist

- [ ] reserve → promote → claim 自動鏈
- [ ] blocked_by 前置檢查
- [ ] complete → close 並驗證 evidence 存在
- [ ] 冪等邏輯（已 claimed 狀態處理）
- [ ] do --status 實作
- [ ] CHANGELOG 補記
