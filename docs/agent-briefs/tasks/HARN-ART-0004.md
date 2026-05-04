---
doc_id: doc_task_0009
id: HARN-ART-0004
priority: P1
phase: Phase1
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: workflow-tooling
chain_id: HARN-CHAIN-ARTIFACT
chain_step: 4/4
sensor_triggered_by: harness-rollout planning
depends:
  - HARN-ART-0003
notes: "2026-05-04 | 狀態: open | 驗證: pending | 變更: GitHubCopilot 依 Harness 落地藍圖建立 Finalize Artifact Defaults 任務卡 | 阻塞: depends HARN-ART-0003"
---

# [HARN-ART-0004] 讓 Finalize 使用標準 Artifact 預設路徑

> **Harness rollout 開卡** — 由 Artifact Storage Policy 接續開立
> **定位**：Phase 1 / Artifact contract 第 4 步
> **前置依賴**：`HARN-ART-0003` 已定義正式存放規則

## 問題描述

即使已有 schema、validator 與 storage policy，如果每次正式 workflow 還要手填 `--artifact-file`，artifact 仍然很容易漏產生、寫錯目錄，或各 workflow 採用不同習慣。

這張卡要解決的是「預設就做對」：讓 `finalize-agent-turn.js` 在正式 workflow 下自動採用標準 path，只在特殊情境才覆蓋。

## INPUT_CONTRACT

- `HARN-ART-0003` 已定義正式 artifact path 與 scratch 邊界
- `finalize-agent-turn.js` 已能輸出 turn artifact
- validator CLI 已能驗證產出的 artifact

## OUTPUT_CONTRACT

- [ ] `finalize-agent-turn.js` 在正式 workflow 下可自動計算標準 artifact path
- [ ] 保留手動覆蓋 `--artifact-file` 的能力，但預設不再依賴人工輸入
- [ ] 能明確區分 formal path 與 scratch/debug path
- [ ] CLI 輸出需回報實際寫入位置，供下一層工具引用
- [ ] 預設路徑行為需與 validator/storage policy 相容

## VALIDATION_CMD

```bash
node tools_node/finalize-agent-turn.js --workflow harness-upgrade --task artifact-defaults-smoke --goal "artifact default path smoke" --files package.json --emit-turn-artifact --json
```

## ROLLBACK_HINT

```bash
git checkout tools_node/finalize-agent-turn.js
git checkout tools_node/lib/
```

## 執行步驟

1. 先把 path 計算邏輯集中到 helper，不要散在 CLI parsing 區塊。
2. 區分 debug/scratch 與 formal workflow，避免所有情境都硬寫正式 artifact。
3. CLI summary 必須回報實際寫入 path，讓 handoff validator 與 metrics 工具可以串接。
4. 對未提供 `workflow/task` 的情況定義 fail-fast 或 fallback 規則，不允許靜默寫到模糊路徑。
5. 交付後再由 Governance 卡決定哪些 workflow 必須強制開啟 artifact。

---
*由 Harness rollout planning 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：未達成（依賴未滿）
- 驗證證據：storage policy 尚未確立；finalize artifact defaults 不能視為完成。
- 需修改：等 ART-0003 完成後讓 finalize-agent-turn.js 使用標準 artifact path。
