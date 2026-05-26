---
doc_id: doc_other_aao_0016
task_id: TASK-AAO-0016
title: "evidence run / --recent-run 快速入口"
status: planned
owner: atm-core
priority: P0
milestone: M6
depends_on:
  - "TASK-AAO-0015"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/work-channels.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "回滾該任務 commit；若有新增產物或 validator，連同 atomization map 更新一起 revert。"
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-command-map"
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
# TASK-AAO-0016 — evidence run / --recent-run 快速入口

## Goal

降低 evidence add 的冷啟成本，支援 commandRun cache 與 recent-run 引用。

## Why

每張卡重跑同一組 validator 很慢。ATM 應該支援可追蹤的 recent-run，而不是逼 AI 手抄 hash。

## Implementation Contract

- Planning context lives in `3KLife`; read it, but do not treat planning paths as target work unless this card explicitly lists them in `deliverables`.
- Target implementation repo is `AI-Atomic-Framework`.
- Work only inside `scopePaths`; if implementation needs another file, use an official scope amendment instead of editing locks by hand.
- New script, CLI, validator, report, or artifact work must include atomization ownership updates in the same task.

## Deliverables

- `packages/cli/src/commands/evidence.ts`
- `packages/cli/src/commands/command-specs/evidence.spec.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`

## Acceptance Criteria

- `evidence run` 能執行並記錄 commandRuns。
- `evidence add --recent-run` 可引用未過期 run。
- exitCode 非 0 不可被當 pass。


<!-- AAO-feedback-0016-diagnostic-evidence -->
## Feedback Reinforcement Acceptance

- `exitCode != 0` command runs must never be counted as validation passes.
- Add diagnostic / expected-failure evidence support for intentional blocked gates: the command may exit non-zero only when the evidence records `expectedOutcome: blocked|warn|fail` and a remediation plan.
- Closure packets must separate `validationPasses` from `diagnosticEvidence`, so a legitimate failing graduation gate can be recorded without pretending it passed.
<!-- /AAO-feedback-0016-diagnostic-evidence -->

## Rollback

Revert the task commit. If generated artifacts were created, remove them in the same revert and re-run the listed validators.

## Atomization Impact

- Owner atom/map: `atm.evidence-command-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- Any new script/CLI/validator introduced by this card must be mapped before the card can close.

## Notes

This card uses the AAO task-card contract: explicit scope, explicit deliverables, command-backed evidence, rollback, and atomization impact.
