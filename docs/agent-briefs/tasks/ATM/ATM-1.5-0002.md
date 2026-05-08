---
doc_id: doc_task_0300
id: ATM-1.5-0002
priority: P0
phase: ATM-1.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: "2026-05-06T09:15:48.254Z"
started_by_agent: vs-code-github-copilot
completed_at: "2026-05-06T17:24:55.4854274+08:00"
type: implementation
depends:
  - ATM-1.5-0001
notes: "2026-05-06 | 狀態: done | 驗證: npm run validate:seed-registry / npm run validate:cli / npm run validate:schemas / npm test / npm run typecheck / npm run lint pass | 變更: AI-Atomic-Framework upstream commit d3ac9cf 新增 atomic-registry.json、CLI `verify --self`、registry selfVerification schema 與 drift 檢查；legacy planning ID ATM-CORE-0001 仍以 registry selfVerification metadata 保留，現行 atomId 維持 `atom.core-seed` | 阻塞: none"
---
# [ATM-1.5-0002] Seed 自我驗證：產生第一份 atomic-registry.json

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-1.5-0002 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-1.5-0001](ATM-1.5-0001.md)、[ATM-1.5-0003](ATM-1.5-0003.md) |

## 開單原因
Phase B1 第二步：seed 用自身 spec（atom-seed-spec.json）跑 self-validation（hash-lock 三段計算），產生第一份正式 atomic-registry.json，其中 ATM-CORE-0001 = seed itself，specHash/codeHash/testHash 全部計算填入。

## 完整描述
- upstream: atomic-registry.json 內含 ATM-CORE-0001 條目（含三段 hash）
- atm verify --self 返回 exit 0（三段 hash 一致）
- registry schema 通過 AJV 驗證

## 如何驗證
1. atm verify --self 輸出 {ATM-CORE-0001: {specHash: ok
1. codeHash: ok
1. testHash: ok}}
1. atomic-registry.json 格式通過 registry.schema.json AJV validate
1. 手動修改 seed.js 一行後重跑 atm verify --self 必偵測到 codeHash drift

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-1.5-0001](ATM-1.5-0001.md)
- [ATM-1.5-0003](ATM-1.5-0003.md)

## 交付物
- upstream: atomic-registry.json 內含 ATM-CORE-0001 條目（含三段 hash）
- atm verify --self 返回 exit 0（三段 hash 一致）
- registry schema 通過 AJV 驗證

## 備註
- 屬 upstream AI-Atomic-Framework repo
