---
doc_id: doc_other_1027
task_id: TASK-ASA-0020
title: 定義 rollback evidence graduation policy
milestone: M20
status: planned
owner: atm-release
priority: P0
depends_on: [TASK-ASA-0015, TASK-ASA-0016]
related_plan: docs/ai_atomic_framework/atm-self-atomization/ATM框架100%自我原子化計畫書.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
started_at: null
started_by_agent: null
completed_at: null
---

# TASK-ASA-0020 定義 rollback evidence graduation policy

## 背景

ASA final score 顯示 `atom_with_rollback_evidence: 0`。rollback evidence 通常來自 release / deploy / rollback rehearsal 的連續累積，不應用假資料一次補滿。需要明確定義 graduation score 如何看待 policy、plan、rehearsal 與真實 rollback evidence。

## 目標

建立 rollback evidence 的分級計分政策，讓 score gate 可以區分 `missing`、`planned`、`rehearsed`、`release-proven`，避免要求單次 ASA 任務產生不真實的歷史證據。

## 交付物

- 新增或更新 rollback evidence policy JSON / MD。
- 更新 scorer 對 rollback evidence 的計分規則。
- 更新 final checklist，明確標示哪些項目是 release-blocking，哪些是 continuous evidence。

## 驗收標準

- scorer 不再把「已有 policy / rollback plan 但尚未 release-proven」粗暴算成完全 0，除非政策明確要求。
- release-proven evidence 與 rehearsal evidence 在報告中分開呈現。
- 不接受 text-only fake rollback evidence 當作 full pass。

## 驗證命令

```bash
node atm.mjs atomize score --repo . --json
npm run validate:atm-self-atomization
```

## Rollback

Revert rollback evidence scoring policy and restore previous graduation checklist.

## Notes

- 2026-05-26 | status: planned | evidence: pending | reason: ASA graduation needs honest rollback scoring instead of fake evidence padding.
