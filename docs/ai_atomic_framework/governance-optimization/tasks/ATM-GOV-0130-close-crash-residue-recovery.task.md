---
doc_id: doc_atm_gov_0130
task_id: ATM-GOV-0130
title: "Recover close, claim release, and residue crash states"
status: planned
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: [ATM-GOV-0129]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/residue.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/tasks/close-helpers/task-transition-writer.ts"
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
  - "packages/cli/src/commands/__tests__/residue.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts"
deliverables:
  - "packages/cli/src/commands/residue.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts"
validators:
  - "node --strip-types packages/cli/src/commands/__tests__/residue.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-crash-matrix.test.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/claim-release-transition.spec.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable automatic projection and keep reconciler diagnose-only."
atomizationImpact:
  ownerAtomOrMap: "atm.taskflow-command-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.close-crash-reconciler"
      pattern: "Process Manager"
      source: "packages/cli/src/commands/taskflow/close-orchestration.ts"
      disposition: extract
outOfScope:
  - "Deleting active-owner, staged, or ambiguous audit evidence."
---

# ATM-GOV-0130 - Recover close, claim release, and residue crash states

## Acceptance

- Crash matrix covers single-Captain and dual-Captain interleavings across commit/close split, missing snapshot, release event,
  queue-head drift, and abandoned residue.
- Commit truth reconstructs publication and release idempotently; publication receipt is a cache rebuilt from commit trailers.
- Closer mutex has TTL, holder diagnostics, step marker, and automatic recovery.
- Windows EPERM/EBUSY/ENOTEMPTY cleanup failures use bounded retry and produce diagnosable residue.
- Staged abandoned residue preserves audit evidence through governed disposition.
- `repair-closure` remains emergency or migration only.
