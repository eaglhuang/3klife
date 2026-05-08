---
doc_id: doc_task_0299
id: ATM-1.5-0001
priority: P0
phase: ATM-1.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: "2026-05-06T16:48:41+08:00"
started_by_agent: vs-code-github-copilot
completed_at: "2026-05-06T17:03:32.1926363+08:00"
type: implementation
depends:
  - ATM-1-0006
  - ATM-1-0007
notes: "2026-05-06 | 狀態: done | 驗證: npm run validate:seed-spec / npm run validate:cli / npm test / npm run typecheck / npm run lint pass | 變更: AI-Atomic-Framework upstream commit ad5f091 新增 packages/core/seed.js、specs/atom-seed-spec.json、CLI `spec --validate` 與 AJV schema validator；legacy planning ID ATM-CORE-0001 以 seed metadata 映射保留，現行 spec id 採 `atom.core-seed` 以符合既有 atomic-spec schema | 阻塞: none"
---
# [ATM-1.5-0001] Seed-as-Spec：種子以自身格式自我描述

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-1.5-0001 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-1.5-0002](ATM-1.5-0002.md)、[ATM-2-0012](ATM-2-0012.md) |

## 開單原因
Phase B1 起點：將 Phase B0 手寫的 ~300 LOC seed（packages/core/seed.js）用自身的 spec 格式描述自己，產生 atom-seed-spec.json。此步驟是自舉悖論化解的關鍵——種子第一次用自己的治理語言定義自己。

## 完整描述
- upstream: AI-Atomic-Framework/specs/atom-seed-spec.json（使用 Atomic Spec schema 描述 seed 本身）
- spec 必填欄位：atmSchemaVersion、id: ATM-CORE-0001、inputSchema、outputSchema、dependencyPolicy、hashLock（空值占位）
- spec 通過 atm spec --validate 驗證（AJV）

## 如何驗證
1. atm spec --validate specs/atom-seed-spec.json 返回 exit 0
1. spec 中 id = ATM-CORE-0001 且 atmSchemaVersion 已填
1. spec 不含任何 3KLife/Cocos/html-to-ucuf 詞彙

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-1.5-0002](ATM-1.5-0002.md)
- [ATM-2-0012](ATM-2-0012.md)

## 交付物
- upstream: AI-Atomic-Framework/specs/atom-seed-spec.json（使用 Atomic Spec schema 描述 seed 本身）
- spec 必填欄位：atmSchemaVersion、id: ATM-CORE-0001、inputSchema、outputSchema、dependencyPolicy、hashLock（空值占位）
- spec 通過 atm spec --validate 驗證（AJV）

## 備註
- 屬 upstream AI-Atomic-Framework repo，不改動 3KLife 任何檔案
