---
doc_id: doc_other_asp_0005
task_id: TASK-ASP-0005
title: 3KLife Coordination & Baseline Measurement for ASP Initiative
milestone: ASP-M1
status: open
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

- [ ] `coordination.md` exists and lists 4 AAF task IDs with mirrored status
- [ ] `baseline-agent-cost-report.md` has at least 10 sampled atom-creation sessions analyzed
- [ ] Corpus index file lists at least 20 TS files for adapter testing
- [ ] After AAF ASP-0002 is done: validation run on 3KLife corpus with precision ≥ 70% (lower bar than AAF acceptance, since 3KLife code is more diverse)
- [ ] Coordination log captures any blocking issues for AAF team

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

- 變更: 待開工
- 驗證: 待補
- 阻塞: 無（可在 AAF tasks 進行同時並行收集 baseline）
