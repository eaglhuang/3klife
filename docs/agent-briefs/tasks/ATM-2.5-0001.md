---
doc_id: doc_task_0303
id: ATM-2.5-0001
priority: P0
phase: ATM-2.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: implementation
depends:
  - ATM-2-0013
  - ATM-2-0012
  - ATM-2-0004
  - ATM-2-0005
notes: "此命令是 Phase B3 唯一 acceptance gate；3KLife → Phase C（adapter）的前置解鎖條件"
---
# [ATM-2.5-0001] Self-Hosting Alpha Gate：atm self-host-alpha --verify CLI

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-2.5-0001 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-2.5-0002](ATM-2.5-0002.md)、[ATM-2.5-0003](ATM-2.5-0003.md) |

## 開單原因
Phase B3 核心：實作 atm self-host-alpha --verify --json 命令，機器可驗地判定 ATM 是否完成自舉。4 條 boolean criteria 必須全部為 true：(1) AI 讀 README/AGENTS/profile 完成 init/adopt；(2) 建第一張 task + 鎖 scope + 寫 artifact；(3) hello-world atom smoke validation；(4) 全程不依賴 3KLife/Cocos/html-to-ucuf。

## 完整描述
- upstream: packages/cli/commands/self-host-alpha.js 實作
- atm self-host-alpha --verify --json 輸出 {criteria1:bool
- criteria2:bool
- criteria3:bool
- criteria4:bool}
- criteria1: atm init --adopt --dry-run --json exit 0 且含 adoptedAt
- criteria2: 三 cmd 鏈 task create/lock/artifact 各有對應目錄產出
- criteria3: atm test --atom hello-world 5/5 PASS
- criteria4: atm verify --neutrality exit 0

## 如何驗證
1. atm self-host-alpha --verify --json 在通過的 upstream repo 輸出全部 true
1. 手動製造任一 criteria 失敗，對應 boolean 變 false
1. exit code 0 = 全過，exit code 1 = 至少一個 false

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-2.5-0002](ATM-2.5-0002.md)
- [ATM-2.5-0003](ATM-2.5-0003.md)

## 交付物
- upstream: packages/cli/commands/self-host-alpha.js 實作
- atm self-host-alpha --verify --json 輸出 {criteria1:bool
- criteria2:bool
- criteria3:bool
- criteria4:bool}
- criteria1: atm init --adopt --dry-run --json exit 0 且含 adoptedAt
- criteria2: 三 cmd 鏈 task create/lock/artifact 各有對應目錄產出
- criteria3: atm test --atom hello-world 5/5 PASS
- criteria4: atm verify --neutrality exit 0

## 備註
- 此命令是 Phase B3 唯一 acceptance gate；3KLife → Phase C（adapter）的前置解鎖條件
