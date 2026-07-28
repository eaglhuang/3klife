---
doc_id: doc_cid_0040
task_id: TASK-CID-0040
title: "Intent registration, lease, heartbeat, and lease bounds"
status: done
completed_at: "2026-06-12T13:51:44.605Z"
completed_by_agent: "001"
lastTransitionId: "2026-06-12T13-51-44-606Z-close-786551898dd8"
delivery_commit: "daf47aa840c45cf00bb1564cfbecfaa4fd02774d"
owner: atm-core
priority: P1
milestone: M5
depends_on:
  - "TASK-CID-0032"
  - "TASK-CID-0034"
related_plan: docs/ai_atomic_framework/cid-hardening/agr-conflict-arbitration-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/intent-registry.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "packages/core/src/broker/__tests__/agr-layer2.test.ts"
  - "packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "packages/core/src/broker/__tests__/decision.test.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/registry.ts"
  - "scripts/validate-broker-registry.ts"
deliverables:
  - "packages/core/src/broker/intent-registry.ts"
  - "packages/core/src/broker/types.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "packages/core/src/broker/__tests__/agr-layer2.test.ts"
  - "packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "packages/core/src/broker/__tests__/decision.test.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/broker/lifecycle.ts"
  - "packages/core/src/broker/registry.ts"
  - "scripts/validate-broker-registry.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types packages/core/src/broker/__tests__/intent-registry.test.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the intent admission and lease-bound contract if registration semantics are not deterministic."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-intent-admission-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Full conflict arbitration verdicts"
  - "Filesystem snapshot persistence details"
nonGoals:
  - "Do not weaken fail-closed admission when scope is unknown."
---

# TASK-CID-0040 - Intent registration, lease, heartbeat, and lease bounds

## Goal

Define the broker admission contract for intent registration, heartbeat renewal, and explicit lease bounds.

## Acceptance Criteria

- Register, renew, and release flows are deterministic and test-covered.
- Unknown-scope or malformed admission requests fail closed.
- Lease bounds are explicit and cannot silently exceed the agreed maximum.
- Claim must fail closed when any declared dependency is still open, running, planned, or otherwise not done / verified.
- After deliverables exist, agents must still run `tasks close`; validator green is not a substitute for closeout.
