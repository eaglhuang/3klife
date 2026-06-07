---
doc_id: doc_cid_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-03
last_updated: 2026-06-07T10:32+08:00
---

# CID Hardening Task Index

Related plan: [../CID硬化計畫書.md](../CID硬化計畫書.md)
Verified facts: [../00-verified-facts.md](../00-verified-facts.md)

## Task Card Contract

Every `TASK-CID-*` card follows the ATM task-card authoring contract:

- machine-readable frontmatter is required;
- `planning_repo` carries intent and planning authority;
- `target_repo` carries source-write authority for execution cards;
- validators, rollback, and `atomizationImpact` must be declared before implementation starts;
- planning-only cards must not be treated as target-repo source delivery.

## Pilot Cards

| Task ID | Stage | Planned Title | Status | Depends | Target |
|---|---|---|---|---|---|
| [TASK-CID-0001](./TASK-CID-0001-cid-hardening-control-plane-bootstrap.task.md) | E0 | CID hardening control-plane bootstrap | **done** | none | planning docs / 3KLife |
| [TASK-CID-0002](./TASK-CID-0002-cid-semantics-and-fingerprint-profile-schema.task.md) | E0 | CID semantics and fingerprintProfile schema | planned | `TASK-CID-0001` | ATM docs / schema |
| [TASK-CID-0003](./TASK-CID-0003-validate-semantic-fingerprint-determinism.task.md) | E0 | Deterministic semantic fingerprint validator | planned | `TASK-CID-0002` | ATM scripts / tests |

## P0 Formal Cards

> `TASK-CID-0005` is the read-only CID-first advisor contract. `TASK-CID-0009` ~ `TASK-CID-0012` are planning-only brokered-write governance cards. `TASK-CID-0013` is the target-repo execution bridge that consumed the read-only advisor in `team` / `next` preflight.

> Planning cards define intent. Target-repo execution cards grant bounded source-write authority. Planning-only cards do not themselves authorize edits in `AI-Atomic-Framework`.

| Task ID | Stage | Planned Title | Notes |
|---|---|---|---|
| [TASK-CID-0005](./TASK-CID-0005-cid-first-parallel-conflict-advisor-cli-contract.task.md) | P0 | CID-first parallel conflict advisor CLI contract | Defines CID-first, not file-first, conflict semantics for the advisor lane. |
| [TASK-CID-0009](./TASK-CID-0009-patch-proposal-capsule-contract.task.md) | P0 | Patch Proposal Capsule contract | Defines the planning contract for proposal-backed writes before canonical worktree mutation. |
| [TASK-CID-0010](./TASK-CID-0010-write-broker-lane-router-contract.task.md) | P0 | Write Broker lane router contract | Defines broker lane ownership, conflict routing, and isolation tiers. |
| [TASK-CID-0011](./TASK-CID-0011-neutral-write-steward-and-break-glass-handoff-contract.task.md) | P0 | Neutral Write Steward and Break-glass handoff contract | Defines neutral steward ownership and the emergency handoff fallback. |
| [TASK-CID-0012](./TASK-CID-0012-team-agents-brokered-write-integration-contract.task.md) | P0 | Team Agents brokered write integration contract | Defines how Team roles consume the CID broker primitives. |
| [TASK-CID-0013](./TASK-CID-0013-cid-first-advisor-team-next-preflight-integration.task.md) | P0 | CID-first advisor team/next preflight integration | Existing target-repo bridge for the read-only advisor consumer surfaces. |

## Future Queue

> `TASK-CID-0004`, `TASK-CID-0006`, and `TASK-CID-0007` remain deferred and are not part of the 100% brokered-write completion pack.

| Future Task ID | Stage | Planned Title | Notes |
|---|---|---|---|
| TASK-CID-0004 | E1 | dependencyPolicy and CID.Effects follow-up | Extends dependency policy and effect tags after the current broker lane is stable. |
| TASK-CID-0006 | E3 | closure attestation and sandbox wording | Follows the sandbox / attestation lane after broker runtime proof exists. |
| TASK-CID-0007 | E5 | Trust Tier promotion gate | Remains downstream of the broker runtime and validation maturity work. |

## 100% Completion Pack

> This pack turns the closed planning contracts in `TASK-CID-0009` ~ `TASK-CID-0012` plus the existing `TASK-CID-0013` preflight bridge into the full brokered-write runtime. Captain cadence for this pack is intentionally compact: aim to close each implementation card in at most two captain rounds, limit formal workers to `005` / `006` / `007`, keep `001` ~ `003` inactive by default, and use captain-owned internal sidecars only for cheap preflight / acceptance convergence.
>
> These roster and cadence rules are captain-governance constraints for dispatch. They are intentionally documented here before any later runtime roster gate exists.

