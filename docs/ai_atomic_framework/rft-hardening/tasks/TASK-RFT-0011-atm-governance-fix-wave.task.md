---
doc_id: doc_rft_0011
task_id: TASK-RFT-0011
title: "ATM governance-fix wave (auto-evidence mapper + reset-open UX + broker/CID unified matrix)"
status: done
started_at: "2026-07-01T02:30:00+08:00"
started_by_agent: claude-code-opus-4-7
owner: atm-core
priority: P0
milestone: RFT-M4
depends_on: [TASK-RFT-0010]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/auto-evidence-mapper.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/import-verify.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/cli/src/commands/taskflow/__tests__/auto-evidence-mapper.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-reset-open-ux.spec.ts"
  - "packages/cli/src/commands/next/__tests__/claim-admission-broker-parity.spec.ts"
  - "scripts/validate-governance-fix-wave.ts"
  - "docs/reports/atm-governance-fix-wave.md"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/cli/src/commands/taskflow/__tests__/auto-evidence-mapper.spec.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-reset-open-ux.spec.ts"
  - "packages/cli/src/commands/next/__tests__/claim-admission-broker-parity.spec.ts"
  - "scripts/validate-governance-fix-wave.ts"
  - "docs/reports/atm-governance-fix-wave.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-fix-wave.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/auto-evidence-mapper.spec.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/import-reset-open-ux.spec.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/claim-admission-broker-parity.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any of the three fixes changes CLI semantics on the golden paths (auto-evidence with valid npm scripts, tasks import with fresh open state, next --claim with truly-conflicting parallel work)."
atomizationImpact:
  ownerAtomOrMap: "atm.governance-fix-wave"
  mapUpdates:
    - "docs/reports/atm-governance-fix-wave.md"
outOfScope:
  - "Rewriting the auto-evidence subsystem beyond the npm-script existence check + fallback"
  - "Rewriting the tasks import subsystem beyond the reset-open detection + UX hint"
  - "Rewriting the broker or CID gate subsystems beyond routing next --claim through the shared conflict-matrix"
  - "Any refactor of tasks.ts, taskflow.ts, or next.ts atomic map (that is TASK-RFT-0012 and later)"
nonGoals:
  - "Do not change the emergency-lease permission catalog"
  - "Do not remove the emergency lease pathway; only remove the false-positive trigger for reset-open"
  - "Do not merge the broker conflict-matrix and the CID gate into one code path; only make next --claim consult the same matrix"
completed_at: "2026-07-01T04:06:02.970Z"
completed_by_agent: "claude-code-opus-4-7"
closedAt: "2026-07-01T04:06:02.970Z"
closedByActor: "claude-code-opus-4-7"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-01T04-06-02-898Z-close-952e6da98d1e"
lastTransitionAt: "2026-07-01T04:06:02.970Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "093d8eb33a5c5b3a8ff813c8b739bf852c18bca3"
---

# TASK-RFT-0011 — ATM governance-fix wave

## Goal

Fix three ATM CLI defects surfaced by TASK-RFT-0010's close path so the RFT-0012 and later cards can close through the normal `taskflow close --write` lane without emergency leases:

1. **auto-evidence npm-script mapping**: when the card declares a validator as `node --strip-types scripts/<name>.ts`, `taskflow close --auto-evidence` currently rewrites it to `npm run <name>` unconditionally and fails closed if the npm script does not exist. Fix: verify `package.json.scripts[<name>]` exists; if not, fall back to the declared verbatim command.
2. **tasks import reset-open UX**: when the planning frontmatter status is already `in-progress` at first import, the runtime ledger inherits `in_progress`, `next --claim` refuses, and the documented remediation `--reset-open` is emergency-gated. Fix: on fresh import (no existing runtime task file) treat `--reset-open` as a normal-lane flag OR auto-detect the case and emit a non-blocking info diagnostic pointing to the non-emergency invocation.
3. **broker verdict vs CID gate parity**: `broker register` returns `parallel-safe` for a task whose scope is genuinely non-overlapping, but `next --claim` blocks based on a separate CID logic gate that does not consult the broker conflict-matrix. Fix: route `next --claim` admission through the same `packages/core/src/broker/conflict-matrix.ts` used by `broker register`, so contradictory verdicts stop happening.

