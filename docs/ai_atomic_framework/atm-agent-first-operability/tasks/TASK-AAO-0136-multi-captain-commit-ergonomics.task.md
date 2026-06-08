---
doc_id: ""
task_id: TASK-AAO-0136
title: "multi-captain commit ergonomics: audit scoping, close-commit-window, worktree framework-mode inheritance"
milestone: M17
status: open
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
created: "2026-06-08"
created_by_agent: captain-incident-review-2026-06-08
started_at: ""
started_by_agent: ""
blocked_by:
  - TASK-AAO-0135
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase0-multi-captain-commit-ergonomics
planning_repo: 3KLife
closure_authority: target_repo
related_plan: docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0136-multi-captain-commit-ergonomics.task.md
related:
  - TASK-CID-0018
  - TASK-AAO-0135
depends_on:
  - TASK-AAO-0135
depends:
  - TASK-AAO-0135
scopePaths:
  - packages/cli/src/commands/hook.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/git.ts
  - tests/**
deliverables:
  - packages/cli/src/commands/hook.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/git.ts
  - tests/**
validators:
  - npm run typecheck
  - npm run validate:cli
  - npm test -- --grep "hook.*audit|close-commit-window|framework-mode worktree"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-closure-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  newScriptsAllowed: false
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0136-multi-captain-commit-ergonomics.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/hook.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/tasks.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/framework-development.ts
  - C:/Users/User/AI-Atomic-Framework/packages/cli/src/commands/git.ts
  - C:/Users/User/AI-Atomic-Framework/tests/**
  - C:/Users/User/AI-Atomic-Framework/atomic_workbench/atomization-coverage/path-to-atom-map.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/.atm/history/**
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - unrelated source surfaces
  - scratch / unrelated dirty
non_goals:
  - "Do not weaken framework-critical staged-file gating."
  - "Do not silence tree-wide findings altogether — they must still surface as warnings."
  - "Do not change INV-ATM invariant enforcement layer."
  - "Do not extend claim lease TTL semantics for normal work."
  - "Do not allow worktrees to escape framework gating altogether."
  - "Do not bypass INV-ATM-002 lock requirements."
  - "Do not mutate AAF source in Phase 0."
  - "Do not start before TASK-AAO-0135 lands; this card relies on its sha256 normalize util and validator error taxonomy."
notes: "2026-06-08 | status: open | validation: pending | change: Phase 0 open card bundling hook audit staged-vs-tree-wide classification + close-commit-window short-lived lock + framework-mode worktree identity inheritance | blocker: none"
---

# TASK-AAO-0136 multi-captain commit ergonomics: audit scoping, close-commit-window, worktree framework-mode inheritance

## 目標

把 2026-06-08 captain incident 暴露的「多 captain 共用 repo + 隔離 worktree 維修被自家治理誤殺」三個結構性卡點一次補上：

1. **Hook audit findings 分級**：pre-commit hook 對 `.atm/history/tasks/**` 的 audit findings 區分 `staged` vs `tree-wide`，staged 維持 fail-closed blocker、tree-wide 降為 warning。
2. **close-commit-window short-lived lock**：`tasks close` / `tasks reconcile` 後自動建立 30 秒 TTL 的 `close-commit-window` lock，allowedFiles = 該 transition 的 staged close artifacts，讓 `node atm.mjs git commit` 能在 window 內落地。
3. **Framework-mode worktree inheritance**：worktree 的 framework-mode 偵測支援沿用主 repo 的 framework identity；`next --claim` 在 worktree 內不再因「missing target framework repo」拒跑。

## 背景

TASK-CID-0018 unstick 過程暴露三個結構性卡點：

- **Tree-wide audit 過度 fail-closed**：早上 11:05 別 session 的 import 在主 repo 留下 9 張 AAO ledger（status=done 但無 ATM CLI 收口 metadata）。隊長嘗試 commit CID-0018 close artifacts 時，被 audit findings × 6（其中沒有一筆涉及 staged 內容）block。被迫先刪除 9 張不相關 ledger 才能繼續。
- **Close 與 commit 之間的縫**：008 跑完 reconcile 後 direction lock 立即釋放。隨後 commit close artifacts 時被判 `ATM_TASK_DIRECTION_SCOPE_DRIFT`（staged TASK-CID-0018.json 不在任何 active direction lock 內）。
- **Worktree framework-mode 誤殺**：路徑 A（isolated worktree）走完 repair-closure 後想 `next --claim` 拿 session，被 framework-mode 判定「current task points to framework repo, switch to target repo」拒跑。明明 worktree 就是主 repo 的 clone。

三件事都讓官方正規路徑卡關，迫使隊長改走治標（手動刪 ledger、複製檔案回主 repo、手動修 evidence）。

## Phase 0 Scope

- 只更新這張 3KLife planning card 與 `docs/tasks/tasks-aao.json`。
- 不碰 `C:/Users/User/AI-Atomic-Framework/**`。

## Phase 1 Scope Amendment

- Frontmatter `allowed_files` 中的 AAF 路徑是 Phase 1 import scope，不是 Phase 0 write scope。
- `hook.ts` 負責 audit findings staged vs tree-wide 分類。
- `framework-development.ts` 負責 worktree → 主 repo identity 對映、close-commit-window 模型。
- `tasks.ts` 負責在 close/reconcile 後段註冊 close-commit-window lock。
- `git.ts` 負責 commit wrapper 認 close-commit-window lock。
- 與 TASK-AAO-0135 的 close/reconcile 改動有重疊區域；本卡必須在 0135 落地、normalize util 與 validator error taxonomy 穩定後才啟動。
- `path-to-atom-map.json` 僅在 capability 描述變更時更新，不拆新 atom。

## Context Map

### Primary（直接改）

- `packages/cli/src/commands/hook.ts` — pre-commit audit findings 分類、blockingStagedFindings / advisoryTreeWideFindings 分段
- `packages/cli/src/commands/framework-development.ts` — task audit findings scope 標記、worktree → 主 repo identity 對映、close-commit-window 模型
- `packages/cli/src/commands/tasks.ts` — close / reconcile 後段建立 close-commit-window 短鎖
- `packages/cli/src/commands/git.ts` — commit wrapper 認 close-commit-window lock 為合法 scope

### Secondary（可能波及、預警 scope drift）

- `atomic_workbench/atomization-coverage/path-to-atom-map.json` — capability 描述更新
- `packages/cli/src/commands/next.ts` — 若 framework-mode worktree 偵測影響 next routing 則同步調整訊息（不改邏輯）

### Test Coverage

- `tests/**` 中新增 hook audit staged-vs-tree、close-commit-window TTL、framework-mode worktree inheritance 整合測試

### Patterns to Follow

- 沿用 TASK-AAO-0135 的 validator error taxonomy（不再用 `missing` 報格式錯誤）
- 沿用 TASK-AAO-0058 的 evidence-events self-allow-on-claim 模式（close-commit-window 算是 self-allow 的時序延伸）
- 沿用既有 direction lock 的 allowedFiles 形狀，close-commit-window 採同樣結構但 TTL 短

## Phase 1 Candidate Allowed Files

- `packages/cli/src/commands/hook.ts`（`runPreCommitHook`、audit aggregation、findings 分類）
- `packages/cli/src/commands/framework-development.ts`（task audit findings 分類、worktree → 主 repo identity 對映、close-commit-window 模型）
- `packages/cli/src/commands/tasks.ts`（close / reconcile 後段建立 close-commit-window）
- `packages/cli/src/commands/git.ts`（commit wrapper 認 close-commit-window lock）
- 對應 tests

## Phase 1 Forbidden Surfaces

- `.atm` runtime / history manual edits
- unrelated source
- scratch / unrelated dirty

## Acceptance Criteria

### 1. Hook audit findings 分級

- audit findings 每筆都帶 `scope: 'staged' | 'tree-wide'` 欄位。
- pre-commit hook 行為：
  - `scope: 'staged'` → fail-closed blocker（維持現行）
  - `scope: 'tree-wide'` → warning only，輸出但不阻擋 commit
- INV-ATM-* 違反在 staged 內仍 100% block。
- hook output 摘要分兩段：`blockingStagedFindings` 與 `advisoryTreeWideFindings`。
- 整合測試：staged 乾淨 + 工作樹他處有 manual-done → commit 通過 + warning；staged 違反 invariant → 仍 block。

### 2. close-commit-window short-lived lock

- `tasks close --status done` 與 `tasks reconcile` 成功落地後自動建立 `close-commit-window` lock，TTL=30 秒。
- lock allowedFiles 涵蓋：closure-packet path、新增 task-events、ledger JSON。
- `node atm.mjs git commit --task <id>` 在 window 內可成功 commit 上述 staged artifacts，不被 `ATM_TASK_DIRECTION_SCOPE_DRIFT` 擋。
- window 結束後 lock 自動釋放。
- 整合測試：reconcile → 立刻 commit 成功；reconcile → 等 60 秒 → commit 被 block。

### 3. Framework-mode worktree inheritance

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
- `npm test -- --grep "hook.*audit|close-commit-window|framework-mode worktree"`
- `git diff --check`

## Plain-language Anchor

別人的髒不該擋我的乾淨；關卡與 commit 之間別有縫；維修通道別被自家偵測誤殺 — 一張卡修好多 captain 共用 repo 與 isolated worktree 兩條主路徑。
