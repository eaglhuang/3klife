---
doc_id: ""
task_id: TASK-AAO-0135
title: "closure/evidence data integrity hardening and import active-claim safety"
milestone: M17
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: applied
started_at: "2026-06-18T18:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-closure-evidence-integrity-and-import-claim-safety
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-import.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/release-manifest.json"
deliverables:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-import.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/release-manifest.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
targetAllowedFiles:
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/validate-task-import.ts"
  - "scripts/validate-task-ledger-governance.ts"
  - "release/atm-onefile/atm.mjs"
  - "release/atm-onefile/release-manifest.json"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0135-closure-evidence-integrity-and-import-claim-safety.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not change closure packet schema beyond format normalization."
  - "Do not introduce a second import path."
  - "Do not weaken dirty-tree fail-closed posture for unrelated changes."
  - "Do not retroactively rewrite historical evidence files."
  - "Do not mutate AAF source in Phase 0."
notes: "2026-06-19 | status: done | validation: passed | change: governance close historical delivery f0d0e18c3 | blocker: none"
completed_at: "2026-06-19T13:43:20.032Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "f0d0e18c3"
---

# TASK-AAO-0135 closure/evidence data integrity hardening and import active-claim safety

## 目標

把 2026-06-08 captain incident 暴露的「資料寫入端汙染 → 讀取端誤判 → 維修通道治標 → import 又覆寫 active claim」整條鏈一次補上。四件事一張卡：

1. **sha256 lowercase normalization**：evidence 與 closure-packet writer 強制 `.toLowerCase()` 所有 `^sha256:<hex>` 字串。
2. **Validator error format clarity**：`validateClosurePacket` 對格式錯誤回報 `invalidFormat`（含 `formatExpected` 與 `actualValue` 截短）、保留 `missing` 給「值真的不在」。
3. **repair-closure upstream-evidence-fix**：`tasks repair-closure` 預設順手把 `.atm/history/evidence/<task>.json` 內所有 sha256 lowercase 並修補格式錯誤，再重建 packet。新增 `--scope <taskId>` 旗標：只看與該 task scope 重疊的 dirty file，無交集的 unrelated dirty 降 warning 不 block。
4. **tasks import preserve-active-claim 預設**：import --write 預設跳過帶 active claim 的 ledger entry；`--force` 也不覆寫 active claim；新旗標 `--force-overwrite-claims` 才允許，並產出 `claim-displaced-by-import` transition 事件。

## 背景

TASK-CID-0018 被卡 3+ 小時的根因鏈：

- 早期某次 `npm run typecheck` evidence 寫入時 sha256 用了大寫 hex（推測 PowerShell `Get-FileHash` 預設）
- `validateClosurePacket` 用 `/^sha256:[a-f0-9]{64}$/` 嚴格小寫驗證，但 error 報 `missing` 誤導查錯方向
- `tasks repair-closure` 只改 `closure-packet.json`，沒修上游 evidence file，治標不治本
- 多 captain 共用 repo 時，CID-0019 captain 進行中的 broker.ts 改動被 `repair-closure` 判 unrelated dirty 整個維修通道關閉
- 同期隊長為了補登 AAO 51 卡跑 `tasks import --write --force`，覆寫了帶 active claim 的 9 張 ledger（keep memory 0123 已記載這類 incident）

四件事互相牽動：normalize 是 repair 的前提，repair 是隊長能在多 captain 場景脫困的前提，import 的 claim 保護則防止「補單行為本身製造新的 incident」。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Scope Amendment

- Frontmatter `allowed_files` 中的 AAF 路徑是 Phase 1 import scope，不是 Phase 0 write scope。
- `framework-development.ts` 負責 closure packet 驗證、evidence writer、repair-closure 上游修補。
- `tasks.ts` 負責 import write 邏輯與 `--force-overwrite-claims` 旗標。
- `path-to-atom-map.json` 僅在 capability 描述變更時更新，不拆新 atom。

## Context Map

### Primary（直接改）

- `packages/cli/src/commands/framework-development.ts` — sha256 normalize、validateClosurePacket error taxonomy、repair-closure upstream fix
- `packages/cli/src/commands/tasks.ts` — import active-claim guard、`--force-overwrite-claims`、`--scope` repair filter
- `packages/cli/src/commands/command-specs/tasks.spec.ts` — 新旗標 CLI spec

