---
doc_id: doc_task_TBD
id: HARN-LOG-0001
priority: P2
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: ClaudeCode_claude-sonnet-4-6
status: done
type: system
chain_id: HARN-CHAIN-CONSOLE-LOG
chain_step: 1/4
sensor_triggered_by: compute-gate check-eslint-rules RULE-01
depends:
  []
notes: "2026-05-04 | 狀態: done | ClaudeCode_claude-sonnet-4-6: eslint-rules 閘門驗證通過，battle 模組 RULE-01 違規已清零（由前序工作完成）。"
---

# [HARN-LOG-0001] 遷移裸 console.log → UCUFLogger（Battle 模組）

> 🔗 **韁繩感測器自動偵測** — 由 `check-eslint-rules.js` RULE-01 觸發
> ⚡ **修改上限**：6 個檔案（Battle 模組全部）
> 📊 **影響範圍**：34 個違規檔案中的 6 個（Battle 模組）

## 問題描述

`assets/scripts/battle/` 下有 6 個檔案含裸 `console.log()`，違反 RULE-01。

**違規檔案清單**：
```
assets/scripts/battle/views/BattleScene.ts
assets/scripts/battle/views/BattleSceneLoader.ts
assets/scripts/battle/views/SceneBackground.ts
assets/scripts/battle/views/TurnFlowManager.ts
assets/scripts/battle/views/UnitRenderer.ts
assets/scripts/battle/views/effects/BuffGainEffectPool.ts
```

## INPUT_CONTRACT

- UCUFLogger 已存在：`assets/scripts/ui/core/UCUFLogger.ts`
- 可用的 LogCategory：`LIFECYCLE` / `SKIN` / `DATA` / `PERFORMANCE` / `RULE` / `DRAG`
- 所有目標檔案語法正確（`ts-syntax` gate 通過）

## OUTPUT_CONTRACT

- [ ] 上述 6 個檔案中所有 `console.log()` 已替換為 `UCUFLogger.debug()` 或 `UCUFLogger.info()`
- [ ] 每個替換的呼叫已加入適當的 `LogCategory`
- [ ] 不得修改任何業務邏輯（只換 log 呼叫）
- [ ] `check-eslint-rules.js` 對 battle 模組輸出 0 個 RULE-01 錯誤

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates ts-syntax eslint-rules
```

## ROLLBACK_HINT

```bash
git checkout assets/scripts/battle/views/
```

## 替換規則

```typescript
// ❌ 舊
console.log('[BattleScene] 初始化完成');

// ✅ 新
import { UCUFLogger, LogCategory } from '../../ui/core/UCUFLogger';
UCUFLogger.debug(LogCategory.LIFECYCLE, '[BattleScene] 初始化完成');
```

### LogCategory 選擇指引

| 日誌內容 | 建議 Category |
|---|---|
| 元件 mount/unmount | `LIFECYCLE` |
| 資料讀取/解析 | `DATA` |
| 渲染/動畫更新 | `PERFORMANCE` |
| 規則計算/判斷 | `RULE` |

## 執行步驟

1. 開啟 `BattleScene.ts`，找到所有 `console.log(` 呼叫
2. 在檔案頂部加入 UCUFLogger import（若尚未存在）
3. 將每個 `console.log(...)` 替換為 `UCUFLogger.debug(LogCategory.XXX, ...)`
4. 儲存後執行 `node tools_node/compute-gate.js --gates ts-syntax`
5. 對其餘 5 個檔案重複步驟 1-4
6. 最終執行 `node tools_node/compute-gate.js --gates ts-syntax eslint-rules` 確認通過

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
