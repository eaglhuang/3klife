---
doc_id: doc_other_0812
task_id: ATM-GOV-0111
title: Antigravity Integration Adapter
milestone: M2
status: done
blocked_by: [ATM-GOV-0109, ATM-GOV-0110]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:integration-adapter
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
lastTransitionId: 2026-05-21T10-29-44-306Z-migrate-legacy-ledger-d1ba4489ceb7
lastTransitionAt: 2026-05-21T10:29:44.306Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.306Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:b5e2e9792230fc3155d75cff273843ae27f51939946d8ed6dd53f5219f6907c1
---

# ATM-GOV-0111 Antigravity Integration Adapter

## Background

Antigravity needs first-class ATM integration instead of multi-adapter workarounds.

## Outputs

1. `integration add/verify/list` support for `antigravity`.
2. Host entry surface using `GEMINI.md` plus `.agents/skills/atm-*/SKILL.md`.
3. Public docs describing Antigravity discovery behavior.

## Acceptance Criteria

- [x] Adapter appears in `integration list`.
- [x] Add/verify/remove cycle succeeds in smoke testing.
- [x] Primary entry path is reported as `GEMINI.md`.

## Target Files

- `packages/integration-gemini/src/index.ts`
- `packages/cli/src/commands/integration.ts`
- `docs/ANTIGRAVITY_INTEGRATION.md`

## Validation Commands

```bash
node atm.mjs integration list --json
node atm.mjs integration add antigravity --json
node atm.mjs integration verify antigravity --json
```

## Notes

2026-05-19 | status: done | validation: smoke add/verify/remove + typecheck | change: adapter implemented and documented in commit 8e3bef4

