---
doc_id: doc_other_0805
task_id: ATM-GOV-0104
title: Evidence-Bound Close and Commit/PR Gate
milestone: M1
status: in-progress
blocked_by: [ATM-GOV-0102]
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

# ATM-GOV-0104 Evidence-Bound Close and Commit/PR Gate

## Background

Task completion must not rely on status text alone.
Evidence needs first-class enforcement for close/commit/PR gates.

## Outputs

1. Evidence kinds and schema (`test`, `artifact`, `attestation`, `review`, `commit`, `waiver`).
2. Evidence verification API per gate type.
3. Close/commit/PR gate behavior with deterministic fail reasons.

## Acceptance Criteria

- [ ] Task close fails when required evidence is missing.
- [ ] Commit/PR checks expose missing evidence details.
- [ ] Waiver flow is explicit and auditable.

## Target Files

- `packages/cli/src/commands/evidence.ts`
- `docs/governance/evidence-gates.md`

## Validation Commands

```bash
node atm.mjs evidence add --task ATM-GOV-0104 --actor <actor> --kind test --summary "pass" --json
node atm.mjs evidence verify --task ATM-GOV-0104 --gate close --json
```

## Notes

2026-05-19 | status: in-progress | validation: pending | change: locked by codex-gpt-5.5 for M1 evidence gate implementation pass in isolated AI-Atomic-Framework worktree | blocker: waiting on shared foundation updates
2026-05-19 | status: open | validation: pending | change: formal card opened
