---
id: TASK-AAO-0207
task_id: TASK-AAO-0207
title: Opt-in host-neutral atomic task close projections
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/host-close-projection.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - tests/cli/taskflow-host-close-projection.test.ts
  - packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
deliverables:
  - packages/cli/src/commands/taskflow/profile-loader.ts
  - packages/cli/src/commands/taskflow/closeback-orchestration.ts
  - packages/cli/src/commands/taskflow/close-orchestration.ts
  - packages/cli/src/commands/taskflow/implementation.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - packages/cli/src/commands/taskflow/host-close-projection.ts
  - tests/cli/taskflow-host-close-projection.test.ts
  - packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - atomic_workbench/atomization-coverage/path-to-atom-map.json
validators:
  - node --strip-types tests/cli/taskflow-host-close-projection.test.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/profile-loader.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-close-atomicity.test.ts
  - npm run typecheck
  - git diff --check
contextMap:
  primary: packages/cli/src/commands/taskflow/closeback-orchestration.ts
atomizationImpact:
  ownerAtomOrMap: atm.taskflow-command-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
priority: P1
phase: Backlog-P1
created: 2026-10-16
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: implementation
depends: []
notes: 2026-10-16 | 狀態: planned | 驗證: pending | 變更: Phase 0 only | 阻塞: Phase 1 claim required
---
# TASK-AAO-0207 Host close projection

## Contract
Add opt-in host-neutral JSON/Markdown projections to the existing close transaction. rosterSync only handles Markdown roster rows. Unconfigured behavior/output stays unchanged; no store inference/scanning.

- JSON: explicitly configure relative file, task array, exact id field, status/completion fields and values. Summary declares counters and status-to-bucket mappings; recalculate the entire selected array, never done++.
- Adopter owns paths, Chinese labels and aliases. 3KLife-only: total=tasks.length; done/closed/completed count done; in-progress/in_progress/in progress count in_progress; all others including blocked count open. No host policy/literals in framework core.
- Markdown: explicitly select unique section/table, exact row labels and mapped status/completion/time values, optional notes. Update with canonical frontmatter and ledger; preserve unrelated cells/sections.
- Before writes, reject invalid/unsupported config, escaping paths, missing files/selectors/ids, duplicate ids and ambiguous tables/rows with actionable diagnostics. Never silently skip projections.
- Idempotence reuses valid completed_at. Patch selected fields only; preserve unknown records/fields, unrelated bytes/content, Traditional Chinese, UTF-8 without BOM and CRLF/LF. Avoid whole-document reserialization.
- Dry-run reports exact paths/diffs without mutation. Scope/write tickets cover every path; same-repo projection admission cannot bypass foreign-file protection.
- Snapshot projected files/index before writes. Inject failures after projection, ledger transition, roster sync, staging and auto-commit preparation: restore all projections and original partial staging on every pre-commit failure; preserve unrelated dirt/unstaged hunks.
- Auto-commit includes all intended projections using the true pre-edit baseline, excludes unrelated/foreign edits and handles partially staged task files. Assert real staged/committed content, HEAD and index, not merely path lists.

## Delivery
OUTPUT_CONTRACT=all deliverables; run all validators. Fixtures must prove every Contract bullet, including compatibility, unknown statuses, summary, timestamps, Unicode/CRLF, authority, rollback and real commits.

Phase 0: one planning commit, planned card plus tasks-aao only. Phase 1: normal target-repo claim/lock before implementation; include in-progress metadata in delivery, exactly delivery+closure commits. Target owns lifecycle/closure; no planning status mirrors or third status commit.

Use canonical framework checkout/normal broker; preserve foreign WIP/claims. No alternate-worktree bypass of INV-ATM-010. Register new leaf under its atom/map. Extra paths, including needed ErrorCode registry/generated docs, require scope amendment first. Use focused tests; never foreign dirty rollback test.

Forbidden: game code, adopter installation, runner/release sync, QF/emergency lifecycle repair, foreign claims/WIP, master merge, blanket staging, bypass or second lifecycle authority. Adopter rollout/acceptance is separate. Rollback via governed delivery revert; never reset shared checkout or restore foreign WIP.
