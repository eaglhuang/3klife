---
doc_id: doc_task_0020
id: HARN-HDO-0003
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: workflow-tooling
chain_id: HARN-CHAIN-HANDOFF
chain_step: 3/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0002
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 依 Harness 落地藍圖建立 Finalize Handoff Integration 任務卡 | 阻塞: depends HARN-HDO-0002"
---

# [HARN-HDO-0003] 將 Handoff Diff Validator 接入 Finalize

> **Harness rollout 開卡** — 讓 handoff 驗證從獨立 CLI 升級為正式收工閘門
> **定位**：Phase 1 / Handoff evidence 第 3 步
> **前置依賴**：`HARN-HDO-0002` fixtures 與 verdict 邏輯已穩定

## 問題描述

如果 handoff validator 只是一支獨立 CLI，Agent 很容易忘記跑，或只在 debug 時才使用。要讓它真的成為收工證據，必須整合進 `finalize-agent-turn.js`。

第一版整合目標：

- 支援 `--validate-handoff`
- 支援 `--strict-handoff`
- 在 `--json` 輸出中附上 `handoffDiff` 區段

## INPUT_CONTRACT

- `validate-handoff-diff.js` 與 fixtures 已可獨立通過
- `finalize-agent-turn.js` 已有 artifact、budget、turnUsage 的整合輸出
- 第一版不讀 diff hunk，只依檔案對帳 verdict 決定 pass/warn/fail

## OUTPUT_CONTRACT

- [ ] `finalize-agent-turn.js` 新增 `--validate-handoff`
- [ ] `finalize-agent-turn.js` 新增 `--strict-handoff`
- [ ] JSON 輸出新增 `handoffDiff` 欄位
- [ ] strict mode handoff fail 時整體 finalize exit 1
- [ ] 不開 handoff 驗證時維持舊行為相容

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task handoff-smoke --goal "handoff integration smoke" --files package.json --emit-turn-artifact --validate-handoff --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/finalize-agent-turn.js
git checkout tools_node/lib/
```

## 執行步驟

1. 先將 handoff validator 包成 finalize 可呼叫的 helper，不直接把 CLI 邏輯塞進主檔。
2. `--validate-handoff` 只產生 verdict；`--strict-handoff` 才升級為 blocker。
3. JSON 輸出需保留 mismatch 細節與摘要，方便下一個 Agent 接手。
4. 確保未開啟 handoff 驗證時，不影響既有 finalize smoke route。
5. 完成後再由 Governance 卡決定哪些 workflow 必須強制帶此參數。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：HDO-0002 尚未交付；finalize 尚未整合 handoff validator。
- 需修改：將 --validate-handoff 與 verdict 輸出接入 finalize-agent-turn.js。
