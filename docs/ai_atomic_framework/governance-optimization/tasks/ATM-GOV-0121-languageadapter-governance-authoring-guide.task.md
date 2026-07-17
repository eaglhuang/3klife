---
doc_id: doc_other_0822
task_id: ATM-GOV-0121
title: LanguageAdapter Governance Authoring Guide
milestone: M4
status: done
blocked_by: [ATM-GOV-0112, ATM-GOV-0120]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
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
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-317Z-migrate-legacy-ledger-0b65ab1f6be6
lastTransitionAt: 2026-05-21T10:29:44.317Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.317Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:b10f03978db74cd62e5f69ac7c721e58bb382ca444bb46a2bf74a0d5f28389b3
---

# ATM-GOV-0121 LanguageAdapter Governance Authoring Guide

## Background

Framework contributors need one canonical guide for adding/updating language adapters.

## Outputs

1. Authoring guide for capability contract, fallback, evidence, and tests.
2. Checklist for neutrality, safety boundaries, and validation matrix updates.
3. Contributor examples for JS/Python reference implementations.

## Acceptance Criteria

- [x] Guide explains required capability declarations.
- [x] Guide covers unsupported-language advisory behavior.
- [x] Guide includes validation and release checklist.

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

2026-05-19 | status: done | validation: `node atm.mjs verify --agents-md --cwd C:\\tmp\\ai-atomic-framework-governance-optimization --json` + `npm run typecheck` | change: aligned rendered/template AGENTS bootstrap guidance to vendor-neutral adapter ids and confirmed authoring-guide-facing verification now passes in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
