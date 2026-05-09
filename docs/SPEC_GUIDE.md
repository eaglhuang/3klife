<!-- doc_id: doc_other_0097 -->
# ATM Spec Guide（Task Store / Milestone）

本文件整理 ATM 在本 repo 的最小規格，讓 task card、shard 與 milestone 共享同一份真相來源。

## 1) Source of Truth

- Task Store（thin index）：`docs/tasks/tasks-atm.json`
- Task Shards（full records）：`docs/tasks/tasks-atm/tasks-atm-part-*.json`
- Milestone：`docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md`

原則：狀態統計以 task shards 為準，milestone 只做投影。

Task-store 主路徑（架構鏈，不是新增入口）：

1. `tasks-atm-shard-store.js`
2. `sync-atm-stabilization-milestone.js`
3. `rebuild-tasks-atm-auto-parts.js`

## 2) Task Record Core Fields

每張 task 至少包含：

- `id`
- `title`
- `status`（`open` / `in-progress` / `done`）
- `phase`
- `depends[]`
- `acceptance[]`
- `deliverables[]`
- `notes`

## 3) Task Card Frontmatter Minimum

`docs/agent-briefs/tasks/ATM/*.md` 建議至少維持：

- `id`
- `priority`
- `phase`
- `owner`
- `status`
- `depends`
- `notes`

接手任務時必填：

- `status: in-progress`
- `started_at: <RFC3339>`
- `started_by_agent: <agent-name>`

## 4) Status Flow

1. `open`：尚未接手
2. `in-progress`：已鎖卡、正在執行
3. `done`：驗證與回寫完成

完成後應同步：

- task card frontmatter
- 對應 task shard
- thin index summary（必要時重建）
- milestone（用 sync 腳本）

## 5) Validation Contract

最小驗證鏈：

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/rebuild-tasks-atm-auto-parts.js
npm.cmd run validate:atm-task-store
```

補充：

- `--check --strict` 為 check-only、non-mutating：只檢查 drift，不寫入衍生檔。
- `validate:atm-milestone` 仍可用，但僅作為相容 alias，不是主要驗證入口。

延伸驗證鏈：

```bash
npm run validate:rule-guard-read-only
npm run validate:registry-backfill-sweep
```

M2 證據鏈：

```bash
npm run validate:usage-evidence-shadow
npm run validate:h2u-evolution-pilot
```

## 6) ATM-5-0001 文件產出對應

- `docs/QUICK_START.md`：最短上手流程（tracking + upstream）
- `docs/API.md`：CLI / validator 入口與參數
- `docs/SPEC_GUIDE.md`：task-store / milestone 規格與同步原則
- `README.md`：專案級 quick start 入口
