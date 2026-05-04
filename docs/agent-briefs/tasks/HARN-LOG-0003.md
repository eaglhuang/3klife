---
doc_id: doc_task_TBD
id: HARN-LOG-0003
priority: P2
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: Agent
status: pending
type: system
chain_id: HARN-CHAIN-CONSOLE-LOG
chain_step: 3/4
sensor_triggered_by: compute-gate check-eslint-rules RULE-01
depends:
  - HARN-LOG-0002
---

# [HARN-LOG-0003] 遷移裸 console.log → UCUFLogger（Tools 模組）

> 🔗 **任務鏈**：`HARN-CHAIN-CONSOLE-LOG`（步驟 3/4）
> ⚡ **修改上限**：4 個檔案（Tools 模組）

## 違規檔案清單

```
assets/scripts/tools/SceneAutoBuilder.ts
assets/scripts/tools/VfxComposerTool.ts
assets/scripts/tools/VideoPlayerTest.ts
assets/scripts/tools/vfx-usage-table.ts
```

## INPUT_CONTRACT

- HARN-LOG-0001、HARN-LOG-0002 已完成

## OUTPUT_CONTRACT

- [ ] 上述 4 個 Tools 檔案所有 `console.log()` 替換完成
- [ ] 注意：Tools 模組的日誌可使用 `LogCategory.PERFORMANCE` 或 `LogCategory.DATA`
- [ ] `check-eslint-rules.js` 對 tools 模組輸出 0 個 RULE-01 錯誤

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates ts-syntax eslint-rules
```

## 特別注意：UCUFLogger import 路徑

Tools 模組位於 `assets/scripts/tools/`，import UCUFLogger 的路徑為：

```typescript
import { UCUFLogger, LogCategory } from '../ui/core/UCUFLogger';
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*
