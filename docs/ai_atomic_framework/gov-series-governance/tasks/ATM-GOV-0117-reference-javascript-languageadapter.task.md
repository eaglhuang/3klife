---
doc_id: doc_other_0818
task_id: ATM-GOV-0117
title: Reference JavaScript LanguageAdapter Governance Implementation
milestone: M4
status: done
blocked_by: [ATM-GOV-0112, ATM-GOV-0116]
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

# ATM-GOV-0117 Reference JavaScript LanguageAdapter Governance Implementation

## Background

JavaScript adapter behavior should be a governance reference implementation.

## Outputs

1. JS adapter capability implementation aligned to the formal contract.
2. Route-plan, inventory, and dry-run planning support for JS.
3. Fixtures and validator coverage for governance behavior.

## Acceptance Criteria

- [x] JS adapter advertises capability map used by guidance engine.
- [x] JS legacy-route and candidate signals match expected fixtures.
- [x] Dry-run planning remains non-mutating and deterministic.

## Target Files

- `packages/language-js/**`
- `scripts/validate-guidance.ts`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
npm run typecheck
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed the JavaScript reference LanguageAdapter advertises the expected governance capabilities and deterministic legacy/dry-run fixtures in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
