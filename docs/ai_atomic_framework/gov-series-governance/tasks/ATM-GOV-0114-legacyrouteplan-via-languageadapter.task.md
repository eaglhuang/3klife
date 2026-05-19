---
doc_id: doc_other_0815
task_id: ATM-GOV-0114
title: LegacyRoutePlan via LanguageAdapter
milestone: M3
status: done
blocked_by: [ATM-GOV-0113]
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
---

# ATM-GOV-0114 LegacyRoutePlan via LanguageAdapter

## Background

Legacy route planning currently depends on language-specific parsing paths.
LanguageAdapter should provide the route-plan extraction contract.

## Outputs

1. Adapter-driven route-plan extraction API.
2. Unified evidence shape for legacy hotspots and release blockers.
3. Guidance integration for `start --legacy-flow`.

## Acceptance Criteria

- [x] Legacy route planning works via adapter capability calls.
- [x] Route evidence includes language adapter attribution.
- [x] Missing capability uses deterministic fallback.

## Target Files

- `packages/core/src/guidance/legacy-route-plan.ts`
- `packages/core/src/guidance/route-engine.ts`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
node atm.mjs start --goal "legacy route plan test" --legacy-flow --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed LegacyRoutePlan generation, adapter attribution, and `start --legacy-flow` guidance routing in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
