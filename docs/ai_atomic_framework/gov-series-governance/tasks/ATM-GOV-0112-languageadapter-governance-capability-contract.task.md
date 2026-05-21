---
doc_id: doc_other_0813
task_id: ATM-GOV-0112
title: LanguageAdapter Governance Capability Contract
milestone: M3
status: done
blocked_by: [ATM-GOV-0110]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:guidance
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-306Z-migrate-legacy-ledger-f48e78fbae3b
lastTransitionAt: 2026-05-21T10:29:44.306Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.306Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:a174c0c3cf6832ae167d74c9bb14d5489693ba18a88c636ad5a704b533407295
---

# ATM-GOV-0112 LanguageAdapter Governance Capability Contract

## Background

Language behavior must be modeled as explicit capabilities, not hidden heuristics.
ATM needs a formal contract to decide what language adapters can guarantee.

## Outputs

1. LanguageAdapter capability interface for governance tasks.
2. Capability registry metadata and detection evidence.
3. Contract docs that separate supported vs deferred operations.

## Acceptance Criteria

- [x] Capability declarations are machine-readable.
- [x] Missing capabilities are visible in CLI evidence.
- [x] Contract can serve multiple language adapters.

## Target Files

- `packages/plugin-sdk/src/**`
- `packages/core/src/guidance/**`
- `docs/ADAPTER_GUIDE.md`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
node atm.mjs next --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run validate:python-adapter` + `npm run typecheck` | change: confirmed the LanguageAdapter governance capability contract, readiness evidence, and multi-adapter routing surfaces in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
