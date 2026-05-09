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

## 2) Milestone Sync API

入口：`node tools_node/sync-atm-stabilization-milestone.js`

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/sync-atm-stabilization-milestone.js
```

用途：

- `--check --strict`：僅驗證里程碑與 task-store 是否一致
- 無旗標：依 task-store 真相回寫里程碑

## 3) Deterministic Validators

```bash
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

1. `validate:atm-milestone`
2. `validate:rule-guard-read-only`
3. `validate:registry-backfill-sweep`
4. `validate:usage-evidence-shadow`
5. `validate:h2u-evolution-pilot`

## 6) Upstream CLI（參考）

在上游 standalone repo 常見命令：

```bash
atm init --adopt
atm status
atm validate
atm test --atom hello-world
```
