---
doc_id: doc_task_0301
id: ATM-1.5-0003
priority: P0
phase: ATM-1.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: "2026-05-06T17:31:00.000Z"
started_by_agent: vs-code-github-copilot
completed_at: "2026-05-06T18:13:27.1736893+08:00"
type: governance
depends:
  - ATM-1.5-0002
notes: "2026-05-06 | 狀態: done | 驗證: npm run validate:seed-registry / npm run validate:cli / npm run validate:schemas / npm test / npm run typecheck / npm run lint pass | 變更: AI-Atomic-Framework upstream commit d90c2f6 將 seed hand-written source 標為 @deprecated、atomic-registry seed entry 升為 governed、CHANGELOG 新增 Phase B1 complete、atm status 在 framework repo root 顯示 B1-complete 與 governedBy ATM-CORE-0002 | 阻塞: none"
---
# [ATM-1.5-0003] ATM-CORE-0001 正式收編：舊 seed 標 @deprecated

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-1.5-0003 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | done |
| 完成度 | 100% |
| 完成時間 | 2026-05-06T18:13:27.1736893+08:00 |
| 關聯卡號 | [ATM-1.5-0001](ATM-1.5-0001.md)、[ATM-1.5-0002](ATM-1.5-0002.md)、[ATM-2-0001](ATM-2-0001.md) |

## 開單原因
Phase B1 收尾：ATM-CORE-0001（seed itself）正式進入 governed 狀態。舊的 hand-written seed code 標 @deprecated（保留但不再是唯一真相），ATM-CORE-0002 成為 seed 的 governed 繼承者。Phase B1 完成條件達成。

## 完整描述
- upstream: seed.js 中 hand-written 區塊標 // @deprecated since ATM-CORE-0002 governs this
- atomic-registry.json 中 ATM-CORE-0001 status: governed
- CHANGELOG 記錄 Phase B1 完成里程碑
- atm status 顯示 Phase B1 complete

## 如何驗證
1. atm verify --self 全綠（三段 hash）
1. atm status 輸出含 phase: B1-complete
1. seed.js 中 ATM-SEED 標記的 hand-written 區塊有 @deprecated 標注
1. neutrality scanner（若已就位）通過

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-1.5-0001](ATM-1.5-0001.md)
- [ATM-1.5-0002](ATM-1.5-0002.md)
- [ATM-2-0001](ATM-2-0001.md)

## 交付物
- upstream: seed.js 中 hand-written 區塊標 // @deprecated since ATM-CORE-0002 governs this
- atomic-registry.json 中 ATM-CORE-0001 status: governed
- CHANGELOG 記錄 Phase B1 完成里程碑
- atm status 顯示 Phase B1 complete

## 備註
- 屬 upstream AI-Atomic-Framework repo；完成後 Phase B2 Default Governance Bundle 開始
