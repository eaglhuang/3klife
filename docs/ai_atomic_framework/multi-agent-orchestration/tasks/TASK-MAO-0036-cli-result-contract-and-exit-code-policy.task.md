---
task_id: TASK-MAO-0036
doc_id: doc_mao_0036
title: "CLI result contract and exit code policy"
status: done
owner: atm-core
priority: P0
milestone: M7
closure_authority: target_repo
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/README.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/command-specs/_common.ts"
  - "docs/cli-error-policy.md"
  - "docs/troubleshooting.md"
  - "docs/testing-strategy.md"
  - "tests/cli/cli-result-contract.test.ts"
  - "tests/cli-fixtures/help-snapshots/"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
targetAllowedFiles:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/command-specs/_common.ts"
  - "docs/cli-error-policy.md"
  - "docs/troubleshooting.md"
  - "docs/testing-strategy.md"
  - "tests/cli/cli-result-contract.test.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
  - "tests/cli-fixtures/help-snapshots/explain.json"
  - "tests/cli-fixtures/help-snapshots/guide.json"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "tests/cli-fixtures/help-snapshots/orient.json"
  - "tests/cli-fixtures/help-snapshots/registry.json"
  - "tests/cli-fixtures/help-snapshots/start.json"
  - "tests/cli-fixtures/help-snapshots/upgrade.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/command-specs/_common.ts"
  - "docs/cli-error-policy.md"
  - "docs/troubleshooting.md"
  - "docs/testing-strategy.md"
  - "tests/cli/cli-result-contract.test.ts"
  - "tests/cli-fixtures/help-snapshots/broker.json"
  - "tests/cli-fixtures/help-snapshots/explain.json"
  - "tests/cli-fixtures/help-snapshots/guide.json"
  - "tests/cli-fixtures/help-snapshots/next.json"
  - "tests/cli-fixtures/help-snapshots/orient.json"
  - "tests/cli-fixtures/help-snapshots/registry.json"
  - "tests/cli-fixtures/help-snapshots/start.json"
  - "tests/cli-fixtures/help-snapshots/upgrade.json"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types tests/cli/cli-result-contract.test.ts"
  - "git diff --check"
notes: "Historical close lane: scope narrowed to cli-result-contract + help snapshots; coexists with TASK-MAO-0038 WIP."
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert result-contract helper, command-spec updates, docs, tests, and atom-map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.cli-result-contract-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing command semantics beyond result normalization"
  - "Introducing exit codes above the documented reserved range"
  - "Masking hard failures as warnings"
nonGoals:
  - "Do not redesign the CLI command dispatcher."
  - "Do not make warning exits inconsistent across JSON and non-JSON output."
completed_at: "2026-06-17T01:12:59.365Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-17T01-12-59-264Z-close-6118de9850ce"
delivery_commit: "742334b69"
---

# TASK-MAO-0036 - CLI result contract and exit code policy

## Goal

Define and enforce a stable machine-readable CLI result contract so agents can
distinguish success, warnings, blocked actions, usage errors, and hard failures
without guessing from inconsistent process exit codes.

## Implementation Contract

- Standardize JSON fields for command results: `ok`, `severity`, `exitCode`,
  `blocking`, and `diagnostics`.
- Document the compatibility matrix for exit code `0`, `1`, and `2`; reserve
  higher codes unless a future policy explicitly introduces them.
- Ensure `ok: true` commands do not exit as hard failures.
- Ensure warning or diagnostic-only commands report an explicit non-blocking
  severity in JSON.
- Add release-smoke coverage that asserts both process exit code and JSON shape.
- Update command help/spec shared text where users or agents rely on exit-code
  behavior.

## Acceptance Criteria

- CLI result docs describe the result contract in one canonical place.
- Tests cover success, warning/advisory, blocked action, usage error, and hard
  failure cases.
- Existing taskflow and tasks commands can adopt the contract without changing
  their governed lifecycle semantics.
- The policy directly addresses backlog item `ATM-BUG-2026-06-16-011` where
  governance-state blockers were indistinguishable from content failures.

