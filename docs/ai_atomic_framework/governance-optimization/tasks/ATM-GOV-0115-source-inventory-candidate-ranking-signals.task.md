---
doc_id: doc_other_0816
task_id: ATM-GOV-0115
title: Source Inventory and Candidate Ranking Signals via LanguageAdapter
milestone: M3
status: done
blocked_by: [ATM-GOV-0113]
depends_on: [ATM-GOV-0113]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
hostKind: upstream-framework
alphaGate: validate:guidance
public_tracking: false
executionMode: planned-upstream-change
scopePaths:
  - packages/cli/src/commands/candidates.ts
  - packages/core/src/guidance/project-probe.ts
deliverables:
  - packages/cli/src/commands/candidates.ts
  - packages/core/src/guidance/project-probe.ts
validators:
  - node atm.mjs candidates rank --include "pipelines/**/*.py" --json
  - node --experimental-strip-types scripts/validate-guidance.ts --mode validate
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
started_at: 2026-05-19T23:18:55+08:00
started_by_agent: codex-gpt-5.5
completed_at: 2026-05-19T23:55:38.2492514+08:00
completed_by_agent: codex-gpt-5.5
lastTransitionId: "2026-07-18T04-41-58-144Z-close-8bce3dd47094"
lastTransitionAt: 2026-05-21T10:29:44.309Z
ledgerContractVersion: task-ledger/v1
ledgerBaselineKind: legacy-transition-backfill
ledgerBaselineByActor: codex-main
ledgerBaselineAt: 2026-05-21T10:29:44.309Z
ledgerBaselineReason: Backfilled task-ledger/v1 baseline transition for legacy task state that predates CLI-controlled task transitions.
ledgerBaselineSourceSha256: sha256:907b3f543d2d19bccf39006bbd7384a36363384ae8c929866b5742528581957a
---

# ATM-GOV-0115 Source Inventory and Candidate Ranking Signals via LanguageAdapter

## Background

Candidate ranking should consume language-aware source signals.
Adapter capabilities should drive inventory/scoring inputs.

## Outputs

1. Adapter-provided inventory metadata for ranking.
2. Candidate scoring enrichment with language-level evidence.
3. CLI output that surfaces adapter signal provenance.

## Acceptance Criteria

- [x] Ranking reports include language adapter signal blocks.
- [x] Inventory generation works across supported languages.
- [x] Unsupported signals degrade with explicit advisory output.

## Target Files

- `packages/cli/src/commands/candidates.ts`
- `packages/core/src/guidance/project-probe.ts`

## Validation Commands

```bash
node atm.mjs candidates rank --include "pipelines/**/*.py" --json
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
```

## Notes

2026-05-19 | status: done | validation: `npm run validate:guidance` + `npm run typecheck` | change: confirmed source inventory and candidate ranking consume language-adapter signal provenance with explicit advisory degradation in the isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
