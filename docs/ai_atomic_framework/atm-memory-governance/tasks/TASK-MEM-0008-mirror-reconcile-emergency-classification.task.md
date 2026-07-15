---
task_id: TASK-MEM-0008
title: "Classify clean-mirror reconcile as non-emergency (BUG-ATM-0072)"
status: done
owner: claude-fable-5
priority: P1
milestone: MEM-M5
depends_on: []
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
deliverables:
  - "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "npm run validate:cli"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the classification; reconcile returns to unconditional emergency."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger"
  extractionCandidates:
    - atom: "atm.reconcile-emergency-classifier"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/tasks/reconcile-orchestrator.ts"
      disposition: "extract"
      inlineReason: null
completed_at: "2026-07-15T02:58:56.085Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-15T02:58:56.085Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T02-58-56-085Z-close-7a4dddb3d3d1"
lastTransitionAt: "2026-07-15T02:58:56.085Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b3333f128eb727ab446b38ce6fb30687cc41e86b"
---

# TASK-MEM-0008 Clean-mirror reconcile classification

Fix BUG-ATM-0072's operational pain: a card whose dependencies closed in
another repo's ledger imports as `source-done-governance-incomplete`, and the
only repair (`tasks reconcile`) is an unconditional emergency surface — even
when the reconcile merely CREATES closure provenance for a clean mirror
(imported-as-done, no local claim, no local close transitions, no local
closure packet) instead of REWRITING existing local governance.

Follow the proven TASK-RFT-0011 `--reset-open` precedent: classify first,
require the emergency lease only when the operation would actually clobber
local closure state.

## Acceptance

- A pure classification function (extracted Policy Object) inspects the
  target task document + local evidence dir and returns
  `clean-mirror-attestation` (no local closure packet, no local close
  transition metadata, status done via import, no active/handoff claim) vs
  `local-closure-rewrite` (anything else).
- `clean-mirror-attestation` + a delivery commit that verifies (including via
  `--historical-delivery-repo`) proceeds WITHOUT an emergency lease; the
  attestation records the classification.
- `local-closure-rewrite` keeps the unconditional emergency gate, byte-for-byte
  current behavior.
- Regression covers both classifications.