## Atom/Map Extraction Pattern

Each fix ships as one small named atom next to the existing code, plus one focused spec:

- `packages/cli/src/commands/taskflow/auto-evidence-mapper.ts` — small **Policy Object** owning validator-command mapping: given a task-declared command string and the current `package.json`, return the command to actually run. Called from the auto-evidence path in `taskflow.ts`.
- `packages/cli/src/commands/tasks/import-verify.ts` — extend the extracted module (from TASK-RFT-0010) with a **Strategy Map** entry that classifies `tasks import` inputs as `fresh-open`, `drift-with-active-claim`, `drift-without-claim`, `planning-in-progress-no-runtime`; emit a `resetOpenSuggestion` hint on the last case rather than requiring an emergency lease.
- `packages/cli/src/commands/next/claim-admission.ts` — new module (or extend existing extraction from RFT-0001 if it lands earlier) that calls `conflict-matrix.ts` for the same task's proposed scope. Return the shared verdict shape and let `next --claim` respect it.

## Required Behavior

- `taskflow close --write --auto-evidence` on a card that declares `node --strip-types scripts/<name>.ts` where `<name>` is NOT a registered npm script must run the declared command verbatim and succeed if that command exits 0 — no emergency lease needed.
- `tasks import --from <path> --write` on a fresh-open case where the planning frontmatter is `in-progress` and no runtime task file exists yet must succeed without `--reset-open` OR clearly instruct the operator to use `--reset-open` as a normal-lane flag in this specific case (documented as such).
- `next --claim` verdict must agree with `broker register` verdict on the same scope: either both allow or both block. Contradictory verdicts must be treated as an internal invariant violation and surfaced with a diagnostic pointing to the conflict-matrix code path.

## Execution Plan

### Phase A — auto-evidence mapper (Bug #1)

- Extract mapping logic into `taskflow/auto-evidence-mapper.ts` (Policy Object).
- Add npm-script existence check; fall back to declared command on miss.
- Cover: known npm script → use npm; unknown npm script + valid declared command → use declared; unknown + invalid declared → surface the original error.

### Phase B — tasks import reset-open UX (Bug #2)

- Classify import input as one of the four states above.
- On `planning-in-progress-no-runtime`, either auto-apply reset-open (preferred) or attach a `resetOpenSuggestion` field that the operator can act on without emergency lease.
- Preserve emergency gating for `drift-with-active-claim` (that case is a real safety net).

### Phase C — broker/CID parity (Bug #3)

- Route `next --claim` admission through `conflict-matrix.ts`.
- Preserve the CID gate as a wrapper that consumes the matrix verdict, not as an independent gate.
- Add a diagnostic when the two verdicts diverge (should not happen after this fix; if it does, ship the diagnostic).

## Testing Requirements

- `auto-evidence-mapper.spec.ts`: known/unknown npm script fallback matrix, malformed declared command.
- `import-reset-open-ux.spec.ts`: four classification states, verify emergency gate stays only on `drift-with-active-claim`.
- `claim-admission-broker-parity.spec.ts`: parallel-safe + block matrix, divergence diagnostic.

## Validation

Card validators (frontmatter). `scripts/validate-governance-fix-wave.ts` asserts:
- `taskflow/auto-evidence-mapper.ts` exists and is imported by `taskflow.ts`
- `tasks/import-verify.ts` exports the four-state classifier
- `next/claim-admission.ts` imports from `packages/core/src/broker/conflict-matrix.ts`
- `docs/reports/atm-governance-fix-wave.md` documents before/after behavior with citations

## Why This Precedes RFT-0012 and RFT-0013

Both later cards are large refactors of `tasks.ts` and will need `taskflow close --write --auto-evidence` on the normal lane. Landing RFT-0011 first removes three emergency-lease dependencies from the normal close path.
