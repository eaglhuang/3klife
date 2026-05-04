---
doc_id: doc_task_0021
id: HARN-HDO-0004
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: governance
chain_id: HARN-CHAIN-HANDOFF
chain_step: 4/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-HDO-0001
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 依 Harness 落地藍圖建立 Task Lock Scope Check 任務卡 | 阻塞: depends HARN-HDO-0001"
---

# [HARN-HDO-0004] 將 Task Lock Scope 納入 Handoff Validator

> **Harness rollout 開卡** — 補強「artifact.task 是否真對應這張鎖卡」
> **定位**：Phase 1 / Handoff evidence 第 4 步
> **前置依賴**：`HARN-HDO-0001` core validator 已可做檔案對帳

## 問題描述

單純比對 changed files 還不夠。若 artifact 聲稱處理的是 `task=A`，但實際鎖的是 `task=B`，交接仍然不可信，尤其在多 Agent 並行時更容易發生。

這張卡要把 handoff validator 再往前推一步：讀 task lock 或任務卡 frontmatter，確認 artifact.task、lock id、frontmatter id 三者是否一致。

## INPUT_CONTRACT

- `tools_node/task-lock.js` 已可查詢 lock 狀態
- `docs/agent-briefs/tasks/*.md` frontmatter 已有 `id` / `status` / `started_by_agent`
- handoff validator core 已能輸出 pass/warn/fail verdict

## OUTPUT_CONTRACT

- [ ] validator 支援讀取 task lock 資訊或 task card frontmatter
- [ ] 檢查 `artifact.task` 是否與 lock id / task frontmatter 一致
- [ ] 無鎖卡、鎖錯卡、frontmatter 不一致需產生明確 verdict
- [ ] strict mode 下 task scope mismatch 可升級為 fail
- [ ] mismatch 訊息需能指出是哪一層（artifact / lock / frontmatter）對不上

## VALIDATION_CMD

```bash
node tools_node/validate-handoff-diff.js --artifact scratch/pilot-turn-artifact.json --task-lock-dir docs/agent-briefs/tasks --strict
```

## ROLLBACK_HINT

```bash
git checkout tools_node/validate-handoff-diff.js
git checkout tools_node/task-lock.js
```

## 執行步驟

1. 第一版先只檢查 task id 一致性，不擴大到 owner/started_by_agent 細節。
2. 優先讀 lock 資訊；若 lock 缺失，再回退到任務卡 frontmatter 做弱驗證。
3. 對 `artifact.task` 為空、未提供 task、或 lock 不存在的情況明確分類。
4. 保留 warn/fail 的區分，避免 doc-only 或無卡 workflow 全部被卡死。
5. 完成後再交由 `HARN-GOV-0002` 決定哪些工作流必須強制 scope check。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：HDO-0001 尚未交付；task-lock scope 尚未納入 handoff validator。
- 需修改：先確認 task-lock.js 現況與 artifact.task 欄位，再新增 scope mismatch 檢查。
