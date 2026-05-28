<!-- doc_id: doc_team_tmpl_team_summary -->
# Team Summary（隊長彙整模板）

> 用途：Captain 在 team run 結束前，把這張任務的決策、實作、驗證、證據、殘餘風險、結案就緒狀態做一份單頁總結。是給人類、給下一位 Captain、給 ATM closure packet 用的彙整。
> 規範：Markdown-first，未來可序列化為 `atm.teamSummary.v1` JSON schema。

---

## Decision

> Captain 在本輪做的「關鍵決策」一句話總結。不是流水帳，是治理層級的選擇。

-

## Implementation Summary

> 實作到了什麼程度。把改過的檔案、新加的能力、刪除的東西分開列。

- Files added：
  - `path/...`
- Files modified：
  - `path/...`
- Files deleted：
  - `path/...`
- Behavior delta：（外部可觀察到的變化；若無，寫「docs-only, no runtime behavior change」）

## Validators

| Validator | Command | Exit | stdout hash（可選） |
|---|---|---|---|
|  |  |  |  |

> 全部 validator 必須 exit 0 才能宣告 close-ready。任一失敗 → close-ready 須為 blocked。

## Evidence

- Evidence file：`.atm/history/evidence/<TASK-ID>.json`
- commandRuns 數量：
- artifact paths：
  - `path/...`
- Evidence 是否由 Coordinator 寫入：（是 / 否；非 Coordinator 寫入即視為違規）

## Risk

> 殘餘風險。如果這張卡今天 close，下游可能踩什麼？

- Residual risk：
- Downstream impact：
- Suggested follow-up card：（若需要另開卡，列建議的卡號或主題）

## Close-Ready

- Close-Ready：（yes | blocked-by:<reason>）
- 若 blocked，列出阻擋條件與解除路徑。

---

## 填寫範例（example）

```
## Decision
本輪採 docs-only 路線，先固化六個 Team Agent 模板，不引入 CLI runtime；待下一張卡再做 validator 程式。

## Implementation Summary
- Files added:
  - docs/ai_atomic_framework/team-agents/templates/team-brief.md
  - docs/ai_atomic_framework/team-agents/templates/agent-report.md
- Files modified: 無
- Files deleted: 無
- Behavior delta: docs-only, no runtime behavior change

## Validators
| Validator | Command | Exit |
|---|---|---|
| diff hygiene | `git diff --check` | 0 |
| encoding | `node tools_node/check-encoding-touched.js` | 0 |

## Evidence
- Evidence file: 本輪為 planning repo docs-only，未產生 ATM evidence
- commandRuns 數量: 2
- artifact paths:
  - docs/ai_atomic_framework/team-agents/templates/

## Risk
- Residual risk: 模板尚未綁定 schema validator；若被誤用為任務真相來源會混淆。
- Downstream impact: 低
- Suggested follow-up card: TASK-TEAM-0004（在 AI-Atomic-Framework 落 validator）

## Close-Ready
- Close-Ready: yes
```