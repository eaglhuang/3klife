---
doc_id: doc_task_TBD
id: HARN-FIX-0001
priority: P3
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Agent
status: pending
type: system
chain_id: HARN-CHAIN-FIXTURES
chain_step: 1/1
sensor_triggered_by: compute-gate approved-fixture-check
depends:
  []
---

# [HARN-FIX-0001] 建立核心系統 Approved Fixtures

> 🔗 **韁繩感測器觸發** — 由 `approved-fixture-check.js` 警告觸發
> ⚡ **修改上限**：建立 ≤ 10 個 fixture 對（.input.json + .expected.json）
> 📋 **優先**：P3（Feedback Loop 完善，不阻擋現有開發）

## 問題描述

`approved-fixture-check.js` 警告：`fixtures/` 目錄只有 1 個示範 fixture（`battle/normal-deploy`）
尚未有任何「人類審核過的預期輸出」可供確定性比對。

**Approved Fixtures 意義**：
- 第一次：強 LLM 或人類審核業務邏輯正確後 → 存為 expected.json
- 之後：每次 CI 自動比對，不需要 LLM，純 CPU 確定性驗證
- 效果：行為回歸測試成本從「LLM 推論」降為「JSON diff」

## INPUT_CONTRACT

- `approved-fixture-check.js` 已存在且可執行
- `fixtures/` 目錄已建立
- 目標業務模組有可獨立呼叫的純函數（不依賴 Cocos 引擎）

## OUTPUT_CONTRACT

至少建立以下 5 套 Fixtures：

### Suite 1: battle-skill（戰鬥技能計算）
- `fixtures/battle-skill/normal-damage.input.json`
- `fixtures/battle-skill/normal-damage.expected.json`

### Suite 2: general-balance（武將平衡計算）
- `fixtures/general-balance/ep-recompute-basic.input.json`
- `fixtures/general-balance/ep-recompute-basic.expected.json`

### Suite 3: ui-skin-resolve（皮膚解析）
- `fixtures/ui-skin/token-resolve-basic.input.json`
- `fixtures/ui-skin/token-resolve-basic.expected.json`

### Suite 4: battle-deploy（部署判斷）
- `fixtures/battle-deploy/normal-deploy.input.json` ← 已建立（需補 expected）
- `fixtures/battle-deploy/normal-deploy.expected.json`

### Suite 5: crossref-validate（交叉索引驗證）
- `fixtures/crossref/basic-integrity.input.json`
- `fixtures/crossref/basic-integrity.expected.json`

**所有 expected.json 必須標記人工審核者**：
```json
{
  "_blessed_by": "<Agent 名稱 或 '人工審核'>",
  "_blessed_at": "2026-05-04T...",
  "output": { ... }
}
```

## VALIDATION_CMD

```bash
node tools_node/approved-fixture-check.js --list
node tools_node/approved-fixture-check.js
```

期望輸出：
```
📦 已知 Fixtures（≥5 個）
✅ battle-skill/normal-damage
✅ general-balance/ep-recompute-basic
✅ ui-skin/token-resolve-basic
✅ battle-deploy/normal-deploy
✅ crossref/basic-integrity
```

## ROLLBACK_HINT

```bash
# Fixtures 為新建，無需 rollback，直接刪除即可
rm -rf fixtures/battle-skill/
rm -rf fixtures/general-balance/
```

## 建立步驟

### 步驟 1：初始化 fixture 骨架

```bash
node tools_node/approved-fixture-check.js --init battle-skill normal-damage
node tools_node/approved-fixture-check.js --init general-balance ep-recompute-basic
node tools_node/approved-fixture-check.js --init ui-skin token-resolve-basic
node tools_node/approved-fixture-check.js --init battle-deploy normal-deploy
node tools_node/approved-fixture-check.js --init crossref basic-integrity
```

### 步驟 2：填寫 input.json

根據各業務模組的實際輸入格式填寫。

### 步驟 3：執行業務邏輯取得輸出

手動呼叫或 Agent 執行，取得正確輸出。

### 步驟 4：人工審核後填寫 expected.json

**這是唯一需要人類判斷的步驟**。確認輸出正確後填入 `output` 欄位，並填寫 `_blessed_by`。

### 步驟 5：驗證

```bash
node tools_node/approved-fixture-check.js
node tools_node/harness-health-report.js
# 期望 C. Feedback Loop 從 90% 升至 ≥ 95%
```

## 長期維護

- 每新增核心業務邏輯 → 對應建立 fixture
- CI 每次執行 `approved-fixture-check.js` 做回歸驗證
- 若業務邏輯更新導致輸出改變 → 執行 `--update` 後需人工重新審核

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
