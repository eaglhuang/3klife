---
doc_id: doc_other_aao_0059
task_id: TASK-AAO-0059
title: "Reconcile closure-packet attestation contract alignment"
status: done
owner: atm-core
priority: P1
milestone: M16
depends_on:
  - "TASK-AAO-0055"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/framework-development.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert reconcile closure-packet contract alignment if schema expansion breaks existing close or reconcile validation."
atomizationImpact:
  ownerAtomOrMap: "atm.task-closure-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "新增第二套 reconcile lifecycle"
  - "修改 unrelated task close semantics"
  - "碰觸 .atm/history/** 作為實作目標"
nonGoals:
  - "重新實作 TASK-AAO-0055 的 reconcile 路由"
  - "變更 TASK-AAO-0057 的 scoped diff isolation 定義"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

# TASK-AAO-0059 - Reconcile closure-packet attestation contract alignment

## Goal

讓 `tasks reconcile` 的 closure packet 契約在型別與驗證層正式對齊，不再只是沿用 `tasks close` 的既有 schema。

## Why

`TASK-AAO-0055` 已先落地 reconcile 命令與 ledger/closure sync 流程，但刻意沒有擴充 `framework-development.ts` 的 reconcile-specific contract。
目前行為可用，但在語意上仍有 gap，例如 reconcile 產物仍可能被標記成 `atm tasks close` 類型的 closure packet。
這張 follow-up 卡的目的是把契約名稱、型別與 validator contract 補齊，避免 reconcile 長期停留在「可用但不精確」狀態。

## Acceptance Criteria

1. `framework-development.ts` 明確表達 reconcile-specific closure packet attestation 或等價契約欄位，不再只靠 `tasks close` 舊 schema 旁通。
2. `validateClosurePacket` 可驗證 reconcile 產物，且不破壞既有 `tasks close` closure packet。
3. `tasks reconcile` 產生的 closure packet 在命名或 attestation 上可與一般 close 區分。
4. `validate-task-ledger-governance.ts` 新增或更新 fixture，覆蓋 reconcile contract 對齊後的成功案例。
5. `path-to-atom-map.json` 同步更新 capability 描述。

## Notes

- 本卡是 `0055` 的 follow-up contract alignment，不是 reopen `0055`
- 若實作時發現需要擴大 command surface，再先回報，不要靜默擴 scope
