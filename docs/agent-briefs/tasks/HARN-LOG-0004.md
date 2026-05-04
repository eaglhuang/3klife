---
doc_id: doc_task_TBD
id: HARN-LOG-0004
priority: P2
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Agent
status: pending
type: system
chain_id: HARN-CHAIN-CONSOLE-LOG
chain_step: 4/4
sensor_triggered_by: compute-gate check-eslint-rules RULE-01
depends:
  - HARN-LOG-0003
---

# [HARN-LOG-0004] 遷移裸 console.log → UCUFLogger（UI 模組 + UCUFLogger 自身）

> 🔗 **任務鏈**：`HARN-CHAIN-CONSOLE-LOG`（步驟 4/4，最後一步）
> ⚡ **修改上限**：此步驟最多分 2 批執行，每批 ≤ 12 個檔案

## 違規檔案清單（20 個，分 2 批）

**批次 A（UI Components，優先）**：
```
assets/scripts/ui/components/ActionCommandComposite.ts
assets/scripts/ui/components/ActionCommandPanel.ts
assets/scripts/ui/components/BattleHUD.ts
assets/scripts/ui/components/BattleHUDComposite.ts
assets/scripts/ui/components/BattleLogComposite.ts
assets/scripts/ui/components/BattleLogPanel.ts
assets/scripts/ui/components/BattleUIDiag.ts
assets/scripts/ui/components/DeployPanel.ts
assets/scripts/ui/components/GeneralQuickViewPanel.ts
assets/scripts/ui/components/StyleCheckPanel.ts
assets/scripts/ui/components/TigerTallyComposite.ts
assets/scripts/ui/components/TigerTallyPanel.ts
```

**批次 B（UI Components 續 + Core）**：
```
assets/scripts/ui/components/UIScreenPreviewHost.ts
assets/scripts/ui/components/UltimateSelectPopup.ts
assets/scripts/ui/components/UnitInfoComposite.ts
assets/scripts/ui/components/UnitInfoPanel.ts
assets/scripts/ui/core/UIPreviewBuilder.ts
assets/scripts/ui/core/UISkinResolver.ts
assets/scripts/ui/core/UISpecLoader.ts
```

**特別處理（UCUFLogger 自身）**：
```
assets/scripts/ui/core/UCUFLogger.ts:106
```
> UCUFLogger.ts 內部的 `console.log(full, ...args)` 是合法的（這是底層 console 輸出點）。
> 應在 `check-eslint-rules.js` 中加入例外規則，而不是修改它。

## INPUT_CONTRACT

- HARN-LOG-0001、HARN-LOG-0002、HARN-LOG-0003 全部已完成
- Battle / Core / Tools 模組的 `check-eslint-rules.js` 已輸出 0 個 RULE-01

## OUTPUT_CONTRACT

- [ ] 批次 A（12 個 UI Component 檔案）所有 `console.log()` 替換完成
- [ ] 批次 B（7 個 UI 檔案）所有 `console.log()` 替換完成
- [ ] `UCUFLogger.ts` 自身的 `console.log` 加入白名單例外
- [ ] `check-eslint-rules.js` 對整個 `assets/scripts/` 輸出 0 個 RULE-01 錯誤
- [ ] `compute-gate.js --profile quick` 全部通過

## VALIDATION_CMD

```bash
# 每批完成後驗證
node tools_node/compute-gate.js --gates ts-syntax eslint-rules

# 最終整體驗收
node tools_node/compute-gate.js --profile quick
```

## ROLLBACK_HINT

```bash
git checkout assets/scripts/ui/components/
git checkout assets/scripts/ui/core/
```

## 特別處理：UCUFLogger 白名單

在 `check-eslint-rules.js` 的 RULE-01 定義中，加入對 UCUFLogger.ts 自身的例外：

```javascript
// 在 RULE-01 的 scanFile 邏輯中：
if (rule.scope === 'scripts-only' && !isScriptsFile) continue;
// 新增：UCUFLogger 自身的 console.log 是合法的底層輸出
if (rule.id === 'RULE-01' && filePath.includes('UCUFLogger.ts')) continue;
```

## 完成條件

當此任務卡完成後，`npm run gate:quick` 應全部通過：
```
✅ TypeScript 語法掃描
✅ 檔案編碼完整性
✅ ESLint 關鍵規則掃描  ← 本鏈目標
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
