---
task_id: TASK-AAO-0200
title: "Consume broker conflict resolution artifacts on next --claim"
status: done
owner: cursor-grok-4.5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-13-160
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/claim-admission.ts"
  - "packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types packages/cli/src/commands/next/__tests__/claim-broker-resolution.spec.ts"
  - "npm run check:encoding:touched"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert claim admission resolution consumption if governed commit lane regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.next-claim-map"
  mapUpdates: []
  extractionCandidates:
    - disposition: in-scope-extract-only
      path: packages/cli/src/commands/git-governance.ts
      inlineReason: "Extract shared readResolutionAuthorizedForeignTaskIds helper only; do not rewrite commit wrapper behavior."
outOfScope:
  - "release/**"
  - "Rewriting packages/cli/src/commands/git-governance.ts commit wrapper behavior beyond extracting a shared read helper"
  - "Editing .atm/history or .atm/runtime by hand"
completed_at: "2026-07-14T01:26:45.638Z"
completed_by_agent: "cursor-grok-4.5"
closedAt: "2026-07-14T01:26:45.638Z"
closedByActor: "cursor-grok-4.5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T01-26-45-638Z-close-fd981f2decf9"
lastTransitionAt: "2026-07-14T01:26:45.638Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c7e3e81a11188c786dce62e0a95e586af0b61421"
---

# TASK-AAO-0200 Consume broker conflict resolution artifacts on next --claim

## Problem

`ATM-BUG-2026-07-13-160`: `next --claim` freezes on a CID-name collision
(`insufficient-mutation-intent`) even when a valid
`atm.brokerConflictResolution.v1` artifact authorizes the pair. The
`requiredCommand` it prints (team broker resolve) therefore cannot unblock the
claim.

## Goal

- Claim admission consumes matching broker conflict resolution artifacts the same
  way the governed commit lane does (`readResolutionAuthorizedForeignTaskIds`).
- Regression proves: freeze without artifact, admit with matching artifact, still
  freeze on artifact for a different pair.
- Mark backlog row 160 Fixed; extract a shared reader only if needed without
  rewriting git-governance commit wrapper behavior.
