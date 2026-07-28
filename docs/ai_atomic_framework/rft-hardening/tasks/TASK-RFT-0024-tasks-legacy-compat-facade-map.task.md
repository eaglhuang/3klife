---
doc_id: doc_rft_0024
task_id: TASK-RFT-0024
title: "tasks legacy implementation compatibility facade split"
status: done
owner: atm-core
priority: P1
milestone: RFT-M7
depends_on: [TASK-RFT-0022]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-13T18:11:21.047Z"
closed_by: "Codex-GPT 5.5"
closedByCommand: atm tasks close
lastTransitionAt: "2026-07-13T18:11:21.047Z"
lastTransitionId: "2026-07-13T18-33-45-518Z-repair-closure-65d71cf35b51"
delivery_commit: "648ea16c0773daf995cafd9e28f66ed1d369dc13"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/legacy/**"
  - "packages/cli/src/commands/tasks/__tests__/**"
  - "scripts/validate-task-import.ts"
  - "scripts/validators/task-ledger/suite-impl.ts"
  - "docs/reports/tasks-legacy-compat-map.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
deliverables:
  - "packages/cli/src/commands/tasks/legacy-impl.ts"
  - "packages/cli/src/commands/tasks/legacy/compat-command-map.ts"
  - "packages/cli/src/commands/tasks/legacy/repair-reconcile-lane.ts"
  - "packages/cli/src/commands/tasks/legacy/transition-compat.ts"
  - "packages/cli/src/commands/tasks/__tests__/legacy-compat-command-map.spec.ts"
  - "docs/reports/tasks-legacy-compat-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-atom-file-size.ts --max-lines 600 --files packages/cli/src/commands/tasks/legacy/compat-command-map.ts packages/cli/src/commands/tasks/legacy/repair-reconcile-lane.ts packages/cli/src/commands/tasks/legacy/transition-compat.ts packages/cli/src/commands/tasks/__tests__/legacy-compat-command-map.spec.ts docs/reports/tasks-legacy-compat-map.md"
  - "node --strip-types scripts/validate-task-import.ts"
  - "node --strip-types scripts/validators/task-ledger/suite-impl.ts"
  - "node --strip-types packages/cli/src/commands/tasks/__tests__/legacy-compat-command-map.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if legacy task import, repair, reconcile, or transition compatibility changes without equivalent test proof."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-legacy-compat-map"
  mapUpdates:
    - "docs/reports/tasks-legacy-compat-map.md"
    - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  extractionCandidates:
    - atom: "atm.tasks.legacy-compat-facade"
      pattern: "Facade"
      source: "packages/cli/src/commands/tasks/legacy-impl.ts"
      disposition: extract
      inlineReason: null
    - atom: "atm.tasks.legacy-command-map"
      pattern: "Strategy Map"
      source: "packages/cli/src/commands/tasks/legacy-impl.ts"
      disposition: extract
      inlineReason: null
teamAgents:
  recommendedTeamSize: L3
  roles:
    - "Knowledge Scout: identify legacy commands still called by validators; no edits."
    - "Review Agent: verify no second task lifecycle or storage model appears; no edits."
  efficiencyEvidence: "Implementation report must state whether sidecar command inventory prevented scope creep."
outOfScope:
  - "Creating a second task lifecycle."
  - "Changing task store schema."
  - "Deleting emergency surfaces unless separately authorized."
acceptance:
  - "Every newly extracted atom/map/script/report source file in this task is <= 600 lines."
---

# TASK-RFT-0024 - tasks legacy implementation compatibility facade split

Extract compatibility routing from `tasks/legacy-impl.ts` while keeping the
already-recovered `tasks.ts` facade intact.

## Planning Closeback

2026-07-17 planning-side cleanup: target ledger already records this card as
`done`, closed at `2026-07-13T18:11:21.047Z` by `Codex-GPT 5.5`. The planning
source card is reconciled to prevent duplicate implementation dispatch.
