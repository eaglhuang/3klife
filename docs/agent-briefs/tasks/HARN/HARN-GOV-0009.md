---
doc_id: doc_task_0243
id: HARN-GOV-0009
priority: P1
phase: M0
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-05T13:03:10+08:00
started_by_agent: GitHubCopilot
type: implementation
chain_id: HARN-CHAIN-DOCID-HARDEN
chain_step: 1/1
sensor_triggered_by: user-followup-doc-id-sync
depends: []
notes: "2026-05-05 | 狀態: done | 驗證: inject-doc-ids --dry-run（task/ai/agentskill backlog=0）、doc-id-registry --verify（119 -> 24 warnings）、check-encoding-touched、compute-gate quick pass | 變更: inject-doc-ids 支援同步既有 doc_id、category/path filter、mixed-EOL frontmatter 修正、清理 19 個高價值 skill/workflow/instruction 檔 + 95 個 task/ai/agentskill backlog | 殘留: 24 筆 warning 位於 index/other/spec/tech/server 類別，未納入本卡範圍"
---
# [HARN-GOV-0009] 同步 doc_id 注入並清理 duplicate warnings

> **Harness follow-up 開卡** — 把 registry 已確定的 doc_id 反向同步回文件，先消掉高價值文件的 missing/duplicate warning。
> **定位**：Phase G+3 / Registry hygiene
> **前置依賴**：HARN-GOV-0008 已完成 preserve-id rebuild 與 writer queue

## 問題描述

`inject-doc-ids.js` 原本只會補空白 doc_id，無法把既有錯配或重複的 doc_id 同步回 registry 真值，導致 `task / ai / agentskill` 類文件長期殘留 missing/duplicate warning。

## INPUT_CONTRACT

- sharded doc-id registry 已存在
- verify 仍有 138 筆 missing injected doc_id warning
- inject-doc-ids 目前只會補空白不會同步錯配

## OUTPUT_CONTRACT

- [x] 注入工具可依 registry 同步既有 doc_id
- [x] 先清 task cards / skills / workflows / instructions 等高價值 warning
- [x] verify warning 顯著下降

## VALIDATION_CMD

```bash
node tools_node/inject-doc-ids.js --dry-run --categories task,ai,agentskill
node tools_node/doc-id-registry.js --verify
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
```

## ROLLBACK_HINT

```bash
git checkout -- tools_node/inject-doc-ids.js .agents/skills/ .agents/workflows/ .github/instructions/ucuf-compliance.instructions.md docs/agent-briefs/tasks/ docs/tasks/ temp_doc_id_changed.txt
```

## 執行步驟

1. 補強 inject-doc-ids 同步邏輯
2. 先 dry-run 確認高價值目標
3. 正式回寫並驗證
4. 更新任務卡與解鎖

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-05*
