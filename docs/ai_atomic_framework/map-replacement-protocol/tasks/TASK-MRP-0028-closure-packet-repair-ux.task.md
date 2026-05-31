---
doc_id: doc_other_0169
task_id: TASK-MRP-0028
title: Closure Packet Repair UX and Parent Tree Semantics
milestone: M28
status: open
priority: P0
created_at: 2026-05-31T23:10:48+08:00
created_by_agent: codex-gpt-5
owner: atm-core
related_plan: docs/ai_atomic_framework/map-replacement-protocol/拆解大型功能優化原子map計畫書v2.md
upstream_repo: AI-Atomic-Framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
public_tracking: false
blocked_by: [TASK-MRP-0026, TASK-MRP-0027]
depends_on:
  - TASK-MRP-0026
  - TASK-MRP-0027
scopePaths:
  - packages/cli/src/commands/framework-development.ts
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/tasks/task-option-parsers.ts
  - packages/cli/src/commands/hook.ts
  - packages/cli/src/commands/rescue.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/command-specs/rescue.spec.ts
  - scripts/validate-cli.ts
  - scripts/validate-git-hooks-enforcement.ts
  - scripts/validate-task-ledger-governance.ts
  - release/atm-onefile/atm.mjs
deliverables:
  - "Closure packet 改描述 delivery parent commit tree，避免 closure packet self-reference hash loop"
  - "tasks close 對 framework done close 增加 clean working tree precondition"
  - "新增 node atm.mjs tasks repair-closure --task <id> --json"
  - "新增 node atm.mjs rescue closure-packet --task <id> --json"
  - "pre-push / commit-range closure drift findings 輸出 suggested fix"
  - "用 local tag broken-closure-packet-self-ref-2026-05-31 驗證 repair UX"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:task-ledger-governance"
  - "npm run build"
acceptance:
  - "broken tag 可重現 TASK-AAO-0102 closure packet drift，且 repair CLI 修復後 pre-push guard PASS"
  - "tasks close 不再把 closure packet 自己所在 tree 寫入 governedTreeSha"
  - "dirty framework worktree close 會 fail fast 並提供可執行 remediation"
  - "rescue closure-packet 與 tasks repair-closure 使用同一修復邏輯"
  - "help / command specs / CLI validator 覆蓋新 command surface"
outOfScope:
  - "重做 TASK-AAO-0102 map deliverables"
  - "推送 local broken tag"
  - "清理 3KLife 或 AAF 既有 untracked 檔案"
  - "MRP-0029 batch CLI"
notes: "2026-05-31 | 狀態: open | 驗證: pending | 變更: 0102 broken state 轉為 living test case，修 closure packet self-reference 與 repair UX | 風險: shared-file 高耦合，需先派讀取 sidecar、實作採 disjoint write set"
---

# TASK-MRP-0028 Closure Packet Repair UX and Parent Tree Semantics

## 目的

修復 TASK-AAO-0102 揭露的 closure packet self-reference hash loop。ATM 應該證明 delivery commit，而不是證明 closure packet 自己所在的 commit tree；否則每次修 packet 都會改變 tree，造成 `governedTreeSha`、git-head evidence、commandRuns 永遠漂移。

## 背景

AAF local tag `broken-closure-packet-self-ref-2026-05-31` 保存了真實 broken state。該 range 可重現：

- `ATM_COMMIT_RANGE_CLOSURE_PACKET_TREE_MISMATCH`
- `ATM_COMMIT_RANGE_CLOSURE_PACKET_GIT_HEAD_TREE_MISMATCH`
- `ATM_COMMIT_RANGE_CLOSURE_PACKET_COMMAND_RUN_MISMATCH`

這不是 user error；它是 framework closure packet 語意與 close 流程的結構缺陷。

## 執行要求

1. 先用 `node atm.mjs next --claim --actor <id> --prompt "<TASK-MRP-0028 prompt>" --json` 取得正式 scope。
2. 實作前確認 working tree，不清不可判斷 untracked。
3. 優先修 `framework-development.ts` / `tasks.ts` / `hook.ts` / `rescue.ts` 四個核心切點。
4. 實作後必須跑 focused validators，再跑 `npm run build` 更新 frozen runner。
5. 用 local broken tag 或等價 isolated worktree 驗證 repair CLI；不得 push tag。

## 驗收案例

```bash
node atm.mjs guard commit-range --base ed8f4a7caafb18e6520c396e44c73382b72aa411 --head e021413096745e947ce6906bed7fcd934fc49419 --json
```

修法前應重現 closure packet drift。修法後，在隔離 worktree 對 broken tag 執行：

```bash
node atm.mjs tasks repair-closure --task TASK-AAO-0102 --json
node atm.mjs hook pre-push --base origin/main --head HEAD --json
```

預期 `ok:true`，且不需 `--no-verify`、不需手改 ledger JSON。
