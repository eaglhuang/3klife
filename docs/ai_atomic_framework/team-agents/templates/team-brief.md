<!-- doc_id: doc_team_tmpl_brief -->
# Team Brief（任務開工簡報模板）

> 用途：隊長（Coordinator / Captain）在啟動一個 team run 前，用這份簡報把任務、隊伍、權限、scope、原子化策略、驗證計畫、停車條件一次說清楚。
> 規範：人類可讀、Markdown-first、未來可序列化為 `atm.teamBrief.v1` JSON schema。

---

## Task

- Task ID：
- Channel：（fast | normal | batch）
- Goal（一行白話）：
- Related task card：（路徑 / 連結）

## Captain

- Captain agent：
- Captain identity：（例：`codex-gpt-5.5` / `ClaudeCode_Sonnet4.7`）
- Started at：

## Team

| Role | Agent ID | Permissions（限定 scope） |
|---|---|---|
| coordinator |  | `task.lifecycle`, `git.write`, `evidence.write` |
| reader |  | `file.read` |
| scope-guardian |  | `file.read` |
| implementer |  | `file.write`（paths 限定如下） |
| validator |  | `exec.validator` |
| evidence-collector |  | `file.read` |

> 註：`file.write` paths 必須是 Task 的 `allowedFiles` 子集。Exclusive permission 同時只能有一個 owner。

## Scope

- Allowed files：
  - `path/...`
- Do-not-touch paths：
  - `.atm/runtime/**`
  - `.atm/history/task-events/**`
  - `<本任務以外的 source>`
- Out of scope（顯式不做的事）：
  -

## Atomization Plan

> 此區塊在每張任務卡都必填，用來提前阻止「大檔細節吃掉整輪 token」。

- Primary atom：（這次工作主要落在哪個 atom）
- Related atoms：（讀取或間接觸碰的鄰近 atom）
- Capability touched：（影響到的能力名稱，例：`task.lifecycle`、`next.routing`、`batch.checkpoint`）
- Command surface：（會影響哪些 CLI 子命令或 public API）
- Large-script risk：（涉及 > 600 行的腳本嗎？是 / 否，若是列出檔名與行數）
- Map update needed：（是否需要更新 `path-to-atom-map.json` 或同類索引；是 / 否 / 路徑）
- Recommended implementation slice：（建議第一刀切哪一段，避免一次改太大）
- Do-not-cross boundary：（哪條邊界這次絕對不能跨；例：「不動 `evidence.ts` runtime 寫入路徑」）
- Split recommendation：（若超過單卡負荷，建議怎麼拆成下一張卡）

## Assignment

> 每位 agent 拿到的具體工作單元，逐條列出，避免「籠統指派」。

- reader：
- scope-guardian：
- implementer：
- validator：
- evidence-collector：

## Validation Plan

| Validator | Command | Expected exit | 備註 |
|---|---|---|---|
| typecheck | `npm run typecheck` | 0 |  |
| focused | `node --strip-types scripts/<...>.ts --task <ID>` | 0 |  |
| diff hygiene | `git diff --check` | 0 |  |

## Evidence Plan

- 必留 commandRuns：
  - `<command>` → 預期 stdout/stderr 留存方式
- 必留 artifact paths：
  - `<artifact path>`
- Evidence 寫入位置：`.atm/history/evidence/<TASK-ID>.json`（由 Coordinator 寫，不由 implementer 寫）

## Stop Conditions

> 隊伍遇到下列任一條件必須停下、回報 Captain、等候人類決策，**不可自行繞過**。

- 任一 validator exit code ≠ 0
- 偵測到 scope 外修改
- 偵測到 `.atm/runtime/**` 寫入意圖
- Large-script 單檔修改超過 200 行
- 與既有 task lock 衝突
- 任務目標需要跨 repo 而原 brief 未授權

---

## 填寫範例（example）

```
## Task
- Task ID: TASK-TEAM-0004
- Channel: normal
- Goal: 建立 team-brief/agent-report/team-summary 三個模板與驗證腳本
- Related task card: docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0004-team-brief-report-templates.task.md

## Captain
- Captain agent: coordinator
- Captain identity: codex-gpt-5.5
- Started at: 2026-05-28T00:00:00Z

## Atomization Plan
- Primary atom: atm.team-agents-template-map
- Related atoms: atm.governance.docs
- Capability touched: docs/governance/team-agents
- Command surface: 無（純文件）
- Large-script risk: 否
- Map update needed: 是 → atomic_workbench/atomization-coverage/path-to-atom-map.json
- Recommended implementation slice: 先 team-brief.md 一份完整骨架 + 範例
- Do-not-cross boundary: 不動 packages/cli runtime
- Split recommendation: 若驗證腳本超量，獨立成 TASK-TEAM-0004b
```