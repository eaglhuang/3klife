<!-- doc_id: doc_team_tmpl_patrol_report -->
# Patrol Report（巡邏報告模板）

> ⚠️ **PATROL IS READ-ONLY**
> 巡邏隊（Atomic Police / Patrol Agent）**未經獨立 task card 授權，不得對任何 source 進行寫入操作**。
> 巡邏報告只能是診斷與建議，不可作為直接修改 repo 的授權。修改必須走獨立 task card 走完 ATM 治理流程。

> 用途：日常巡邏、claim-preflight、close-preflight、big-script 巡查都用同一份格式。未來可序列化為 `atm.patrolReport.v1` JSON schema。

---

## Patrol Run Header

- Patrol Run ID：（建議 `PATROL-<YYYYMMDD>-<seq>`，例：`PATROL-20260528-001`）
- Patrol Type：（daily | claim-preflight | close-preflight | big-script | ad-hoc）
- Team：（巡邏隊伍識別；例：`atomic-police-default`）
- Captain identity：
- Started at：
- Completed at：

## Scope

- Target repo：
- Target paths / globs：
  - `path/...`
- Read-only confirmed：（yes / no；必須為 yes 才能執行巡邏）

## Severity

- Severity：（info | warning | critical）
- 判斷標準：
  - info：觀察到但不需即時行動
  - warning：建議下一張任務卡處理
  - critical：應停止當前推進，等候人類決策

## Findings

> 逐項列出。每筆要附路徑、行號（若適用）、與診斷理由。

| # | Path | Line / Range | Type | Note |
|---|---|---|---|---|
| 1 |  |  | （large-script / scope-leak / encoding / lock-stale / orphan-evidence / other） |  |

## Safe to Proceed

- Safe to Proceed：（yes | no | conditional）
- 條件（若 conditional）：

## Suggested Command

> 若巡邏建議的後續行動有具體可執行命令，列在這。**僅為建議，不是授權**。

- `<command>`

## Follow-up

> 巡邏發現的後續任務卡建議。每條都應該對應到一個明確的 atom / capability。

- 建議開卡：
  - Task title：
  - Channel：
  - Owner atom：
  - Rationale：

---

## 填寫範例（example）

```
## Patrol Run Header
- Patrol Run ID: PATROL-20260528-001
- Patrol Type: big-script
- Team: atomic-police-default
- Captain identity: codex-gpt-5.5
- Started at: 2026-05-28T03:00:00Z
- Completed at: 2026-05-28T03:08:00Z

## Scope
- Target repo: AI-Atomic-Framework
- Target paths / globs:
  - packages/cli/src/commands/**/*.ts
- Read-only confirmed: yes

## Severity
- Severity: warning

## Findings
| # | Path | Line | Type | Note |
|---|---|---|---|---|
| 1 | packages/cli/src/commands/tasks.ts | 1–4956 | large-script | 4956 行，超過 600 行門檻 |
| 2 | packages/cli/src/commands/next.ts | 1–3760 | large-script | 3760 行 |
| 3 | packages/cli/src/commands/hook.ts | 1–2303 | large-script | 2303 行 |

## Safe to Proceed
- Safe to Proceed: conditional
- 條件: 先開「Big Script Atomization #1」planning card，不直接動 source

## Suggested Command
- `node atm.mjs tasks open --title "Big Script Atomization #1" --channel normal`

## Follow-up
- 建議開卡:
  - Task title: Big Script Atomization #1 — tasks.ts split planning
  - Channel: normal
  - Owner atom: atm.cli.tasks-command
  - Rationale: tasks.ts 4956 行已造成 token 風險，必須先做 atomization 規劃
```