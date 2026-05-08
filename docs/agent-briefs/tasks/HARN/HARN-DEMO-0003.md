---
doc_id: doc_task_0010
id: HARN-DEMO-0003
priority: P1
phase: Phase3
created: 2026-05-04
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-04T18:29:52+08:00
started_by_agent: GitHubCopilot
type: template-update
chain_id: HARN-CHAIN-DEMO
chain_step: 2/2
sensor_triggered_by: harness-rollout-planning
depends:
  - HARN-GOV-0003
notes: "2026-05-04 | 狀態: done | 驗證: task-card-opener write+assign-doc-id 產生 scratch/harn-demo-0003-generated.md；doc_id=doc_other_0026；encoding ok；get_errors=0 | 變更: VALIDATION_CMD 改為真實可執行 write 指令，HARNESS_EVIDENCE 改指真實 artifact，明示 task-card-opener 目前不產生 trace artifact | 阻塞: none"
---
# [HARN-DEMO-0003] Harness opener 實寫驗證

> **Harness rollout 開卡** — 驗證 task-card-opener 的 HARN rich brief 寫檔與 doc_id 分配
> **定位**：Phase3 / Tooling validation
> **前置依賴**：HARN-GOV-0003 已完成

## 問題描述

驗證新版 task-card-opener 能否在 HARN-* 任務上自動輸出 rich brief、補 started 欄位，並於 write 模式自動分配正式 doc_id。

## INPUT_CONTRACT

- agent-briefs 模式可自動切 harn-rich
- write 模式可同步 assign-doc-id

## OUTPUT_CONTRACT

- [x] 產生 HARN rich brief markdown
- [x] 前端 doc_id 成功寫入

## HARNESS_EVIDENCE

- artifact path：`scratch/harn-demo-0003-generated.md`
- validation evidence：`node tools_node/task-card-opener.js --id HARN-DEMO-SCRATCH-0001 --title "Harness opener scratch 驗證" --status in-progress --md-kind agent-briefs --md-out scratch/harn-demo-0003-generated.md --write --assign-doc-id` exit 0，markdown 寫入成功，doc_id 已注入 `doc_other_0026`
- handoff diff status：n/a（單檔 opener 實寫驗證，無 handoff diff）
- trace summary / path：n/a（task-card-opener 目前不產生 trace artifact）
- metrics summary：doc_id assigned = `doc_other_0026`

## VALIDATION_CMD

```bash
node tools_node/task-card-opener.js --id HARN-DEMO-SCRATCH-0001 --title "Harness opener scratch 驗證" --status in-progress --md-kind agent-briefs --md-out scratch/harn-demo-0003-generated.md --write --assign-doc-id
node tools_node/check-encoding-integrity.js --files scratch/harn-demo-0003-generated.md
```

## ROLLBACK_HINT

```bash
git checkout docs/agent-briefs/tasks/HARN/HARN-DEMO-0003.md
git clean -f scratch/harn-demo-0003-generated.md
```

## 執行步驟

1. 建立卡片
2. 驗證 doc_id
3. 跑編碼檢查

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-04*

## 審核結果（2026-05-04）

- 審核結論：已達成
- 驗證證據：`scratch/harn-demo-0003-generated.md` 已由 task-card-opener write 模式實寫成功，且 `--assign-doc-id` 已注入 `doc_other_0026`；encoding integrity 檢查通過。
- 需修改：無；若後續要納入 trace，需另開 task 補 task-card-opener trace emission，而非在本卡再留假路徑。
