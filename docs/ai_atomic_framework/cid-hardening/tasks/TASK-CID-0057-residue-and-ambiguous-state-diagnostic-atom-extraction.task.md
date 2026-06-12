---
doc_id: doc_cid_0057
task_id: TASK-CID-0057
title: "Residue and ambiguous state diagnostic atom extraction"
status: planned
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
---

# TASK-CID-0057 - Residue and ambiguous state diagnostic atom extraction

## Goal

Extract task status, residue, and ambiguous manual review explanations into one diagnostic module.

## Required Behavior

- `tasks status --residue` must explain why a task is ambiguous, blocked, or trusted.
- Ambiguous manual review must include missing evidence type, expected provenance path, and recommended next command.
- Diagnostics must reuse the dependency and closeout provenance atoms rather than reimplementing trust checks.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/residue-diagnostics.test.ts
npm run validate:cli
git diff --check
```

