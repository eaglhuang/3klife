---
doc_id: ""
task_id: TASK-AAO-0108
title: "Recover ATM-MAP-0003 from preserved 0102 tag"
milestone: M15
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: [TASK-MRP-0028, TASK-AAO-0102]
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-recover-map
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0108-recover-atm-map-0003-from-preserved-0102-tag.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
forbidden_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0102-*.task.md
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
non_goals:
  - "Do not cherry-pick the broken tag commit."
  - "Do not push the preserved tag to origin."
  - "Do not use --no-verify during commit."
  - "Do not manually edit the AAF ledger JSON files."
  - "Do not restore old 0102 ledger or closure packets directly."
notes: "2026-06-01 | status: open | validation: pending | change: Phase 0 create card for ATM-MAP-0003 recovery from preserved tag | blocker: TASK-MRP-0028 | risk: broken closure packet reuse"
---

# TASK-AAO-0108 Recover ATM-MAP-0003 from preserved 0102 tag

## Goal
Recover the successful `ATM-MAP-0003` map formation work (10 LOC-ranked atoms, spec, and integration test) from the preserved tag `broken-closure-packet-self-ref-2026-05-31`, and close it properly using the healthy closure engine fixed in `TASK-MRP-0028`.

## Background
During `TASK-AAO-0102`, the actual code, specification, and test work for `ATM-MAP-0003` were correct. However, a self-referential serialization bug in the closure packet generator caused the task closure to fail. The working state was preserved in a local git tag: `broken-closure-packet-self-ref-2026-05-31`. Now that `TASK-MRP-0028` has patched the framework's closure engine, we can safely retrieve the map assets and close the recovery task.

## Phase 1 Scope
- Retrieve `ATM-MAP-0003` files from local tag `broken-closure-packet-self-ref-2026-05-31`:
  - `plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json` (rename or rewrite to plan under 0108 if needed, or keep mapId as ATM-MAP-0003)
  - `atomic_workbench/maps/ATM-MAP-0003/map.spec.json`
  - `atomic_workbench/maps/ATM-MAP-0003/map.integration.test.ts`
  - `atomic_workbench/maps/ATM-MAP-0003/map.test.report.json`
- DO NOT cherry-pick `e021413` directly. Extract only the assets (map spec, tests, plans).
- DO NOT reuse the broken `TASK-AAO-0102` closure packet.
- Run `atm test --map ATM-MAP-0003 --json` to verify compatibility and correctness.
- Complete the new healthy closure flow for `TASK-AAO-0108` and generate valid non-self-referential closure packets.

## Suggested AAF allowedFiles
- `atomic_workbench/maps/ATM-MAP-0003/map.spec.json`
- `atomic_workbench/maps/ATM-MAP-0003/map.integration.test.ts`
- `atomic_workbench/maps/ATM-MAP-0003/map.test.report.json`
- `plans/TASK-AAO-0102-tasks-helpers-batch10.plan.json`
- `.atm/history/reports/*TASK-AAO-0108*`
- `.atm/history/evidence/TASK-AAO-0108*`
- `.atm/history/tasks/TASK-AAO-0108.json`
- `.atm/history/task-events/TASK-AAO-0108/*`

## Acceptance Criteria
- ATM-MAP-0003 specifications and test stubs are correctly populated into AAF.
- `atm test --map ATM-MAP-0003 --json` passes successfully.
- Closure packet is generated cleanly without self-referential loop errors.
- All ledger changes and evidence records are committed via healthy ATM CLI wrappers.

## Forbidden
- Do not cherry-pick the broken tag commit.
- Do not push tag to remote origin.
- Do not use `--no-verify`.
- Do not manually edit ledger JSON files.
- Do not clean unrelated dirty / untracked files.
- Do not mutate other 3KLife task cards.
- Do not touch AAF source files unless explicitly needed for Phase 1.

## Validators
- `npm run typecheck`
- `npm run validate:cli`
- `npm run validate:git-hooks-enforcement`
- `npm run validate:task-ledger-governance`
- `node atm.mjs hook pre-push --json`
- `node atm.mjs test --map ATM-MAP-0003 --json` (if available)

## Plain-language Anchor
這張卡負責從舊的封存標籤中撈出「ATM-MAP-0003」的完好零件，放進新的健康包裝盒重新入庫。不搬破箱子，只拿好零件。
