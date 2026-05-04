---
doc_id: doc_task_0018
id: HARN-HDO-0001
priority: P0
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: handoff-validation
chain_id: HARN-CHAIN-HANDOFF
chain_step: 1/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0002
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 依 Harness 落地藍圖建立 Handoff Diff Validator Core 任務卡 | 阻塞: depends HARN-ART-0002"
---

# [HARN-HDO-0001] 建立 Handoff Diff Validator Core

> **Harness rollout 開卡** — 直接對應「交接說了什麼是否符合事實」問題
> **定位**：Phase 1 / Handoff evidence 第 1 步
> **前置依賴**：`HARN-ART-0002` validator 已可確認 artifact 格式正確

## 問題描述

目前 handoff 主要靠 Agent 文字敘述。即使摘要寫得完整，仍有三個常見風險：

- handoff 宣稱修改 A/B 檔，但實際 changed files 不一致
- 有額外 dirty file 未被提及，下一位 Agent 會誤判範圍
- staged / unstaged / untracked 狀態沒有對帳，交接可信度不足

這張卡的任務是建立第一版 `validate-handoff-diff.js`，先做「artifact files vs git status」的確定性核對。

## INPUT_CONTRACT

- turn artifact validator 可保證 artifact 基本合法
- repo 有可讀取的 git status 資訊
- 第一版只檢查檔案層級，不讀完整 diff hunk

## OUTPUT_CONTRACT

- [ ] 新增 `tools_node/validate-handoff-diff.js`
- [ ] 支援讀取 artifact 內 `files[*].path` 與 git changed files 做對帳
- [ ] 至少區分 `pass / warn / fail` 三種結果
- [ ] 輸出需列出 `missingInArtifact`、`extraInArtifact`、`dirtyButUnreported` 類型摘要
- [ ] strict 模式下 fail 需回傳 exit code = 1

## VALIDATION_CMD

```bash
node tools_node/validate-handoff-diff.js --artifact scratch/pilot-turn-artifact.json --repository . --strict
```

## ROLLBACK_HINT

```bash
git checkout tools_node/validate-handoff-diff.js
```

## 執行步驟

1. 先限制範圍在檔案清單，不在第一版解析 diff 內容。
2. 將 git status 正規化成可比較的 repo-relative path。
3. 先定義 mismatch taxonomy，讓後續 fixture 與 finalize integration 可共用。
4. 對沒有 artifact、artifact 非法、repo 非 git 的情況，明確回傳 fail 或 blocked 訊號。
5. 錯誤訊息需可直接被下一輪 Agent 消費，不只丟 raw JSON。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：ART-0002 尚未交付；未見 handoff diff validator core。
- 需修改：等 artifact validator 後建立 changed-files / expected-files handoff diff core。
