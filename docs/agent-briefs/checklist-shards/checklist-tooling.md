# Agent Briefs CheckList — 既有 Tooling 與 Harness 任務總表

> 這是 `CheckList.md` 的「既有 Tooling 與 Harness 任務總表」分片。完整索引見 `docs/agent-briefs/CheckList.md`。

## HTML-to-UCUF Plan5 Tooling

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | Owner |
|---|---|---|---|---|---|
| P0 | [PROG-2-0001](tasks/PROG-2-0001.md (doc_task_0177)) (doc_task_0177) | 建立 Plan5、任務卡與 shard bootstrap | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0002](tasks/PROG-2-0002.md (doc_task_0178)) (doc_task_0178) | HTML-to-UCUF 舊規則與衝突流程審計 | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0003](tasks/PROG-2-0003.md (doc_task_0179)) (doc_task_0179) | final gate 低分診斷與 nextFixes 契約 | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0004](tasks/PROG-2-0004.md (doc_task_0180)) (doc_task_0180) | CSS semantics extraction parity | done | 100% | GitHubCopilot |
| P0 | [PROG-2-0005](tasks/PROG-2-0005.md (doc_task_0181)) (doc_task_0181) | UCUF runtime renderer parity closure | done | 100% | GitHubCopilot |
| P1 | [PROG-2-0006](tasks/PROG-2-0006.md (doc_task_0182)) (doc_task_0182) | source-derived spec authority hardening | done | 100% | GitHubCopilot |
| P1 | [PROG-2-0007](tasks/PROG-2-0007.md (doc_task_0183)) (doc_task_0183) | 95% pixel fidelity regression matrix | open | 0% | GitHubCopilot |
| P1 | [PROG-2-0008](tasks/PROG-2-0008.md (doc_task_0184)) (doc_task_0184) | html-to-ucuf skill Plan5 workflow rewrite | done | 100% | GitHubCopilot |

## Harness Engineering Rollout

| 優先級 | 卡號 | 簡單描述 | 狀態 | 完成度% | Owner |
|---|---|---|---|---|---|
| P0 | [HARN-ART-0001](tasks/HARN/HARN-ART-0001.md) | 建立 Turn Artifact Schema 與版本契約 | done | 100% | GitHubCopilot |
| P0 | [HARN-ART-0002](tasks/HARN/HARN-ART-0002.md) | 建立 Turn Artifact Validator CLI | done | 100% | GitHubCopilot |
| P1 | [HARN-ART-0003](tasks/HARN/HARN-ART-0003.md) | 建立 Turn Artifact Storage Policy | done | 100% | GitHubCopilot |
| P1 | [HARN-ART-0004](tasks/HARN/HARN-ART-0004.md) | 讓 Finalize 使用標準 Artifact 預設路徑 | done | 100% | GitHubCopilot |
| P0 | [HARN-HDO-0001](tasks/HARN/HARN-HDO-0001.md) | 建立 Handoff Diff Validator Core | done | 100% | GitHubCopilot |
| P0 | [HARN-HDO-0002](tasks/HARN/HARN-HDO-0002.md) | 建立 Handoff Diff Validator Fixtures | done | 100% | GitHubCopilot |
| P1 | [HARN-HDO-0003](tasks/HARN/HARN-HDO-0003.md) | 將 Handoff Diff Validator 接入 Finalize | done | 100% | GitHubCopilot |
| P1 | [HARN-HDO-0004](tasks/HARN/HARN-HDO-0004.md) | 將 Task Lock Scope 納入 Handoff Validator | done | 100% | GitHubCopilot |
| P1 | [HARN-TRC-0001](tasks/HARN/HARN-TRC-0001.md) | 定義 Execution Trace Event Schema | done | 100% | GitHubCopilot |
| P1 | [HARN-TRC-0002](tasks/HARN/HARN-TRC-0002.md) | 建立 Node Tool Trace Middleware | done | 100% | GitHubCopilot |
| P1 | [HARN-TRC-0003](tasks/HARN/HARN-TRC-0003.md) | 建立 Execution Trace Collector | done | 100% | GitHubCopilot |
| P2 | [HARN-TRC-0004](tasks/HARN/HARN-TRC-0004.md) | 將 Trace Summary 掛入 Finalize 輸出 | done | 100% | GitHubCopilot |
| P1 | [HARN-EVAL-0001](tasks/HARN/HARN-EVAL-0001.md) | 建立 Workflow Path Taxonomy | open | 0% | GitHubCopilot |
| P2 | [HARN-EVAL-0002](tasks/HARN/HARN-EVAL-0002.md) | 建立 Workflow Baseline Fixture Pack | open | 0% | GitHubCopilot |
| P2 | [HARN-EVAL-0003](tasks/HARN/HARN-EVAL-0003.md) | 建立 Path Drift Comparator | open | 0% | GitHubCopilot |
| P1 | [HARN-MET-0001](tasks/HARN/HARN-MET-0001.md) | 建立 Turn Artifact History Query | open | 0% | GitHubCopilot |
| P2 | [HARN-MET-0002](tasks/HARN/HARN-MET-0002.md) | 建立 Harness Metrics Accumulator | open | 0% | GitHubCopilot |
| P2 | [HARN-MET-0003](tasks/HARN/HARN-MET-0003.md) | 擴充 Harness Health Report | open | 0% | GitHubCopilot |
| P1 | [HARN-GOV-0001](tasks/HARN/HARN-GOV-0001.md) | 建立 Harness Capability Boundary Matrix | open | 0% | GitHubCopilot |
| P1 | [HARN-GOV-0002](tasks/HARN/HARN-GOV-0002.md) | 更新 Agent Collaboration 強制規則入口 | open | 0% | GitHubCopilot |
| P2 | [HARN-GOV-0003](tasks/HARN/HARN-GOV-0003.md) | 更新 Task Card Template 的 Harness 欄位 | done | 100% | GitHubCopilot |
| P0 | [HARN-PILOT-0001](tasks/HARN/HARN-PILOT-0001.md) | 執行 Doc-only Pilot | done | 100% | GitHubCopilot |
| P1 | [HARN-PILOT-0002](tasks/HARN/HARN-PILOT-0002.md) | 執行 Tooling-code Pilot | done | 100% | GitHubCopilot |
| P2 | [HARN-PILOT-0003](tasks/HARN/HARN-PILOT-0003.md) | 執行 UI-QA Pilot | open | 0% | GitHubCopilot |

### HARN 審核摘要（2026-05-04）

- 全 HARN 任務卡盤點：34 張；done 25 張、open 9 張、in-progress 0 張。
- 34 張 HARN 任務卡皆已回寫 `## 審核結果（2026-05-04）`，內容包含審核結論、驗證證據與需修改事項。
- 已達成鏈：`HARN-ARCH-*`、`HARN-LOG-*`、`HARN-FIX-0001`、`HARN-UI-0001`、`HARN-GOV-0003`、`HARN-ART-0001/0002/0003/0004`、`HARN-DEMO-0003`、`HARN-HDO-0001/0002/0003/0004`、`HARN-TRC-0001/0002/0003/0004`。
- 未達成主鏈：`HARN-EVAL-*`、`HARN-MET-*`、`HARN-GOV-0001/0002`、`HARN-PILOT-0003` 仍為 open；artifact schema、validator CLI、storage policy helper、finalize default path、handoff task scope check、execution trace schema/middleware/collector/finalize attachment 已落地，後續鏈可開始重用這條 gate。
- 下一個應優先落地的根卡：`HARN-EVAL-0001`；TRC chain 已完成，下一步可建立 workflow path taxonomy。
