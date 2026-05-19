---
doc_id: doc_other_0808
task_id: ATM-GOV-0107
title: Integration Plugins for Claude Code, Codex, Gemini, Cursor
milestone: M2
status: done
blocked_by: [ATM-GOV-0106]
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
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
---

# ATM-GOV-0107 Integration Plugins for Claude Code, Codex, Gemini, Cursor

## Background

Integration plugins should only adapt host surfaces and call core governance.
They must not duplicate policy or create a parallel governance model.

## Outputs

1. Adapter recipes for supported editors.
2. Thin hook guidance where supported.
3. Clear fallback behavior where hooks are unavailable.

## Acceptance Criteria

- [x] Plugin logic delegates checks to core guard APIs.
- [x] Hook profiles remain minimal and bounded.
- [x] Adapter docs explain capability differences.

## Target Files

- `packages/integration-*/**`
- `docs/governance/integration-plugin-matrix.md`

## Validation Commands

```bash
node atm.mjs integration list --json
node atm.mjs integration verify <adapter-id> --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:integration-adapter` + `atm.mjs integration list --json` + `atm.mjs integration verify codex --json` + `npm run typecheck` | change: synced the Codex governance-router reference skill/fixture and re-verified all six installable adapters plus the local Codex integration manifest in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
