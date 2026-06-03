---
doc_id: doc_index_team_agents_tasks
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-28
last_updated: 2026-06-03
---

# Team Agents Task Index

Related plan: [../團隊自動化代理分工計畫.md](../團隊自動化代理分工計畫.md)
Templates: [../templates/README.md](../templates/README.md)

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
| [TASK-TEAM-0001](./TASK-TEAM-0001-team-agents-planning-roster-reset.task.md) | M0 | Team agents planning roster reset | done | none | planning docs |
| [TASK-TEAM-0002](./TASK-TEAM-0002-minimal-task-crew-briefing-contract.task.md) | M1 | Minimal task crew briefing contract | planned | `TASK-TEAM-0001` (parallel with 0003) | team docs / CLI contract |
| [TASK-TEAM-0003](./TASK-TEAM-0003-atomization-planner-required-role.task.md) | M1 | Atomization planner required role | planned | `TASK-TEAM-0001` (parallel with 0002) | team docs / CLI contract |
| [TASK-TEAM-0004](./TASK-TEAM-0004-team-brief-report-templates.task.md) | M2 | Team brief/report templates | planned | `TASK-TEAM-0002`, `TASK-TEAM-0003` | templates / validator |
| [TASK-TEAM-0005](./TASK-TEAM-0005-team-memory-captain-decision-templates.task.md) | M2 | Team memory and captain decision templates | planned | `TASK-TEAM-0004` (parallel with 0006) | templates / validator |
| [TASK-TEAM-0006](./TASK-TEAM-0006-patrol-report-template.task.md) | M2 | Patrol report template | planned | `TASK-TEAM-0004` (parallel with 0005) | templates / validator |
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
| [TASK-TEAM-0017](./TASK-TEAM-0017-team-template-schema-validator-contract.task.md) | M2 | Team template schema and validator contract | draft | `TASK-TEAM-0004`, `TASK-TEAM-0005`, `TASK-TEAM-0006` | schemas / validator |
| [TASK-TEAM-0018](./TASK-TEAM-0018-team-lease-fencing-deadlock-contract.task.md) | M5H | Team lease fencing and deadlock contract | draft | `TASK-TEAM-0011`, `TASK-TEAM-0012`, `TASK-TEAM-0013` | lease / scheduler hardening |
| [TASK-TEAM-0019](./TASK-TEAM-0019-team-sandbox-attestation-closure-contract.task.md) | M6H | Team sandbox attestation and closure contract | draft | `TASK-TEAM-0016`, `TASK-TEAM-0018` | sandbox / closure hardening |

## Sequencing Note

Open and import these cards by milestone order. Do not reuse the previous `TASK-TEAM-0001` to `TASK-TEAM-0004` draft semantics; those early drafts were superseded by the M0-M6 rollout.

## Parallelization Plan for M1-M2

The line-graph dependency above (`0002 -> 0003 -> 0004 -> 0005 -> 0006`) was tightened during the 2026-06-03 dispatch review. The actual file footprints permit the following collapse:

```
M0: 0001 (done)
        |
M1:     +--> 0002 (crew contract)   ----+
        +--> 0003 (atomization role) ---+   (run in parallel)
                                        |
M2:                                     +--> 0004 (brief/report/summary)
                                                       |
                                                       +--> 0005 (decision/memory)  ----+
                                                       +--> 0006 (patrol)               +   (run in parallel)
```

- `0002` and `0003` write to disjoint doc paths (`minimal-task-crew.md` vs `atomization-planner.md`) and may merge in either order.
- `0005` and `0006` write to disjoint template files but share the same validator script. They may build in parallel; merge sequentially so the second-merged card extends the first card's validator section additions.
- `0004` is the single synchronization point between M1 and M2: it lands the first version of the shared validator script (`scripts/validate-team-agents-templates.ts`) that `0005` and `0006` extend.

## Dispatch Contract for M1-M2

Every card from `TASK-TEAM-0002` through `TASK-TEAM-0006` carries a `dispatch_pattern` block in its frontmatter declaring:

- `phase_0` (read-only planner) + `phase_1` (external builder) split — the dual-agent pattern that physically prevents Phase 1 from touching `C:/Users/User/3KLife/**`.
- `commit_budget`: 0 for Phase 0 (planning only), 2 for Phase 1 (AAF strict 2-commit rule).
- `forbidden_files`: at minimum `C:/Users/User/3KLife/**`, `.atm/runtime/**`, `.atm/history/**`.
- `condition_review`: per-card checklist for close.

This pattern translates the captain dispatch lessons from memory (mirror-commit incidents 0064 / 0075 / 0077 / 0088) into per-card enforceable allowed-files whitelists.

## 90-Minute First-Card Promise

`TASK-TEAM-0004`, `TASK-TEAM-0005`, and `TASK-TEAM-0006` each carry a `ninety_minute_promise` block. Together they ship the artifact chain that lets a new adopter run their first governed task card in under 90 minutes:

| Minute | Adopter sees |
|---|---|
| 0-15 | `npx create-atm` succeeds, `atm doctor` green |
| 15-30 | Copy `examples/team-agents-minimal/team-brief.md` (from 0004), edit 4 fields |
| 30-60 | `atm next` -> agent claim -> small edit -> `npm run typecheck` |
| 60-80 | `validate-team-agents-templates.ts` (from 0004+0005+0006) green; agent-report.md ready |
| 80-90 | `atm tasks close` -> closure packet + first patrol-report.md (from 0006) |

The promise is verifiable after all three M2 cards close: an `examples/team-agents-minimal/` directory exists in the framework repo, and a wall-clock dry run of the steps above completes in under 90 minutes for at least one observer.

## CID Hardening Synchronization

The 2026-06-03 CID Hardening v2 review added two Team Agents follow-up cards:

- `TASK-TEAM-0018` maps CID Hardening E2 into Team Agents. It treats `leaseEpoch`, fencing tokens, wait-for graph deadlock detection, and stronger released-tombstone coverage as new hardening work, not current behavior.
- `TASK-TEAM-0019` maps CID Hardening E3 into Team Agents. It treats sandbox attestation fields (`runnerKind`, `runtimeVersion`, `sandboxPolicyHash`, `attestationSigner`) as new closure-supporting metadata, not existing command-backed evidence.

These cards preserve the existing Team Agents rule: Team Agents accelerate scoped work, but they do not relax ATM gates, task evidence, closure packets, or coordinator-only lifecycle ownership.
