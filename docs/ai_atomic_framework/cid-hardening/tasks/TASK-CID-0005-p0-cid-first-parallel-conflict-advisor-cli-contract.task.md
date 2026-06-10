---
doc_id: doc_cid_0005
task_id: TASK-CID-0005
title: "P0 parallel conflict advisor CLI contract"
status: done
owner: atm-core
priority: P0
milestone: P0
started_at: 2026-06-10T16:02:00+08:00
started_by_agent: "003"
completed_at: 2026-06-10T16:02:00+08:00
completed_by_agent: "003"
depends_on:
  - "TASK-CID-0003"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0005-p0-cid-first-parallel-conflict-advisor-cli-contract.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0005-p0-cid-first-parallel-conflict-advisor-cli-contract.task.md"
validators:
  - "encoding-touched guard on touched planning files"
  - "git diff --check"
  - "ATM task import dry-run for this planning card"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit. This card is planning-only; no framework source files or runtime/history files are touched."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Planning-only P0 contract card. No CID family task ledger or shard is introduced."
outOfScope:
  - "Any framework source implementation or CLI runtime changes"
  - "Any CID family task ledger or shard creation"
  - "Editing TASK-TEAM-0018 or any TEAM task card"
  - "Runtime or history writes"
  - "A second scheduler, Git substitute, or runtime lease engine implementation"
nonGoals:
  - "Do not treat file overlap as the primary conflict signal"
  - "Do not define a blocked state when atoms are disjoint but file paths overlap"
  - "Do not add a new CID ledger/shard"
---

# TASK-CID-0005 — P0 parallel conflict advisor CLI contract

## Goal

Promote `TASK-CID-0005` to the P0 planning contract that defines how ATM judges parallel task-card conflicts.

CID-first means:

1. `atom_id` / `atom_cid` are checked before file overlap.
2. CID conflict means semantic conflict.
3. CID disjoint + file overlap means `needs-physical-split`, not `blocked`.
4. Physical file overlap is a packaging signal, not the first-order gate.

## CLI Contract

- ATM CLI: tasks parallel --task <task-id> --with <task-id> --json
- ATM CLI: tasks parallel --task <task-id> --queue --json
- ATM CLI: tasks parallel --queue --report --json

## Verdicts

- `parallel-safe`
- `blocked-cid-conflict`
- `needs-physical-split`
- `blocked-shared-generator`
- `blocked-shared-validator`
- `blocked-shared-projection`
- `blocked-shared-artifact`
- `blocked-active-lease`
- `insufficient-atom-map`

## Report Fields

- overlapping files / scripts
- overlapping atom_id
- overlapping atom_cid
- shared generator / projection / registry / index
- shared validator
- shared output artifact
- active lease / direction lock conflicts
- hotspot report: which scripts / atoms most often collide, and which atoms should be split first

## Planning Notes

- This card only upgrades the contract and wording in 3KLife planning.
- The implementation surface remains in future AAF cards.
- `TASK-TEAM-0018` remains a read-only consumer reference; this card does not modify TEAM artifacts.
- No CID family task ledger or shard currently exists in 3KLife; do not create one for this card.

## Acceptance Criteria

- `TASK-CID-0005` is documented as the P0 next formal card, not as a future queue placeholder.
- The plan book states CID-first, not file-first.
- The plan book states CID conflict = semantic conflict.
- The plan book states CID disjoint + file overlap = needs-physical-split, not blocked.
- The task card lists the CLI contract, verdicts, and report fields verbatim enough for future implementation cards to follow without reinterpretation.
- Existing planned tasks continue to route normally.

## R49 Referee Synthesis

The R49 referee wording for this card is:

1. CID-first is the primary arbitration rule.
2. Semantic CID conflict outranks file overlap.
3. CID disjoint + file overlap is `needs-physical-split`, not `blocked`.
4. Shared generator / projection / validator / artifact / active-lease collisions remain hard blockers.
5. The card is a planning contract only; it does not authorize AAF source writes.

This wording is the acceptance-facing contract future implementation cards must preserve without reinterpretation.

## Worker Report

- worker: 003
- task: TASK-CID-0005
- status: done
- result: The CID-first conflict advisor contract is now explicitly anchored in the planning source of truth, with acceptance wording that keeps semantic CID conflict ahead of file overlap and treats CID-disjoint + file overlap as `needs-physical-split`, not `blocked`.
- sync: `tasks/README.md` and `CID硬化計畫書.md` were aligned to the same wording so future execution cards can inherit the contract without reinterpretation.
- dispatch-note: No formal R49 dispatch file was present in `inbox`; this work was completed directly in the planning scope and therefore does not require a mailbox move.

## Rollback

Revert the planning-doc commit. No AAF source changes are part of this card.
