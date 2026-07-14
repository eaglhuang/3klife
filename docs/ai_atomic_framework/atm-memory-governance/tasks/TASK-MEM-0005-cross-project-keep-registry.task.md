---
task_id: TASK-MEM-0005
title: "跨專案 keep registry 與 orient 導流"
status: planned
owner: atm-core
priority: P2
milestone: MEM-M3
depends_on:
  - "TASK-MEM-0001"
related_plan: docs/ai_atomic_framework/atm-memory-governance/ATM 跨專案記憶治理計畫書.md
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/keep.registry.md"
  - "docs/keep.summary.md"
deliverables:
  - "docs/keep.registry.md"
validators:
  - "git diff --check"
  - "node tools_node/check-encoding-integrity.js --staged"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "registry 是新增檔；revert 後各 repo keep 各自獨立運作如現狀。"
atomizationImpact:
  ownerAtomOrMap: "3klife.docs-keep"
---

# TASK-MEM-0005 跨專案 keep registry

計畫書 Milestone 3。`docs/keep.registry.md`（住 3KLife——planning 協調中樞）：

- 每個參與 repo 一列：repo 名、本機路徑、keep 入口（summary 或等價物）、
  keep-memory 目錄、語言（繁中 / 英文）、負責 lane 前綴。
- 首批登錄：`3KLife`、`AI-Atomic-Framework`、`3klife-npc-brain`（其餘 adopter
  repo 隨 internal-release sync 名單逐步補）。
- AAF 端注意 INV-ATM-006/007：AAF 的 keep-memory 等價物必須英文、
  repository-neutral、只收框架操作教訓，不收 adopter 專案內容。
- 明載反規則：registry 只做導流，**不**把各 repo 記憶集中複製成大倉
  （避免第二真相來源）。

`atm-orient` 模板的 registry 導流步驟屬 TASK-MEM-0004 已含的 orient 修改面；
本卡若先行，orient 端以 depends_on 順序協調，不重複改同一模板。

## 驗收

- registry 檔落地、三個首批 repo 條目正確可達（路徑實測存在）。
- `keep.summary.md` P0 段補一行指向 registry（跨 repo 工作前先查）。
- 中文內容過 encoding 檢查。
