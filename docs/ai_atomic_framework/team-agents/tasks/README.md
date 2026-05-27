---
doc_id: doc_index_team_agents_tasks
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-28
last_updated: 2026-05-28
---

# Team Agents Task Index

Related plan: [../團隊自動化代理分工計畫.md](../團隊自動化代理分工計畫.md)

## Task Card Contract

Every `TASK-TEAM-*` card follows the ATM task-card authoring contract:

- `scopePaths`: target repo paths an implementation agent may change.
- `deliverables`: concrete target outputs, not only `.atm/history/**`.
- `validators`: command-backed checks required for closure.
- `evidence.required: command-backed`: completion requires command evidence.
- `rollback`: revertable rollback guidance.
- `atomizationImpact`: owner atom/map and required map updates.

Planning-only cards must set `target_repo: 3KLife` and `closure_authority: planning_repo`. Framework implementation cards must set `target_repo: AI-Atomic-Framework` and `closure_authority: target_repo`.

## Task Roster

| Task ID | Milestone | Title | Status | Depends | Target surface |
|---|---|---|---|---|---|
| [TASK-TEAM-0001](./TASK-TEAM-0001-team-agents-planning-roster-reset.task.md) | M0 | Team agents planning roster reset | planned | none | planning docs |
| [TASK-TEAM-0002](./TASK-TEAM-0002-minimal-task-crew-briefing-contract.task.md) | M1 | Minimal task crew briefing contract | planned | `TASK-TEAM-0001` | team docs / CLI contract |
| [TASK-TEAM-0003](./TASK-TEAM-0003-atomization-planner-required-role.task.md) | M1 | Atomization planner required role | planned | `TASK-TEAM-0002` | team docs / CLI contract |
| [TASK-TEAM-0004](./TASK-TEAM-0004-team-brief-report-templates.task.md) | M2 | Team brief/report templates | planned | `TASK-TEAM-0003` | templates / validator |
| [TASK-TEAM-0005](./TASK-TEAM-0005-team-memory-captain-decision-templates.task.md) | M2 | Team memory and captain decision templates | planned | `TASK-TEAM-0004` | templates / validator |
| [TASK-TEAM-0006](./TASK-TEAM-0006-patrol-report-template.task.md) | M2 | Patrol report template | planned | `TASK-TEAM-0005` | templates / validator |
| [TASK-TEAM-0007](./TASK-TEAM-0007-captain-decision-team-sizing-dry-run.task.md) | M3 | Captain decision and team sizing dry-run | planned | `TASK-TEAM-0003` | `team` CLI |
| [TASK-TEAM-0008](./TASK-TEAM-0008-task-lieutenant-escalation-rules.task.md) | M3 | Task lieutenant escalation rules | planned | `TASK-TEAM-0007` | `team` CLI |
| [TASK-TEAM-0009](./TASK-TEAM-0009-team-plan-dry-run-resolver.task.md) | M4 | Team plan dry-run resolver | planned | `TASK-TEAM-0007`, `TASK-TEAM-0008` | `team` CLI |
| [TASK-TEAM-0010](./TASK-TEAM-0010-role-implementer-selector.task.md) | M4 | Role and implementer selector | planned | `TASK-TEAM-0009` | `team` CLI |
| [TASK-TEAM-0011](./TASK-TEAM-0011-team-start-status-runtime.task.md) | M5 | Team start/status runtime | planned | `TASK-TEAM-0009` | `team` runtime |
| [TASK-TEAM-0012](./TASK-TEAM-0012-permission-lease-validator.task.md) | M5 | Permission lease validator | planned | `TASK-TEAM-0011` | lease validator |
| [TASK-TEAM-0013](./TASK-TEAM-0013-file-write-scope-validator.task.md) | M5 | file.write scope validator | planned | `TASK-TEAM-0012` | scope validator |
| [TASK-TEAM-0014](./TASK-TEAM-0014-atomic-police-patrol-reports.task.md) | M6 | Atomic police patrol reports | planned | `TASK-TEAM-0013` | patrol CLI/report |
| [TASK-TEAM-0015](./TASK-TEAM-0015-next-playbook-team-recommendation.task.md) | M6 | Next/playbook team recommendation | planned | `TASK-TEAM-0011`, `TASK-TEAM-0012` | `next` / playbook |
| [TASK-TEAM-0016](./TASK-TEAM-0016-closure-packet-team-summary-integration.task.md) | M6 | Closure packet team summary integration | planned | `TASK-TEAM-0013`, `TASK-TEAM-0014`, `TASK-TEAM-0015` | closure / evidence |

## Sequencing Note

Open and import these cards by milestone order. Do not reuse the previous `TASK-TEAM-0001` to `TASK-TEAM-0004` draft semantics; those early drafts were superseded by the M0-M6 rollout.
