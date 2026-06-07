---
doc_id: doc_cid_0010
task_id: TASK-CID-0010
title: "Write Broker lane router contract"
status: done
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0005"
  - "TASK-CID-0009"
started_at: 2026-06-07T09:39:40+08:00
started_by_agent: codex-gpt-5.4-mini
completed_at: 2026-06-07T09:39:40+08:00
completed_by_agent: codex-gpt-5.4-mini
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0010-write-broker-lane-router-contract.task.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0010-write-broker-lane-router-contract.task.md"
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
  notes: "Defines the always-on thin broker and lane decision model."
outOfScope:
  - "Framework source implementation"
  - "Runtime lease engine implementation"
  - "A second scheduler"
  - "Direct mutation of Git hooks"
  - "Write Agent pool implementation"
---

# TASK-CID-0010 — Write Broker lane router contract

## Goal

Define the always-on Write Broker as a thin ATM coordination layer that records write intent and chooses a write lane across all active tasks / teamRuns in the same repo or workspace.

## Background

The goal is not to make every edit slow. The broker must be cheap enough that normal single-Agent work still feels direct, while still giving ATM enough information to escalate same-file / same-CID / shared-surface collisions.

The broker is global per repo/workspace, not per task. Each task's Team Agents submit intents to the same registry so cross-task conflicts are visible before writes collide.

## Lane Contract

The broker must classify work into:

- Direct Brokered Lane
- Deterministic Composer Lane
- Neutral Steward Lane
- Mediation / Serial Lane
- Shared Surface Guard Lane
- Lead Writer Break-glass Lane

The broker decision must consider:

- task id
- team run id
- actor id
- base commit
- target files
- atom id
- atom CID
- shared generator / projection / registry / index
- shared validator
- shared output artifact
- active lease / direction lock

## Registry Contract

The broker registry must track active write intents across tasks:

- repo / workspace identity
- task id
- team run id
- actor id
- base commit
- resource keys: files, atom ids, atom CIDs, generators, projections, validators, artifacts
- lease epoch
- lane decision

## Acceptance Criteria

- CID plan states `Broker always, Writer dynamic, isolation tiered`.
- The broker is explicitly not a second scheduler and not a direct writer.
- The broker is global per repo/workspace and can see multiple active teamRuns.
- The lane table is documented with escalation conditions.
- No framework source, runtime, or history files are touched.

## Rollback

Revert the planning-doc commit.
