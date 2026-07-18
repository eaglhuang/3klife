---
task_id: TASK-CID-0128
doc_id: doc_cid_0128
title: "Cross-repo packet warning baseline"
status: planned
owner: atm-core
priority: P0
milestone: M19
related_plan: "docs/ai_atomic_framework/cid-hardening/CID hardening plan.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
depends_on:
  - "TASK-CID-0127"
scopePaths:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-cross-repo-packet-warning-baseline.md"
  - "scripts/validate-cross-repo-packet-baseline.cjs"
planningMirrorPaths:
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0128-cross-repo-packet-warning-baseline.task.md"
deliverables:
  - "docs/governance/tasks-audit-warning-baseline.json"
  - "docs/reports/3klife-cross-repo-packet-warning-baseline.md"
  - "scripts/validate-cross-repo-packet-baseline.cjs"
validators:
  - "git diff --check"
  - "node scripts/validate-cross-repo-packet-baseline.cjs"
  - "node scripts/validate-legacy-baseline-zero.cjs"
  - "node scripts/validate-planning-only-baseline.cjs"
evidence:
  required: command-output
rollback:
  strategy: revert-baseline
  notes: "Revert the cross-repo packet acknowledgement entries, report, and validator if packet authority policy changes."
atomizationImpact:
  ownerAtomOrMap: "atm.task-audit-warning-baseline"
outOfScope:
  - "Do not rewrite or re-close the affected historical tasks."
  - "Do not create per-task closure packets for historical external-planning work in this card."
  - "Do not change ATM audit source code."
  - "Do not modify framework target deliverables."
nonGoals:
  - "Do not convert cross-repo historical planning records into fresh target-repo deliveries."
---

# TASK-CID-0128 - Cross-repo packet warning baseline

## Goal

Resolve the active `ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET` warning bucket in one governed baseline pass, preserving the findings as acknowledged historical planning records.

## Required Behavior

- Preserve the underlying audit findings in `tasks audit` output with baseline acknowledgement rather than suppressing them.
- Acknowledge all currently observed `ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET` findings in one governed baseline pass.
- Keep legacy-baseline and planning-only warning buckets at zero active findings.
- Add a validator that fails when any active, unacknowledged cross-repo packet finding remains.

## Acceptance Criteria

- `node scripts/validate-cross-repo-packet-baseline.cjs` reports zero active `ATM_TASK_AUDIT_CROSS_REPO_DONE_WITHOUT_PACKET` findings.
- `node scripts/validate-legacy-baseline-zero.cjs` reports zero active `ATM_TASK_AUDIT_LEGACY_BASELINE_DONE` findings.
- `node scripts/validate-planning-only-baseline.cjs` reports zero active `ATM_TASK_AUDIT_PLANNING_ONLY_DONE` findings.
- `node atm.mjs tasks audit --json` remains `ok=true`.
- The report lists the acknowledged count and any remaining active warning buckets.
