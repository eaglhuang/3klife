---
doc_id: doc_cid_0014
task_id: TASK-CID-0014
title: "Brokered write completion plan and task pack"
status: done
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0009"
  - "TASK-CID-0010"
  - "TASK-CID-0011"
  - "TASK-CID-0012"
  - "TASK-CID-0013"
started_at: 2026-06-07T10:20:04+08:00
started_by_agent: codex-gpt-5.4-mini
completed_at: 2026-06-07T10:44:30+08:00
completed_by_agent: codex-gpt-5.4-mini
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0014-brokered-write-completion-plan-and-task-pack.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0015-broker-contract-schemas-and-types.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0016-local-write-broker-registry-and-cli.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0017-cid-advisor-broker-decision-model.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0018-patch-proposal-capsule-runtime.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0019-deterministic-composer-and-merge-plan.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0020-neutral-write-steward-apply-flow.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0021-team-agents-brokered-write-runtime-integration.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0022-next-claim-and-closeout-broker-integration.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0023-end-to-end-brokered-write-acceptance-harness.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0014-brokered-write-completion-plan-and-task-pack.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0015-broker-contract-schemas-and-types.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0016-local-write-broker-registry-and-cli.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0017-cid-advisor-broker-decision-model.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0018-patch-proposal-capsule-runtime.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0019-deterministic-composer-and-merge-plan.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0020-neutral-write-steward-apply-flow.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0021-team-agents-brokered-write-runtime-integration.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0022-next-claim-and-closeout-broker-integration.task.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0023-end-to-end-brokered-write-acceptance-harness.task.md"
validators:
  - "encoding-touched guard on touched planning files"
  - "git diff --check"
  - "node atm.mjs tasks import --from \"docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md\" --dry-run --json"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit that opened the completion pack. This card is planning-only and must not write framework source."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-brokered-write-planning-map"
  mapUpdates: []
  notes: "Planning-only card. It defines the execution pack and acceptance contract but does not birth new framework atoms by itself."
outOfScope:
  - "Editing AI-Atomic-Framework source files"
  - "Importing, claiming, or closing execution cards in AI-Atomic-Framework"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
  - "Reopening TASK-CID-0009 through TASK-CID-0013"
nonGoals:
  - "Do not implement the broker runtime in this card"
  - "Do not create a parallel planning queue outside cid-hardening"
---

# TASK-CID-0014 - Brokered write completion plan and task pack

## Goal

Write the 100% brokered-write completion definition back into the CID hardening plan, update the task index, and open the full execution pack `TASK-CID-0015` ~ `TASK-CID-0023`.

## Background

`TASK-CID-0009` ~ `TASK-CID-0012` already closed the planning contracts for proposal-backed writes, broker lane routing, neutral stewardship, and Team integration. `TASK-CID-0013` proved the first consumer bridge by wiring the existing CID-first advisor into `team` / `next` preflight. The remaining gap is not another planning sketch; it is a fully authorable execution pack with explicit deliverables, validators, rollback, and final acceptance.

## Contract

1. Update `CID硬化計畫書.md` so the document defines what "100% complete" means for brokered writes in the local repo/workspace model.
2. Update `tasks/README.md` so the completion pack is discoverable from the task index.
3. Create `TASK-CID-0015` ~ `TASK-CID-0023` as machine-readable execution cards with explicit scope, deliverables, validators, rollback, and atomization ownership.
4. Encode the captain cadence for this pack: aim to close each implementation card in at most two captain rounds, use only formal workers `005` / `006` / `007`, keep `001` ~ `003` inactive by default, and allow captain-owned internal sidecars for cheap read-only convergence only.

## Acceptance Criteria

- The CID plan contains a local-first 100% completion definition and a task-pack summary for `TASK-CID-0014` ~ `TASK-CID-0023`.
- The task index contains the same completion pack and sequencing guidance.
- Every new card includes machine-readable `scopePaths`, `deliverables`, `validators`, `rollback`, and `atomizationImpact`.
- `node atm.mjs tasks import --from "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md" --dry-run --json` discovers the intended task ids without falling back to unrelated work.
- No framework source files and no `.atm/**` runtime files are edited by this card.

## Validators

- `encoding-touched guard on touched planning files`
- `git diff --check`
- `node atm.mjs tasks import --from "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md" --dry-run --json`

## Rollback

Revert the planning-doc commit that opened the completion pack.

## Notes

- Captain dispatch mode for this pack is compact by design: one primary implementation wave owned by `007`, one acceptance / reporting wave owned by `005` and `006`, and captain-owned internal sidecars for preflight / postflight read-only convergence only.
- These roster and cadence rules are captain-governance constraints for dispatch in this planning card; they are not yet machine-enforced runtime gates.
- This card does not authorize framework writes; it only opens the execution pack that will authorize them later.
