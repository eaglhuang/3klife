---
doc_id: doc_other_0816
task_id: ATM-GOV-0115
title: Source Inventory and Candidate Ranking Signals via LanguageAdapter
milestone: M3
status: done
blocked_by: [ATM-GOV-0113]
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
