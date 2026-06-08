---
doc_id: ""
task_id: TASK-AAO-0137
title: "tasks import preserve-active-claim default and force-overwrite-claims gate"
milestone: M17
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-08"
created_by_agent: captain-incident-review-2026-06-08
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P0
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-tasks-import-preserve-active-claim-default
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-AAO-0123
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/command-specs/tasks.spec.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - .atm runtime / history manual edits
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not introduce a second import path."
  - "Do not change the task-card import frontmatter schema."
  - "Do not make --force a no-op (must still allow disaster recovery)."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card for tasks import preserve-active-claim default behavior | blocker: none"
---

# TASK-AAO-0137 tasks import preserve-active-claim default and force-overwrite-claims gate

## 目標

把 `tasks import --write` 的預設行為改成「不覆寫帶 active claim 的 ledger entry」。要強制覆寫必須再加一個明示旗標 `--force-overwrite-claims`。

## 背景

keep memory `atm_governance_bypass_incidents_2026-06-04` 已記載：「import refresh erased active claims」是反覆出現的 incident。TASK-AAO-0123 是針對此事的修補，但這次（2026-06-08）captain 跑 `tasks import --write --force` 仍然撞到類似情境：

- 主 repo 已有 9 張 ledger entry 帶 active claim
- 隊長為了補登 AAO 51 張 frontmatter 的 done 狀態跑 import
- import 覆寫了 active claim，產生 ATM_TASK_AUDIT_TRANSITION_EVENT_MISSING 連鎖效應

要點：`--force` 是 source-hash 不同也覆寫；但「active claim」的覆寫應該需要另一個旗標，不能被 `--force` 一起涵蓋。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/tasks.ts`（`runTasksImport` write 邏輯）
- `packages/cli/src/commands/command-specs/tasks.spec.ts`（新旗標 spec）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

- `tasks import --write` 預設行為：偵測到目標 ledger entry 已有 `claim.state === 'active'` 或 `claim.state === 'handoff'`，跳過該卡並回報 `IMPORT_SKIPPED_ACTIVE_CLAIM` warning（不算失敗）。
- `tasks import --write --force` 對 source-hash 仍能強制重寫，但**不**覆寫 active claim — 仍會跳過並 warn。
- 新旗標 `tasks import --write --force-overwrite-claims`：才允許覆寫 active claim，且每張被覆寫的卡都產生 transition 事件 `claim-displaced-by-import`，記錄原本 actorId、leaseId、reason。
- 三種模式（無 flag / `--force` / `--force-overwrite-claims`）的測試 case 都覆蓋。
- import manifest 在 dry-run 也要標示「會跳過的 active-claim 卡」清單。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep "import.*active.*claim"`
- `git diff --check`

## Plain-language Anchor

不再讓 import 偷偷踩掉別人正在跑的任務。要覆寫 active claim 就明示請求，並留 transition 事件可追。
