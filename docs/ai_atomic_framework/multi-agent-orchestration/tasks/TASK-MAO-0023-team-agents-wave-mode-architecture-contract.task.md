---
task_id: TASK-MAO-0023
doc_id: doc_mao_0023
title: "Team Agents wave mode architecture contract"
status: planned
owner: atm-core
priority: P0
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0004"
  - "TASK-MAO-0005"
  - "TASK-MAO-0006"
  - "TASK-MAO-0009"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "docs/specs/team-agents-wave-mode-v1.md"
  - "docs/specs/mao-logical-routing-v1.md"
  - "docs/tasks/"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/specs/team-agents-wave-mode-v1.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "git diff --check"
  - "npm run validate:neutrality"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the Team Agents Wave Mode spec and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-wave-mode-spec-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Implementing wave CLI commands"
  - "Changing batch checkpoint behavior"
nonGoals:
  - "Do not create a second task lifecycle or a Team Agents-only close path."
---

# TASK-MAO-0023 - Team Agents wave mode architecture contract

## Goal

Define Team Agents Wave Mode as the official way to make multi-card batch work fast without bypassing ATM governance.

## Implementation Contract

- Specify the relationship between Team Agents, batch queue, Broker admission, patch envelopes, evidence, and checkpoint.
- State that Team Agents may coordinate execution but do not own task lifecycle or git writes.
- Define wave safety rules: dependencies, scope overlap, CID conflicts, validators, target repo, closure authority, and generated artifacts.
- Define blocked cases that must split into later waves.

## Acceptance Criteria

- The spec explains why this is not a separate batch writer system.
- The spec names `batch checkpoint` or the existing close path as the final lifecycle authority.
- Unknown or ambiguous scope fails closed.
- The spec is public-framework neutral and does not embed 3KLife-specific policy.
