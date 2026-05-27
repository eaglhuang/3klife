---
doc_id: doc_other_1324
task_id: TASK-AAO-0006
title: "Docs / schema / command drift guard"
status: done
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-AAO-0002"
  - "TASK-AAO-0004"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "schemas/**"
  - "packages/cli/src/commands/command-specs/**"
  - "scripts/validate-docs-command-drift.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-docs-command-drift.ts"
  - "docs/governance/command-surface.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-docs-command-drift.ts"
evidence:
  required: command-backed
  closedAt: "2026-05-27T11:31:47.076Z"
  closedByActor: "copilot"
  closureCommit: "42f7c496c14112e476fe3cd43ec04928236d6ea1"
  relatedCommits:
    - "ec9129471d87e07a3890f5b1114cd6e7d6928e46"
    - "42f7c496c14112e476fe3cd43ec04928236d6ea1"
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.docs-command-drift-map"
  mapUpdates:
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "新增 script / CLI / validator 時，同卡必須更新 atomization ownership map，不把 ownership 留給後續卡。"
outOfScope:
  - "手改 .atm/runtime/**"
  - "把 .atm/history/** 當作功能交付物"
  - "修改 unrelated 3KLife dirty files"
nonGoals:
  - "不在本卡完成整個 AAO 計畫"
  - "不建立第二套 task lifecycle"
  - "不繞過 ATM evidence gate"
---
# TASK-AAO-0006 — Docs / schema / command drift guard

## Goal

把 docs、schema、command spec 的不一致變成 validator 可檢測問題。

## Why

文件教一套、CLI 做一套，是 agent 走錯流程的根源之一。這張卡把 drift 變成硬訊號。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `scripts/validate-docs-command-drift.ts`
- `docs/governance/command-surface.md`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-docs-command-drift.ts`

## Acceptance Criteria

- validator 能列出 docs 提到但 help/spec 缺失的命令。
- validator 能列出 spec 有但 docs 無入口的命令。
- 新增 validator 同卡納入 atomization ownership。

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.docs-command-drift-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
本任務已由 copilot 於 commit ec91294 與 42f7c49 中完全實作並安全關閉。
