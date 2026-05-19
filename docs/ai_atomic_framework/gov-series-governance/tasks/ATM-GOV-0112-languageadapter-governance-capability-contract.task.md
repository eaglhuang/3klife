---
doc_id: doc_other_0813
task_id: ATM-GOV-0112
title: LanguageAdapter Governance Capability Contract
milestone: M3
status: in-progress
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

- [ ] Capability declarations are machine-readable.
- [ ] Missing capabilities are visible in CLI evidence.
- [ ] Contract can serve multiple language adapters.

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

2026-05-19 | status: open | validation: pending | change: formal card opened
