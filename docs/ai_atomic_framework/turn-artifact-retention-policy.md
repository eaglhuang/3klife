<!-- doc_id: doc_other_0000 -->
# ATM Turn Artifact Retention and Rotation Policy

## 1. 目的

這份文件定義 ATM 在 turn artifact 的保存、分類與輪替規則，讓證據鏈能維持：
- 可重播（replayable）
- 可審核（auditable）
- 可機器檢查（machine-checkable）

## 2. 單一真相來源

turn artifact 儲存契約以 `tools_node/lib/turn-artifact-storage.js` 為唯一程式來源。  
文件、validator、rotation executor 需與此契約一致。

## 3. 路徑契約

- Formal root：`artifacts/turn-artifacts`
- Scratch root：`scratch`
- Canonical formal pattern：  
  `artifacts/turn-artifacts/<YYYY-MM-DD>/<workflow>/<task>.json`

### 路徑分類

- `formal`：位於 formal root
- `scratch`：位於 scratch root
- `custom`：非上述兩種

## 4. 保存策略

### 4.1 永久保存（Permanent）

- 與 done commit 直接關聯的 turn artifact
- release / milestone / pilot 採納證據
- regression fixture 與 baseline 證據

### 4.2 可輪替（Cleanup Eligible）

- scratch smoke artifact
- 臨時 local probe / debug artifact
- 無 task card / commit / baseline 關聯的探針輸出

## 5. Rotation 契約

`rotate-turn-artifacts` 是輪替執行器，規則如下：

1. 預設 `--dry-run`，只產生規劃與報告，不改檔。
2. `--apply` 必須搭配 `--yes`，否則拒絕執行。
3. 只處理符合 cleanup policy 且超過門檻天數的候選。
4. 產出 machine-readable report（含 candidates / moved / skipped / blockers）。

## 6. Legacy Path 處理

既有的 formal legacy path 可暫時保留，但應逐步歸檔到 canonical pattern：

1. `validate-turn-artifact-retention` 先標記為 advisory finding。
2. `rotate-turn-artifacts --dry-run` 盤點可移動候選。
3. 確認後以 `--apply --yes` 分批收斂。

## 7. 檢查與 Gate

### 7.1 Retention Validator

`validate-turn-artifact-retention --strict` 必須可機器判定 pass/fail，至少檢查：

- JSON 可解析
- formal path class 合法
- canonical formal artifact 的 `generatedAt`、workflow、task
- canonical path date segment 與 `generatedAt` 對齊

### 7.2 Rotation Executor

`rotate-turn-artifacts` 需輸出 machine-readable 欄位，至少包含：

- `trigger`
- `scope`
- `severity`
- `action`
- `routeClass`
- `routeHint`

## 8. 既有命令

```bash
node tools_node/validate-turn-artifact-retention.js --strict
node tools_node/rotate-turn-artifacts.js --dry-run
node tools_node/rotate-turn-artifacts.js --apply --yes
```