### Secondary（可能波及、預警 scope drift）

- `atomic_workbench/atomization-coverage/path-to-atom-map.json` — capability 描述更新
- `packages/cli/src/commands/command-specs.ts` — 若 tasks spec 註冊點需同步

### Test Coverage

- `tests/**` 中新增 validateClosurePacket / repair-closure / import active-claim 測試；若無現成 fixture 則新建 focused test file

### Patterns to Follow

- 沿用 `TASK-AAO-0123` 的 active-claim import guard 語意，但本卡把預設行為升級為 skip + 明確 warning code
- 沿用 `TASK-AAO-0017` closure validator error envelope 風格（`invalidFormat` vs `missing` 分類）

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/framework-development.ts`
  - `validateClosurePacket`、`extractEvidenceCommandRuns`、evidence writer
  - `repairClosurePacket`、`readClosureEvidenceContext`
- `packages/cli/src/commands/tasks.ts`
  - reconcile evidence envelope writer
  - repair-closure dispatcher、`--scope` filter
  - `runTasksImport` write 邏輯與旗標解析
- `packages/cli/src/commands/command-specs/tasks.spec.ts`（新旗標 spec）
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`（capability 描述更新）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm/history/**` 與 `.atm/runtime/**` 手動編輯
- `release/**`、dist、build outputs
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

### 1. sha256 lowercase normalization

- evidence / closure-packet writer 在寫入時自動 `.toLowerCase()` 任何 `^sha256:` 字串的 hex 段。
- 既存的大寫資料路徑（PowerShell 寫入）測試 case 通過。

### 2. Validator error format clarity

- `validateClosurePacket` 對 `sha256:<UPPER>` 或長度不符回報 `invalidFormat`，data 帶 `formatExpected: '^sha256:[a-f0-9]{64}$'` 與 `actualValue` 截短摘要。
- `missing` 只用於「key 不存在 / value 空字串 / value undefined」。
- 新增 unit test：大寫走 normalization 後 reconcile 通過；空值報 `missing`；大寫未 normalize 報 `invalidFormat`。

### 3. repair-closure upstream-evidence-fix + --scope

- `tasks repair-closure --task <id>` 預設多做一步：呼叫上游 evidence normalizer。
- `--scope <taskId>` 旗標：dirty-tree check 只看與該 task 的 claim.files / direction lock allowedFiles / deliverables 交集；無交集降 warning。
- 無 `--scope` 時維持現行 fail-closed（向後相容）。
- 新增 integration test：大寫 sha256 evidence + unrelated dirty broker.ts → 帶 `--scope` 跑完並產可用 packet。

### 4. tasks import preserve-active-claim

- `tasks import --write` 預設偵測 `claim.state === 'active' | 'handoff'` 跳過該卡，回報 `IMPORT_SKIPPED_ACTIVE_CLAIM` warning（不算失敗）。
- `--force` 對 source-hash 強制覆寫但**不**覆寫 active claim。
- `--force-overwrite-claims` 才允許覆寫 active claim，並產出 `claim-displaced-by-import` transition 事件（記原 actorId、leaseId、reason）。
- 三種模式測試 case 都覆蓋。
- import manifest dry-run 標示「會跳過的 active-claim 卡」清單。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0135-closure-evidence-integrity-and-import-claim-safety.task.md docs/tasks/tasks-aao.json`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep "validateClosurePacket|repair-closure|import.*active.*claim"`
- `git diff --check`

## Rollback Hint

若 import claim guard 或 repair-closure `--scope` 行為超出 Phase 1 candidate files，保持本卡 open 並拆 follow-up 卡。
Phase 0 回滾只需 revert 本卡與 `tasks-aao.json` 條目，不碰 AAF source。
Phase 1 回滾用 `git revert` 還原 delivery commit + closure ledger commit。

## Atomization Impact

- Owner: `atm.task-closure-map`（closure packet / repair-closure / close gate）
- Secondary owner: `atm.task-ledger-governance-map`（import write path）
- Map update: `atomic_workbench/atomization-coverage/path-to-atom-map.json` capability 描述
- 不新增 script；不拆新 atom

## Plain-language Anchor

寫入端強制小寫、讀取端講人話、維修通道修對地方、補單動作別踩別人 — 一張卡把 CID-0018 那 3 小時不會再發生的硬體封死。
