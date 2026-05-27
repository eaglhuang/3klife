---
doc_id: doc_task_aao_0049
task_id: TASK-AAO-0049
title: "Default atom health test gates"
status: planned
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - TASK-AAO-0048
  - TASK-AAO-0015
  - TASK-AAO-0016
  - TASK-AAO-0023
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/manager/test-runner.ts
  - packages/core/src/test-runner/**
  - packages/cli/src/commands/test.ts
  - packages/cli/src/commands/command-specs/test.spec.ts
  - schemas/test-report.schema.json
  - schemas/governance/**
  - fixtures/**
  - tests/**
  - scripts/validate-test-runner.ts
  - scripts/validate-schemas.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - docs/ADAPTER_GUIDE.md
deliverables:
  - "A default atom health check catalog covering input immutability, side effects, and consumer contract fixtures."
  - "Fixture format and runner support for positive and negative examples."
  - "Report schema fields that identify which health gates ran, skipped, failed, or were not applicable."
  - "Documentation explaining when each gate should be enabled."
validators:
  - npm run typecheck
  - npm run validate:test-runner
  - npm run validate:schemas
  - npm run validate:cli
evidence:
  required:
    - "Command output proving each default gate can pass and fail through fixtures."
    - "Schema validation for the new test report fields."
    - "Documentation evidence showing how adopters enable or disable each gate."
rollback:
  - "Keep all three gates policy-gated or opt-in until adopter compatibility is proven."
  - "Allow projects to downgrade a gate from blocking to advisory through ATM policy."
atomizationImpact:
  - "Improves confidence that small atom edits preserve behavior beyond simple command success."
  - "Encourages atom designs with explicit inputs, outputs, side effects, and caller contracts."
outOfScope:
  - "Making these checks mandatory for every atom type on day one."
  - "Replacing project-specific unit, integration, end-to-end, or performance tests."
  - "Automatically inferring every business invariant from schemas alone."
nonGoals:
  - "Treating schema equality as complete proof of semantic correctness."
  - "Blocking adoption in repositories that have not yet authored fixtures."
---

# TASK-AAO-0049 — Default atom health test gates

## Goal

Add a small default catalog of atom health gates that ATM can run or delegate: input immutability checks, side-effect checks, and consumer contract fixtures.

## Why

For pure functions or tightly scoped atoms, schema checks plus equivalence fixtures can cover a large part of correctness. The remaining common blind spots are usually outside the return value:

- The atom silently mutates its input.
- The atom writes, emits, caches, deletes, or calls something it should not.
- The output shape is technically valid, but a downstream consumer's real contract is broken.

These checks should become standard ATM concepts, even if not every repository enables all of them immediately.

## Implementation Contract

The first implementation should be a default test catalog, not a hard global mandate.

- Pure atoms should normally enable input immutability and equivalence checks.
- Atoms with declared side effects should use explicit side-effect fixtures.
- Consumer-facing atoms should carry consumer contract fixtures for caller expectations that schemas do not fully express.
- Each gate should support `blocking`, `advisory`, `skipped`, and `not_applicable` outcomes.

## Recommended Gate Design

| Gate | First implementation | Notes |
|---|---|---|
| Input immutability | Deep clone or structured snapshot before execution, then compare after execution unless mutation is explicitly allowed. | Best for pure atoms and transformation atoms. Must support allowlists for intentional mutation. |
| Side-effect check | Run with fake adapters or declared sandbox paths, then compare expected file, event, network, cache, database, or log effects. | Best for I/O atoms. Must avoid pretending hidden external effects are fully observable. |
| Consumer contract fixtures | Let downstream consumers declare required fields, error semantics, null handling, ordering, compatibility, and golden examples. | Best for atom maps and public outputs. Complements schema validation. |

## Deliverables

- Default atom health check catalog.
- Fixture schema for the three gates.
- Runner integration through `atm test --spec` and/or `atm test --map`.
- Report output that shows pass/fail/skip/not applicable per gate.
- Positive and negative fixtures.
- Documentation for adopter policy and plugin authors.

## Validators

- `npm run typecheck`
- `npm run validate:test-runner`
- `npm run validate:schemas`
- `npm run validate:cli`

## Acceptance Criteria

- ATM can represent the three gates in test configuration and reports.
- At least one fixture proves each gate can detect a real failure.
- Gates can be enabled by atom capability, policy, or plugin support.
- Existing adopters are not forced to write all fixtures immediately.
- Documentation explains that these gates reduce common regression risk but do not replace complete project tests.

## Rollback

Keep the gates advisory by default until enough adopter projects have fixtures. If a gate is noisy, disable only that gate through policy rather than removing the entire test runner path.

## Atomization Impact

This makes small atoms easier to trust after AI edits. The smaller and more explicit the atom, the cheaper it becomes to prove that inputs, outputs, side effects, and downstream contracts still match expectations.

## Notes

Recommendation: include these three checks in ATM's default basic test vocabulary, but enable them by atom type and policy. They are too valuable to leave unnamed, but too context-sensitive to force blindly.
