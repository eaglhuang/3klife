---
doc_id: doc_other_asr_0009
task_id: TASK-ASR-0009
title: root-drop wrappers.json SSoT manifest
layer: L3
status: done
blocked_by: []
owner: atm-core
related_plan: docs/ai_atomic_framework/atm-self-refactor/ATM自我治理拆分計畫書.md
upstream_repo: AI-Atomic-Framework
alphaGate: validate-script-parity
public_tracking: false
allowed_files:
  - templates/root-drop/.atm/scripts/wrappers.json
created_at: 2026-05-20T02:00:00+08:00
created_by_agent: ClaudeCode_Opus4.7
started_at: 2026-05-20T02:00:00+08:00
started_by_agent: ClaudeCode_Opus4.7
completed_at: 2026-05-20T02:10:00+08:00
completed_by_agent: ClaudeCode_Opus4.7
upstream_commit: 947849f
---

# TASK-ASR-0009 — root-drop wrappers.json SSoT manifest

## 目標

WRAPPER_DEDUP_PLAN.md Step 1。建立 7 個 root-drop wrapper 的單一事實來源。Generator (Step 2) 與 parity validator (Step 3) 在後續 follow-up 卡執行。

## 重要發現

實際 wrapper 各有自己的 extraArgs，**不是** SPLIT_PLAN 預設的「只有 subcommand」這麼單純：

| Wrapper | subcommand | extraArgs |
|---------|-----------|-----------|
| atm-create | create | `--bucket CORE --dry-run` |
| atm-evidence | explain | `--why blocked` |
| atm-handoff | handoff | `summarize` |
| atm-lock | lock | `check` |
| atm-next | next | `(無)` |
| atm-orient | orient | `--cwd .` |
| atm-upgrade-scan | upgrade | `--scan` |

manifest 必須完整捕捉每個 wrapper 的真實調用合約。

## 輸出

`templates/root-drop/.atm/scripts/wrappers.json`（new）

## 驗收條件

- [x] `validate-script-parity` ok (7 POSIX + 7 PowerShell wrappers, init install, hello-world smoke)
- [x] I3 release wire format 不變（14 個既有 wrapper 一字未動）

## Validation Evidence

2026-05-20 | 狀態: done | 驗證: script-parity:validate ok (7 POSIX + 7 PowerShell wrappers) | 變更: 建立 SSoT manifest，14 個既有 wrapper 未變動；commit 947849f。
