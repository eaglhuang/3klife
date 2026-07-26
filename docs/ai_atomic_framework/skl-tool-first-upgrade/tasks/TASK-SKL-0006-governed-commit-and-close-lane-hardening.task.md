---
task_id: TASK-SKL-0006
title: Governed commit and close lane hardening
status: superseded
superseded_by:
  - TASK-LANE-0022
  - ATM-GOV-0250
  - ATM-GOV-0257
  - ATM-GOV-0258
  - ATM-GOV-0259
  - ATM-GOV-0265
closed_reason: "Plan 3.1 and LANE cards delivered the residue, ownership, staged-bundle, runner publication, and close/commit hardening as narrower governed capabilities."
retirement_policy: "Do not import or claim this historical umbrella card. Route new defects to the owning seam or ATM bug backlog."
milestone: P3
depends_on:
  - TASK-SKL-0003
  - TASK-SKL-0004
  - TASK-SKL-0005
  - TASK-SKL-0007
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
  - "packages/core/src/**"
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
  notes: "Revert the hardening commit if residue diagnostics or claim protections regress."
atomizationImpact:
  ownerAtomOrMap: "atm.close-commit-lane-hardening"
  mapUpdates: []
out_of_scope:
  - "Do not normalize residue by mutating .atm runtime state directly."
  - "Do not turn emergency or foreign governance conditions into silent success."
nonGoals:
  - "No new alternate close lane."
  - "No broad rewrite of unrelated runtime hygiene rules."
---

# TASK-SKL-0006

## Retirement

Superseded by the completed Plan 3.1 and LANE hardening chain. Reopening this
broad umbrella would duplicate already sealed ownership, staged-bundle,
runner-publication, and close/commit policies. New defects must route to the
specific owning seam or the ATM bug backlog.

## Goal

針對 governed commit / close lane 的 runtime residue、foreign active-claim、cross-repo target 對齊與 staged foreign governance artifacts 做最後 hardening。

## Acceptance

- Known runtime residue is classified and surfaced without forcing operators to infer meaning from raw filesystem noise.
- Foreign active-claim and staged foreign governance artifacts are disclosed with machine-readable blockers or advisories as appropriate.
- Planning repo vs framework repo boundaries remain explicit in tool results for close/commit flows.
- `taskflow pre-close` and `taskflow close` share a consistent blocker surface for residue-related failures.
- Recurrent tooling mismatches or close/commit wall-hits can be captured through the shared skill-growth contract instead of being rediscovered ad hoc.

## Non-Goals

- No manual mutation of `.atm/history/**` or `.atm/runtime/**`.
- No downgrade of fail-closed blockers into permissive warnings.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- This card is the dogfood-safety closer for the SKL lane. It should make tool-first governance survivable in messy real repos, not only in clean fixtures.
- It should also prove that the shared growth contract produces actionable close/commit lessons instead of dead notes.
