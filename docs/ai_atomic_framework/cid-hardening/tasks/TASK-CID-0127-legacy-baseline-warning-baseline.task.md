---
task_id: TASK-CID-0127
doc_id: doc_cid_0127
title: "Legacy baseline warning baseline"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: "docs/ai_atomic_framework/cid-hardening/CID hardening plan.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0126"
scopePaths:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-legacy-baseline-warning-baseline.md"
  - "scripts/validate-legacy-baseline-zero.cjs"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0127-legacy-baseline-warning-baseline.task.md"
deliverables:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-legacy-baseline-warning-baseline.md"
  - "scripts/validate-legacy-baseline-zero.cjs"
validators:
  - "git diff --check"
  - "node scripts/validate-legacy-baseline-zero.cjs"
evidence:
  required: command-output
rollback:
  strategy: revert-baseline
  notes: "Revert the legacy-baseline acknowledgement entries, report, and validator if historical baseline policy changes."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-warning-baseline"
outOfScope:
  - "Do not acknowledge cross-repo packet warnings."
  - "Do not rewrite or re-close the affected historical tasks."
  - "Do not change ATM audit source code."
  - "Do not modify framework target deliverables."
nonGoals:
  - "Do not convert legacy baseline transitions into fresh ATM CLI close events."
---

# TASK-CID-0127 - Legacy baseline warning baseline

## Goal

Resolve the active `ATM_TASK_AUDIT_LEGACY_BASELINE_DONE` warning bucket by recording a repo-local warning baseline for the verified historical baseline findings.

## Required Behavior

- Preserve the underlying audit findings in `tasks audit` output with baseline acknowledgement rather than suppressing them.
- Acknowledge all currently observed `ATM_TASK_AUDIT_LEGACY_BASELINE_DONE` findings in one governed baseline pass.
- Keep `ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET` active for a later larger CID card.
- Add a validator that fails when any active, unacknowledged legacy-baseline finding remains.

## Acceptance Criteria

- `node scripts/validate-legacy-baseline-zero.cjs` reports zero active `ATM_TASK_AUDIT_LEGACY_BASELINE_DONE` findings.
- `node atm.mjs tasks audit --json` remains `ok=true`.
- The report lists the acknowledged count and remaining active warning buckets.
---
