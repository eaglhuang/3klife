---
doc_id: doc_agentskill_0060
name: compute-gate
description: "計算型閘門 SKILL — Harness Engineering 的確定性驗證核心。在 Agent 每次完成代碼修改後自動執行一組計算型感測器（Computational Sensors），產生 Agent 友善的錯誤修正提示。USE FOR: 任何代碼修改後的自動品質驗證。DO NOT USE FOR: 僅文件修改、純美術資產生成（無 TypeScript 改動）。"
argument-hint: "提供 --profile（quick/standard/full）或 --gates（指定特定閘門）。若不提供預設使用 standard profile。"
---

# Compute Gate Skill

把「代碼寫完」升級為「計算型確認通過」的品質閘門技能。

設計原則（來自 Martin Fowler Harness Engineering）：
- **計算型 > 推論型**：所有驗證均由 CPU 確定性執行，不消耗 LLM tokens
- **錯誤即 Prompt**：失敗訊息已被格式化為 Agent 可直接讀取的修正指引
- **小步驟、頻驗證**：quick profile 在 3 秒內完成，適合每次 Save 後觸發

## 🎯 小模型友善策略（任務拆解框架）

**核心原則**：任何任務修改的範圍不超過 **3 個檔案**。閘門每步驗收一次，讓 1.5B 小模型也能穩定執行大型任務。

### 執行前（Pre-flight）
```bash
# 1. 先掃描現有問題，了解起始狀態
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop

# 2. 若是大型功能，先拆成原子任務卡再執行
node tools_node/task-decomposer.js --feature "<功能名稱>" --type <system|ui|data|doc>
```

### 執行中（每完成一個原子步驟後）
```bash
# 修改 TypeScript 後立刻驗證
node tools_node/compute-gate.js --gates ts-syntax eslint-rules

# 修改 UI JSON 後立刻驗證
node tools_node/compute-gate.js --gates ui-spec-contract

# 新增 import 後立刻驗證
node tools_node/compute-gate.js --gates import-boundary
```

### 執行後（Post-flight）
```bash
# 標準閘門全量驗收
node tools_node/compute-gate.js --profile standard --agent-feedback
```

### 自動修正迴圈
```
1. 執行閘門 → 2. 讀取失敗訊息 → 3. 修正對應檔案 → 4. 重新執行閘門
      ↑_____________________________|（最多重試 3 次，仍失敗則升級任務）
```


## Profile 選擇

| Profile | 適用時機 | 閘門 | 速度 |
|---|---|---|---|
| `quick` | 每次代碼修改後 | TS語法 + 編碼 + ESLint | ~3s |
| `standard` | 任務卡完成時 | quick + UI規格 + GeneralDetail + 模組邊界 | ~10s |
| `full` | 階段性交付時 | standard + 武將資料 + Skin + CrossRef + Fixture | ~30s |

## 基本用法

```bash
# 快速驗證（每次改完代碼）
node tools_node/compute-gate.js --profile quick

# 標準驗證（任務卡完成）
node tools_node/compute-gate.js --profile standard

# 完整驗證（交付前）
node tools_node/compute-gate.js --profile full

# 產生 Agent 修正提示（無停止，輸出所有問題）
node tools_node/compute-gate.js --profile standard --agent-feedback --no-stop
```

## 指定特定閘門

```bash
# 只跑 TypeScript 語法掃描
node tools_node/compute-gate.js --gates ts-syntax

# 跑 TS + ESLint
node tools_node/compute-gate.js --gates ts-syntax eslint-rules

# 跑模組邊界守衛
node tools_node/compute-gate.js --gates import-boundary
```

## JSON 輸出（供自動化流程）

```bash
node tools_node/compute-gate.js --profile standard --json
```

## 自我修正流程

當閘門失敗時，錯誤訊息格式如下（直接可當作下一輪 prompt）：

```
[計算型閘門失敗] ESLint 關鍵規則掃描 (eslint-rules)
說明：禁裸 console.log / no-var / no-debugger / eqeqeq 規則掃描
失敗動作：阻擋（必須修正）
錯誤摘要：
❌ [RULE-01] assets/scripts/ 中禁止裸 console.log()
   assets/scripts/battle/BattleScene.ts:132
修正指引：請根據上述錯誤訊息修正對應的檔案，然後重新執行此 gate。
```

## 任務卡整合方式

在任務卡的 `VALIDATION_CMD` 欄位使用：

```markdown
## VALIDATION_CMD（計算型驗證）
node tools_node/compute-gate.js --profile quick
```

## 與其他 skills 的銜接

- 代碼修改前：先用 `prepare-high-risk-edit` 確認影響範圍
- UI 修改後：接 `ui-runtime-verify` 做截圖驗收
- 階段交付前：先跑 `gate:full` 確認所有閘門

## 所有可用閘門清單

```bash
node -e "const c=require('./tools_node/compute-gate-config.json'); c.gates.forEach(g=>console.log(g.id.padEnd(20), g.description))"
```

## 不可妥協規則

- `CG-001`: 閘門失敗時，不得直接提交代碼。
- `CG-002`: 錯誤修正後必須重新執行閘門，確認通過。
- `CG-003`: 不得以「這次先跳過」方式繞過阻擋（block）級別的閘門。
- `CG-004`: quick profile 最多重試 3 次；若 3 次仍失敗，升級為 standard 診斷。
