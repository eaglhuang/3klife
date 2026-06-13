---
doc_id: doc_cid_0057
task_id: TASK-CID-0057
title: "Residue and ambiguous state diagnostic atom extraction"
status: done
owner: atm-core
priority: P1
milestone: M9
depends_on:
  - "TASK-CID-0053"
  - "TASK-CID-0054"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/residue-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/residue-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.residue-diagnostic-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing closeout trust semantics"
  - "Planning mirror writer behavior"
nonGoals:
  - "Do not convert ambiguous-manual-review into a pass state."
completed_at: "2026-06-13T15:36:17.587Z"
completed_by_agent: "captain"
delivery_commit: "a699c87ed89743055759c0e59ec8975ac10871b9"
---

# TASK-CID-0057 - Residue and ambiguous state diagnostic atom extraction

## Goal

Extract task status, residue, and ambiguous manual review explanations into one diagnostic module.

## Required Behavior

- `tasks status --residue` must explain why a task is ambiguous, blocked, or trusted.
- Ambiguous manual review must include missing evidence type, expected provenance path, and recommended next command.
- Diagnostics must reuse the dependency and closeout provenance atoms rather than reimplementing trust checks.

## Atom/Map Extraction Pattern

- Primary pattern: **Strategy Map**.
- Represent residue buckets as an explicit bucket-to-strategy map: no-residue, stale-import, planning-mirror-only, source-done-governance-incomplete, interrupted-close, ambiguous-manual-review.
- Each strategy must return the same `atm.taskResidueDiagnosis.v1` result contract shape.
- Bucket strategies may call closeout provenance, dependency gate, and lifecycle atoms, but must not reimplement their trust rules.
- False-positive ambiguous cases must be covered by focused fixtures, especially status=done with no divergence.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts
npm run validate:cli
git diff --check
```
