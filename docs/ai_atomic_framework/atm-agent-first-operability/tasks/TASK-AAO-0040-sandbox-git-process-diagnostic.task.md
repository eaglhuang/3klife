---
doc_id: doc_task_aao_0040
task_id: TASK-AAO-0040
title: "Sandbox git process diagnostics"
status: planned
owner: atm-core
priority: P1
milestone: M13
depends_on:
  - "TASK-AAO-0004"
  - "TASK-AAO-0026"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/status.ts"
  - "scripts/validate-cli.ts"
  - "scripts/lib"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/status.ts"
  - "scripts/validate-cli.ts"
  - "scripts/lib"
  - "scripts/validate-task-ledger-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-task-ledger-governance.ts --mode validate"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert sandbox diagnostic handling; validators fall back to existing raw process errors."
atomizationImpact:
  ownerAtomOrMap: "atm.validator-envelope-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing Codex sandbox policy"
  - "Silencing real git failures"
nonGoals:
  - "Automatically escalating permissions"
  - "Treating environment failures as successful validation"
---
# TASK-AAO-0040 — Sandbox git process diagnostics

## Goal

把 Node child process 執行 `git` 時遇到的 sandbox/EPERM 假性失敗診斷成環境問題，並提供清楚的 requiredCommand / retry guidance，而不是混進 ATM gate 或 evidence 失敗。

## Why

在 Codex sandbox 裡，`validate:cli`、`validate:git-head-evidence`、hook pre-commit 可能因 `spawnSync('git')` 或 `.git/index.lock Permission denied` 假性失敗。這會讓 AI 以為功能錯，實際上只是需要用外層權限或安全 temp root 重跑。

## Implementation Contract

- 封裝 git child-process failure classifier，辨識 `EPERM`、`EACCES`、`Permission denied`、`.git/index.lock` sandbox 模式。
- Hook/validator envelope 應輸出環境錯誤碼，例如 `ATM_ENV_SANDBOX_GIT_EPERM`，並包含 `requiredCommand` 或 retry hint。
- 環境錯誤不能被當成 validator pass，也不能偽裝成 task/evidence failure。
- 若可設定 `ATM_TEMP_ROOT` 或使用安全 temp root，錯誤訊息要明講。
- 不得自動升權或繞過使用者 approval。

## Deliverables

- `packages/cli/src/commands/hook.ts`
- `packages/cli/src/commands/doctor.ts`
- `packages/cli/src/commands/status.ts`
- `scripts/validate-cli.ts`
- `scripts/lib`
- `scripts/validate-task-ledger-governance.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-task-ledger-governance.ts --mode validate`

## Acceptance Criteria

- Simulated git `EPERM` 會回 `ATM_ENV_SANDBOX_GIT_EPERM` 或等價環境診斷。
- `.git/index.lock Permission denied` 被標成 environment/sandbox，而不是 task audit 或 evidence gate failure。
- Error envelope 包含可操作下一步，例如設定 `ATM_TEMP_ROOT=C:\tmp` 或用外層權限重跑原 validator。
- 真正的 git command 失敗仍回原本 gate failure，不被誤判為 sandbox。

## Rollback

Revert this task commit. Validators and hooks return to raw git process errors.

## Atomization Impact

- Owner atom/map: `atm.validator-envelope-map`
- Map updates: `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

這張卡只改善診斷和重跑路徑，不把環境失敗當作通過。
