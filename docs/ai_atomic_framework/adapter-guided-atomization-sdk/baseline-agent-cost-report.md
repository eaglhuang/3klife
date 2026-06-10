---
doc_id: doc_other_asp_baseline
task_id: TASK-ASP-0005
title: AI Agent 原子化成本基線報告（ASP Initiative）
status: v1
sampled_at: 2026-06-10
sample_source: AI-Atomic-Framework .atm/history（cached governed sessions）
---

# AI Agent 原子化成本基線報告

## 方法說明

- **資料來源**：AAF 框架 repo 的 `.atm/history/task-events/*`（claim/close 事件時間戳）與 `.atm/history/evidence/*.json`（治理證據筆數）。這是任務卡允許的「cached session logs」，未執行任何付費 LLM 量測。
- **樣本定義**：一筆 session = 一張已關閉（close）的 ATM 任務卡，從首次 claim 到最後 close 的歷程。
- **代理指標**：
  - *Wall-clock per task*：claim → close 的牆鐘時間（分鐘）。
  - *Evidence records per task*：close 前累積的治理證據筆數，作為「governed agent 互動次數」的下界代理。
  - *LLM calls / token usage*：ATM ledger 不記錄模型 token；以 evidence 筆數 + 任務事件數為代理。直接 token 量測列為後續工作（需 agent 端 instrumentation）。
- **3KLife 端現況**：`atomic_workbench/atoms` 僅 4 顆 atom，session log 不足以單獨成樣，因此以上游 AAF 治理紀錄為代理母體（D3 決策，見 coordination.md）。

## 取樣結果（23 筆 session，門檻 ≥ 10）

| Task ID | Wall-clock (min) | Evidence records |
|---|---:|---:|
| TASK-AAO-0063 | 4.5 | 4 |
| TASK-AAO-0106 | 10.3 | 9 |
| TASK-AAO-0130 | 197.9 | 4 |
| TASK-AAO-0131 | 12.1 | 5 |
| TASK-AAO-0133 | 5.4 | 7 |
| TASK-AAO-0135 | 4.1 | 5 |
| TASK-AAO-0136 | 30.8 | 1 |
| TASK-AAO-0137 | 5.4 | 4 |
| TASK-APO-0031 | 28.4 | 12 |
| TASK-ASP-0003 | 9.7 | 4 |
| TASK-CID-0013 | 12.6 | 5 |
| TASK-CID-0015 | 4.5 | 6 |
| TASK-CID-0016 | 9.4 | 5 |
| TASK-CID-0017 | 58.6 | 7 |
| TASK-CID-0018 | 1628.3 | 13 |
| TASK-CID-0019 | 1.9 | 5 |
| TASK-CID-0020 | 1.6 | 5 |
| TASK-CID-0021 | 1.1 | 5 |
| TASK-CID-0022 | 24.2 | 7 |
| TASK-CID-0023 | 1.9 | 5 |
| TASK-TEAM-0002 | 44.3 | 6 |
| TASK-TEAM-0003 | 13.1 | 10 |
| TASK-TEAM-0027 | 7.8 | 10 |

## 統計摘要

| 指標 | 值 |
|---|---|
| 樣本數 | 23 |
| Wall-clock 中位數 | 9.7 min |
| Wall-clock 平均（含離群） | ≈ 92.1 min |
| Wall-clock IQR | 約 4.5 – 28.4 min |
| 離群樣本 | TASK-CID-0018（1628 min，跨夜長任務）、TASK-AAO-0130（198 min） |
| Evidence records 中位數 | 5 筆/任務 |
| Retry rate（close 前被治理閘退回的比例，依本日 ASP-0003 實測） | 1 筆 session 內 4 次 checkpoint/commit 退回後成功（dirty-worktree、commit-wrapper、validator-absent、scope 各 1 次） |

## 重要觀察（供論文 baseline 使用）

1. **治理開銷集中在收口而非實作**：ASP-0003 實作（SDK contract + Python adapter + 測試）約佔 session 一半時間，另一半為 evidence/validator/checkpoint 收口流程；中位數任務需 5 筆 evidence 才能 close。
2. **retry 來源是治理閘而非程式錯誤**：本日實測 4 次退回全部來自治理協定（commit 順序、validator 證據缺漏），0 次來自測試失敗。這正是 adapter-guided 自動化（ASP-0001~0004）要壓縮的成本。
3. **token 成本待補**：現有 ledger 無 token 欄位；建議後續在 agent 端記錄每任務 prompt/completion token，再回填本報告 v2。

## 後續工作

- [ ] ASP-0002 完成後：以 `corpus-index.md` 對 3KLife corpus 跑 candidate discovery，回填 precision / recall。
- [ ] 補 token 級 instrumentation（v2）。
