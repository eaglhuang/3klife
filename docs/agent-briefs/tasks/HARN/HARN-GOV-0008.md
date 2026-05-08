---
doc_id: doc_task_0233
id: HARN-GOV-0008
priority: P1
phase: M0
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-05T12:31:25+08:00
started_by_agent: GitHubCopilot
type: implementation
chain_id: HARN-CHAIN-DOCID-HARDEN
chain_step: 1/1
sensor_triggered_by: user-followup-doc-id-hardening
depends: []
notes: "2026-05-05 | 狀態: done | 驗證: doc-id-registry --verify（無缺檔 error，僅既存未注入 warning）、resolve-doc-id doc_index_0012、reshard-current、assign docs/keep.summary.md、check-encoding-touched | 變更: doc-id writer queue/lock、preserve-existing-id rebuild、doc_index_0012 修正、guard 文件補 auto-parts 規則 | 殘留: compute-gate standard 被既有 dirty worktree 的 task-scope noise 阻擋"
---
# [HARN-GOV-0008] 強化 doc-id-registry 併發分配與 preserve-id rebuild

> **Harness rollout 開卡** — 把 doc-id assign 變成可併發但不重號的 queue/lock workflow，順便清掉既有 registry 錯配與 rebuild 重排風險。
> **定位**：Phase G+2 / Governance follow-up
> **前置依賴**：無

## 問題描述

為 doc-id 分配加入嚴謹排隊/寫回後放行機制，修正既有錯配與缺檔，並讓全量重掃維持既有 doc_id 不重排。

## INPUT_CONTRACT

- doc-id-registry 已 shard 化
- consumer 已改走 loader
- 現有 full rebuild 仍可能重排 doc_id
- assign 尚未具嚴謹併發序列化

## OUTPUT_CONTRACT

- [x] assign 具 queue/lock 與 write-before-release 保證
- [x] doc_index_0012/缺檔錯配清理完成
- [x] full rebuild preserve-existing-id
- [x] guard 文件補入 auto-parts 優先讀取

## VALIDATION_CMD

```bash
node tools_node/doc-id-registry.js --verify
node tools_node/resolve-doc-id.js doc_index_0012
node tools_node/shard-manager.js validate docs/doc-id-registry-shards
node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop
```

## ROLLBACK_HINT

```bash
git checkout tools_node/doc-id-registry.js tools_node/lib/doc-id-registry-loader.js tools_node/lib/doc-id-registry-queue.js docs/doc-id-registry.json docs/doc-id-registry.md docs/doc-id-registry-shards/.shardrc.json docs/doc-id-registry-shards/registry-index.json docs/doc-id-registry-shards/registry-other.json docs/keep.summary.md .github/instructions/token-guard.instructions.md docs/agent-context-budget.md .github/instructions/docs-guard.instructions.md
```

## 執行步驟

1. 鎖卡與界定範圍
2. 實作 assign queue/lock 與 atomic write
3. 讓 full rebuild preserve existing ids
4. 修 doc_index_0012 與缺檔
5. 補 guard 文件與驗證

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-05*
