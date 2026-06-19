---
doc_id: ""
task_id: TASK-AAO-0137
title: "write-path atomicity and operator diagnostics: close transaction, runner stale fail-closed, status triangulation, scratch gitignore"
milestone: M17
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-19T15:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P2
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-write-path-atomicity-and-operator-diagnostics
planning_repo: 3KLife
closure_authority: target_repo
depends_on:
  - TASK-AAO-0135
  - TASK-AAO-0136
scopePaths:
  - ".gitignore"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "tests/cli-fixtures/help-snapshots/next.json"
deliverables:
  - ".gitignore"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "tests/cli-fixtures/help-snapshots/next.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - ".gitignore"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/shared.ts"
  - "packages/cli/src/commands/task-direction.ts"
  - "packages/cli/src/commands/tasks/task-option-parsers.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "tests/cli-fixtures/help-snapshots/next.json"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0137-write-path-atomicity-and-operator-diagnostics.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not introduce a second transaction model alongside existing close/reconcile."
  - "Do not block read-only ATM commands when runner is stale."
  - "Do not change the live-ledger SSOT designation."
  - "Do not silently auto-rollback on close failure (must surface diagnostic first)."
  - "Do not mutate AAF source in Phase 0."
  - "Do not start before TASK-AAO-0135 lands; transaction wrapper sits on top of 0135's normalize util."
notes: "2026-06-19 | status: in_progress | validation: pending | change: governance close historical delivery 9aa7ed619 | blocker: none"
completed_at: "2026-06-19T14:06:33.088Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "9aa7ed619"
---

# TASK-AAO-0137 write-path atomicity and operator diagnostics

## 目標

把 2026-06-08 incident 揭露的「寫入路徑可半完成」與「操作者看不出真相在哪」兩類問題綁同一張卡：

1. **Close transaction atomicity**：`tasks close` / `tasks reconcile` 把「寫 closure packet → 推 ledger status → 寫 transition 事件」包成單一 transactional 動作。任何一步失敗 → 全部 roll back（含已寫的 packet 與 transition 事件）並回報明確診斷。
2. **Runner stale fail-closed for write actions**：偵測到 `ATM_RUNNER_SYNC_REQUIRED` 時，預設**拒絕**寫類動作（`tasks reconcile/close/import --write`），唯讀動作（`tasks show`、`next` 查詢、`tasks audit`）放行。
3. **`tasks status` triangulation**：新增 `node atm.mjs tasks status --task <id>` 命令，一條輸出對齊三來源差異：live ledger、最近 transition 事件、3KLife frontmatter status。標示哪個是 SSOT、差異點在哪。
4. **Scratch output gitignore**：把 `next-output.json` 等 ATM 暫存輸出加入 `.gitignore`；同時把 `next --json` 的預設輸出路徑改寫到 `.atm-temp/` 下，避免 user 隨手 `>` 留垃圾在 repo root。

## 背景

TASK-CID-0018 unstick 過程暴露的次層問題（P0/P1 解掉但仍有半完成風險的部分）：

- **Close 不原子**：歷史上某次 close 寫了 packet 但沒推 ledger 到 done、claim state 半路停在 released-but-status-running。隊長過了好幾輪才意識到「live ledger truth」與「歷史 close event」可以漂移。
- **Runner stale 警告不夠強**：`ATM_RUNNER_SYNC_REQUIRED` 顯示但仍會執行，導致部分 reconcile 用舊版 validator 跑成功、新版跑失敗，產生「修了又壞」錯覺。
- **真相可見度差**：隊長要分別讀 ledger JSON、task-events 目錄、3KLife frontmatter 才能拼出當下狀態。現有 `tasks show` 只給 ledger 一面。
- **暫存物污染**：`next > next-output.json` 留下的 UTF-16 BOM 垃圾在 working tree 數小時，差點被誤 commit。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Scope Amendment

- Frontmatter `allowed_files` 中的 AAF 路徑是 Phase 1 import scope，不是 Phase 0 write scope。
- `tasks.ts` 負責 close/reconcile transaction wrapper、runner-stale write gate、新 `tasks status` subcommand。
- `framework-development.ts` 負責 transaction journal helper、runner stale 寫類動作分類。
- `next.ts` 負責 `--output` 預設路徑改 `.atm-temp/`。
- `command-specs/tasks.spec.ts` 負責新 `status` subcommand spec 註冊。
- `.gitignore` 補登 `next-output.json`、`.atm-temp/`、`*.atm-scratch.*`。
- 與 TASK-AAO-0135 的 close/reconcile 改動有重疊區域；本卡必須在 0135 落地、normalize util 與 validator error taxonomy 穩定後才啟動。
- `path-to-atom-map.json` 僅在 capability 描述變更時更新，不拆新 atom。

## Context Map

### Primary（直接改）

