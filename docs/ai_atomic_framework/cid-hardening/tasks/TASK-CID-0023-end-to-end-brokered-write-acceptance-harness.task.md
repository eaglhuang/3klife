---
doc_id: doc_cid_0023
task_id: TASK-CID-0023
title: "End-to-end brokered write acceptance harness"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0017"
  - "TASK-CID-0020"
  - "TASK-CID-0021"
  - "TASK-CID-0022"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-brokered-write.ts"
  - "scripts/fixtures/brokered-write/disjoint-same-file.scenario.json"
  - "scripts/fixtures/brokered-write/conflict-same-atom.scenario.json"
  - "scripts/fixtures/brokered-write/hash-mismatch.scenario.json"
deliverables:
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-brokered-write.ts"
  - "scripts/fixtures/brokered-write/disjoint-same-file.scenario.json"
  - "scripts/fixtures/brokered-write/conflict-same-atom.scenario.json"
  - "scripts/fixtures/brokered-write/hash-mismatch.scenario.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-brokered-write.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the end-to-end harness commit if the acceptance model proves flaky or produces non-deterministic verdicts."
atomizationImpact:
  ownerAtomOrMap: "atm.brokered-write-acceptance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card formalizes the final acceptance harness and scenario fixtures for the brokered-write lane."
outOfScope:
  - "Adding remote shared-broker infrastructure"
  - "Changing the broker runtime contract itself"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0023 - End-to-end brokered write acceptance harness

## Goal

Add the final acceptance harness that proves the whole brokered-write lane works end to end inside one local repo/workspace.

## Why This Exists

The completion pack is only truly done when one validator can prove the happy path and the blocked paths using the same runtime vocabulary that `tasks parallel`, `team`, and `next` already consume.

## Acceptance Criteria

- A dedicated `validate:brokered-write` script exists in `package.json`.
- The harness proves that same-file CID-disjoint work can go through proposal -> merge plan -> steward final patch.
- The harness proves that same atom/CID conflicts fail closed.
- The harness proves that stale hash/base-commit cases fail closed.
- Team, Next, and Tasks surfaces use one consistent broker verdict model.
- The final harness is registered through both `package.json` and `scripts/validators.config.json`.

## Notes

This is the final gate card for the completion pack, so it should still aim for one main `007` implementation wave and one `005` / `006` closeout wave. Internal sidecars may verify scenario coverage and evidence completeness, but they are not formal worker identities.
