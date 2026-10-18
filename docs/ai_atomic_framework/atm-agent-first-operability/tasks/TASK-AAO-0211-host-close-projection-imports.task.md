---
id: TASK-AAO-0211
title: Deduplicate host close projection imports
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/taskflow-host-close-projection.test.ts
deliverables:
  - packages/cli/src/commands/taskflow/implementation.ts
  - tests/cli/taskflow-host-close-projection.test.ts
contextMap:
  primary: packages/cli/src/commands/taskflow/implementation.ts
  direct: tests/cli/taskflow-host-close-projection.test.ts
  secondary: packages/cli/src/commands/taskflow/closeback-orchestration.ts
  pattern: Existing TASK-AAO-0207 host-close-projection seam and consolidated module imports
validators:
  - npx eslint packages/cli/src/commands/taskflow/implementation.ts tests/cli/taskflow-host-close-projection.test.ts
  - node --strip-types tests/cli/taskflow-host-close-projection.test.ts
  - npm run typecheck
  - npm run lint
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-18
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: maintenance
depends: []
notes: "2026-10-19 | 狀態: planned | 驗證: pending | 變更: imports-only CI repair planning | 阻塞: Phase 1 claim required"
---
# [TASK-AAO-0211] Deduplicate host close projection imports

> **任務開卡** — Deduplicate host close projection imports
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Resolve duplicate imports introduced by host close projection delivery without changing runtime behavior or unrelated CI policy.

## INPUT_CONTRACT

- TASK-AAO-0207 delivery e63860b8548b166e0f157b029d9cbf8e81a91758 introduced duplicate imports. PR #352/#353 Dogfood lint reports three errors; evidence: AI-Atomic-Framework/artifacts/ci-39175841213-failed.log. Verify exact owned errors before edits.
- Only the two frontmatter source files are deliverables. No new atom, module or behavioral change.

## OUTPUT_CONTRACT

- [ ] packages/cli/src/commands/taskflow/implementation.ts
- [ ] tests/cli/taskflow-host-close-projection.test.ts

## VALIDATION_CMD

```bash
npx eslint packages/cli/src/commands/taskflow/implementation.ts tests/cli/taskflow-host-close-projection.test.ts
node --strip-types tests/cli/taskflow-host-close-projection.test.ts
npm run typecheck
npm run lint
git diff --check
```

## ROLLBACK_HINT

```bash
# Revert the governed delivery commit through normal ATM governance.
# Never reset shared worktree or restore foreign WIP.
```

## 執行步驟

1. Phase 0 creates this planned card and compact tasks-aao entry in one planning commit. Phase 1 claims in AAF before editing and uses exactly delivery plus closure commits; no planning status mirror.
2. In implementation.ts, merge buildPartialPlanningCardContent into the existing closeback-orchestration import declaration. In the focused fixture, consolidate duplicate child_process imports and combine fs default/named imports without altering execution.
3. Use source evidence to prove focused eslint, fixture, typecheck, whole lint and diff checks. Preserve failed-before and passing-after evidence; report unrelated lint warnings/failures precisely, never suppress or modify them.
4. Preserve all runtime behavior, assertions, claim/closure authority and original WIP. If normal closure requires a fresh runner, use a separate formal synchronization card; this task cannot build or publish runners.

## Acceptance and boundaries

- The source diff contains only import consolidation in the two existing owned files; no new atoms or behavior changes. Focused eslint removes all three owned duplicate-import errors, and the host projection fixture remains valid.
- Record every validator's actual outcome; unrelated failures are not silently rewritten into success.
- Product CI create-atm/dist/index.js dirty state and empty-delivery behavior are separate root causes, explicitly out of scope.
- Forbidden: release/dist/build outputs, adopter installation, warning-policy edits, foreign WIP, task-close-cleanup-rollback test, backlog/projection updates, master changes, force, no-verify and emergency routes. Additional source scope requires a separate task; do not widen this imports-only fix.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-18*
