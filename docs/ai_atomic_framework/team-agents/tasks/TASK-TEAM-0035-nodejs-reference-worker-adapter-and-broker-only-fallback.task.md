---
doc_id: doc_team_0035
task_id: TASK-TEAM-0035
title: "Node.js reference worker adapter and broker-only fallback"
status: done
owner: atm-core
priority: P0
milestone: M6R
depends_on:
  - "TASK-TEAM-0031"
  - "TASK-TEAM-0032"
  - "TASK-TEAM-0034"
related_plan: "docs/ai_atomic_framework/team-agents/ATM多語言WorkerAdaptor方案.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/core/src/team-runtime/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts --case nodejs-worker-adapter"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Node.js worker adapter implementation, broker-only fallback wiring, and validator coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Python or C# reference implementation"
  - "Editor-specific worker execution"
  - "Replacing broker governance"
nonGoals:
  - "Do not make agent spawn mandatory"
  - "Do not make vendor SDK choice part of core contracts"
completed_at: "2026-06-18T17:53:15.802Z"
completed_by_agent: "codex-gpt-5.4-mini"
closed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T17-53-14-687Z-close-c4546c304ec2"
delivery_commit: "94613136044b8dd851ecb74169c3a0df8f048c4e"
---
# TASK-TEAM-0035 Node.js reference worker adapter and broker-only fallback

## Goal

Ship the default Node.js Team worker adapter and the broker-only fallback path so ATM can run with or without actual spawned agents.

## Why

ATM needs one concrete reference runtime that matches the existing CLI and validator stack, while still allowing adopters to disable agents entirely and keep governance-only behavior.

## Implementation Contract

- Provide a Node.js reference adapter for `real-agent` mode.
- Allow provider and SDK selection through runtime metadata without binding core contracts to one vendor.
- Support `broker-only` fallback that disables agent spawn but preserves broker, lease, validator, police, and evidence behavior.

## Acceptance Criteria

- A Team run can use the default Node.js adapter without any editor dependency.
- A Team run can select broker-only mode and still complete governance checks.
- Runtime output preserves the same artifact and retry contracts across Node.js and broker-only paths.

## Notes

This is the first concrete runtime implementation card for the neutral adapter contract.
