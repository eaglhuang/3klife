---
task_id: TASK-AAO-0104
title: "Function-bag atom capsule extraction wave 1"
status: planned
priority: high
created_at: 2026-06-01
created_by_agent: github-copilot
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - TASK-AAO-0102
  - TASK-AAO-0106
scopePaths:
  - packages/cli/src/commands/tasks/normalize-string-value-helper.ts
  - packages/cli/src/commands/tasks/is-frontmatter-scalar-helper.ts
  - packages/cli/src/commands/tasks/normalize-task-document-id-helper.ts
  - packages/cli/src/commands/tasks/sha256-helper.ts
  - packages/cli/src/commands/tasks/task-file-io-helpers.ts
  - packages/cli/src/commands/tasks/task-markdown-helpers.ts
  - packages/cli/src/commands/tasks/task-git-helpers.ts
  - packages/cli/src/commands/tasks/task-ledger-readers.ts
  - packages/cli/src/commands/tasks/task-transition-helpers.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - tests/**/tasks/**
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
  - atomic_workbench/maps/**
  - .atm/history/evidence/TASK-AAO-0104.json
  - .atm/history/evidence/TASK-AAO-0104.closure-packet.json
  - .atm/history/tasks/TASK-AAO-0104.json
deliverables:
  - "Batch-10 helper/capsule extraction plan for ten existing task helper modules."
  - "Per-capsule atom ownership registration for each new or split helper capsule."
  - "Focused unit coverage for the ten helper groups, using fixtures/golden inputs where useful."
  - "ROI report showing helper/capsule boundary, touched files, and trunk-flow non-interference."
  - "Closure evidence proving validators passed and forbidden trunk files were untouched."
validators:
  - "npm run typecheck -> exit 0"
  - "npm run validate:cli -> exit 0"
  - "npm run validate:task-import -> exit 0"
  - "npm run validate:task-ledger-governance -> exit 0"
  - "npm run validate:git-head-evidence -> exit 0"
  - "node atm.mjs hook pre-commit --json -> ok:true"
  - "focused helper/capsule unit tests for all ten candidate groups -> pass"
rollback:
  strategy: revert-commit
  notes: "Revert the AAF delivery commit and closure-ledger commit for TASK-AAO-0104; remove any newly registered capsule atom/map entries introduced only by this task."
atomizationImpact:
  ownerAtomOrMap: atm.tasks-function-bag-capsules-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
    - atomic_workbench/maps/**
outOfScope:
  - next.ts
  - batch.ts
  - packages/cli/src/commands/tasks.ts main flow
  - work-channels.ts
  - task-ledger.ts
  - hook.ts main flow
  - police/family.ts
  - rescue-family.ts
  - lifecycle trunk, routing trunk, ledger mutation trunk, hook enforcement trunk
nonGoals:
  - "Do not redesign task lifecycle, batch checkpoint, prompt routing, hook enforcement, police family, or rescue family behavior."
  - "Do not close or mirror 3KLife task status from the AAF implementation agent."
  - "Do not perform unrelated cleanup or normalize helpers outside the ten listed candidates."
notes: "Phase 0 card draft only. Before opening/committing the card, check TASK-AAO-0104 does not already exist in 3KLife task cards, docs/tasks/tasks-aao.json, AAF .atm/history/tasks, or both repos' git log."
---

# TASK-AAO-0104 Function-bag atom capsule extraction wave 1

## Summary
Extract the first wave of pure helper/function-bag code into small atom capsules. Treat the current helper files like a large toolbox and package the low-semantic-coupling tools into clear, testable capsule boundaries. This task must stay leaf/helper only and must not cut task lifecycle, routing, ledger, hook, police, or rescue trunk flows.

## Phase 0 AllowedFiles
- `C:\Users\User\3KLife\docs\ai_atomic_framework\atm-agent-first-operability\tasks\TASK-AAO-0104-function-bag-atom-capsule-wave-1.task.md`
- `C:\Users\User\3KLife\docs\tasks\tasks-aao.json`

Phase 0 agent must stop after opening the task card and ledger shard entry. Do not edit AAF. Do not start Phase 1 implementation. Do not stage, commit, or push unless explicitly instructed by Captain. Phase 1 path-to-atom-map work must wait until TASK-AAO-0106 is landed.

## Phase 1 Target AllowedFiles
- `packages/cli/src/commands/tasks/normalize-string-value-helper.ts`
- `packages/cli/src/commands/tasks/is-frontmatter-scalar-helper.ts`
- `packages/cli/src/commands/tasks/normalize-task-document-id-helper.ts`
- `packages/cli/src/commands/tasks/sha256-helper.ts`
- `packages/cli/src/commands/tasks/task-file-io-helpers.ts`
- `packages/cli/src/commands/tasks/task-markdown-helpers.ts`
- `packages/cli/src/commands/tasks/task-git-helpers.ts`
- `packages/cli/src/commands/tasks/task-ledger-readers.ts`
- `packages/cli/src/commands/tasks/task-transition-helpers.ts`
- `packages/cli/src/commands/tasks/task-import-validators.ts`
- focused test files for these ten groups only
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`
- `atomic_workbench/maps/**`
- `.atm/history/evidence/TASK-AAO-0104.json`
- `.atm/history/evidence/TASK-AAO-0104.closure-packet.json`
- `.atm/history/tasks/TASK-AAO-0104.json`

## Batch-10 Candidate List
1. `normalize-string-value-helper.ts` — string/null normalization capsule.
2. `is-frontmatter-scalar-helper.ts` — frontmatter scalar predicate capsule.
3. `normalize-task-document-id-helper.ts` — task document id fallback normalization capsule.
4. `sha256-helper.ts` — deterministic SHA-256 helper capsule.
5. `task-file-io-helpers.ts` — safe file read/stat/path collection helper capsule.
6. `task-markdown-helpers.ts` — markdown metadata and key/value extraction capsule.
7. `task-git-helpers.ts` — thin git output reader/list helper capsule.
8. `task-ledger-readers.ts` — task claim record reader and expiry helper capsule.
9. `task-transition-helpers.ts` — status normalization and task transition command builder capsule.
10. `task-import-validators.ts` — YAML and markdown literal normalization capsule.

## Validators
- `npm run typecheck -> exit 0`
- `npm run validate:cli -> exit 0`
- `npm run validate:task-import -> exit 0`
- `npm run validate:task-ledger-governance -> exit 0`
- `npm run validate:git-head-evidence -> exit 0`
- `node atm.mjs hook pre-commit --json -> ok:true`
- focused helper/capsule unit tests for all ten candidate groups -> pass

## Acceptance Criteria
- Only leaf/helper functions or helper groups from the ten listed candidates are extracted or repackaged.
- No task lifecycle trunk flow is cut or behaviorally changed.
- No prompt routing, batch checkpoint, work-channel routing, ledger mutation, hook enforcement, police family, or rescue family main flow is edited.
- Each new capsule has explicit atom ownership or map registration when a new file/module boundary is introduced.
- Existing public behavior stays equivalent for task import, task ledger verification, git helper reads, markdown metadata extraction, and file IO safety helpers.
- Focused tests cover representative normal, empty, malformed, and Windows-path cases where applicable.
- Validators pass with command-backed evidence.
- AAF implementation agent does not touch 3KLife files; 3KLife remains Phase 0 planning/ledger only.

## Do Not Cut Directly
- `next.ts`
- `batch.ts`
- `packages/cli/src/commands/tasks.ts` main flow
- `work-channels.ts`
- `task-ledger.ts`
- `hook.ts` main flow
- `police/family.ts`
- `rescue-family.ts`
- lifecycle trunk
- routing trunk
- ledger mutation trunk
- hook enforcement trunk

## Rollback
Rollback strategy is revert-commit. Revert the AAF delivery commit and closure-ledger commit for `TASK-AAO-0104`, then remove any atom/map registrations and generated evidence introduced only by this task. If a capsule boundary proves too broad, do not patch trunk flow in place; revert the capsule split and reopen a narrower follow-up card.

## Notes
- This is a `closure_authority: target_repo` card. Phase 0 opens the 3KLife card; Phase 1 must be handled by a separate AAF implementation agent after TASK-AAO-0106 lands.
- Phase 1 agent must not edit any 3KLife path.
- If the implementation discovers that one of the ten candidates is tied to trunk flow, stop and report scope drift rather than expanding the card.
