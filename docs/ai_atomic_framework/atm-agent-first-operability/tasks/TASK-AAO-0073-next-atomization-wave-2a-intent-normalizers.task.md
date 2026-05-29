---
task_id: TASK-AAO-0073
title: "next.ts atomization wave 2A: intent normalizers"
status: planned
priority: P1
milestone: M5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on: [TASK-AAO-0061]
related_plan: "TASK-AAO-0061 wave 2 deferred scope"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/intent-normalizers.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/intent-normalizers.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: "atm.next-router-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/next/intent-normalizers.ts"
      atom_id: "atm.cli-next-intent-resolver"
      capability: "Pure parsing/normalization helpers for next.ts intent resolution: frontmatter parse, status/intent/scope normalizers, list splitters"
      coverage_status: "active"
outOfScope:
  - "Simplifying any callers; this is behavior-preserving extraction only"
  - "Wave 2B (formatting/projection) and Wave 2C (validators) — separate cards"
  - "normalizeOptionalString (already in task-import-validators) / normalizeRelativePath (in task-ledger-readers)"
nonGoals:
  - "Do not change any function signature or runtime behavior"
---

# TASK-AAO-0073: next.ts atomization wave 2A: intent normalizers

## Goal: Extract 11 pure parsing/normalization helpers from next.ts into next/intent-normalizers.ts as Wave 2A of TASK-AAO-0061 deferred scope.

## Acceptance: next.ts net line reduction ≥ 150; new atom registered with independent atom_id; bitwise compat verified.
