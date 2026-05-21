---
doc_id: doc_other_0820
task_id: ATM-GOV-0119
title: Unsupported Language Advisory and Deferred Apply Contract
milestone: M4
status: done
blocked_by: [ATM-GOV-0113, ATM-GOV-0118]
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
lastTransitionId: 2026-05-21T10-29-44-314Z-migrate-legacy-ledger-929f1e224b3e
lastTransitionAt: 2026-05-21T10:29:44.314Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.314Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:9cb3de7658eaac76a259bbaef30bfa5d669935e347d857539c3c3bacbf622310
---

# ATM-GOV-0119 Unsupported Language Advisory and Deferred Apply Contract

## Background

Unsupported-language flows must never pretend apply readiness.
ATM should provide useful advisory output while deferring unsafe operations.

## Outputs

1. Unsupported/deferred contract language for CLI evidence.
2. Advisory path that still allows discovery/ranking/docs-first workflows.
3. Clear user-facing guidance for enabling future language support.

## Acceptance Criteria

- [x] Unsupported language apply paths are blocked by contract.
- [x] Advisory messages include precise deferred reasons.
- [x] Non-mutating workflows remain available.

## Target Files

- `packages/cli/src/commands/runtime-adapter-readiness.ts`
- `docs/SELF_HOSTING_ALPHA.md`

## Validation Commands

```bash
node atm.mjs next --json
node atm.mjs explain --why blocked --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run validate:python-adapter` + `npm run typecheck` | change: confirmed unsupported-language advisory output keeps discovery/ranking/docs-first flows available while deferring unsafe apply paths in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
