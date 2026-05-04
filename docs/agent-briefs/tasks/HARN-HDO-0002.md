---
doc_id: doc_task_0019
id: HARN-HDO-0002
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: test-fixture
chain_id: HARN-CHAIN-HANDOFF
chain_step: 2/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0001
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 依 Harness 落地藍圖建立 Handoff Diff Fixture 任務卡 | 阻塞: depends HARN-HDO-0001"
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

- [ ] 建立 pass / warn / fail 三組 fixture
- [ ] fixture 覆蓋：漏檔、額外檔、untracked、merge conflict 降級
- [ ] 每組 fixture 需有預期 verdict 與摘要欄位
- [ ] 補一支最小 smoke/test entry，讓 validator regression 可重跑
- [ ] fixture 命名需可被後續 CI 或 compute gate 採用

## VALIDATION_CMD

```bash
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/pass-basic.json --strict
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/warn-extra-file.json
node tools_node/validate-handoff-diff.js --fixture tests/fixtures/handoff-diff/fail-merge-conflict.json --strict
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

- 審核結論：未達成（依賴未滿）
- 驗證證據：HDO-0001 尚未交付；未見 handoff diff fixtures。
- 需修改：建立 matched/missing/extra/dirty fixtures。
