---
doc_id: doc_task_0030
id: HARN-PILOT-0002
priority: P1
phase: Phase4
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
type: pilot
chain_id: HARN-CHAIN-PILOT
chain_step: 2/3
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-TRC-0004
started_at: "2026-05-06T21:47:50.1031177+08:00"
started_by_agent: "vs-insiders-gpt-5.4-mini"
completed_at: "2026-05-06T21:58:54.6000309+08:00"
completed_by_agent: "vs-insiders-gpt-5.4-mini"
notes: "2026-05-06 | 狀態: done | 驗證: 3 次 tooling-code pilot run pass；trace summary pass；handoff-diff 皆為 warn（主因為既有 ATM dirty worktree），最常見 drift 為 dirty-but-unreported 與 sample 對應外部雜訊 | 變更: vs-insiders-gpt-5.4-mini 完成 3 次 tooling-code pilot，分別驗證 generate-context-summary、context-guard-core、turn-artifact-storage 的小型改動；每次皆保存 artifact、handoff diff、trace summary | 阻塞: none"
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

- [x] 完成至少 3 次 tooling-code pilot run
- [x] 每次 run 都保留 artifact、handoff diff、trace summary
- [x] 觀察 trace 是否足以區分正常路徑與多餘重試
- [x] 產出一份 tooling-code pilot 摘要，記錄最常見 drift 類型
- [x] 將結果提供給 metrics / health report 校準

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

## 審核結果（2026-05-06）

- 審核結論：通過
- 驗證證據：3 次 tooling-code pilot 已完成；`generate-context-summary.js`、`context-guard-core.js`、`turn-artifact-storage.js` 皆有對應 artifact 與 trace summary；trace summary 皆為 pass
- 觀察：handoff-diff 一致呈現 warn，主要不是工具本身壞掉，而是 repo 內既有 ATM dirty worktree 讓 dirty-but-unreported 成為最常見 drift 類型；這些結果可直接回餵 metrics / health report
