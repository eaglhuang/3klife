---
task_id: TASK-MAO-0018
title: "closure packet runner binding"
status: done
owner: atm-core
priority: P2
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0017"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "schemas/governance/closure-packet.schema.json"
  - "packages/cli/src/commands/tasks/closeout-provenance.ts"
  - "packages/cli/src/commands/tasks/closeout-signaling.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "scripts/validate-framework-development-governance.ts"
  - "tests/cli/closure-runner-binding.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "schemas/governance/closure-packet.schema.json"
  - "tests/cli/closure-runner-binding.test.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:schemas"
  - "node --strip-types tests/cli/closure-runner-binding.test.ts"
  - "npm run validate:framework-development-governance"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert closure packet schema/additive binding logic, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.runner-closure-binding-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Cross-repo adopter binding"
  - "Changing closure authority rules"
  - "Replacing existing closure packet fields"
---

# TASK-MAO-0018 - closure packet runner binding

## Goal

Add a formal `atmCoreRunnerBinding` to closure packets for tasks that touched ATM core, but only after the team decides the lighter source-commit plus runner-sync-commit evidence is no longer enough.

## Implementation Contract

- Extend closure packet schema additively.
- Bind task closure to runner version, stream, source commit SHA, runner artifact sha256, artifact manifest hash, publisher, publish timestamp, and reproducibility method.
- Require the binding only when the closed task touched ATM core scope.
- Verify the runner artifact hash from the published runner artifact manifest.
- Preserve existing closure packets and non-core closure behavior.
- Keep v1 closure usable with simpler source-delivery plus steward-sync evidence while this richer binding remains deferred.

## Acceptance Criteria

- Schema validation passes for old packets without the field and new ATM-core packets with the field.
- ATM-core closure without a binding fails with a clear diagnostic.
- Non-core closure does not require the field.
- Tests prove digest mismatch rejection and successful binding verification.
- The task text makes clear it is a later precision upgrade, not a blocker for v1 stewardship.
