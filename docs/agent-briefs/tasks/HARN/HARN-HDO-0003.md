---
doc_id: doc_task_0020
id: HARN-HDO-0003
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T21:21:30.5400649+08:00
started_by_agent: GitHubCopilot
type: workflow-tooling
chain_id: HARN-CHAIN-HANDOFF
chain_step: 3/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0002
notes: "2026-05-04 | 狀態: done | 驗證: handoff fixture smoke pass(4 fixtures)；finalize --validate-handoff --json 已輸出 handoffDiff；finalize --strict-handoff 在 warn 情境下仍 exit 0；get_errors=0 | 變更: 新增 tools_node/lib/handoff-diff-core.js，共用於 validate-handoff-diff.js 與 finalize-agent-turn.js；finalize 新增 --validate-handoff / --strict-handoff 與 handoffDiff JSON 輸出 | 阻塞: none"
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

- [x] `finalize-agent-turn.js` 新增 `--validate-handoff`
- [x] `finalize-agent-turn.js` 新增 `--strict-handoff`
- [x] JSON 輸出新增 `handoffDiff` 欄位
- [x] strict mode handoff fail 時整體 finalize exit 1
- [x] 不開 handoff 驗證時維持舊行為相容

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task handoff-smoke --goal "handoff integration smoke" --files package.json --emit-turn-artifact --validate-handoff --json
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task handoff-smoke --goal "handoff integration smoke" --files package.json --emit-turn-artifact --validate-handoff --strict-handoff --json
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

- 審核結論：已達成
- 驗證證據：已新增 `tools_node/lib/handoff-diff-core.js` 供 `validate-handoff-diff.js` 與 `finalize-agent-turn.js` 共用；`finalize-agent-turn.js --validate-handoff --json` 會輸出 `handoffDiff` 區段，內容包含 summary 與 mismatch 細節；`--strict-handoff` 在目前 warn 情境下不會誤擋，而 merge-conflict fail taxonomy 已由 HDO-0002 fixture regression 證明。
- 需修改：下一步可進入 `HARN-HDO-0004`，把 task lock scope 納入 handoff validator，降低 unrelated dirty files 對 verdict 的噪音。
