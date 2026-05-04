---
doc_id: doc_task_0030
id: HARN-PILOT-0002
priority: P1
phase: Phase4
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: pilot
chain_id: HARN-CHAIN-PILOT
chain_step: 2/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0004
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 建立 Tooling-code Pilot 任務卡 | 阻塞: depends HARN-TRC-0004"
---

# [HARN-PILOT-0002] 執行 Tooling-code Pilot

> **Harness rollout 開卡** — 以小型 `tools_node/*` 修改驗證 artifact + trace + handoff 三層證據
> **定位**：Phase 4 / Pilot and adoption 第 2 步
> **前置依賴**：`HARN-TRC-0004` 已把 trace summary 掛進 finalize

## 問題描述

tooling-code workflow 是最能驗證 trace 價值的第二類樣本，因為：

- 會有實際 Node 工具執行順序
- 會有局部驗證命令
- 變更面相對可控，容易比較基準路徑

這張卡要用 3 次小型工具修改實測 artifact + handoff + trace 三層證據是否足夠支援交接與 path drift 判斷。

## INPUT_CONTRACT

- finalize 已能輸出 trace summary
- trace collector 與 path taxonomy 已可用
- 可選擇 `tools_node/*` 的小型修改任務作為樣本

## OUTPUT_CONTRACT

- [ ] 完成至少 3 次 tooling-code pilot run
- [ ] 每次 run 都保留 artifact、handoff diff、trace summary
- [ ] 觀察 trace 是否足以區分正常路徑與多餘重試
- [ ] 產出一份 tooling-code pilot 摘要，記錄最常見 drift 類型
- [ ] 將結果提供給 metrics / health report 校準

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow tooling-code-pilot --task HARN-PILOT-0002 --goal "tooling code pilot" --files tools_node/generate-context-summary.js tools_node/lib/context-guard-core.js --emit-turn-artifact --validate-handoff --json
```

## ROLLBACK_HINT

```bash
git checkout artifacts/turn-artifacts/
git checkout artifacts/execution-traces/
git checkout scratch/
```

## 執行步驟

1. 優先選擇小範圍 `tools_node/*` 修改，不要一開始混入跨模組大變更。
2. 每次 run 都記錄 trace summary 與 path class，供 drift comparator 使用。
3. 觀察 retry、gate fail、extra tool step 是否能從 summary 看出來。
4. 若 trace 太重或資訊不足，要先回補 middleware/collector，再繼續 pilot。
5. 完成後再將結果帶到最複雜的 `HARN-PILOT-0003` UI-QA 場景。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：TRC-0004 尚未交付；tooling-code pilot run 未執行。
- 需修改：等 trace summary 接入 finalize 後執行至少 3 次 tooling-code pilot。
