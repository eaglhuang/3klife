<!-- doc_id: doc_other_0130 -->
# ATM/H2U 三層閘門與單一入口

## 為什麼要這樣做
- 目標不是減少嚴謹，而是把嚴謹藏進固定流程，讓日常開發更快。
- 用同一套規則切三個速度層：
  - Dev：快速回饋（預設目標 60 秒內）
  - PR：合併前中等成本檢查
  - Release：最嚴格、可審核、可重播

## 單一入口
```bash
npm run atm:flow -- --mode dev
npm run atm:flow -- --mode pr
npm run atm:flow -- --mode release
```

也提供固定升級命令：
```bash
npm run atm:flow:dev
npm run atm:flow:pr
npm run atm:flow:release
```

## 模式配方
### Dev（綠燈）
- 永遠跑 `compute-gate --profile quick`
- 若碰 task-store/milestone：加跑 `validate:atm-task-store`
- 若碰 H2U：加跑 `validate-html-to-ucuf-rule-guard --strict`
- 若碰 docs/task：加跑 `check-doc-shard-health`

### PR（黃燈）
- 永遠跑 `compute-gate --profile standard`
- 永遠跑 `validate:atm-task-store`
- 若碰 H2U：跑 `validate:legacy-h2u-launch --strict --require-worktree-check`
- 若碰 docs/task：跑 `check-doc-shard-health`

### Release（紅燈）
- 包含 PR 全部
- 加跑 `validate:atm-milestone`
- 加跑 `validate:atm-stability-closeout --strict`
- 若碰 H2U：再跑 `validate:legacy-h2u-first-win --strict --require-worktree-check`

## EPERM/worktree fallback
- 若執行環境無法由 child process 直接讀 `git status`，請先產生快照再傳入：
```bash
git status --short > artifacts/legacy-h2u-first-win/worktree-status.txt
npm run atm:flow -- --mode pr --worktree-status-file artifacts/legacy-h2u-first-win/worktree-status.txt
```

## Shadow -> Enforce
- `--shadow`：流程會輸出完整失敗資訊，但不 hard-block exit code。
- `--metrics-file`：把每次執行結果累積到同一份 JSON，用於追蹤平均耗時、p95、最常失敗步驟。

建議節奏：
1. Shadow 期先跑 `mode=pr --shadow`，觀察假陽性與耗時。
2. 穩定後切換到 hard-block（不帶 `--shadow`）。

## 輸出契約
`atm-flow` 會固定輸出：
- 現在卡哪裡
- 為什麼
- 下一步命令

並可用 `--json` 取 machine-readable 報告給 CI/Agent 消費。
