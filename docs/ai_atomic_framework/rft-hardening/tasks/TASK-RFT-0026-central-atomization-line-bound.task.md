---
doc_id: doc_rft_0026
task_id: TASK-RFT-0026
title: "central configurable ATM atomic line bound"
status: done
owner: atm-core
priority: P1
milestone: RFT-M8
depends_on: [ATM-GOV-0124]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-14T16:59:17.800Z"
closed_by: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionAt: "2026-07-14T16:59:17.800Z"
lastTransitionId: "2026-07-14T16-59-17-895Z-lock-cleanup-097530394d6e"
delivery_commit: "870307c1b9abd6a1064d89e12fc8fc3bd76b5afa"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "schemas/atm-config.schema.json"
  - "packages/cli/src/commands/git-governance/validate-atom-file-size.ts"
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
  - "scripts/validate-next-atomic-map.ts"
  - "scripts/validate-hook-atomic-map.ts"
  - "scripts/validate-team-agents.ts"
  - "tests/cli/atomization-max-lines.test.ts"
deliverables:
  - "schemas/atm-config.schema.json"
  - "packages/cli/src/commands/git-governance/validate-atom-file-size.ts"
  - "tests/cli/atomization-max-lines.test.ts"
validators:
  - "node --strip-types tests/cli/atomization-max-lines.test.ts"
  - "node --strip-types packages/cli/src/commands/git-governance/validate-atom-file-size.ts --max-lines 600 --files packages/cli/src/commands/git-governance/validate-atom-file-size.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Restore current CLI overrides and constants while retaining reports."
atomizationImpact:
  ownerAtomOrMap: "atm.atomization-governance-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.atomization-line-budget"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/tasks/task-import-validators.ts"
      disposition: extract
outOfScope:
  - "Splitting large facades before their behavior reaches a freeze gate."
---

# TASK-RFT-0026 - central configurable ATM atomic line bound

## Acceptance

- Schema, CLI, reports, task patrol, and RFT validators resolve one value.
- The default is 600 and repositories may lower it.
- Raising the limit requires an explicit expiring waiver.
- Every new atom, map, script, or supporting module is checked at birth.