| Task ID | Stage | Planned Title | Notes |
|---|---|---|---|
| [TASK-CID-0014](./TASK-CID-0014-brokered-write-completion-plan-and-task-pack.task.md) | P0 | Brokered write completion plan and task pack | Planning-only opener for the completion pack. Writes the 100% definition back into the CID plan, opens `TASK-CID-0015` ~ `TASK-CID-0023`, and encodes the compact captain cadence. |
| [TASK-CID-0015](./TASK-CID-0015-broker-contract-schemas-and-types.task.md) | P0 | Broker contract schemas and types | Adds `WriteIntent.v1`, `PatchProposal.v1`, `BrokerDecision.v1`, `MergePlan.v1`, and `BreakGlassHandoff.v1` schemas plus TS types. |
| [TASK-CID-0016](./TASK-CID-0016-local-write-broker-registry-and-cli.task.md) | P0 | Local write-broker registry and CLI | Adds the local runtime registry and `broker` CLI surface for register / decision / status / release / cleanup. |
| [TASK-CID-0017](./TASK-CID-0017-cid-advisor-broker-decision-model.task.md) | P0 | CID advisor uses broker decision model | Replaces file-first precedence with the shared broker decision model and fixes verdict precedence for `tasks parallel`. |
| [TASK-CID-0018](./TASK-CID-0018-patch-proposal-capsule-runtime.task.md) | P0 | PatchProposal capsule runtime | Implements proposal create / list / show / validate runtime with fail-closed hash, anchor, and scope checks. |
| [TASK-CID-0019](./TASK-CID-0019-deterministic-composer-and-merge-plan.task.md) | P0 | Deterministic composer and MergePlan | Generates deterministic merge plans for same-file CID-disjoint proposals and rejects overlapping anchors. |
| [TASK-CID-0020](./TASK-CID-0020-neutral-write-steward-apply-flow.task.md) | P0 | Neutral Write Steward apply flow | Adds steward plan / apply so final scoped patches can be produced without giving the steward git/task lifecycle ownership. |
| [TASK-CID-0021](./TASK-CID-0021-team-agents-brokered-write-runtime-integration.task.md) | P0 | Team Agents brokered write runtime integration | Wires broker lanes into `team plan/start` and keeps Coordinator as lifecycle owner. |
| [TASK-CID-0022](./TASK-CID-0022-next-claim-and-closeout-broker-integration.task.md) | P0 | Next claim and closeout broker integration | Registers broker intent before claim and guarantees cleanup on release / handoff / close. |
| [TASK-CID-0023](./TASK-CID-0023-end-to-end-brokered-write-acceptance-harness.task.md) | P0 | End-to-end brokered write acceptance harness | Adds the final validator that proves same-file CID-disjoint writes can complete end-to-end and blocked lanes fail closed. |

## Sequencing Note

E0 closes the initial CID documentation baseline in `TASK-CID-0001` ~ `TASK-CID-0003`. P0 then splits into three layers:

1. `TASK-CID-0005` defines the read-only CID-first advisor contract.
2. `TASK-CID-0009` ~ `TASK-CID-0012` define the full brokered-write planning contracts and Team Agents ownership model.
3. `TASK-CID-0013` consumes the existing advisor in `team` / `next` preflight as the first target-repo execution bridge.

The 100% completion pack starts after those predecessors are closed:

1. `TASK-CID-0014` opens the completion pack and writes the final acceptance definition back into the CID plan.
2. `TASK-CID-0015` ~ `TASK-CID-0020` build the broker primitives in execution order: schema/types, local registry, proposal runtime, composer, and steward apply flow.
3. `TASK-CID-0021` and `TASK-CID-0022` wire the broker into Team and Next/closeout lifecycle surfaces.
4. `TASK-CID-0023` adds the end-to-end validator and final acceptance gate for the whole lane.

Future Queue items `TASK-CID-0004`, `TASK-CID-0006`, and `TASK-CID-0007` remain outside this completion pack. They stay deferred until the brokered-write runtime is fully proven.

## Future Extension Proposal

- **TASK-CID-0008 (not opened in this round)** may later formalize budget, cap, sampling, sharding, and timeout policy once the broker runtime and acceptance harness are stable enough to support higher-order governance controls.

## Cross-Lane References

- TEAM lane: [../../team-agents/tasks/README.md](../../team-agents/tasks/README.md)
- APF lane: [../../atomic-police-family/tasks/README.md](../../atomic-police-family/tasks/README.md)
