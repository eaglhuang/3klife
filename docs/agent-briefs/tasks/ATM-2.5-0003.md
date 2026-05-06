---
doc_id: doc_task_0305
id: ATM-2.5-0003
priority: P1
phase: ATM-2.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: open
type: confidence-gate
depends:
  - ATM-2.5-0001
  - ATM-2.5-0002
notes: "2026-05-06 | 狀態: open | 驗證: pending | 變更: ATM-0-0014 將 multi-agent alpha gate 降級為 confidence gate；alpha0 release blocker 僅保留 deterministic profile check | 阻塞: none"
---
# [ATM-2.5-0003] Multi-Agent 兼容性驗證：confidence gate

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-2.5-0003 |
| 優先級 | P1 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | open |
| 完成度 | 0% |
| 完成時間 | — |
| 關聯卡號 | [ATM-2.5-0001](ATM-2.5-0001.md)、[ATM-2.5-0002](ATM-2.5-0002.md)、[ATM-2-0012](ATM-2-0012.md) |

## 開單原因
依 multi-agent-compatibility-matrix.md 執行 5 種 AI agent 的 confidence 測試，確認 ATM 是否足夠 agent-neutral。此卡不再阻塞 alpha0；alpha0 release blocker 僅保留 deterministic profile check、schema validation、hash-lock、hello-world atom smoke 與最小 task/lock/evidence。

## 完整描述
- Claude Code：atm self-host-alpha --agent claude-code 產生 confidence report
- Cursor：manual run 產生 confidence report
- Aider：aider --message AGENTS.md 跑 confidence workflow
- GitHub Copilot Agent：gh copilot agent run 產生 confidence report
- OpenAI Assistants API：node tests/agents/openai-assistant.test.js 產生 confidence report
- tests/agents/results/<agent>-<timestamp>.json 結果記錄
- docs/multi-agent-results.md 公開結果摘要
- 失敗 agent 只開 issue / 修復計畫，不阻塞 alpha0 release

## 如何驗證
1. atm self-host-alpha --agent claude-code 返回 deterministic alpha0 criteria 全 true
1. 5 個 agent confidence report 皆有結果檔；不要求 3/5 全 true 才能釋出 alpha0
1. AGENTS.md 通過 atm verify --agents-md（無特定 IDE slash command）
1. 失敗 agent 有 issue link 與修復計畫，並標記是否阻塞 alpha1

## 建議作法
- 待補：依任務類型補上最小可執行步驟。

## 相關聯任務卡
- [ATM-2.5-0001](ATM-2.5-0001.md)
- [ATM-2.5-0002](ATM-2.5-0002.md)
- [ATM-2-0012](ATM-2-0012.md)

## 交付物
- Claude Code：atm self-host-alpha --agent claude-code 產生 confidence report
- Cursor：manual run 產生 confidence report
- Aider：aider --message AGENTS.md 跑 confidence workflow
- GitHub Copilot Agent：gh copilot agent run 產生 confidence report
- OpenAI Assistants API：node tests/agents/openai-assistant.test.js 產生 confidence report
- tests/agents/results/<agent>-<timestamp>.json 結果記錄
- docs/multi-agent-results.md 公開結果摘要

## 備註
- 2026-05-06 | 狀態: open | 驗證: pending | 變更: ATM-0-0014 將 multi-agent alpha gate 降級為 confidence gate；alpha0 release blocker 僅保留 deterministic profile check | 阻塞: none
