---
doc_id: doc_other_0817
task_id: ATM-GOV-0116
title: Atomize and Infect Dry-Run Planning via LanguageAdapter
milestone: M3
status: in-progress
blocked_by: [ATM-GOV-0114, ATM-GOV-0115]
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

# ATM-GOV-0116 Atomize and Infect Dry-Run Planning via LanguageAdapter

## Background

Dry-run planning for atomize/infect needs language-specific extraction while remaining non-mutating.
LanguageAdapter capabilities should define the safe planning contract.

## Outputs

1. Adapter-driven dry-run proposal generation for atomize/infect.
2. Evidence links to route plan, scope, and rollback expectations.
3. Explicit no-apply boundaries unless capability + evidence gates pass.

## Acceptance Criteria

- [ ] Dry-run proposals contain language capability attribution.
- [ ] Proposal generation does not mutate host source files.
- [ ] Missing capabilities produce advisory-only fallback.

## Target Files

- `packages/cli/src/commands/upgrade.ts`
- `packages/core/src/guidance/route-engine.ts`

## Validation Commands

```bash
node atm.mjs upgrade --propose --behavior behavior.atomize --dry-run --json
node atm.mjs upgrade --propose --behavior behavior.infect --dry-run --json
```

## Notes

2026-05-19 | status: open | validation: pending | change: formal card opened
