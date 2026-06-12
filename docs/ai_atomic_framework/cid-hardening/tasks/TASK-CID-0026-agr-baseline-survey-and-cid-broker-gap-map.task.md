---
doc_id: doc_cid_0026
task_id: TASK-CID-0026
title: "AGR baseline survey and CID/broker gap map"
status: done
owner: atm-core
priority: P1
milestone: M0
depends_on:
  - "TASK-CID-0025"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/agr-virtual-atomization-implementation-plan.md"
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md"
  - "docs/ai_atomic_framework/cid-hardening/00-verified-facts.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0026-agr-baseline-survey-and-cid-broker-gap-map.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/agr-baseline-survey.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0026-agr-baseline-survey-and-cid-broker-gap-map.task.md"
validators:
  - "encoding-touched guard on touched planning files"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the planning-doc commit that introduced the AGR baseline survey."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-planning-map"
  mapUpdates: []
  notes: "Planning-only survey card."
outOfScope:
  - "Editing AI-Atomic-Framework source files"
  - "Creating or closing target-repo execution tasks"
  - "Manual mutation of .atm/history/** or .atm/runtime/**"
nonGoals:
  - "Do not implement Layer 1 or Layer 2 in this card"
  - "Do not treat planning mirror edits as execution delivery"
started_at: 2026-06-11T18:30:00+08:00
started_by_agent: captain
completed_at: 2026-06-11T18:36:00+08:00
completed_by_agent: captain
---

# TASK-CID-0026 - AGR baseline survey and CID/broker gap map

## Goal

Read the AGR proposal and map it onto the current CID/broker reality so the next execution pack starts from verified framework facts instead of proposal language alone.

## Acceptance Criteria

- Produce `agr-baseline-survey.md`.
- Cover five areas: Layer 1, Layer 2, Augmented Decision Rule, mid-execution registration, validator benchmark.
- Mark what is already partially covered by `TASK-CID-0015` through `TASK-CID-0025`.
- Mark what must remain fail-closed or deferred.

## Notes

- This is planning-only.
- The output should be written as a gap map: AGR claim -> current surface -> missing contract -> suggested execution card.

## Completion Notes

- Delivered planning doc: `docs/ai_atomic_framework/cid-hardening/agr-baseline-survey.md`.
- The survey covers Layer 1, Layer 2, Augmented Decision Rule, mid-execution registration, and validator benchmark gaps.
- The output stays within planning-only scope and does not claim target-repo runtime completion.
