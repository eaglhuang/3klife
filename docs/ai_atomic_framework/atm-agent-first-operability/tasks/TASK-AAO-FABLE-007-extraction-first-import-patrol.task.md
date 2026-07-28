---
task_id: TASK-AAO-FABLE-007
title: "Import patrol: warn when large-module scope lacks extraction candidates"
status: done
owner: claude-fable-5
priority: P2
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
  - "packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
deliverables:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "packages/cli/src/commands/tasks/import-orchestrator.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "node --strip-types --test packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the advisory diagnostic; import behavior is otherwise unchanged (warning-only, never blocking)."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger"
  extractionCandidates:
    - atom: "atm.task-import-extraction-patrol"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/tasks/task-import-validators.ts"
      disposition: "extract"
      inlineReason: null
completed_at: "2026-07-13T07:44:15.425Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-13T07:44:15.425Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T07-44-15-350Z-close-05c57e2b9ce5"
lastTransitionAt: "2026-07-13T07:44:15.425Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "0b65e3370877cf42c7102e2e74a8ec9e2973c721"
---

# TASK-AAO-FABLE-007 Extraction-first import patrol

Framework-level patrol for the extraction-first contract established by
TASK-AAO-FABLE-006: skills now require `atomizationImpact.extractionCandidates`
when a card's scope touches a module over 600 lines, but nothing in ATM
itself checks it. Add an advisory `importDiagnostics` warning at
`tasks import` time.

## Acceptance

- During import (dry-run and write), each parsed task whose `scopePaths`
  reference an existing repository file over 600 lines and whose card does not
  declare `extractionCandidates` receives a warning diagnostic
  `ATM_TASK_IMPORT_EXTRACTION_FIRST_CANDIDATE` naming the oversized files and
  pointing at `.agents/skills/atm-atom-map-refactor`.
- Warning-only: import never blocks on this diagnostic; cards that declare
  `extractionCandidates` (any disposition, including human-approved inline)
  emit nothing.
- The patrol lives in its own small policy function
  (`buildExtractionFirstPatrolDiagnostics`) with a focused regression in the
  import orchestrator spec.
