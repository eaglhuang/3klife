---
doc_id: doc_other_0811
task_id: ATM-GOV-0110
title: Adapter Neutrality Boundary and Governance Externalization
milestone: M2
status: done
blocked_by: [ATM-GOV-0107]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:neutrality
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-305Z-migrate-legacy-ledger-3a8168bd0bf4
lastTransitionAt: 2026-05-21T10:29:44.305Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.305Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:375f4ae1007f57371b6f2f35edaa5c7893bc2229161f082019249df423c99bb0
---

# ATM-GOV-0110 Adapter Neutrality Boundary and Governance Externalization

## Background

Governance invariants belong to core, not adapter templates.
Adapter files should be host-facing entry points only.

## Outputs

1. Explicit boundary policy between core governance and integration adapters.
2. Neutrality checks for protected framework surfaces.
3. Documentation for adopter-specific extension points.

## Acceptance Criteria

- [x] Adapters do not duplicate core governance decisions.
- [x] Protected docs/code remain host-neutral.
- [x] Externalization policy is testable.

## Target Files

- `docs/governance/DOCS_NEUTRALITY_AUDIT.md`
- `docs/governance/docs-neutrality-policy.json`
- `docs/governance/integration-plugin-matrix.md`

## Validation Commands

```bash
node atm.mjs verify --neutrality --json
npm run validate:neutrality
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:neutrality` + `atm.mjs verify --neutrality --cwd C:\\tmp\\ai-atomic-framework-gov-series-governance --json` + `npm run typecheck` | change: confirmed protected framework surfaces stay host-neutral and adapter-specific governance remains externalized to policy/docs boundaries in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
