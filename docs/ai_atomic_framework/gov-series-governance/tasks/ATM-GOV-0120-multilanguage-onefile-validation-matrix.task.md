---
doc_id: doc_other_0821
task_id: ATM-GOV-0120
title: Multi-language Onefile Validation Matrix for Governance Analysis
milestone: M4
status: in-progress
blocked_by: [ATM-GOV-0117, ATM-GOV-0118, ATM-GOV-0119]
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

# ATM-GOV-0120 Multi-language Onefile Validation Matrix for Governance Analysis

## Background

Onefile distribution must validate governance behavior across language profiles.

## Outputs

1. Validation matrix covering JS, Python, mixed, and unsupported repos.
2. Deterministic fixtures for capability routing outcomes.
3. Release-ready evidence for multi-language governance analysis.

## Acceptance Criteria

- [ ] Matrix includes supported, deprecated, unsupported capability states.
- [ ] Onefile runner outputs consistent evidence across matrix fixtures.
- [ ] CI gate can fail on matrix drift.

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

2026-05-19 | status: open | validation: pending | change: formal card opened
