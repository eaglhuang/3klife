---
doc_id: doc_cid_0012
task_id: TASK-CID-0012
title: "Team Agents brokered write integration contract"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0005"
  - "TASK-CID-0009"
  - "TASK-CID-0010"
  - "TASK-CID-0011"
related:
  - "TASK-TEAM-0011"
  - "TASK-TEAM-0012"
  - "TASK-TEAM-0013"
  - "TASK-TEAM-0015"
  - "TASK-TEAM-0016"
  - "TASK-TEAM-0018"
  - "TASK-TEAM-0019"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0012-team-agents-brokered-write-integration-contract.task.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
deliverables:
  - "docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md"
  - "docs/ai_atomic_framework/cid-hardening/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/README.md"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0012-team-agents-brokered-write-integration-contract.task.md"
  - "docs/ai_atomic_framework/team-agents/tasks/README.md"
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
  notes: "Aligns CID brokered write governance with the Team Agents role and permission model."
outOfScope:
  - "Framework source implementation"
  - "Runtime or history writes"
  - "Opening or modifying TEAM task cards"
  - "Creating a second scheduler"
  - "Giving Neutral Write Steward git.write or task.lifecycle"
  - "Making Lead Writer a normal team recipe"
---

# TASK-CID-0012 — Team Agents brokered write integration contract

## Goal

Align CID brokered write governance with Team Agents so the feature becomes part of ATM's multi-agent acceleration path rather than a separate coordination system.

The integration must treat Write Broker as a repo/workspace-level service shared by all active teamRuns, not as a per-task helper.

## Background

Team Agents already defines Coordinator, Scope Guardian, Atomization Planner, Implementer, Review Agent, Validator, Evidence Collector, permission leases, `file.write`, `git.write`, and coordinator-only lifecycle ownership.

Write Broker must plug into that model:

- CID defines the conflict primitive and proposal contracts.
- Team Agents consumes the primitive as role / permission / playbook behavior.
- Team Agents must not become a second scheduler.
- Every task may have its own Team Agents, but all of those teams must register write intents against one global broker registry for the repo/workspace.

## Role Mapping

| Brokered write function | Team role | Notes |
|---|---|---|
| Write intent registration | Coordinator + Scope Guardian | Coordinator owns lifecycle; Scope Guardian checks allowedFiles / dirty tree / lease overlap. |
| Atom/CID conflict surface | Atomization Planner | Provides atom_id / atom_cid / shared generator / projection / validator / artifact surface. |
| Patch proposal authoring | Implementer | Produces `PatchProposal.v1`; high-risk same-file work does not directly dirty canonical worktree. |
| Proposal merge / final patch | Neutral Write Steward | Holds scoped `file.write` only; no `git.write` and no `task.lifecycle`. |
| Merge validation | Validator / Check Runner | Runs focused validators and diff checks. |
| Independent review | Review Agent | Writes review signature draft; does not hold `file.write`. |
| Commit / evidence / close | Coordinator | Keeps `git.write`, `evidence.write`, and `task.lifecycle`. |

## Global Broker Requirement

`TASK-CID-0012` requires the Team Agents integration to preserve a single cross-task broker view:

- A Team Run Coordinator registers `WriteIntent.v1` with the global broker before allowing a write lane.
- Scope Guardian reads broker conflicts across all active tasks, not only its own teamRun.
- Atomization Planner feeds atom/CID and shared-surface keys into the broker registry.
- Neutral Write Steward is spawned only after the broker sees a cross-task same-file / shared-surface case.
- Broker state can be local for single-user mode, but multi-user or server mode needs a shared adapter; local-only state becomes advisory there.

## Acceptance Criteria

- CID plan states Team Agents is the execution surface for brokered write governance.
- Team task index cross-references `TASK-CID-0012`.
- The mapping preserves Coordinator-only lifecycle and commit ownership.
- The contract states Write Broker is global per repo/workspace and serves all active task teams.
- Neutral Write Steward is explicitly not allowed to hold `git.write` or `task.lifecycle`.
- Lead Writer remains break-glass only and is not a normal team recipe.
- No framework source, runtime, or history files are touched.

## Rollback

Revert the planning-doc commit.
