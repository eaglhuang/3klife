---
doc_id: doc_other_0814
task_id: ATM-GOV-0113
title: LanguageAdapter Capability Resolution and Fallback Semantics
milestone: M3
status: done
blocked_by: [ATM-GOV-0112]
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

# ATM-GOV-0113 LanguageAdapter Capability Resolution and Fallback Semantics

## Background

When an adapter cannot perform a capability, ATM must degrade predictably.
Fallback behavior should be advisory, gated, and explicitly reported.

## Outputs

1. Capability resolution engine for supported/unsupported/deferred paths.
2. Fallback semantics with warnings and allowed next actions.
3. Evidence schema that explains why fallback occurred.

## Acceptance Criteria

- [x] Unsupported capability never silently executes apply paths.
- [x] Fallback reason is present in command evidence.
- [x] Guidance output remains deterministic.

## Target Files

- `packages/core/src/guidance/**`
- `packages/cli/src/commands/runtime-adapter-readiness.ts`

## Validation Commands

```bash
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
node atm.mjs explain --why blocked --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed capability resolution, deterministic fallback semantics, and explicit blocked/deferred evidence in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
