---
doc_id: doc_cid_0024
task_id: TASK-CID-0024
title: "Same-file parallel claim and shared delivery closeout follow-up"
status: done
owner: atm-core
priority: P0
milestone: P1
depends_on:
  - "TASK-CID-0022"
  - "TASK-CID-0023"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/tasks/task-transition-helpers.ts"
  - "packages/cli/src/commands/hook.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-task-direction-governance.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "node --strip-types scripts/validate-task-direction-governance.ts --mode validate"
  - "node --strip-types scripts/validate-git-hooks-enforcement.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the closeout/claim/governance follow-up if same-file parallel claim admits ambiguous staged ownership or historical-delivery evidence becomes too permissive."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-closeout-governance-followup-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This follow-up tightens the lifecycle boundary between same-file CID-disjoint claim, steward-produced delivery evidence, and final pre-commit ownership checks."
outOfScope:
  - "Rewriting broker compose or steward apply contracts already proven by TASK-CID-0019 through TASK-CID-0023"
  - "Adding remote multi-repo broker infrastructure"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
---

# TASK-CID-0024 - Same-file parallel claim and shared delivery closeout follow-up

## Goal

Finish the missing lifecycle follow-up after the brokered-write completion pack so ATM can safely treat steward-produced same-file work as first-class claim and closeout behavior, not just as an internal compose/apply proof.

## Why This Exists

`TASK-CID-0019` through `TASK-CID-0023` already proved that same-file CID-disjoint work can be proposed, composed, and applied through a neutral steward lane. What is still incomplete is the operator-facing lifecycle:

- claim should not keep blocking same-file CID-disjoint work just because the file overlaps;
- a later worker should be allowed to close against an earlier shared steward delivery commit instead of being forced to re-commit the same file;
- pre-commit should block only when ATM cannot prove staged ownership or steward/broker evidence coverage.

Without this follow-up, same-file parallel development remains technically possible in the broker lane but operationally confusing at claim and closeout time.

This also covers the "delivery already landed, no more source mutation" case: a worker who only needs governed closeout, evidence alignment, or claim continuity should not be forced back into a write-conflicting claim path when the real deliverable is already complete.

## Acceptance Criteria

- `next --claim` (and any shared claim gate it uses) can admit same-file parallel work when the CID/broker verdict is non-conflicting, instead of forcing file-level serialization by default.
- Claim flow exposes a no-more-mutation / closeout-only intent for tasks whose scoped deliverable already landed, so claim can proceed without reopening unnecessary CID write conflicts.
- `tasks close --status done --historical-delivery <shared-steward-commit>` is documented and validated as a first-class closeout path for later workers whose deliverable already landed through an earlier steward-owned delivery commit.
- `hook pre-commit` no longer fails purely because the staged set touches a file with multiple active same-file claims; it blocks only when steward/broker evidence is missing or staged ownership remains ambiguous.
- Historical-delivery close gates remain scope-tight: a shared steward commit must still prove scoped non-.atm deliverables for the closing task.
- Validators cover both positive and negative cases:
  - same-file CID-disjoint claim admitted;
  - closeout-only / no-more-mutation claim admitted when source mutation is no longer requested and governed delivery evidence already exists;
  - same-file overlapping/unsafe claim still blocked;
  - shared steward historical-delivery close passes when evidence is valid;
  - pre-commit still rejects ambiguous mixed staged content without steward/broker evidence.

## Notes

This is a lifecycle follow-up card, not a second broker-runtime rewrite. Prefer the smallest change set that upgrades claim, closeout, and pre-commit semantics to match the already-shipped steward/composer model. The new closeout-only claim intent must remain non-mutating by contract; it is not a backdoor to bypass normal CID write checks for real source edits.
