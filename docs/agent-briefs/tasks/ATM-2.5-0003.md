---
doc_id: doc_task_0305
id: ATM-2.5-0003
priority: P0
phase: ATM-2.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: verification
depends:
  - ATM-2.5-0001
  - ATM-2.5-0002
notes: "此卡是 ATM 0.1.0 alpha release 的最終 acceptance gate；Claude Code Sonnet 4.6 / Opus 4.7 皆測"
---
# [ATM-2.5-0003] Multi-Agent 兼容性驗證：5 種 AI Agent Alpha Gate 測試

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-2.5-0003 |
| 優先級 | P0 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-2.5-0001](ATM-2.5-0001.md)、[ATM-2.5-0002](ATM-2.5-0002.md)、[ATM-2-0012](ATM-2-0012.md) |

## 開單原因
依 multi-agent-compatibility-matrix.md 執行 5 種 AI agent 的 alpha gate 測試，確認 ATM 真正做到 agent-neutral。Claude Code 必須通過；至少 3/5 通過才能釋出 ATM 0.1.0 alpha。任一 agent 不通過，AGENTS.md 必須修到通過後重測。

## 完整描述
- Claude Code：atm self-host-alpha --agent claude-code 通過（必要）
- Cursor：manual run 3/4 criteria 通過（至少）
- Aider：aider --message AGENTS.md 跑 alpha gate 通過
- GitHub Copilot Agent：gh copilot agent run 通過
- OpenAI Assistants API：node tests/agents/openai-assistant.test.js 通過
- tests/agents/results/<agent>-<timestamp>.json 結果記錄
- docs/multi-agent-results.md 公開結果摘要

## 如何驗證
1. atm self-host-alpha --agent claude-code 返回全 true（必過）
1. 5 個 agent 中至少 3 個返回全 true
1. AGENTS.md 通過 atm verify --agents-md（無特定 IDE slash command）
1. 失敗 agent 有 issue link 與修復計畫

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-2.5-0001](ATM-2.5-0001.md)
- [ATM-2.5-0002](ATM-2.5-0002.md)
- [ATM-2-0012](ATM-2-0012.md)

## 交付物
- Claude Code：atm self-host-alpha --agent claude-code 通過（必要）
- Cursor：manual run 3/4 criteria 通過（至少）
- Aider：aider --message AGENTS.md 跑 alpha gate 通過
- GitHub Copilot Agent：gh copilot agent run 通過
- OpenAI Assistants API：node tests/agents/openai-assistant.test.js 通過
- tests/agents/results/<agent>-<timestamp>.json 結果記錄
- docs/multi-agent-results.md 公開結果摘要

## 備註
- 此卡是 ATM 0.1.0 alpha release 的最終 acceptance gate；Claude Code Sonnet 4.6 / Opus 4.7 皆測