- `packages/cli/src/commands/tasks.ts` — `runTasksClose` / `runTasksReconcile` transaction wrapper、新 `runTasksStatus` subcommand、runner-stale write gate
- `packages/cli/src/commands/framework-development.ts` — transaction journal helper（write-then-verify-then-commit）、runner stale write-action 分類
- `packages/cli/src/commands/next.ts` — 預設 `--output` 路徑改 `.atm-temp/`
- `packages/cli/src/commands/command-specs/tasks.spec.ts` — 新 `tasks status` subcommand spec
- `.gitignore` — 暫存物 entries

### Secondary（可能波及、預警 scope drift）

- `atomic_workbench/atomization-coverage/path-to-atom-map.json` — capability 描述更新
- `packages/cli/src/commands/command-specs.ts` — 若 tasks spec 註冊點需同步

### Test Coverage

- `tests/**` 中新增 close transaction rollback、runner-stale write-refused、tasks status triangulation、gitignore relocation 整合測試

### Patterns to Follow

- 沿用 TASK-AAO-0135 的 normalize util 作為 transaction wrapper 內部驗證的標準入口
- 沿用 TASK-AAO-0136 的 close-commit-window TTL pattern（transaction commit 後在 window 內 commit artifacts）
- 沿用 TASK-AAO-0017 的 closure validator error envelope 風格（runner stale 拒絕時回報相同形狀）

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/tasks.ts`
  - `runTasksClose` / `runTasksReconcile` transactional wrapper
  - 新 `tasks status` subcommand
  - runner-stale write gate
- `packages/cli/src/commands/framework-development.ts`
  - transaction journal helper（write-then-verify-then-commit pattern）
  - runner stale write-action 分類
- `packages/cli/src/commands/next.ts`
  - 預設 `--output` 路徑改 `.atm-temp/`
- `packages/cli/src/commands/command-specs/tasks.spec.ts`（新 status spec）
- `.gitignore`（補登 `next-output.json`、`.atm-temp/`）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

### 1. Close transaction atomicity

- `tasks close` / `tasks reconcile` 採 write-journal pattern：先寫 staging（`.atm-temp/close-journal-<task>.json`）→ 全部驗證通過 → atomic rename 落地最終位置。
- 任何階段失敗 → 自動清除 staging、回滾已寫的 packet 與 transition event、回報 `ATM_TASK_CLOSE_TRANSACTION_FAILED` 含 `rolledBackArtifacts` 清單。
- 整合測試：模擬 validator 在中途失敗 → 確認沒有半完成檔案殘留、live ledger status 保持原值。

### 2. Runner stale fail-closed for write actions

- 偵測 `ATM_RUNNER_SYNC_REQUIRED` 時：
  - 寫類動作（`tasks close/reconcile/import --write/repair-closure --write`）→ 拒絕執行，回報 `ATM_RUNNER_STALE_WRITE_REFUSED` 並提示 `npm run build`
  - 唯讀動作（`tasks show/audit`、`next` 查詢、`framework-mode status`）→ 放行 + warning
- 新旗標 `--allow-stale-runner` 可強制覆寫（給 disaster recovery 用），且每次使用都產出 transition 事件記錄。
- 測試：stale runner + reconcile → 被拒；stale runner + tasks show → 通過 + warning。

### 3. `tasks status` triangulation

- 新 subcommand：`node atm.mjs tasks status --task <id> --json`
- 輸出欄位：
  - `liveLedger`: { status, claimState, lastTransitionId, lastTransitionAt }
  - `lastTransitionEvent`: { action, actorId, createdAt, fromStatus, toStatus }
  - `planningFrontmatter`: { status, source }（讀 3KLife planning_repo 的 task card）
  - `divergence`: 三來源不一致時，列出差異點 + 標記 `ssot: 'liveLedger'`
  - `recommendation`: 若有 divergence，建議哪個指令對齊
- 測試：構造三來源一致 → divergence 為空；構造 frontmatter=done / ledger=running → divergence 非空 + 建議 reconcile。

### 4. Scratch output gitignore

- `.gitignore` 新增 entries：`next-output.json`、`.atm-temp/`、`*.atm-scratch.*`
- `next` 命令的 `--output` 預設路徑改 `.atm-temp/next-<timestamp>.json`（之前是當前目錄）
- 既有的明示 `--output <path>` 路徑保留向後相容
- 測試：`next --json --output` 不帶參數 → 寫到 `.atm-temp/` 內、不污染 working tree

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep "tasks.*close.*transaction|runner.*stale|tasks status|gitignore"`
- `git diff --check`

## Plain-language Anchor

寫入要嘛全做要嘛全不做、舊 runner 不准寫、操作者一條命令看清真相在哪、暫存物別污染 working tree — 四件次層 P2 修補一次包好，配合 0135/0136 把整個寫入路徑封死。
