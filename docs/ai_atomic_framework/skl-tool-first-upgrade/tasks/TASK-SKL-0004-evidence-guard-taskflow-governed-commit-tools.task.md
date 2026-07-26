---
task_id: TASK-SKL-0004
title: Evidence, guard, taskflow, and governed commit tools
status: done
completed_at: "2026-06-23T16:11:14.466Z"
completed_by_agent: codex-main
delivery_commit: 596b6d6ca
milestone: P1
depends_on:
  - TASK-SKL-0001
  - TASK-SKL-0002
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/**"
  - "packages/core/src/**"
  - "tests/cli/**"
  - "docs/**"
deliverables:
  - "packages/cli/src/commands/**"
  - "tests/cli/**"
  - "docs/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the operator-tool commit if evidence, guard, close, or commit lanes lose their existing protections."
atomizationImpact:
  ownerAtomOrMap: "atm.tool-first-operator-surface"
  mapUpdates: []
out_of_scope:
  - "Do not bypass existing taskflow close gates."
  - "Do not weaken commit trailer or governance evidence binding."
nonGoals:
  - "No full skill migration in this card."
  - "No remote execution broker."
---

# TASK-SKL-0004

## Historical closeback

Target delivery commit `596b6d6ca` closed this card on
`2026-06-23T16:11:14.466Z`. The planning mirror remained stale at `planned`;
this closeback records the target-ledger truth and prevents duplicate execution.

## Goal

把 `evidence / guard / taskflow / governed commit` 落地為結構化 operator tools，讓 close/commit/evidence lane 有一致 output 與 machine-readable blockers。

## Acceptance

- `atm_evidence_run` returns validator summaries, artifact paths, and command-backed evidence metadata.
- `atm_guard_run` exposes pass/fail findings in a stable shape.
- `atm_taskflow_open`, `atm_taskflow_pre_close`, and `atm_taskflow_close` surface readiness hints, blockers, and evidence plans without text scraping.
- `atm_git_commit` exposes commit result, lane diagnostics, and evidence binding metadata.
- Operator-tool output can carry reusable diagnostics that later feed shared skill-growth capture, especially for blocked evidence, guard, close, and commit flows.

## Non-Goals

- No hardening of every residue edge case in this card; that belongs to `TASK-SKL-0006`.
- No conversion of arbitrary shell commands into official ATM tools.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- This card should keep `taskflow` on the official operator lane instead of reusing older ad-hoc `tasks close` style entrypoints.
