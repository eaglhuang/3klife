---
doc_id: doc_cid_0019
task_id: TASK-CID-0019
title: "Deterministic composer and MergePlan"
status: done
completed_at: "2026-06-08T15:57:19.559Z"
completed_by_agent: "008"
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0015"
  - "TASK-CID-0018"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/compose.ts"
  - "packages/core/src/broker/merge-plan.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-compose.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
deliverables:
  - "packages/core/src/broker/compose.ts"
  - "packages/core/src/broker/merge-plan.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-broker-compose.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-compose.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the composer/merge-plan commit and remove the compose CLI surface if deterministic composition proves unstable."
atomizationImpact:
  ownerAtomOrMap: "atm.merge-plan-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card births the deterministic merge-planning layer for same-file CID-disjoint proposal sets."
outOfScope:
  - "Steward patch apply"
  - "team or next integration"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0019 - Deterministic composer and MergePlan

## Goal

Generate deterministic `MergePlan.v1` output for proposal sets that target the same file but remain CID-disjoint and non-overlapping by anchor/range.

## Why This Exists

A proposal runtime alone only captures write intent. ATM still needs a deterministic decision about whether two or more proposal capsules can be composed safely or must escalate to mediation or serial execution.

## Acceptance Criteria

- A composer can inspect multiple proposals and emit `MergePlan.v1`.
- Non-overlapping same-file CID-disjoint proposals can be composed into one final patch plan.
- Overlapping anchors or ranges fail closed instead of silently merging.
- The output is deterministic for the same input set.
- The compose validator is registered through `package.json` and `scripts/validators.config.json`.
- This card does not yet apply the final patch to disk.

## Notes

This card still follows the compact captain cadence: one main `007` implementation packet, then one `005` / `006` closeout pass, with captain-owned sidecars reserved for read-only matrix checking only.
