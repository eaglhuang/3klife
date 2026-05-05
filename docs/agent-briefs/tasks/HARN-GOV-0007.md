---
doc_id: doc_task_0232
id: HARN-GOV-0007
priority: P1
phase: M0
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-05T12:08:03+08:00
started_by_agent: GitHubCopilot
completed_at: 2026-05-05T12:36:00+08:00
completed_by_agent: GitHubCopilot
type: implementation
chain_id: HARN-CHAIN-DOCID-SHARD
chain_step: 1/1
sensor_triggered_by: user-request-doc-id-registry-sharding
depends: []
notes: "2026-05-05 | 狀態: done | 驗證: shard-manager validate PASS；resolve-doc-id 走 sharded loader PASS；quick gate PASS；encoding PASS；doc-id-registry --verify 仍有既有缺檔/未注入 warning | 變更: doc-id-registry 改為 thin stub + category shards + auto-parts，新增共用 loader 並切換 consumer 腳本，keep/token guard 補充 shard 入口 | 阻塞: 既有 registry 資料仍含 doc_other_0007/doc_other_0008 缺檔與 doc_index_0012 錯配"
---
# [HARN-GOV-0007] 將 doc-id-registry.json 納入 shard 管理

> **Harness rollout 開卡** — 把 doc-id registry 從單一大 JSON 收斂成 category shards 與 thin index stub，避免 token 爆量並維持工具相容性。
> **定位**：Phase G+2 / Governance
> **前置依賴**：無

## 問題描述

把過大的 docs/doc-id-registry.json 改成由 shard-manager 管理的分片群，並提供共用 loader 給既有工具讀取。

## INPUT_CONTRACT

- docs/doc-id-registry.json 已過大
- shard-manager 為既有通用能力
- 多支 tools_node 腳本直讀 registry

## OUTPUT_CONTRACT

- [x] 新增 doc-id-registry shard group
- [x] 既有工具改走共用 loader
- [x] doc-id-registry.js 寫入流程改用 shard-manager

## HARNESS_EVIDENCE

- `node tools_node/doc-id-registry.js --reshard-current`：PASS，產生 `docs/doc-id-registry-shards/` 與 thin stub
- `node tools_node/shard-manager.js validate docs/doc-id-registry-shards`：PASS；`registry-spec` / `registry-task` 已有 auto-parts coverage
- `node tools_node/resolve-doc-id.js doc_index_0012`：loader 可讀 sharded registry；回傳錯配為既有資料問題
- `node tools_node/compute-gate.js --profile quick --agent-feedback --no-stop`：PASS
- `node tools_node/check-encoding-touched.js --files ...`：PASS
- `git show HEAD:docs/doc-id-registry.json | Select-String -Pattern 'doc_index_0012' -Context 0,4`：確認 `doc_index_0012` 錯配存在於本輪前

## VALIDATION_CMD

```bash
node tools_node/doc-id-registry.js --verify
node tools_node/resolve-doc-id.js doc_index_0012
node tools_node/shard-manager.js validate docs/doc-id-registry-shards
node tools_node/compute-gate.js --profile standard --agent-feedback
```

## ROLLBACK_HINT

```bash
git checkout tools_node/doc-id-registry.js tools_node/resolve-doc-id.js tools_node/rebuild-crossref.js tools_node/inject-doc-ids.js tools_node/audit-md-references.js tools_node/update-md-references.js tools_node/validate-consolidation-links.js tools_node/fix-consolidation-targetspec-aliases.js tools_node/consolidation-doubt-mcq.js tools_node/task-decomposer.js docs/doc-id-registry.json docs/doc-id-registry.md docs/keep.summary.md .github/instructions/token-guard.instructions.md
```

## 執行步驟

1. 建立任務卡與 scope 鎖定
2. 新增共用 loader 與 registry shards 設定
3. 改寫 doc-id-registry.js 走 shard-manager
4. 補 consumer 相容層與驗證

*由 GitHubCopilot 透過 task-card-opener 開立 | 2026-05-05*
