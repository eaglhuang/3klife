---
task_id: TASK-MEM-0006
title: "記憶過期與索引預算巡邏（advisory）"
status: done
owner: atm-core
priority: P3
milestone: MEM-M4
depends_on:
  - "TASK-MEM-0002"
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "tools_node/memory-manager.js"
  - "tools_node/tests/memory-manager.test.js"
  - "docs/keep-memory/README.md"
deliverables:
  - "tools_node/memory-manager.js"
  - "docs/keep-memory/README.md"
validators:
  - "git diff --check"
  - "node tools_node/tests/memory-manager.test.js"
  - "node tools_node/memory-manager.js patrol docs/keep-memory"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "patrol 子命令為 advisory 新增；revert 後 validate/rebuild-index/stale-report 不受影響。"
atomizationImpact:
  ownerAtomOrMap: "3klife.tools-node"
  extractionCandidates:
    - atom: "3klife.memory-manager"
      pattern: "inline"
      source: "tools_node/memory-manager.js"
      disposition: "inline"
      inlineReason: "patrol 是 memory-manager 既有三子命令的聚合報告面，同屬單一工具原子（TASK-MEM-0002 建立），不構成新邊界。"
completed_at: "2026-07-14T16:18:25.603Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-14T16:18:25.603Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-14T16-18-25-603Z-close-6c0e162cf445"
lastTransitionAt: "2026-07-14T16:18:25.603Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b6297b4e328efe38ebd0f21da3d0b53b5b0bbeb5"
---

# TASK-MEM-0006 過期與預算巡邏

計畫書 Milestone 4。在 memory-manager（TASK-MEM-0002 交付）加 `patrol` 子命令，
聚合成 Captain 例行巡邏一鍵報告（**全程 advisory，不阻擋任何流程**）：

1. stale：`stale-report` 結果（status 型 >30 天、gotcha 型 >180 天的 active 記憶）。
2. budget：`keep.summary.md` 記憶索引段落行數 vs 預算（門檻寫在
   `docs/keep-memory/README.md` 契約，預設 30 行）；超標即建議跑
   `atm-memory-consolidate`。
3. orphan：keep-memory 檔案存在但索引缺行、或索引有行但檔案不存在。
4. 仿 Claude Code 的過期提醒語意：報告對每則過期記憶附一句
   「point-in-time observation, verify before asserting」提示文字，
   供代理引用時自我警覺。

## 驗收

- `patrol` 對真實目錄輸出四節報告；orphan 與 budget 對造假夾具正確判紅。
- 回歸測試覆蓋 patrol 聚合路徑。
- `docs/keep-memory/README.md` 補「巡邏節奏」一節（建議每週或每次大型收口後
  跑一次 patrol；連續兩次超標必跑 consolidate）。
