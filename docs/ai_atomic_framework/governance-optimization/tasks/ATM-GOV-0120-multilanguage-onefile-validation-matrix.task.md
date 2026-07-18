---
doc_id: doc_other_0821
task_id: ATM-GOV-0120
title: Multi-language Onefile Validation Matrix for Governance Analysis
milestone: M4
status: done
blocked_by: [ATM-GOV-0117, ATM-GOV-0118, ATM-GOV-0119]
depends_on: [ATM-GOV-0117, ATM-GOV-0118, ATM-GOV-0119]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
hostKind: upstream-framework
alphaGate: validate:guidance
public_tracking: false
executionMode: planned-upstream-change
scopePaths:
  - scripts/validate-guidance.ts
  - fixtures/**
  - docs/multi-agent-compatibility-matrix.md
deliverables:
  - scripts/validate-guidance.ts
  - fixtures/**
  - docs/multi-agent-compatibility-matrix.md
validators:
  - node --experimental-strip-types scripts/validate-guidance.ts --mode validate
  - npm run validate:guidance
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.multilanguage-onefile-validation-matrix
  mapUpdates:
    - scripts/validate-guidance.ts
    - fixtures/**
    - docs/multi-agent-compatibility-matrix.md
  extractionCandidates:
    - atom: atm.guidance.multilanguage-matrix
      pattern: ValidationMatrix
      source: scripts/validate-guidance.ts
      disposition: preserve
      inlineReason: legacy delivery reconcile
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-315Z-migrate-legacy-ledger-e07ee8582612
lastTransitionAt: 2026-05-21T10:29:44.315Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.315Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:0e4472dfa6d0c88ec50de1ce5cfec7bb3992174394858ade620146f824002cf4
---

# ATM-GOV-0120 Multi-language Onefile Validation Matrix for Governance Analysis

## Background

Onefile distribution must validate governance behavior across language profiles.

## Outputs

1. Validation matrix covering JS, Python, mixed, and unsupported repos.
2. Deterministic fixtures for capability routing outcomes.
3. Release-ready evidence for multi-language governance analysis.

## Acceptance Criteria

- [x] Matrix includes supported, deprecated, unsupported capability states.
- [x] Onefile runner outputs consistent evidence across matrix fixtures.
- [x] CI gate can fail on matrix drift.

## Target Files

- `scripts/validate-guidance.ts`
- `fixtures/**`
- `docs/multi-agent-compatibility-matrix.md`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
npm run typecheck
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed the multi-language governance matrix across JavaScript, Python, mixed, and unsupported fixtures stays deterministic and CI-verifiable in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
