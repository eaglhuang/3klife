---
task_id: TASK-CID-0114
title: Shared hot file broker rearbitration and auto-stage boundary hardening
status: done
milestone: M20
depends_on:
  - TASK-CID-0113
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
deliverables:
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not redesign the whole task lifecycle."
  - "Do not broaden broker arbitration beyond shared-hot-file closeout and staging governance."
  - "Do not absorb foreign work such as AAO-0126 into this lane."
nonGoals:
  - "No generic auto-merge system."
  - "No replacement of direction-lock diagnostics."
atomizationImpact:
  ownerAtomOrMap: "atm.shared-hot-file-broker-rearbitration"
  mapUpdates: []
completed_at: "2026-06-19T00:31:45.477Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-19T00-31-43-212Z-close-90fd415d73cc"
delivery_commit: "9f54ec196"
---

# TASK-CID-0114

## Goal

When a shared hot file such as `packages/cli/src/commands/tasks.ts` is already involved in another live lane, ATM should send the operator back through broker rearbitration before the flow falls into hook-time scope drift or staged-bundle confusion.

Also harden `auto-stage` so closeout staging does not scoop unrelated runtime residue or foreign task bundles into the governed index.

## Acceptance

- Shared hot file overlap is detected before hook-time failure.
- The operator gets a broker-first remediation path instead of only direction-lock or scope-drift fallout.
- `auto-stage` excludes unrelated runtime residue and foreign task bundles from the governed staged bundle.
- CLI coverage reproduces the shared-hot-file collision and verifies the broker-first repair path.

## Non-Goals

- No broad broker policy rewrite outside this conflict lane.
- No attempt to auto-resolve semantic conflicts without broker verdicts.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
