---
doc_id: doc_other_0806
task_id: ATM-GOV-0105
title: Git Governance and Commit Trailer Validation
milestone: M1
status: in-progress
blocked_by: [ATM-GOV-0101, ATM-GOV-0102]
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

# ATM-GOV-0105 Git Governance and Commit Trailer Validation

## Background

Actor/claim ownership must align with git metadata.
Commit trailer enforcement gives deterministic traceability.

## Outputs

1. `atm git prepare` and `atm git check` governance checks.
2. Trailer contract (`ATM-Task`, `ATM-Actor`, `ATM-Claim`, `ATM-Evidence`).
3. Ownership consistency checks across actor, claim, lock, and commit author.

## Acceptance Criteria

- [ ] Invalid actor/git identity fails check with explicit reason.
- [ ] Trailer mismatch is detectable pre-merge.
- [ ] Contract does not manage remote git credentials.

## Target Files

- `packages/cli/src/commands/git.ts`
- `docs/governance/git-governance-contract.md`

## Validation Commands

```bash
node atm.mjs git prepare --task ATM-GOV-0105 --actor <actor> --json
node atm.mjs git check --task ATM-GOV-0105 --actor <actor> --json
```

## Notes

2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 git governance implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
