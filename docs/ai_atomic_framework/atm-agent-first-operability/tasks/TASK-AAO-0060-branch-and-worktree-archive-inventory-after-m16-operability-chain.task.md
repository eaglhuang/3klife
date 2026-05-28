---
doc_id: doc_other_aao_0060
task_id: TASK-AAO-0060
title: "Branch and worktree archive inventory after M16 operability chain"
status: done
owner: atm-core
priority: P2
milestone: M16
depends_on:
  - "TASK-AAO-0059"
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: planning_repo
scopePaths: []
acceptance:
  - "提供一份完整的 local branches, worktrees 盤點清單與歸類建議"
  - "所有盤點分支與目錄依 Merged/Obsolete/High-risk/Review/Delete 進行分類"
deliverables:
  - "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0060-branch-and-worktree-archive-inventory-after-m16-operability-chain.task.md"
  - "docs/ai_atomic_framework/atm-agent-first-operability/reports/TASK-AAO-0060-branch-worktree-archive-inventory.md"
validators:
  - "git diff --check"
evidence:
  required: attestation
rollback:
  strategy: delete-card
  notes: "Delete the planning card."
atomizationImpact:
  ownerAtomOrMap: null
  mapUpdates: []
tags:
  - "planning-only"
  - "inventory"
---

# TASK-AAO-0060: Branch and worktree archive inventory after M16 operability chain

## 目的與背景 (Goal & Background)
在 M16 可操作性鏈結優化任務 (AAO-0046 ~ AAO-0059) 完成整合後，工作區累積了許多 local branches、git worktrees 以及獨立的 standalone clones 沙盒。
本任務旨在進行一次 planning-only 的資產盤點 (inventory)，將這些歷史分支與工作區目錄進行安全分類，以避免下一任指揮 AI 被舊分支、殘餘暫存檔或過時的 worktree 誤導。

## 盤點範疇與分類 (Scope & Classification Goal)
將所有相關分支與目錄分類歸納為：
- **已吸收，可封存** (Merged & Archivable)
- **舊草稿，不合併** (Obsolete draft, do not merge)
- **高風險沙盒，不合併** (High-risk sandbox, do not merge)
- **需另案 diff review** (Needs separate review)
- **可刪除候選** (Deletion candidates)

## 排除項目 (Out of Scope)
- **不刪除**任何實體 worktree / clone 目錄。
- **不進行** branch merge。
- **不進行** git revert。
- **不碰觸** `.atm/history` 中已產生之 evidence/ledger 殘餘紀錄。
- **不清理** `.playwright-mcp` 目錄。

## 驗收標準 (Acceptance Criteria)
- 提供一份完整的 local branches, worktrees 盤點清單與歸類建議。
- 所有盤點分支與目錄依 Merged/Obsolete/High-risk/Review/Delete 進行分類。

## 交付物 (Deliverables)
- docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0060-branch-and-worktree-archive-inventory-after-m16-operability-chain.task.md
- docs/ai_atomic_framework/atm-agent-first-operability/reports/TASK-AAO-0060-branch-worktree-archive-inventory.md
