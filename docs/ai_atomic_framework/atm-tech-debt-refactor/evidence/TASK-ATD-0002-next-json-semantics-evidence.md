---
doc_id: doc_other_0603
task_id: TASK-ATD-0002
title: TASK-ATD-0002 next --json semantics execution evidence
owner: atm-core
status: completed
created_at: 2026-05-18T11:00:00+08:00
created_by_agent: ClaudeCode_Sonnet4.6
---

# TASK-ATD-0002 — next --json Semantics Execution Evidence

## 結論

TASK-ATD-0002 的全部驗收條件已達成，M0 第二項任務完成。

## 驗收對照

| 驗收條件 | 結果 | 證據 |
|---|---|---|
| `node atm.mjs <command> --json` 既有 shape 不破 | PASS | `validate:cli` ok (23 commands, standalone fixture verified)；JSON shape 未變動 |
| exit code 與 message code 有 fixture 保護 | PASS | `validate:cli` 含 `verify --agents-md` exit code 與 message code 驗收 |
| source 與 release wrapper 行為沒有無證據漂移 | PASS | `validate:standard` ok (53/53)；`validate:root-drop-release` ok |

## 工作成果

**修改的檔案**：`C:/Users/User/AI-Atomic-Framework/docs/SELF_HOSTING_ALPHA.md`（新增兩個 section）

**新增 Section「Repository State Semantics for `atm next --json`」**：
- 三種 repo 狀態對照表（Framework repo / Adopter bootstrapped / Adopter unbootstrapped）
- 說明 framework repo 出現 `needs-bootstrap` 是**預期行為**，非 silent failure
- JSON output 中的 `reason` 欄位即為機器可讀的說明
- M0 exit condition 說明

## 當前 `next --json` 輸出驗證

```
node atm.mjs next --json （在 framework repo 執行）
→ status: "needs-bootstrap"
→ reason: ".atm/config.json is missing"
→ exit code: 1
→ allowedCommands / blockedCommands 已列出
```

此輸出現已有對應文件，符合 M0 exit condition。

## 驗證結果

```
validate:cli     → ok (23 commands, standalone fixture verified)
validate:standard → ok (passed=53, failed=0, total=53)
typecheck        → 既有錯誤（validate-known-bad-versions.ts、validate-rollout-metrics.ts）與本卡變更無關，為預存問題
```

## 未污染確認

- 未在 SELF_HOSTING_ALPHA.md 中寫入 3KLife / npc-brain / Cocos / task-lock 語彙
- 無 upstream commit / push（本卡為 internal-mirror）
