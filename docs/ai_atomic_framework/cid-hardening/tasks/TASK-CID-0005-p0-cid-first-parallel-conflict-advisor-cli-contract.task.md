---
doc_id: doc_cid_0005
task_id: TASK-CID-0005
title: "P0 CID-first parallel conflict advisor CLI contract"
status: planned
owner: atm-core
priority: P0
milestone: P0
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
  - "npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md docs/ai_atomic_framework/cid-hardening/tasks/README.md docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0005-p0-cid-first-parallel-conflict-advisor-cli-contract.task.md"
  - "git diff --check"
  - "node atm.mjs tasks import --from \"C:/Users/User/3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0005-p0-cid-first-parallel-conflict-advisor-cli-contract.task.md\" --dry-run --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit. This card is planning-only; no AI-Atomic-Framework source files or .atm runtime/history files are touched."
atomizationImpact:
  ownerAtomOrMap: "atm.planning-bridge-map"
  mapUpdates: []
  notes: "Planning-only P0 contract card. No CID tasks-cid ledger/shard exists in docs/tasks, so no new ledger is introduced."
outOfScope:
  - "C:/Users/User/AI-Atomic-Framework/**"
  - "Any AAF CLI implementation or source changes"
  - "Creating or editing docs/tasks/tasks-cid.json or any new tasks-cid shard"
  - "Editing TASK-TEAM-0018 or any TEAM task card"
  - ".atm/runtime/** and .atm/history/** writes"
  - "A second scheduler, Git substitute, or runtime lease engine implementation"
nonGoals:
  - "Do not treat file overlap as the primary conflict signal"
  - "Do not define a blocked state when atoms are disjoint but file paths overlap"
  - "Do not add a new tasks-cid ledger/shard"
---

# TASK-CID-0005 — P0 CID-first parallel conflict advisor CLI contract

## Goal

Promote `TASK-CID-0005` to the P0 planning contract that defines how ATM judges parallel task-card conflicts.

CID-first means:

1. `atom_id` / `atom_cid` are checked before file overlap.
2. CID conflict means semantic conflict.
3. CID disjoint + file overlap means `needs-physical-split`, not `blocked`.
4. Physical file overlap is a packaging signal, not the first-order gate.

## CLI Contract

- `node atm.mjs tasks parallel --task <task-id> --with <task-id> --json`
- `node atm.mjs tasks parallel --task <task-id> --queue --json`
- `node atm.mjs tasks parallel --queue --report --json`

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
- No `docs/tasks/tasks-cid.json` / tasks-cid shard currently exists in 3KLife; do not create one for this card.

## Acceptance Criteria

- `TASK-CID-0005` is documented as the P0 next formal card, not as a future queue placeholder.
- The plan book states CID-first, not file-first.
- The plan book states CID conflict = semantic conflict.
- The plan book states CID disjoint + file overlap = needs-physical-split, not blocked.
- The task card lists the CLI contract, verdicts, and report fields verbatim enough for future implementation cards to follow without reinterpretation.
- Existing planned tasks continue to route normally.

## Rollback

Revert the planning-doc commit. No AAF source changes are part of this card.
