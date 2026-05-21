---
doc_id: doc_other_0809
task_id: ATM-GOV-0108
title: No-Hook and Human Collaboration Fallback Profile
milestone: M2
status: done
blocked_by: [ATM-GOV-0106]
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
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: 2026-05-21T10-29-44-303Z-migrate-legacy-ledger-8560082b5dd9
lastTransitionAt: 2026-05-21T10:29:44.303Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.303Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:e23e80a2223c7949ed000c44e48ece34edf31c8fec509c1945446ceb5ac6b9df
---

# ATM-GOV-0108 No-Hook and Human Collaboration Fallback Profile

## Background

Many editors and human workflows do not provide reliable pre-tool hooks.
ATM must still prevent unsafe merges through claim, evidence, and git gates.

## Outputs

1. No-hook fallback profile for local and CI workflows.
2. Human collaboration flow using the same claim/evidence model as AI agents.
3. Worktree/branch and commit gate recommendations.

## Acceptance Criteria

- [x] Unclaimed work cannot pass commit/PR governance checks.
- [x] Human and AI workflows share the same core contracts.
- [x] Fallback profile is explicit in docs and examples.

## Target Files

- `docs/governance/no-hook-human-fallback.md`
- `docs/governance/downstream-adopter-governance-mapping.md`

## Validation Commands

```bash
node atm.mjs guard mutation --task ATM-GOV-0108 --actor <actor> --files <csv> --json
node atm.mjs evidence verify --task ATM-GOV-0108 --gate commit --json
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:governance-commands` + `npm run typecheck` | change: validated no-hook fallback through shared mutation, git, and commit-evidence gates so human and AI workflows follow the same core claim/evidence contract in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
