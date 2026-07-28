---
doc_id: task_rft_0028
task_id: TASK-RFT-0028
title: "dogfood Team Agents after close transaction and shadow-first gates are stable"
status: done
owner: atm-core
priority: P2
milestone: RFT-M8
depends_on: [ATM-GOV-0136, ATM-GOV-0140]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-14T17:14:36.231Z"
closed_by: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionAt: "2026-07-14T17:14:36.231Z"
lastTransitionId: "2026-07-14T17-14-36-336Z-lock-cleanup-2ad1470f4509"
delivery_commit: "870307c1b9abd6a1064d89e12fc8fc3bd76b5afa"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "tests/cli/team-agents-dogfood.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "tests/cli/team-agents-dogfood.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "node --strip-types tests/cli/team-agents-dogfood.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.team-dogfood-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Unrelated refactors outside the declared scope."
---

# TASK-RFT-0028 - dogfood Team Agents after close transaction and shadow-first gates are stable

## Acceptance

- Run controlled Team dogfood only after close transaction, composer, and efficiency controller gates pass.
- Measure incremental, fully-loaded and list-price-equivalent monetary cost plus wall-clock time against paired single-Agent baselines; keep token counts as diagnostics.
- Exercise cheap worker models, role collapse, prompt caching, mixed-model routing and stop-loss without weakening quality or governance gates.
- Do not promote Team as default unless production cost/time/quality thresholds are met with canonical provider usage and pricing evidence.
- Record failures, stale pricing, context inflation and cost attribution gaps as optimization backlog items with a next experiment.
