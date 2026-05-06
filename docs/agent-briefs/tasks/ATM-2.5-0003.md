---
doc_id: doc_task_0305
id: ATM-2.5-0003
priority: P1
phase: ATM-2.5
created: 2026-05-05
created_by_agent: GitHubCopilot
owner: GitHubCopilot
status: done
started_at: 2026-05-07T16:05:00Z
started_by_agent: vs-insiders-gpt-5.4-mini
completed_at: 2026-05-07T16:45:00Z
type: confidence-gate
depends:
  - ATM-2.5-0001
  - ATM-2.5-0002
notes: "2026-05-06 | 狀態: open | 驗證: pending | 變更: ATM-0-0014 將 multi-agent alpha gate 降級為 confidence gate；alpha0 release blocker 僅保留 deterministic profile check | 阻塞: none\n2026-05-07 | 狀態: in-progress | 驗證: pending | 變更: 開始補齊 self-host-alpha --agent、verify --agents-md 與 multi-agent confidence reports/summary | 阻塞: none\n2026-05-07 | 狀態: done | 驗證: npm.cmd run validate:cli pass；npm.cmd run validate:self-hosting-alpha pass；npm.cmd run validate:multi-agent-confidence pass；npm.cmd test/typecheck/lint pass | 變更: upstream AI-Atomic-Framework commit aa1fcdd 新增 verify --agents-md、self-host-alpha --agent、multi-agent compatibility matrix、OpenAI assistants probe 與 5 份 advisory confidence reports | 阻塞: none"
---
# [ATM-2.5-0003] Multi-Agent 兼容性驗證：confidence gate

## 基本資訊
| 欄位 | 值 |
|---|---|
| 卡號 | ATM-2.5-0003 |
| 優先級 | P1 |
| 開單時間 | 2026-05-05 |
| 負責 Agent | GitHubCopilot |
| 狀態 | done |
| 完成度 | 100% |
| 完成時間 | 2026-05-07T16:45:00Z |
| 關聯卡號 | [ATM-2.5-0001](ATM-2.5-0001.md)、[ATM-2.5-0002](ATM-2.5-0002.md)、[ATM-2-0012](ATM-2-0012.md) |

## 開單原因
依 multi-agent-compatibility-matrix.md 執行 5 種 AI agent 的 confidence 測試，確認 ATM 是否足夠 agent-neutral。此卡不再阻塞 alpha0；alpha0 release blocker 僅保留 deterministic profile check、schema validation、hash-lock、hello-world atom smoke 與最小 task/lock/evidence。

## 完整描述
- upstream `atm verify --agents-md --json` 驗證 AGENTS/bootstrap 指令仍保持 vendor-neutral。
- upstream `atm self-host-alpha --verify --agent <profile> --json` 產生 advisory confidence report，支援 5 個 agent profiles。
- `scripts/generate-multi-agent-confidence-reports.mjs` 產生 `tests/agents/results/*.json` 與 `docs/multi-agent-results.md`。
- `scripts/validate-multi-agent-confidence.mjs` 驗證 5 個 profiles、AGENTS instructions 與 OpenAI assistants probe。
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
- upstream commit `aa1fcdd`
- `packages/cli/src/commands/agent-confidence.mjs`
- `atm verify --agents-md --json`
- `atm self-host-alpha --verify --agent <profile> --json`
- `tests/agents/openai-assistant.test.js`
- `tests/agents/results/*-2026-05-07T16-30-00Z.json` + `latest-batch.json`
- `docs/multi-agent-compatibility-matrix.md`
- `docs/multi-agent-results.md`

## 2026-05-06 v2 規劃書補丁（追加 acceptance）

- [x] upgrade --propose dry-run confidence 為 advisory。
- [x] advisory confidence 不得作為 alpha0 release blocker。
> 2026-05-06 v2 規劃書補丁：依附錄 A.2 補強 acceptance（不重啟驗收，僅追加）

## 備註
- 2026-05-07 完成：上游以 profile-based advisory workflow 收斂 multi-agent confidence，而非要求 5 個外部 agent 都成為 alpha0 blocking gate。
