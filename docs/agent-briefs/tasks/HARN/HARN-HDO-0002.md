---
doc_id: doc_task_0019
id: HARN-HDO-0002
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T21:16:51.3592401+08:00
started_by_agent: GitHubCopilot
type: test-fixture
chain_id: HARN-CHAIN-HANDOFF
chain_step: 2/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0001
notes: "2026-05-04 | 狀態: done | 驗證: pass-basic strict pass；warn-extra-file non-strict pass；fail-merge-conflict strict pass；test-handoff-diff-fixtures smoke pass(4 fixtures)；get_errors=0 | 變更: 新增 tests/fixtures/handoff-diff/* fixtures、tools_node/test-handoff-diff-fixtures.js，並擴充 validate-handoff-diff.js 支援 --fixture、自驗預期 verdict 與 merge-conflict fail taxonomy | 阻塞: none"
---

# [HARN-HDO-0002] 建立 Handoff Diff Validator Fixtures

> **Harness rollout 開卡** — 為 handoff 對帳提供穩定回歸樣本
> **定位**：Phase 1 / Handoff evidence 第 2 步
> **前置依賴**：`HARN-HDO-0001` core validator 已存在

## 問題描述

handoff validator 若沒有 fixture，很容易在之後擴功能時把分類規則改壞，尤其是 `warn` 與 `fail` 的邊界。第一版至少要有三組 fixture：

- 完全一致的 pass case
- artifact 少報或多報的 warn case
- 嚴重 mismatch 或 merge conflict 的 fail case

這樣後續 finalize integration 才不會每次只能拿真實 repo 做手工 smoke。

## INPUT_CONTRACT

- `validate-handoff-diff.js` 已能讀 artifact 與 changed files
- mismatch taxonomy 已初步定義
- fixture 可使用 mock git status 輸入，不必依賴真實 repo 狀態

## OUTPUT_CONTRACT

- [x] 建立 pass / warn / fail 三組 fixture
- [x] fixture 覆蓋：漏檔、額外檔、untracked、merge conflict 降級
- [x] 每組 fixture 需有預期 verdict 與摘要欄位
- [x] 補一支最小 smoke/test entry，讓 validator regression 可重跑
- [x] fixture 命名需可被後續 CI 或 compute gate 採用

## VALIDATION_CMD

```bash
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/pass-basic.json --strict
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/warn-extra-file.json
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/fail-merge-conflict.json --strict
node tools_node/test-handoff-diff-fixtures.js
```

## ROLLBACK_HINT

```bash
git checkout tests/fixtures/handoff-diff/
git checkout tools_node/validate-handoff-diff.js
```

## 執行步驟

1. 先把 mismatch taxonomy 對應到 fixture case name，避免之後測試與邏輯分家。
2. fixture 要包含最小 artifact input、mock changed files 與預期 verdict。
3. 明確測試 merge conflict 不得被誤判為 pass。
4. strict 與 non-strict 兩種模式都要有對應案例。
5. 交付後讓 `HARN-HDO-0003` 可直接把這些 fixture 接進 finalize smoke。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：已新增 `tests/fixtures/handoff-diff/pass-basic.json`、`warn-extra-file.json`、`warn-missing-untracked.json`、`fail-merge-conflict.json`，並補 `tools_node/test-handoff-diff-fixtures.js`；`validate-handoff-diff.js --fixture ...` 可自驗預期 verdict/summary，pass/warn/fail 三條路徑都已固定化；merge conflict 現在會被分類為 fail。
- 需修改：下一步可進入 `HARN-HDO-0003`，把目前 fixture verdict 接到 `finalize-agent-turn.js` 的 `--validate-handoff` / `--strict-handoff`。
