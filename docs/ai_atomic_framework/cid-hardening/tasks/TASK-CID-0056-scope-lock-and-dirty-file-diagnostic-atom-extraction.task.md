---
doc_id: doc_cid_0056
task_id: TASK-CID-0056
title: "Scope lock and dirty file diagnostic atom extraction"
status: done
owner: atm-core
priority: P1
milestone: M9
depends_on:
  - "TASK-CID-0054"
  - "TASK-CID-0055"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/tasks/scope-lock-diagnostics.ts"
  - "packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.scope-lock-diagnostic-atom"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing hook enforcement policy"
  - "Auto-staging files"
nonGoals:
  - "Do not hide out-of-scope dirty files."
completed_at: "2026-06-13T15:22:00.953Z"
completed_by_agent: "captain"
delivery_commit: "e66a033541e2fae110eeb706704e6736d48aafa0"
---

# TASK-CID-0056 - Scope lock and dirty file diagnostic atom extraction

## Goal

Extract allowed-file, dirty-file, direction-lock, and claim-lock diagnostics into one module.

## Required Behavior

- Diagnostics must clearly separate in-scope dirty files, out-of-scope dirty files, ATM runtime side effects, generated artifacts, and untracked files.
- Error responses must include actionable `requiredCommand` when safe and must fail closed when ambiguous.
- Existing TASK-AAO-0141 behavior for scoped staging guidance must remain intact.

## Atom/Map Extraction Pattern

- Primary patterns: **Strategy Map** plus **Result Contract Object**.
- Model dirty-file diagnostics as named buckets with stable semantics: in-scope blocking, closure-governance blocking, advisory unrelated, generated artifact, ignored untracked.
- Each bucket should have a deterministic remediation contract, not free-form prose assembled in multiple callers.
- The atom should be usable by close gates, pre-commit audit, and taskflow bundle preview without duplicating file classification.
- Keep auto-stage decisions out of this atom; it diagnoses and recommends, while taskflow close owns governed staging.

## Validation

```powershell
npm run typecheck
node --strip-types packages/cli/src/commands/tasks/__tests__/scope-lock-diagnostics.test.ts
npm run validate:cli
git diff --check
```
