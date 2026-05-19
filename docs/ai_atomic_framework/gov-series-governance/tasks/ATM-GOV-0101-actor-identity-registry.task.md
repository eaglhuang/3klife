---
doc_id: doc_other_0802
task_id: ATM-GOV-0101
title: Actor Identity Registry and Git Identity Contract
milestone: M1
status: in-progress
blocked_by: []
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

# ATM-GOV-0101 Actor Identity Registry and Git Identity Contract

## Background

ATM needs a neutral actor model for humans, AI agents, and automation services.
Git author identity and ATM actor identity must be explicitly aligned.

## Outputs

1. Actor registry schema and CLI operations (`register`, `list`, `resolve`, `verify-git`).
2. `ATM_ACTOR_ID` contract and `AGENT_IDENTITY` compatibility alias.
3. Deterministic git identity verification evidence.

## Acceptance Criteria

- [ ] Actor kinds support `human`, `ai-agent`, and `automation`.
- [ ] Git name/email mismatch is detectable and actionable.
- [ ] CLI emits machine-readable identity evidence.

## Target Files

- `packages/cli/src/commands/actor.ts`
- `packages/core/src/governance/**`
- `docs/governance/actor-identity-model.md`

## Validation Commands

```bash
node atm.mjs actor list --json
node atm.mjs actor verify-git --id <actor-id> --json
```

## Notes

2026-05-19 | status: in-progress | validation: actor register + actor verify-git pass in isolated AI-Atomic-Framework worktree | change: exercised actor registry creation, AGENT_IDENTITY compatibility, and git identity verification end-to-end with codex-gpt-5.5 | blocker: none
2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 and started M1 governance foundations in isolated AI-Atomic-Framework worktree | blocker: none
2026-05-19 | status: open | validation: pending | change: formal card opened
