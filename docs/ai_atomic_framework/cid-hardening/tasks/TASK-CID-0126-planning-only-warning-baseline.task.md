---
task_id: TASK-CID-0126
doc_id: doc_cid_0126
title: "Planning-only warning baseline"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: "docs/ai_atomic_framework/cid-hardening/CID hardening plan.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0125"
scopePaths:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-planning-only-warning-baseline.md"
  - "scripts/validate-planning-only-baseline.cjs"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0126-planning-only-warning-baseline.task.md"
deliverables:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-planning-only-warning-baseline.md"
  - "scripts/validate-planning-only-baseline.cjs"
validators:
  - "git diff --check"
  - "node scripts/validate-planning-only-baseline.cjs"
evidence:
  required: command-output
rollback:
  strategy: revert-baseline
  notes: "Revert the planning-only baseline, report, and validator if the acknowledged finding set changes."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-warning-baseline"
outOfScope:
  - "Do not acknowledge cross-repo packet or legacy-baseline warning buckets."
  - "Do not change ATM audit source code."
  - "Do not modify framework target deliverables."
nonGoals:
  - "Do not close or mutate the affected historical planning-only tasks."
---

# TASK-CID-0126 - Planning-only warning baseline

## Goal

Resolve the current `ATM_TASK_AUDIT_PLANNING_ONLY_DONE` warning bucket by recording a repo-local warning baseline for the verified planning-only done findings.

## Required Behavior

- Preserve the underlying audit findings in `tasks audit` output with baseline acknowledgement rather than suppressing them.
- Acknowledge only `ATM_TASK_AUDIT_PLANNING_ONLY_DONE` findings observed in the current 3KLife audit.
- Keep cross-repo packet and legacy-baseline warning buckets for later CID cards.
- Add a validator that fails when any active, unacknowledged planning-only finding remains.

## Acceptance Criteria

- `node scripts/validate-planning-only-baseline.cjs` reports zero active `ATM_TASK_AUDIT_PLANNING_ONLY_DONE` findings.
- `node atm.mjs tasks audit --json` remains `ok=true`.
- The report lists the acknowledged count and remaining warning buckets.
---
