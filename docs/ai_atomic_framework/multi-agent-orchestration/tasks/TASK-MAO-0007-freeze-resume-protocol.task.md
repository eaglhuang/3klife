---
task_id: TASK-MAO-0007
title: "freeze resume protocol"
status: planned
owner: atm-core
priority: P1
milestone: M3
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0005"
  - "TASK-MAO-0006"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/core/src/broker/freeze.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/cli/src/commands/route.ts"
  - "tests/cli/route-freeze-resume.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/core/src/broker/freeze.ts"
  - "packages/cli/src/commands/route.ts"
  - "tests/cli/route-freeze-resume.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/route-freeze-resume.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert freeze/resume protocol, CLI hooks, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-freeze-protocol-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Patch envelope schema implementation"
  - "Automatic agent interruption during LLM inference"
---

# TASK-MAO-0007 - freeze resume protocol

## Goal

Add a governed protocol for freezing and resuming routes when broker admission detects a conflict.

## Implementation Contract

- Add freeze records with reason, blocker route/task, target resources, requested ack, timeout, and fallback action.
- Add route CLI support for freeze/resume/status reporting.
- Define timeout semantics without assuming an LLM can be interrupted mid-generation.
- Freeze must request WIP patch envelope when source edits may already exist.

## Acceptance Criteria

- Tests prove freeze, freeze acknowledgement, timeout, resume, and blocked fallback.
- Freeze diagnostics identify the exact conflicting task/route/resource.
- Resume requires broker admission to be checked again.
- The protocol does not delete worktree changes.

