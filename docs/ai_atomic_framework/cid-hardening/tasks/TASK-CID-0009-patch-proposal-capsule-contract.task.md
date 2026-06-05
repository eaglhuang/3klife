---
doc_id: doc_cid_0009
task_id: TASK-CID-0009
title: "Patch Proposal Capsule contract"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0005"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0009-patch-proposal-capsule-contract.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0009-patch-proposal-capsule-contract.task.md"
validators:
  - "encoding-touched guard on touched planning files"
  - "git diff --check"
  - "ATM task import dry-run for this planning card"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit. This card is planning-only."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-write-governance-map"
  mapUpdates: []
  notes: "Defines the proposal capsule required before brokered parallel writes can be safely merged."
outOfScope:
  - "Framework source implementation"
  - "Runtime or history writes"
  - "A second scheduler"
  - "Git merge implementation"
  - "Neutral Write Agent implementation"
---

# TASK-CID-0009 — Patch Proposal Capsule contract

## Goal

Define `atm.patchProposal.v1`, the governance capsule that lets an Agent submit a change without immediately dirtying the canonical worktree.

## Background

ATM wants parallel development without turning Git into a late-stage fire drill. The first missing primitive is a patch proposal that carries task, actor, base commit, file hash, atom/CID, anchors, intent, validators, and rollback.

## Contract

The proposal must include:

- `schemaId`
- `proposalId`
- `taskId`
- `actorId`
- `baseCommit`
- `fileBeforeHash`
- `targetFile`
- `atomRefs[]`
- `anchors[]`
- `intent`
- `patch` or structured edit payload
- `validators[]`
- `rollback`

## Acceptance Criteria

- CID plan defines `PatchProposal.v1`.
- The card explains why normal AI patch application is not enough: existing patch writes mutate the worktree immediately, while ATM proposal capsules must remain reviewable and mergeable before apply.
- The contract is clear enough for a future AI-Atomic-Framework implementation card to create schema / loader / validator work.
- No framework source, runtime, or history files are touched.

## Rollback

Revert the planning-doc commit.
