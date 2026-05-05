---
doc_id: doc_task_0304
id: ATM-2.5-0002
priority: P0
phase: ATM-2.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: implementation
depends:
  - ATM-2.5-0001
notes: "此 fixture 用於 multi-agent 兼容測試（ATM-2.5-0003）；Claude Code 是主要測試 agent"
---
# [ATM-2.5-0002] Sandbox Repo Fixture：空白 repo 跑完整 Alpha Gate

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-2.5-0002 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-2.5-0001](ATM-2.5-0001.md)、[ATM-2.5-0003](ATM-2.5-0003.md) |

## 開單原因
建立可重複執行的 sandbox repo fixture：在一個空白 git repo 中安裝 atm-cli，讓 AI agent 只讀 README.md 與 AGENTS.md，自動完成 alpha gate 四條 criteria。此 fixture 是 multi-agent 兼容測試的底座。

## 完整描述
- upstream: tests/sandbox/setup.sh（初始化空 repo + 安裝 atm-cli）
- upstream: tests/sandbox/verify.sh（跑 atm self-host-alpha --verify --json）
- upstream: tests/sandbox/expected-output.json（全 true 基準）
- sandbox 跑完時間 < 60s
- CI workflow 中有 sandbox gate job

## 如何驗證
1. 在任意空目錄執行 setup.sh 後 verify.sh 返回全部 criteria true
1. expected-output.json diff = 0
1. sandbox setup.sh 不引用任何 3KLife/Cocos 資源
1. CI sandbox gate job 綠燈

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-2.5-0001](ATM-2.5-0001.md)
- [ATM-2.5-0003](ATM-2.5-0003.md)

## 交付物
- upstream: tests/sandbox/setup.sh（初始化空 repo + 安裝 atm-cli）
- upstream: tests/sandbox/verify.sh（跑 atm self-host-alpha --verify --json）
- upstream: tests/sandbox/expected-output.json（全 true 基準）
- sandbox 跑完時間 < 60s
- CI workflow 中有 sandbox gate job

## 備註
- 此 fixture 用於 multi-agent 兼容測試（ATM-2.5-0003）；Claude Code 是主要測試 agent
