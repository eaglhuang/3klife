---
doc_id: doc_task_aao_0048
task_id: TASK-AAO-0048
title: "TestRunnerPlugin interface for atom health"
status: done
owner: atm-core
priority: P1
milestone: M17
depends_on:
  - TASK-AAO-0015
  - TASK-AAO-0016
  - TASK-AAO-0023
  - TASK-AAO-0035
  - TASK-AAO-0047
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/plugin-sdk/src/index.ts
  - packages/plugin-sdk/src/test-runner.ts
  - packages/core/src/manager/test-runner.ts
  - packages/cli/src/commands/test.ts
  - packages/cli/src/commands/command-specs/test.spec.ts
  - schemas/test-report.schema.json
  - docs/ADAPTER_GUIDE.md
  - README.md
  - scripts/validate-test-runner.ts
  - scripts/validate-plugin-sdk.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/plugin-sdk/src/index.ts
  - packages/plugin-sdk/src/test-runner.ts
  - packages/core/src/manager/test-runner.ts
  - packages/cli/src/commands/test.ts
  - packages/cli/src/commands/command-specs/test.spec.ts
  - schemas/test-report.schema.json
  - docs/ADAPTER_GUIDE.md
  - scripts/validate-test-runner.ts
  - scripts/validate-plugin-sdk.ts
validators:
  - npm run typecheck
  - npm run validate:plugin-sdk
  - npm run validate:test-runner
  - npm run validate:cli
evidence:
  required:
    - "Command output for the plugin SDK validator."
    - "Command output for the test runner validator."
    - "CLI fixture proving an external plugin can contribute atom test evidence."
rollback:
  - "Keep existing validation.commands as the stable fallback path."
  - "Disable plugin discovery behind config if the first implementation causes adopter breakage."
atomizationImpact:
  - "Makes atom health validation an extension point instead of a hard-coded ATM core feature."
  - "Allows host repositories to define richer correctness tests while preserving the same governance evidence shape."
outOfScope:
  - "Building a complete language-specific test framework."
  - "Replacing project-owned unit, integration, or end-to-end test suites."
  - "Claiming semantic correctness without host-provided fixtures or validators."
nonGoals:
  - "Force every adopter to implement a custom plugin."
  - "Make all atoms run the same test set regardless of atom type."
completed_at: "2026-06-29T11:58:14.757Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-06-29T11:58:14.757Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-06-29T11-58-14-757Z-close-c2f2ee971f23"
lastTransitionAt: "2026-06-29T11:58:14.757Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3a60f13e5c9d3e906243290033f8fa844fb292ae"
---

# TASK-AAO-0048 — TestRunnerPlugin interface for atom health

## Goal

Open ATM's atom health validation surface through a formal `TestRunnerPlugin` interface so adopter repositories can plug in their own correctness tests without changing ATM core.

## Why

ATM already governs routing, scope, evidence, validator execution, and map equivalence, but correctness is still limited by whatever validators the host repository exposes. A first-class test runner plugin makes the intended model explicit: ATM owns the governance contract and evidence envelope; each adopter can own the domain-specific tests that prove an atom still behaves correctly.

This matters because atom health is not only "did the command run." It also includes long-lived logical correctness, compatibility with callers, and repeatability across future AI edits.

## Implementation Contract

The target implementation should define a stable plugin contract that can:

- Discover whether a plugin supports a given atom, atom map, language adapter, or repository profile.
- Produce a test plan for atom health checks.
- Execute host-provided unit, integration, golden, contract, or domain tests.
- Normalize plugin output into ATM evidence.
- Report clear failure types: no plugin configured, plugin unavailable, plugin crashed, tests failed, or test evidence is incomplete.

The existing `execution.validation.commands` behavior must remain backward compatible. The plugin layer should extend the model rather than invalidate existing adopters.

## Deliverables

- Public `TestRunnerPlugin` or equivalent SDK export.
- CLI integration for plugin-backed `atm test` execution.
- Versioned test report schema extension if needed.
- Example fixture plugin.
- Documentation in the adapter/plugin guide and README.
- Atom map update for the new plugin/test-runner code paths.

## Validators

- `npm run typecheck`
- `npm run validate:plugin-sdk`
- `npm run validate:test-runner`
- `npm run validate:cli`

## Acceptance Criteria

- ATM exposes a documented test runner plugin contract.
- A host repository can add custom atom tests without forking ATM.
- Existing validation command based workflows still pass unchanged.
- Plugin-generated results appear in normal ATM evidence.
- Failure output is actionable for both human maintainers and AI agents.
- Documentation clearly states that plugins provide extension points, not automatic correctness guarantees.

## Rollback

Keep the legacy validation command path as the stable fallback. If plugin discovery causes instability, disable plugin execution behind configuration while preserving the SDK type for later completion.

## Atomization Impact

This task raises testing from an ad hoc command list into a governed extension point. It lets small atoms stay independently testable while giving large adopter projects a clean place to attach richer correctness checks.

## Notes

This is the enabling layer. The complete default atom health checks should be handled by `TASK-AAO-0049`.
