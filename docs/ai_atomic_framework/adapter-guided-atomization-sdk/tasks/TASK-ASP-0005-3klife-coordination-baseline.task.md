---
doc_id: doc_other_asp_0005
task_id: TASK-ASP-0005
title: 3KLife Coordination & Baseline Measurement for ASP Initiative
milestone: ASP-M1
status: done
blocked_by: []
owner: 3klife-data
related_plan: docs/ai_atomic_framework/atomic-cost-reduction-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: 3KLife
hostKind: adopter
alphaGate: none
public_tracking: true
executionMode: planned-local-change
allowed_files:
  - docs/ai_atomic_framework/adapter-guided-atomization-sdk/**
  - docs/ai_atomic_framework/atm-core-broker-survey.md
  - docs/ai_atomic_framework/vision-paper-semantic-admission.md
  - docs/ai_atomic_framework/atomic-cost-reduction-plan.md
forbidden_files:
  - assets/**
  - library/**
  - tools_node/**
non_goals:
  - Do not modify AAF code from 3KLife side (use coord links only).
  - Do not run live LLM token measurements requiring paid API.
  - Do not block paper writing on this task (the survey + 4 cards are enough scaffolding).
created_at: 2026-06-10T00:00:00+08:00
created_by_agent: ClaudeCode_haiku-4-5
completed_at: "2026-06-11T11:02:34+08:00"
completed_by_agent: "historical-backfill"
closedAt: "2026-06-11T11:02:34+08:00"
closedByActor: "historical-backfill"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-11T11-02-34+08-00-close-385706329905"
lastTransitionAt: "2026-06-11T11:02:34+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "f40917f9ebe6961f8cb56ed13a0c16d9389e43ff"
---

# TASK-ASP-0005 3KLife Coordination & Baseline Measurement

## Background

The ASP initiative spans both `AI-Atomic-Framework` (implementation, tasks ASP-0001 to ASP-0004) and `3KLife` (adopter / data source for paper evaluation). This task tracks the 3KLife-side responsibilities:

1. Maintain coordination notes between 3KLife and AAF tasks
2. Provide baseline measurement of current AI Agent atomization cost
3. Provide source corpus for adapter candidate-discovery validation

## Inputs

- AAF tasks ASP-0001 to ASP-0004 (progress mirrored here)
- 3KLife codebase as test corpus
- Historical AI Agent atomization session logs (if available)

## Outputs

1. `docs/ai_atomic_framework/adapter-guided-atomization-sdk/coordination.md`
   - Sync table of AAF task status
   - Decision log of cross-repo trade-offs
2. `docs/ai_atomic_framework/adapter-guided-atomization-sdk/baseline-agent-cost-report.md`
   - LLM calls per atom (sampled)
   - Token usage per atom (sampled)
   - Wall-clock time per atom (sampled)
   - Retry rate
3. Sample corpus index pointing to:
   - 20 TS files from `assets/scripts/`
   - 5 Python files (if available in `tools_python/` or NPC brain sibling)
4. Verification once AAF JS adapter is ready:
   - Run `atm candidates discover` against 3KLife corpus
   - Compare candidate count vs manual ground truth
   - Report precision / recall

## Acceptance Criteria

- [x] `coordination.md` exists and lists 4 AAF task IDs with mirrored status
- [x] `baseline-agent-cost-report.md` has at least 10 sampled atom-creation sessions analyzed
- [x] Corpus index file lists at least 20 TS files for adapter testing
- [ ] After AAF ASP-0002 is done: validation run on 3KLife corpus with precision ≥ 70%（延後至 AAF release 就緒後執行；不阻擋本卡收口）
- [x] Coordination log captures any blocking issues for AAF team

## Validation

```bash
# 3KLife local
ls docs/ai_atomic_framework/adapter-guided-atomization-sdk/
# After AAF builds release
npx @ai-atomic-framework/cli candidates discover \
  --include "assets/scripts/**/*.ts" \
  --json > /tmp/asp-candidates-3klife.json
```

## Non-goals

- Not implementing any AAF SDK code from 3KLife side
- Not blocking on AAF ASP-0001 to start coordination doc
- Not running paid LLM benchmarks (use cached session logs)

## Notes / Decision Log

- 變更: 3KLife 交付 `afa17a12`（coordination、baseline、corpus-index）；AAF 治理收口 `4b5c9be7`；規劃鏡像同步 2026-06-11
- 驗證: 23 筆 session 樣本、20 TS + 8 Python corpus 索引；corpus precision 驗證待 release 後補跑
- 阻塞: 無
