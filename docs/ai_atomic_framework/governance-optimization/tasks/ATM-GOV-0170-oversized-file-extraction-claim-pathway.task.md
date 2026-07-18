---
task_id: ATM-GOV-0170
title: Governed extraction claim pathway for oversized touched files
status: done
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
related_plans:
  - docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  The blocker was found while trying to claim ATM-GOV-0169 in the governance-
  optimization lane. ATM-GOV-0168 and ATM-GOV-0169 are already occupied, so
  this uses the next free GOV id.
scopePaths:
  - scripts/validate-physical-line-budget.ts
  - packages/cli/src/commands/next/claim-orchestration.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/next/__tests__/claim-readiness.test.ts
  - tests/cli/oversized-extraction-claim-pathway.test.ts
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/governance/command-surface.md
  - .atm/history/evidence/ATM-GOV-0170.*
  - .atm/history/task-events/ATM-GOV-0170/**
  - .atm/history/tasks/ATM-GOV-0170.json
deliverables:
  - scripts/validate-physical-line-budget.ts
  - tests/cli/oversized-extraction-claim-pathway.test.ts
validators:
  - node --strip-types tests/cli/oversized-extraction-claim-pathway.test.ts
  - node --strip-types scripts/validate-physical-line-budget.ts --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.touched-physical-line-admission
  mapUpdates: []
  extractionCandidates:
    - atom: atm.oversized-file-extraction-claim-pathway
      pattern: Gate Adapter
      source: scripts/validate-physical-line-budget.ts
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T13:14:47.759Z"
completed_by_agent: "codex-gpt-5-captain"
closedAt: "2026-07-18T13:14:47.759Z"
closedByActor: "codex-gpt-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T13-14-47-759Z-close-c0de4caed32e"
lastTransitionAt: "2026-07-18T13:14:47.759Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a27dccd60679b9ac2d308c9e39001a1cd2450bda"
plan_alignment:
  role: prerequisite
  note: >
    This closed card resolves a governance self-lock discovered while enabling
    the auto-batch prerequisite chain. It is not the Batch Wave Selector slot;
    selector work is remapped to ATM-GOV-0173.
---

# ATM-GOV-0170 - Oversized File Extraction Claim Pathway

## Plan Alignment

This card is a completed prerequisite that made large-file extraction claims
legal and auditable. The Batch Wave Selector from the end-to-end plan is tracked
separately as ATM-GOV-0173.

## Context

ATM-GOV-0169 could not be claimed because the touched-file physical-line gate
blocked `packages/cli/src/commands/next/claim-orchestration.ts` at 636 lines.
That gate is correct for ordinary feature work, but it currently creates a
self-locking path for tasks whose explicit purpose is to split or extract the
oversized file.

## Required Behavior

- Preserve the global 600-line hard cap for ordinary touched files.
- Add a governed, auditable extraction-only pathway for task cards that declare
  an oversized-file reduction intent.
- The pathway may be driven by `proposalAdmission`/bounded-region metadata or a
  more explicit task-card field, but it must require enough metadata to prove
  the oversized surface is the target of the extraction.
- The pathway must not become a broad waiver. It should only admit a claim when
  the declared task is a refactor/extraction and validators can prove that the
  oversized file shrinks or delegates behavior into modules that are under the
  line cap.
- Diagnostics must distinguish ordinary hard violations from extraction-path
  admission, including task id, touched files, declared intent, and follow-up
  validators.

## Acceptance

Use isolated fixtures to prove: ordinary tasks touching an oversized file still
fail claim admission; extraction-declared tasks can claim the oversized file;
the extraction path fails if no shrink/delegation evidence is available at
pre-close or commit; and the diagnostic names the exact pathway used. After
this card closes, ATM-GOV-0169 can be re-claimed without a manual bypass.
