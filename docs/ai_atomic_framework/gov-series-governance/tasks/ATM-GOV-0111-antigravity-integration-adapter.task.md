---
doc_id: doc_other_0812
task_id: ATM-GOV-0111
title: Antigravity Integration Adapter
milestone: M2
status: done
blocked_by: [ATM-GOV-0109, ATM-GOV-0110]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:integration-adapter
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
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

