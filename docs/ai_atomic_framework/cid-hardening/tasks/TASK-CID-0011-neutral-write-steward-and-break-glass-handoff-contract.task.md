---
doc_id: doc_cid_0011
task_id: TASK-CID-0011
title: "Neutral Write Steward and Lead Writer break-glass handoff contract"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0009"
  - "TASK-CID-0010"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0011-neutral-write-steward-and-break-glass-handoff-contract.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0011-neutral-write-steward-and-break-glass-handoff-contract.task.md"
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
  notes: "Defines neutral merge stewardship and the emergency-only Lead Writer escape hatch."
outOfScope:
  - "Framework source implementation"
  - "Runtime or history writes"
  - "Making Lead Writer a normal lane"
  - "Allowing verbal handoff without evidence"
  - "Replacing Git history or rollback"
---

# TASK-CID-0011 — Neutral Write Steward and Lead Writer break-glass handoff contract

## Goal

Define the neutral Write Agent / Steward protocol and the emergency-only Lead Writer Break-glass handoff policy.

## Background

Promoting Agent A into B's Lead Writer is risky because it mixes task intent, ownership, acceptance, and evidence. The normal route must use a neutral Write Agent / Steward. Lead Writer is only a break-glass fallback.

## Steward Contract

Neutral Write Agent / Steward must:

- receive patch proposals from A and B
- preserve A/B task boundaries
- produce a merge plan
- apply only the authorized final patch
- emit evidence naming all input proposals and validators
- avoid expanding task scope

## Break-glass Contract

Lead Writer Break-glass is allowed only when:

- neutral Write Agent / Steward is unavailable or failed
- A is already working on the same physical file
- B patch is small, clear, and proposal-backed
- CID check says disjoint
- Captain approval exists
- `BreakGlassHandoff.v1` exists before A applies B's patch

## Acceptance Criteria

- CID plan says Lead Writer is not a normal lane.
- CID plan defines `BreakGlassHandoff.v1`.
- The handoff fields include reason, actors, tasks, CID check, transferred intent, expanded scope, forbidden expansion, acceptance split, and rollback.
- No framework source, runtime, or history files are touched.

## Rollback

Revert the planning-doc commit.
