---
doc_id: doc_other_0819
task_id: ATM-GOV-0118
title: Reference Python LanguageAdapter Governance Implementation
milestone: M4
status: in-progress
blocked_by: [ATM-GOV-0112, ATM-GOV-0116]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:python-adapter
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
---

# ATM-GOV-0118 Reference Python LanguageAdapter Governance Implementation

## Background

Python adapter behavior is required for real multi-language governance adoption.

## Outputs

1. Python adapter capability implementation for governance routing.
2. Python route-plan, inventory, ranking, and dry-run support.
3. Explicit boundary between advisory analysis and apply readiness.

## Acceptance Criteria

- [ ] Python-only repos can run governance analysis without JS assumptions.
- [ ] Capability evidence shows supported vs deferred operations.
- [ ] Validators cover Python-specific guidance paths.

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

2026-05-19 | status: open | validation: pending | change: formal card opened
