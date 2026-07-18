---
doc_id: doc_other_0819
task_id: ATM-GOV-0118
title: Reference Python LanguageAdapter Governance Implementation
milestone: M4
status: done
blocked_by: [ATM-GOV-0112, ATM-GOV-0116]
depends_on: [ATM-GOV-0112, ATM-GOV-0116]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
hostKind: upstream-framework
alphaGate: validate:python-adapter
public_tracking: false
executionMode: planned-upstream-change
scopePaths:
  - packages/language-python/**
  - scripts/validate-python-adapter.ts
  - docs/SELF_HOSTING_ALPHA.md
deliverables:
  - packages/language-python/**
  - scripts/validate-python-adapter.ts
  - docs/SELF_HOSTING_ALPHA.md
validators:
  - node --experimental-strip-types scripts/validate-python-adapter.ts --mode validate
  - node --experimental-strip-types scripts/validate-guidance.ts --mode validate
  - npm run validate:python-adapter
  - npm run validate:guidance
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.language-python-reference-adapter
  mapUpdates:
    - packages/language-python/**
    - scripts/validate-python-adapter.ts
  extractionCandidates:
    - atom: atm.language-python.adapter
      pattern: LanguageAdapter
      source: packages/language-python
      disposition: extract
      inlineReason: null
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-313Z-migrate-legacy-ledger-92181d77685d
lastTransitionAt: 2026-05-21T10:29:44.313Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.313Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:df54766956d1dd025d2c9e1dc2167055cd6ba40bece09575815dc6fb9b655f8a
---

# ATM-GOV-0118 Reference Python LanguageAdapter Governance Implementation

## Background

Python adapter behavior is required for real multi-language governance adoption.

## Outputs

1. Python adapter capability implementation for governance routing.
2. Python route-plan, inventory, ranking, and dry-run support.
3. Explicit boundary between advisory analysis and apply readiness.

## Acceptance Criteria

- [x] Python-only repos can run governance analysis without JS assumptions.
- [x] Capability evidence shows supported vs deferred operations.
- [x] Validators cover Python-specific guidance paths.

## Target Files

- `packages/language-python/**`
- `scripts/validate-python-adapter.ts`
- `docs/SELF_HOSTING_ALPHA.md`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-python-adapter.ts --mode validate
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:python-adapter` + `npm run validate:guidance` + `npm run typecheck` | change: confirmed the bundled Python LanguageAdapter reference implementation, Python-only readiness evidence, and deferred-apply contract in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
