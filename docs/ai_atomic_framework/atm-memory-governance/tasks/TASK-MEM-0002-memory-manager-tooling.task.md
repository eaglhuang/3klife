---
task_id: TASK-MEM-0002
title: "memory-manager 工具：契約驗證、索引重建、過期報告"
status: done
owner: atm-core
priority: P1
milestone: MEM-M1
depends_on:
  - "TASK-MEM-0001"
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "tools_node/memory-manager.js"
  - "tools_node/tests/memory-manager.test.js"
  - "docs/keep.summary.md"
deliverables:
  - "tools_node/memory-manager.js"
  - "tools_node/tests/memory-manager.test.js"
validators:
  - "git diff --check"
  - "node tools_node/tests/memory-manager.test.js"
  - "node tools_node/memory-manager.js validate docs/keep-memory"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "獨立新工具檔；revert 後 keep-memory 目錄仍可手動維護。"
atomizationImpact:
  ownerAtomOrMap: "3klife.tools-node"
  extractionCandidates:
    - atom: "3klife.memory-manager"
      pattern: "Facade"
      source: "tools_node/memory-manager.js"
      disposition: "extract"
      inlineReason: null
completed_at: "2026-07-14T10:30:30.885Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-14T10:30:30.885Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T10-55-27-759Z-close-644bac597d12"
lastTransitionAt: "2026-07-14T10:30:30.885Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ddc6e95135a4d6d45a08f4c1e840445ded952bfc"
---

# TASK-MEM-0002 memory-manager 工具

計畫書 Milestone 1。**獨立新檔** `tools_node/memory-manager.js`——明確不塞進
`tools_node/shard-manager.js`（826 行，extraction-first：新能力開新原子，
shard-manager 維持分片職責不擴權）。三個子命令：

1. `validate <dir>`：逐檔驗 frontmatter 契約（欄位齊全、type 合法、updated 為
   絕對日期、name 唯一）；壞檔列明原因，exit code 非零。
2. `rebuild-index <dir>`：重建 `docs/keep.summary.md` 的 keep-memory 索引段落
   （一行一則：`- [name](路徑) — description`），只改該段落標記之間的內容，
   不碰 summary 其他章節。
3. `stale-report <dir>`：列出 `status=active` 且 `updated` 超過門檻（預設
   status 型 30 天、gotcha 型 180 天）的記憶，advisory 輸出，不改檔。

## 驗收

- 三個子命令對 `docs/keep-memory/` 實際目錄可用。
- 最小回歸測試：壞 frontmatter → validate 紅；合法目錄 → validate 綠；
  rebuild-index 冪等（跑兩次無 diff）；stale-report 對造假日期檔案正確分類。
- rebuild-index 產物通過 encoding 檢查，summary 段落標記外零 diff。
