---
doc_id: doc_other_0822
task_id: ATM-GOV-0121
title: LanguageAdapter Governance Authoring Guide
milestone: M4
status: in-progress
blocked_by: [ATM-GOV-0112, ATM-GOV-0120]
owner: atm-core
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
---

# ATM-GOV-0121 LanguageAdapter Governance Authoring Guide

## Background

Framework contributors need one canonical guide for adding/updating language adapters.

## Outputs

1. Authoring guide for capability contract, fallback, evidence, and tests.
2. Checklist for neutrality, safety boundaries, and validation matrix updates.
3. Contributor examples for JS/Python reference implementations.

## Acceptance Criteria

- [ ] Guide explains required capability declarations.
- [ ] Guide covers unsupported-language advisory behavior.
- [ ] Guide includes validation and release checklist.

## Target Files

- `docs/ADAPTER_GUIDE.md`
- `docs/SELF_HOSTING_ALPHA.md`
- `docs/governance/**`

## Validation Commands

```bash
npm run typecheck
node atm.mjs verify --agents-md --json
```

## Notes

2026-05-19 | status: open | validation: pending | change: formal card opened
