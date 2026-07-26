---
doc_id: doc_skl_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-23
last_updated: 2026-06-23T22:55+08:00
---

# SKL Tool-First Task Index

Related plan: [../SKL-tool-first-upgrade-plan.md](../SKL-tool-first-upgrade-plan.md)
Verified facts: [../00-verified-facts.md](../00-verified-facts.md)

## Task Card Contract

All `TASK-SKL-*` cards follow the ATM task-card contract.

- Use machine-readable frontmatter.
- Keep `planning_repo` and `target_repo` explicit.
- Define `scopePaths`, `deliverables`, `validators`, `rollback`, and `atomizationImpact`.
- Planning-only work stays in `3KLife`; source delivery lands in `AI-Atomic-Framework`.

## Task Pack

| Task ID | Stage | Planned Title | Status | Depends | Target |
|---|---|---|---|---|---|
| [TASK-SKL-0001](./TASK-SKL-0001-skl-tool-first-plan-and-task-pack.task.md) | P0 | SKL tool-first plan and task pack | done | none | planning docs / 3KLife |
| [TASK-SKL-0002](./TASK-SKL-0002-tool-bridge-v1-schema-and-result-adapter.task.md) | P1 | Tool Bridge v1 schema and result adapter | planned | `TASK-SKL-0001` | ATM tool bridge |
| [TASK-SKL-0007](./TASK-SKL-0007-shared-skill-growth-contract-and-learning-loop.task.md) | P1 | Shared skill growth contract and learning loop | planned | `TASK-SKL-0002` | ATM skill growth |
| [TASK-SKL-0013](./TASK-SKL-0013-error-code-resolver-shared-skill.task.md) | P1 | Error-code resolver shared skill and registry | planned | `TASK-SKL-0002`, `TASK-SKL-0005`, `TASK-SKL-0007` | ATM error-code knowledge |
| [TASK-SKL-0005](./TASK-SKL-0005-skill-tool-first-orchestration-migration.task.md) | P1 | Skill tool-first orchestration migration | planned | `TASK-SKL-0002`, `TASK-SKL-0007` | ATM skills / integrations |
| [TASK-SKL-0003](./TASK-SKL-0003-next-claim-framework-mode-tools.task.md) | P2 | Next, claim, and framework-mode tools | planned | `TASK-SKL-0001`, `TASK-SKL-0002`, `TASK-SKL-0005` | ATM CLI / governance entry |
| [TASK-SKL-0004](./TASK-SKL-0004-evidence-guard-taskflow-governed-commit-tools.task.md) | P2 | Evidence, guard, taskflow, and governed commit tools | planned | `TASK-SKL-0001`, `TASK-SKL-0002`, `TASK-SKL-0005` | ATM operators |
| [TASK-SKL-0006](./TASK-SKL-0006-governed-commit-and-close-lane-hardening.task.md) | P3 | Governed commit and close lane hardening | planned | `TASK-SKL-0003`, `TASK-SKL-0004`, `TASK-SKL-0005`, `TASK-SKL-0007` | ATM close/commit safety |
| [TASK-SKL-0008](./TASK-SKL-0008-team-role-skill-pack-and-capability-boundary-contract.task.md) | P3 | Team role skill-pack and capability boundary contract | planned | `TASK-SKL-0005`, `TASK-SKL-0007` | Team role contract |
| [TASK-SKL-0009](./TASK-SKL-0009-team-role-routing-matrix-and-playbook-slices.task.md) | P3 | Team role-routing matrix and playbook slices | planned | `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0008` | Team playbook routing |
| [TASK-SKL-0010](./TASK-SKL-0010-provider-neutral-role-skill-pack-manifest.task.md) | P4 | Provider-neutral role skill-pack manifest | planned | `TASK-SKL-0007`, `TASK-SKL-0008`, `TASK-SKL-0009` | Team runtime manifest |
| [TASK-SKL-0011](./TASK-SKL-0011-agent-plus-skill-runtime-pilot.task.md) | P4 | Agent plus skill runtime pilot | planned | `TASK-SKL-0008`, `TASK-SKL-0009`, `TASK-SKL-0010` | Team runtime pilot |
| [TASK-SKL-0012](./TASK-SKL-0012-team-role-growth-and-observability-integration.task.md) | P4 | Team role growth and observability integration | planned | `TASK-SKL-0007`, `TASK-SKL-0010`, `TASK-SKL-0011` | Team growth / observability |
| [TASK-SKL-0014](./TASK-SKL-0014-framework-temp-claim-tool-first-workflow.task.md) | P1 | Framework temp claim tool-first workflow and skill route | planned | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0013` | Framework quickfix governance |
| [TASK-SKL-0015](./TASK-SKL-0015-entry-skill-governance-flow-backwrite.task.md) | P1 | Entry skill governance-flow backwrite | planned | `TASK-SKL-0005`, `TASK-SKL-0007` | ATM entry skills / integrations |
| [TASK-SKL-0031](./TASK-SKL-0031-data-driven-skill-tiers-and-full-corpus-integration-profiles.task.md) | P1 | Data-driven skill tiers and full-corpus integration profiles | planned | `TASK-SKL-0029` | ATM skill compiler / integrations |
| [TASK-SKL-0032](./TASK-SKL-0032-editor-global-skill-source-federation-and-overlay-manifests.task.md) | P1 | Editor-global skill source federation and overlay manifests | planned | `TASK-SKL-0031` | Editor-global external skill overlays |

## Sequencing Note

1. `TASK-SKL-0001` remains the planning opener and source of truth for the lane.
2. `TASK-SKL-0002` establishes the shared tool result contract first.
3. `TASK-SKL-0007` is intentionally pulled forward so the growth contract exists before the first orchestration skill grows large.
4. `TASK-SKL-0013` adds shared error-code resolution before more specialist skills duplicate recovery prose.
5. `TASK-SKL-0005` also moves into early P1 so we can stand up the first usable `router / playbook / specialist skill` seam quickly and let it learn while being used.
6. `TASK-SKL-0003` and `TASK-SKL-0004` attach more governance surfaces onto that growth-enabled skill skeleton instead of fattening one entry skill first.
7. `TASK-SKL-0008` to `TASK-SKL-0012` extend the same architecture into Team Agents, where `Agent + Skill` is the reusable unit.
8. `TASK-SKL-0006` stays as later hardening and should absorb real dogfood friction such as residue, active-claim noise, runner skew, and cross-repo sync problems.
9. `TASK-SKL-0014` is opened from `ATM-GOV-0196` dogfood and should run before more framework quickfixes rely on raw `framework-mode` CLI snippets. It must consume the sealed `ATM-GOV-0196` summary before final dogfood acceptance.
10. `TASK-SKL-0015` promotes stable governance-flow rules from the 2026-07-20 ATM 2.0/2.1 Captain handoff into source skill templates, while keeping historical task state out of reusable entry skills. It may coordinate with `TASK-SKL-0014` when both touch the same skill templates, but `TASK-SKL-0014` is not a semantic prerequisite.
11. `TASK-SKL-0031` retains the minimum-entry install contract while making the skill tier data-driven and adding a governed full-corpus install profile. It follows `TASK-SKL-0029` and is the only route for repairing specialist-skill installation parity.
12. `TASK-SKL-0032` keeps personal and third-party skill portability outside the ATM canonical corpus. It follows the 0031 distribution interface and owns only provenance-aware editor-global overlays and their managed manifests.

## Backlog To Skill Feed

- Backlog is not only a repair queue; it is also a feeder for reusable skill knowledge.
- Product defects stay in backlog until fixed, but the reusable symptom, safer route, and durable rule should be promoted into shared skill references as early as possible.
- Error-code interpretation is a shared skill concern: skills should route `ATM_*` code explanations through `atm-error-code-resolver` instead of keeping per-skill private recovery tables.
- Shared growth files should preload the first wall-hit cases so a fresh skill already knows common ATM dogfood traps.
- Current seed cases:
  - `ATM-BUG-2026-06-23-019`: imported planning-repo batch already exists, but claim path keeps rediscovering instead of trusting ledger truth.
  - `ATM-BUG-2026-06-23-020`: planning repo says done, target repo still blocks on stale imported dependency truth.
  - `ATM-BUG-2026-06-23-021`: host repo runner and framework repo runner expose different operator surfaces during closeback and evidence work.
  - `TASK-SKL-0014` seed case: framework temp claim quickfix currently lacks a dedicated `skill -> tools/playbook -> CLI fallback` route and is too dependent on raw `framework-mode status/claim` snippets.
  - `TASK-SKL-0015` seed case: the 2026-07-20 ATM 2.0/2.1 Captain handoff contains stable per-card governance-flow rules that should be promoted into entry skills, but its historical task status and local residue must remain in planning evidence rather than reusable skill text.

## Completion Gate

- Tool result shape must stay stable across ATM tool surfaces.
- `nextAction`, `userNotice`, `runnerMode`, and `messages` must stay consumable by skills.
- `taskflow`, `close`, and `commit` lanes must expose blockers in machine-readable form.
- ATM skills must share one growth contract and one learning-loop structure.
- Team role skill packs must reuse the same contract instead of inventing a separate memory scheme.
- Tool-first paths must still fail closed and preserve a clear CLI fallback policy.
