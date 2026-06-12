---
doc_id: doc_cid_0032
task_id: TASK-CID-0032
title: "Broker Augmented Decision Rule and read-set contract"
status: done
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-CID-0029"
  - "TASK-CID-0031"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/__tests__/decision.test.ts"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/__tests__/decision.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert ADR wiring if optional read-set introduces incorrect optimistic parallel decisions."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-decision-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Embedding-based semantic identity"
  - "Cross-machine broker coordination"
nonGoals:
  - "Do not weaken existing shared-surface blockers"
started_at: 2026-06-11T17:49:22+08:00
started_by_agent: codex-main
completed_at: 2026-06-11T22:20:04+08:00
completed_by_agent: codex-main
---

# TASK-CID-0032 - Broker Augmented Decision Rule and read-set contract

## Goal

Expand broker decisions beyond write-set overlap so read dependencies can participate in CID admission and lane routing.

## Acceptance Criteria

- `readAtoms` or equivalent read-set contract is represented as optional input.
- Existing callers remain compatible.
- Read/write dependency cases can no longer be incorrectly labeled `parallel-safe`.
- Shared-surface blockers continue to win when applicable.

## Completion Notes

- Target-repo ledger is already closed as `done` in `AI-Atomic-Framework`.
- Closure packet exists at `.atm/history/evidence/TASK-CID-0032.closure-packet.json`.
- This planning mirror update only synchronizes the 3KLife task card with the authoritative target-repo closeout state.
