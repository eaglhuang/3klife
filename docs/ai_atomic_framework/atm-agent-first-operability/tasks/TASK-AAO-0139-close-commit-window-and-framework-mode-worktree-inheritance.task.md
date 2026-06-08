---
doc_id: ""
task_id: TASK-AAO-0139
title: "close-commit-window short-lived lock and framework-mode worktree identity inheritance"
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
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-close-commit-window-and-framework-mode-worktree-inheritance
planning_repo: 3KLife
closure_authority: target_repo
related:
  - TASK-CID-0018
depends: []
allowed_files:
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
forbidden_files:
  - .atm runtime / history manual edits
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not extend claim lease TTL semantics for normal work."
  - "Do not allow worktrees to escape framework gating altogether."
  - "Do not introduce a separate close-only actor identity."
non_goals_extra:
  - "Do not bypass INV-ATM-002 lock requirements."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card for close-commit-window short-lived lock + framework-mode worktree identity inheritance | blocker: none"
---

# TASK-AAO-0139 close-commit-window short-lived lock and framework-mode worktree identity inheritance

## 目標

兩個小修補綁在一張卡，都是處理「task close 之後到 commit 之間的縫」與「isolated worktree 維修被 framework-mode 卡死」：

1. **close-commit-window**：`tasks close` / `tasks reconcile` 完成後，自動建立一個 30 秒 TTL 的 short-lived `close-commit-window` lock，allowedFiles = 該 transition 的 staged artifacts（closure-packet、task-events、ledger）。讓 `node atm.mjs git commit` 還能成功落地 close artifacts，window 結束後自動釋放。
2. **framework-mode worktree inheritance**：worktree 的 framework-mode 偵測支援沿用主 repo 的 framework identity；`next --claim` 在 worktree 內不再因為「missing target framework repo」而拒跑。

## 背景

2026-06-08 captain incident：

- **Window 缺口**：008 跑完 reconcile 後 direction lock 立即釋放，但 staged 的 close artifacts（closure-packet + 6 task-events + ledger 修改）還沒 commit。隨後想用 `node atm.mjs git commit` commit 這些檔，hook 卻說「TASK-CID-0018.json 不在任何 active direction lock allowedFiles 內」→ scope drift block。
- **Worktree 卡關**：路徑 A（isolated worktree）走完 repair-closure 後想 `next --claim` 拿 session 來 commit，被 framework-mode 偵測判定為「current task points to framework repo, switch to target repo」而拒跑。worktree 明明就是主 repo 的 clone。

兩個缺口都讓正規路徑卡關，迫使隊長改走治標。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/tasks.ts`（close / reconcile 後段建立 close-commit-window）
- `packages/cli/src/commands/framework-development.ts`（worktree → 主 repo identity 對映、close-commit-window 模型）
- `packages/cli/src/commands/git.ts`（commit wrapper 認 close-commit-window lock）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

### close-commit-window

- `tasks close --status done` 與 `tasks reconcile` 成功落地後，自動建立 `close-commit-window` 短期 lock，TTL=30 秒。
- lock allowedFiles 涵蓋：closure-packet path、新增 task-events、ledger JSON。
- `node atm.mjs git commit --task <id>` 在 window 內可成功 commit 上述 staged artifacts，不被 direction-lock-drift 擋。
- window 結束後 lock 自動釋放，下次 commit 不享受該 window。
- 整合測試：reconcile → 立刻 commit 成功；reconcile → 等 60 秒 → commit 被 block。

### framework-mode worktree inheritance

- worktree 內呼叫 framework-mode status 時，若偵測到該 worktree 對應的主 repo 已有 framework identity，沿用主 repo 設定。
- worktree 內 `next --claim` 不再因 framework-mode 拒跑（同主 repo 行為）。
- 整合測試：`git worktree add` 後在新 worktree 跑 `framework-mode status --json` 應該回報主 repo 的 mode、不報 missing。

## Validators

### Phase 0 Planning Validators

- `node tools_node/check-encoding-touched.js --files <touched>`
- `git diff --check`

### Phase 1 AAF Validators

- `npm run typecheck`
- `npm run validate:cli`
- `npm test -- --grep "close-commit-window|framework-mode worktree"`
- `git diff --check`

## Plain-language Anchor

關卡與 commit 之間別再有縫；維修通道（isolated worktree）別再被自家 framework-mode 偵測誤殺。
