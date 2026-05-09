<!-- doc_id: doc_other_0098 -->
# ATM API（Tracking Repo）

本文件描述本 repo 內可直接呼叫的 ATM 指令面（CLI + 驗證器）。

## 1) Task Lock CLI

入口：`node tools_node/task-lock.js`

常用命令：

```bash
node tools_node/task-lock.js check <task-id>
node tools_node/task-lock.js lock <task-id> <agent-name>
node tools_node/task-lock.js unlock <task-id> <agent-name>
node tools_node/task-lock.js list
```

用途：

- `check`：檢查任務是否衝突/佔用
- `lock`：宣告接手任務
- `unlock`：收工解鎖

## 2) Task-Store Sync API

入口：`node tools_node/sync-atm-stabilization-milestone.js`

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/sync-atm-stabilization-milestone.js
```

用途：

- `--check --strict`：check-only（不寫檔），驗證 task-store truth pipeline 是否無漂移
- 無旗標：依 task-store 真相回寫衍生檔（tasks-atm summary + milestone）

主路徑（架構鏈，不是新增入口）：

1. `tasks-atm-shard-store.js`
2. `sync-atm-stabilization-milestone.js`
3. `rebuild-tasks-atm-auto-parts.js`

官方驗證序列（固定）：

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/rebuild-tasks-atm-auto-parts.js
npm.cmd run validate:atm-task-store
```

`validate:atm-milestone` 保留相容 alias，用於舊流程；新流程請以 `validate:atm-task-store` 為主。

## 3) Deterministic Validators

```bash
npm run validate:atm-task-store
npm run validate:atm-milestone
npm run validate:rule-guard-read-only
npm run validate:registry-backfill-sweep
npm run validate:usage-evidence-shadow
npm run validate:h2u-evolution-pilot
```

輸出型態：

- 統一包含 `validator`、`passed`、`checks[]`
- 失敗時包含 `findings[]`（machine-readable）

## 4) Rule Guard Findings Contract

`validate:rule-guard-read-only` 產出的 findings 至少含以下欄位：

- `trigger`
- `scope`
- `severity`
- `action`
- `routeClass`
- `routeHint`

## 5) 建議呼叫順序

1. `sync-atm-stabilization-milestone.js --check --strict`（check-only）
2. `rebuild-tasks-atm-auto-parts.js`
3. `validate:atm-task-store`
4. `validate:rule-guard-read-only`
5. `validate:registry-backfill-sweep`
6. `validate:usage-evidence-shadow`
7. `validate:h2u-evolution-pilot`

## 6) Upstream CLI（參考）

在上游 standalone repo 常見命令：

```bash
atm init --adopt
atm status
atm validate
atm test --atom hello-world
```
