<!-- doc_id: doc_team_tmpl_agent_report -->
# Agent Report（隊員工作回報模板）

> 用途：team run 中每位 agent（reader / scope-guardian / implementer / validator / evidence-collector / police / ...）把自己這一輪做的事與發現整理出來，交回 Captain。
> 規範：人類可讀、欄位固定，未來可序列化為 `atm.agentReport.v1` JSON schema。

---

## Role

- Role：（coordinator | reader | scope-guardian | implementer | validator | evidence-collector | data-pipeline | db | ci | web-research | police | other）
- Agent ID：
- Agent identity：（例：`codex-gpt-5.5` / `ClaudeCode_Sonnet4.7`）

## Status

- Status：（in-progress | done | blocked | needs-review）
- Round：（本回合是第幾輪交班；首次填 1）
- Started at：
- Reported at：

## Files Read

> 列出本輪「讀過」的關鍵檔案，避免下輪重讀。

- `path/...`

## Files Changed

> 只列「本輪實際寫過」的檔案。若 role 不持有 `file.write` 權限，此欄應為空。

- `path/...`（新增 / 修改 / 刪除）

## Commands Run

| # | Command | Exit | 重點輸出 / 摘要 |
|---|---|---|---|
| 1 | `npm run typecheck` | 0 | 全綠 |
| 2 | `git diff --check` | 0 | 無 whitespace 問題 |

> 重要：exit code 非 0 的指令不可被回報成 pass。如有失敗，必須在 Findings / Blockers 中說明。

## Findings

> 觀察到的事實 / 風險 / 反例 / 預期外行為。一條一行。

-

## Blockers

> 阻擋繼續推進的具體事項。若無，請明確寫「none」。

-

## Recommendation

> 給 Captain 的建議：下一步、是否需要其他 agent 介入、是否需要拆卡、是否需要升級 channel。

-

---

## 填寫範例（example）

```
## Role
- Role: implementer
- Agent ID: implementer-typescript
- Agent identity: codex-gpt-5.5

## Status
- Status: done
- Round: 1
- Started at: 2026-05-28T01:00:00Z
- Reported at: 2026-05-28T01:42:00Z

## Files Read
- docs/governance/team-agents/templates/team-brief-template.md
- scripts/validate-team-agents-templates.ts

## Files Changed
- docs/governance/team-agents/templates/agent-report-template.md（新增）
- docs/governance/team-agents/templates/team-summary-template.md（新增）

## Commands Run
| # | Command | Exit | 重點輸出 |
|---|---|---|---|
| 1 | `npm run typecheck` | 0 | clean |
| 2 | `node --strip-types scripts/validate-team-agents-templates.ts --task TASK-TEAM-0004` | 0 | all sections present |

## Findings
- 模板維持 Markdown-first，未引入 JSON schema 依賴
- 驗證腳本以 section 標題作為必填判定

## Blockers
- none

## Recommendation
- 可進入 Captain 階段做 team-summary 與 close
```