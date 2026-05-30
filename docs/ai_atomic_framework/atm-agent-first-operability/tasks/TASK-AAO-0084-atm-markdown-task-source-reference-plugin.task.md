---
task_id: TASK-AAO-0084
title: "atm-markdown-task-source reference plugin (Layer 2)"
status: planned
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0083
scopePaths:
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/atm-markdown-task-source/package.json"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/plugin-registry.ts"
  - "schemas/atm-config.schema.json"
  - "tests/plugin-sdk/atm-markdown-task-source.test.ts"
deliverables:
  - "packages/atm-markdown-task-source/src/index.ts"
  - "packages/atm-markdown-task-source/package.json"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/plugin-registry.ts"
  - "schemas/atm-config.schema.json"
  - "tests/plugin-sdk/atm-markdown-task-source.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run test -- tests/plugin-sdk/atm-markdown-task-source.test.ts"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.plugin-sdk-map"
  mapUpdates:
    - path_pattern: "packages/atm-markdown-task-source/src/index.ts"
      atom_id: "atm.markdown-task-source-plugin"
      capability: "Reference ExternalTaskSourcePlugin implementing markdown frontmatter parse hook, advisory by default, opt-in enforce via .atm/config.json"
      coverage_status: "active"
outOfScope:
  - "validate / generate hooks — 漸進加"
  - "Context Map fields — TASK-AAO-0085"
  - "Upstream 3KLife task-card-opener — TASK-AAO-0086"
  - "Modifying tasks.ts to consume plugin — TASK-AAO-0084 中做"
nonGoals:
  - "Do not assume any specific frontmatter format"
  - "Do not bundle reference implementation in this card"
---

## Goal
Implement a reference sub-package `atm-markdown-task-source` providing the standard `ExternalTaskSourcePlugin` parse hook. Integrate it into `tasks import` CLI parsing with backward-compatible advisory fallback logic, schema updates, and a comprehensive test suite.

## Acceptance
- `packages/atm-markdown-task-source/src/index.ts` is implemented and exports the plugin instance
- `packages/atm-markdown-task-source/package.json` is created with proper TS build directives
- `packages/cli/src/plugin-registry.ts` is created and loads custom task sources from `.atm/config.json`
- `packages/cli/src/commands/tasks.ts` uses plugin parse hook with 100% byte-identical backward compatibility
- `schemas/atm-config.schema.json` is updated with `plugins.externalTaskSources` schema definition
- `tests/plugin-sdk/atm-markdown-task-source.test.ts` passes typecheck and fully tests mock and actual plugin flows
