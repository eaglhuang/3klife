---
task_id: TASK-CID-0078
doc_id: doc_cid_0078
title: "Validator remediation command canonicalization"
status: planned
owner: atm-core
priority: P1
milestone: M16
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0075"
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/lib/validator-envelope.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-validator-envelope.ts"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "scripts/lib/validator-envelope.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "scripts/validate-validator-envelope.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-validator-envelope.ts"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if canonicalization starts accepting the wrong validator evidence or hides genuinely missing required commands."
atomizationImpact:
  ownerAtomOrMap: "atm.validator-remediation-command-identity"
  mapUpdates:
    - "scripts/lib/validator-envelope.ts"
    - "scripts/validate-task-ledger-governance.ts"
outOfScope:
  - "Changing which validators are required for a task"
  - "Relaxing command-backed evidence requirements into plain terminal attestation"
nonGoals:
  - "Do not keep exact-string command matching as the only source of validator identity."
  - "Do not accept unrelated commands merely because they share a validator nickname."
---

# TASK-CID-0078 - Validator remediation command canonicalization

## Goal

Normalize validator/remediation command identity so equivalent governed commands
can be recognized without requiring exact string sameness in every evidence and
required-command path.

## Problem

The captain closeback run exposed brittle mismatches like `git diff --check`
versus validator keys and `npm test` versus normalized names. ATM's current
truth model is sometimes stricter about command spelling than about actual
governed intent, which creates false "missing validator" residue.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Keep any extraction scoped to command canonicalization or remediation identity
  only.
- Introduce a canonical representation for validator commands or validator
  identities before they are compared in evidence/remediation flows.
- Equivalent governed spellings must converge onto the same comparison key when
  they really represent the same validator obligation.
- ATM must still fail closed when the command is materially different or when no
  governed evidence exists.
- Validation coverage must prove at least the `git diff --check` and `npm test`
  style equivalence cases.

## Acceptance Criteria

- Equivalent governed validator commands no longer generate false missing-proof
  failures solely because of exact-string mismatch.
- Non-equivalent commands still fail closed.
- `validate-validator-envelope` and `validate-task-ledger-governance` cover the
  canonicalization boundary.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-validator-envelope.ts
node --strip-types scripts/validate-task-ledger-governance.ts --mode validate
git diff --check
```

## Report Back

Report the canonicalization rule, the exact equivalence cases added, and the
guardrail that still rejects materially different commands.
