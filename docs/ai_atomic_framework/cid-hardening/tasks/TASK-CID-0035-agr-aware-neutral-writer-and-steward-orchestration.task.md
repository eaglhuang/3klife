---
doc_id: doc_cid_0035
task_id: TASK-CID-0035
title: "AGR-aware neutral writer and steward orchestration"
status: done
owner: atm-core
priority: P1
milestone: M3
depends_on:
  - "TASK-CID-0032"
  - "TASK-CID-0034"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/broker.ts"
  - "scripts/validate-broker-steward.ts"
deliverables:
  - "packages/core/src/broker/steward.ts"
  - "packages/cli/src/commands/broker.ts"
  - "scripts/validate-broker-steward.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-steward.ts --mode validate"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert AGR-aware steward orchestration if scope-tight write execution cannot be preserved."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-runtime-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing git.write or task.lifecycle authority"
  - "Introducing external write workers"
nonGoals:
  - "Do not let steward apply exceed broker-approved scope"
---

# TASK-CID-0035 - AGR-aware neutral writer and steward orchestration

## Goal

Allow neutral writer / steward flows to consume AGR virtual atoms and Layer 2 requests without widening lifecycle authority.

## Acceptance Criteria

- Steward can understand virtual atom context and decomposition requests.
- Scope-tight final patch authority remains intact.
- Rollback and evidence boundaries remain explicit.
