---
doc_id: doc_other_0820
task_id: ATM-GOV-0119
title: Unsupported Language Advisory and Deferred Apply Contract
milestone: M4
status: in-progress
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

- [ ] Unsupported language apply paths are blocked by contract.
- [ ] Advisory messages include precise deferred reasons.
- [ ] Non-mutating workflows remain available.

## Target Files

- `packages/cli/src/commands/runtime-adapter-readiness.ts`
- `docs/SELF_HOSTING_ALPHA.md`

## Validation Commands

```bash
node atm.mjs next --json
node atm.mjs explain --why blocked --json
```

## Notes

2026-05-19 | status: open | validation: pending | change: formal card opened
