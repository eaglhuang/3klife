---
task_id: TASK-AAO-0087
title: "advisory commit hook reading contextMap.secondary"
status: in_progress
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0085
  - TASK-AAO-0086
started_at: "2026-05-30T13:30:23+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/hook/context-map-advisor.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "packages/cli/src/commands/hook/context-map-advisor.test.ts"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/hook/context-map-advisor.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  - "packages/cli/src/commands/hook/context-map-advisor.test.ts"
validators:
  - "node atm.mjs hook pre-commit --json"
  - "node atm.mjs atomize score"
  - "npm run test -- tests/cli/context-map-advisor.test.ts"
atomizationImpact:
  ownerAtomOrMap: "atm.context-map-advisor-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/hook/context-map-advisor.ts"
      atom_id: "atm.context-map-advisor-map"
      capability: "Advisory advisor checks for staged files outside of task scopePaths"
      coverage_status: "active"
outOfScope:
  - "Do not make advisor blocking (keep exit 0)"
  - "Do not edit target close or import workflows"
  - "Do not upgrade schemaVersion (keep v0.2)"
nonGoals:
  - "Do not use --no-verify or --force to bypass hooks"
  - "Do not modify the .atm/git-hooks/pre-commit shell script itself"
---

## Goal
Extend the existing pre-commit hook handler to check staged files against the current task's `contextMap.primary`, `contextMap.secondary`, `tests`, and `scopePaths`. If any staged file falls outside of these paths, output an advisory warning to stderr but always exit with 0 (never block the commit).

## Acceptance
- `packages/cli/src/commands/hook.ts` pre-commit handler invokes the new `context-map-advisor` core logic.
- `packages/cli/src/commands/hook/context-map-advisor.ts` is implemented and exports a robust checking function.
- `atomic_workbench/atomization-coverage/path-to-atom-map.json` is updated to register the new advisor file with the atom ID `atm.context-map-advisor-map`.
- The advisor outputs human-readable advisory warnings to stderr listing out-of-scope files and their suggested categories.
- Performance: Advisor executes fast. If it takes longer than 50ms, it should gracefully skip the warning.
