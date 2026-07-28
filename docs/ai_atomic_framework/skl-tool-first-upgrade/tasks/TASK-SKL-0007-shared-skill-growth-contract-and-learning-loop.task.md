---
task_id: TASK-SKL-0007
title: Shared skill growth contract and learning loop
status: done
milestone: P1
depends_on:
  - TASK-SKL-0002
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "integrations/**"
  - "docs/**"
  - "packages/**"
  - ".github/**"
deliverables:
  - "integrations/**"
  - "docs/**"
  - ".github/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the shared growth contract commit if the learning-loop architecture becomes inconsistent across ATM skills or bloats skill entry files."
atomizationImpact:
  ownerAtomOrMap: "atm.shared-skill-growth-contract"
  mapUpdates: []
out_of_scope:
  - "Do not build a separate knowledge system outside the existing skill/reference structure."
  - "Do not force every individual learning note directly into SKILL.md."
nonGoals:
  - "No chat-history-only memory scheme."
  - "No per-skill bespoke taxonomy that breaks cross-skill reuse."
completed_at: "2026-06-28T21:21:25.476Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-06-28T21:21:25.476Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-06-28T21-21-25-063Z-close-02021b32404f"
lastTransitionAt: "2026-06-28T21:21:25.476Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d6eeab308db78934f1c48914795defab65efe6cc"
---

# TASK-SKL-0007

## Goal

建立所有 ATM skills 共用的成長架構，讓大 skill 與小 skill 都使用同一套 learning loop、taxonomy、capture template 與 promotion policy，並把 playbook 產生的撞牆經驗可持續沉澱成可重用知識。

## Acceptance

- ATM skills share one growth contract instead of each skill inventing its own learning structure.
- The contract defines:
  - a shared taxonomy,
  - a shared capture template,
  - promotion rules for moving durable rules into `SKILL.md`,
  - reference-only handling for raw cases and examples.
- The router/playbook/specialist model clearly states where learning events originate and where they should be promoted.
- At least one ATM entry skill and one specialist skill demonstrate how the shared learning loop is consumed.
- The same growth contract is usable by future Team role skill packs without redefining taxonomy or promotion semantics per role.
- The contract explicitly defines how backlog items are split into product bugs, shared skill lessons, or both.
- The first reusable lesson set includes claim-latency, stale imported dependency truth, and runner capability skew cases from ATM dogfood backlog.
- The contract defines an active-to-historical demotion path so fixed wall-hit lessons do not keep bloating default skill context forever.

## Non-Goals

- No attempt to turn every friction note into permanent core instructions.
- No separate memory product or registry outside the skill/reference layout.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- This card exists so all ATM skills can grow through the same architecture.
- The desired rule is simple: case first in reference, stable pattern later in `SKILL.md`.
- Team role skill packs should consume this contract instead of inventing separate role-memory systems.
- Fixed bug lessons should be moved to a historical section or archive once the live route no longer depends on them.
