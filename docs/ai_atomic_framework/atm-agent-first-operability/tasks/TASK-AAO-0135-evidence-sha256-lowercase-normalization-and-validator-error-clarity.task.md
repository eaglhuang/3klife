---
doc_id: ""
task_id: TASK-AAO-0135
title: "evidence/closure-packet sha256 lowercase normalization and validator error format clarity"
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
executionMode: phase0-evidence-sha256-lowercase-normalization-and-validator-error-clarity
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-CID-0018
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - .atm runtime / history manual edits
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not change closure packet schema beyond format normalization."
  - "Do not touch reconcile transition semantics."
  - "Do not retroactively rewrite historical evidence files."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card for sha256 lowercase normalization at evidence write time + validator format error clarity | blocker: none"
---

# TASK-AAO-0135 evidence/closure-packet sha256 lowercase normalization and validator error format clarity

## 目標

兩件事一起做：

1. 在 evidence 與 closure-packet writer 落地時，強制把 `sha256:<hex>` 的 hex 段 normalize 成小寫。
2. 讓 `validateClosurePacket` 在格式錯誤時不要報 `missing`，而是回報 `invalidFormat` 並附 `formatExpected` 與 `actualValue` 摘要。

## 背景

2026-06-08 captain incident review：TASK-CID-0018 卡了超過 3 個小時。最終定位到 `.atm/history/evidence/TASK-CID-0018.json` 的 `evidence[2].details.commandRuns[0]` 寫入時用了大寫 hex（疑似 PowerShell `Get-FileHash` 預設輸出）：

```
sha256:5098B124E7F8A0C08AC224DE3000A9407CEA1369551AE9838DFEA3A197D0F69A
```

`validateClosurePacket` 用 `/^sha256:[a-f0-9]{64}$/` 驗證，大寫直接失敗。但 error message 報 `missing: ["commandRuns/1/stdoutSha256"]`，誤導 captain 以為欄位缺失，浪費大量除錯時間。

根本問題：寫入端沒有 normalization，讀取端錯誤訊息不分 `missing` vs `invalidFormat`。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Candidate Allowed Files

- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts`（`validateClosurePacket`、`extractEvidenceCommandRuns`、evidence writer）
- `C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts`（reconcile evidence envelope writer）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

- evidence / closure-packet writer 在寫入時自動 `.toLowerCase()` 任何 `^sha256:` 字串的 hex 段。
- 既存的大寫資料路徑（PowerShell 寫入）測試 case 通過。
- `validateClosurePacket` 若值是 `sha256:<UPPER>` 或長度不符，回報 `invalidFormat`，data 帶 `formatExpected: '^sha256:[a-f0-9]{64}$'` 與 `actualValue` 截短摘要。
- `missing` 只用於「key 真的不存在 / value 是空字串 / value 是 undefined」。
- 新增 unit test：upper-case sha256 走 normalization 後 reconcile 通過。
- 新增 unit test：值為空時 `missing`、值為大寫時 `invalidFormat`。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep validateClosurePacket`
- `git diff --check`

## Plain-language Anchor

這張卡是把「大寫 sha256 寫進 evidence 然後騙人說欄位缺失」這個陷阱徹底封死。寫入端強制小寫，讀取端講人話，下一次同樣的 bug 就不會再吃掉隊長 3 小時。
