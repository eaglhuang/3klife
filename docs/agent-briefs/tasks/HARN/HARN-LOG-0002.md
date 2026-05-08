---
doc_id: doc_task_0023
id: HARN-LOG-0002
priority: P2
phase: G
created: 2026-05-04
created_by_agent: compute-gate-sensor
owner: ClaudeCode_claude-sonnet-4-6
status: done
type: system
chain_id: HARN-CHAIN-CONSOLE-LOG
chain_step: 2/4
sensor_triggered_by: compute-gate check-eslint-rules RULE-01
depends:
  - HARN-LOG-0001
notes: "2026-05-04 | 狀態: done | ClaudeCode_claude-sonnet-4-6: eslint-rules 閘門驗證通過，core 模組 RULE-01/RULE-04 違規已清零（由前序工作完成）。"
---

# [HARN-LOG-0002] 遷移裸 console.log → UCUFLogger（Core 模組）

> 🔗 **任務鏈**：`HARN-CHAIN-CONSOLE-LOG`（步驟 2/4）
> ⚡ **修改上限**：4 個檔案（Core 模組）

## 違規檔案清單

```
assets/scripts/core/systems/AudioSystem.ts
assets/scripts/core/systems/EffectSystem.ts
assets/scripts/core/systems/MemoryManager.ts   ← 含 RULE-04 (== 應改為 ===)
assets/scripts/core/systems/NetworkService.ts
```

## INPUT_CONTRACT

- HARN-LOG-0001 已完成（Battle 模組已清零）
- `check-eslint-rules.js` 對 battle 模組輸出 0 個 RULE-01

## OUTPUT_CONTRACT

- [ ] 上述 4 個 Core 檔案所有 `console.log()` 替換完成
- [ ] `MemoryManager.ts` 的 `==` 同步修正為 `===`（RULE-04）
- [ ] `check-eslint-rules.js` 對 core 模組輸出 0 個 RULE-01/RULE-04 錯誤

## VALIDATION_CMD

```bash
node tools_node/compute-gate.js --gates ts-syntax eslint-rules
```

## ROLLBACK_HINT

```bash
git checkout assets/scripts/core/systems/
```

## 特別注意：MemoryManager.ts

`MemoryManager.ts:55` 有額外的 RULE-04 違規（`==` 應改為 `===`）：

```typescript
// ❌ 舊
if (obj == null) { ... }

// ✅ 新（null 比較慣用 ===）
if (obj === null || obj === undefined) { ... }
// 或使用 nullish coalescing
if (obj == null) { ... }  // 僅此場景可考慮例外，但建議改為 ===
```

---
*由 Harness Engineering compute-gate 感測器自動偵測開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：達成
- 驗證證據：compute-gate --profile standard 已於本輪審核通過 6/6。 check-eslint-rules 已通過，core 模組 RULE-01/RULE-04 未再阻擋。
- 需修改：無；UCUFLogger 白名單只允許底層合法輸出點。
