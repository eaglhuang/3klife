---
doc_id: doc_cid_0016
task_id: TASK-CID-0016
title: "Local write-broker registry and CLI"
status: planned
owner: atm-core
priority: P0
milestone: P0
depends_on:
  - "TASK-CID-0014"
  - "TASK-CID-0015"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/index.ts"
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-cli.ts"
  - "scripts/validate-broker-registry.ts"
  - "tests/cli-fixtures/cli-mvp.fixture.json"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli-fixtures/help-snapshots/broker.json"
deliverables:
  - "packages/core/src/broker/registry.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/index.ts"
  - "packages/core/src/index.ts"
  - "packages/cli/src/atm.ts"
  - "packages/cli/src/index.ts"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/command-specs/broker.spec.ts"
  - "packages/cli/src/commands/command-specs.ts"
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-cli.ts"
  - "scripts/validate-broker-registry.ts"
  - "tests/cli-fixtures/cli-mvp.fixture.json"
  - "tests/cli-fixtures/help-snapshots/command-list.json"
  - "tests/cli-fixtures/help-snapshots/broker.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-broker-registry.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the broker registry/CLI commit and remove the CLI surface from command-specs if the runtime proves unstable."
atomizationImpact:
  ownerAtomOrMap: "atm.write-broker-registry-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "This card births the shared local registry and decision surface that later broker flows depend on."
outOfScope:
  - "tasks parallel precedence changes"
  - "proposal creation and validation runtime"
  - "steward apply flow"
  - "team or next lifecycle integration"
---

# TASK-CID-0016 - Local write-broker registry and CLI

## Goal

Implement the local write-broker registry and the first `node atm.mjs broker ...` CLI surface for registering, inspecting, deciding, releasing, and cleaning broker intent.

## Why This Exists

The planning contracts assume one repo/workspace-level broker view of active write intent. Without a real local registry, later proposal, compose, steward, Team, and Next lifecycle flows would each invent their own partial state.

## Acceptance Criteria

- A local broker registry implementation exists in core code.
- The CLI exposes at least `register`, `decision`, `status`, `release`, and `cleanup`.
- The runtime can represent multiple active task/team write intents inside one repo/workspace.
- Stale registry entries can be cleaned instead of permanently blocking later work.
- Any new broker validator introduced by this card is registered through both `package.json` and `scripts/validators.config.json`.
- CLI route wiring, command help, and help snapshots are updated through `packages/cli/src/atm.ts`, `packages/cli/src/index.ts`, `scripts/validate-cli.ts`, and the broker CLI fixture snapshot set.
- This card does not yet change `tasks parallel`, `team`, or `next` behavior.

## Notes

Compact captain cadence still applies: prefer one large `007` packet, then one `005` / `006` go-no-go plus reporting pass. Captain-owned sidecars may preflight command-spec wiring and validator coverage.

`packages/core/src/broker/*` and `packages/cli/src/commands/broker.ts` are intentional new surfaces born by this completion pack. Their absence in the current repo is expected before this card starts.
