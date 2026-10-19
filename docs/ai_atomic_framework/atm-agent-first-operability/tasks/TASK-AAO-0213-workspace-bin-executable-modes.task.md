---
id: TASK-AAO-0213
title: Workspace bin executable mode contract
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/create-atm/dist/index.js
  - tests/cli/ci-product-lane-contract.test.ts
deliverables:
  - packages/create-atm/dist/index.js
  - tests/cli/ci-product-lane-contract.test.ts
contextMap:
  primary: tests/cli/ci-product-lane-contract.test.ts
  direct: packages/create-atm/dist/index.js
  secondary: package.json workspace declarations and each workspace package.json bin declarations
  pattern: packages/cli/src/commands/git-governance/implementation/sealed-commit-candidate-index.ts and sealed-commit-attribution.ts preserve authorized staged modes
validators:
  - node --strip-types tests/cli/ci-product-lane-contract.test.ts
  - npx eslint tests/cli/ci-product-lane-contract.test.ts
  - node --strip-types packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
  - npm run typecheck
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-19
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: maintenance
depends: []
notes: "2026-10-19 | 狀態: planned | 驗證: pending | 變更: workspace executable mode planning | 阻塞: Phase 1 claim required"
---
# [TASK-AAO-0213] Workspace bin executable mode contract

> **任務開卡** — Workspace bin executable mode contract
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Correct create-atm executable Git mode without changing its blob and validate every declared tracked workspace bin.

## INPUT_CONTRACT

- current-workspace-bin-modes.json observes create-atm at100644 versus CLI100755. CI #352/#353/#368 Product sweep encounters initial create-atm index dirt. POSIX npm chmod is currently a strong inference, not a proven remote raw-mode diff; do not report that inference as verified cause.
- Read native preservation seams sealed-commit-candidate-index.ts:44,77 and sealed-commit-attribution.ts:122,192. Use authorized pre-staged mode through native wrapper; do not use auto-stage that can replace intended Windows index mode.

## OUTPUT_CONTRACT

- [ ] packages/create-atm/dist/index.js
- [ ] tests/cli/ci-product-lane-contract.test.ts

## VALIDATION_CMD

```bash
node --strip-types tests/cli/ci-product-lane-contract.test.ts
npx eslint tests/cli/ci-product-lane-contract.test.ts
node --strip-types packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.test.ts
npm run typecheck
git diff --check
```

## ROLLBACK_HINT

```bash
# Revert this task's governed delivery only; preserve all foreign index/worktree entries.
```

## 執行步驟

1. Phase 0: this planned card plus compact tasks-aao entry, one planning commit. Phase 1: normal target-repo claim/lock and exactly delivery plus closure commits; no planning status mirror.
2. Extend the existing contract to enumerate every root package.json workspace (including packages/* and examples/*), resolve each package's bin string or object declarations, and require every tracked declared bin Git mode to be100755. Do not check only CLI or ignore create-atm.
3. Capture red evidence proving the contract rejects the current create-atm100644. Obtain valid ticket and normal index authority, then stage only its100644-to100755 mode change. Do not rebuild or change its blob.
4. Through the normal sealed commit wrapper preserve that staged mode and exclude all foreign staged paths. Prove original/delivered blob IDs are identical and delivered HEAD mode is100755; prove the only source-content change is the contract extension. Run every validator with command-backed evidence.
5. Inspect remote Product CI to establish whether sweep passes its initial dirty guard. If still dirty, retain actual diff including raw modes for a separate task. Do not equate a passed local contract or partial remote progress with the whole CI pipeline being green.

## Boundaries

- Only the two declared files are deliverables; no new module or atom. No behavior edits to source implementation, Lobby UI, empty-delivery handling, other dist files, runners or adopter installations.
- No rebuild of create-atm content, Git configuration/core.filemode changes, ignore/clean-guard/hook/baseline edits, manual runtime-code edits, foreign WIP changes, force, no-verify or emergency.
- If normal closure needs runner freshness, create a separate formal sync task. Do not expand this mode-only repair into release/build work.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-19*
