# MAO 多 AI 並行治理計畫書

## 定位

MAO means Multi-Agent Orchestration. This series exists because the CID/AGR parallel-development test showed that ATM needs a logical parallel routing layer, not only physical worktree isolation.

AAO remains the agent operability and small UX improvement stream. MAO owns the product-level capability for multiple AI agents to develop in parallel against the same logical repository while ATM detects conflicts before they become dirty worktree, stash, or merge failures.

## Problem Statement

Current `atm next` behaves primarily as a global safety router. That is correct for single-lane governed work, but it is too coarse for simultaneous agents. When several agents share a repo, the global dirty tree, staged index, direction locks, and task status can blur together. The observed failure mode is not that ATM cannot protect work; it is that it detects too much at the physical layer after work has already happened.

MAO moves conflict detection earlier into the control plane:

- agents register intent before writing;
- broker admission compares logical read/write/atom scopes;
- task-specific route contexts preserve local progress;
- root router remains the single global authority;
- patch envelopes allow WIP capture without treating the shared worktree as the source of truth.

## Design Principle

Subroutes may have local memory, but they must not have local truth.

The root router remains authoritative for dependency graph, task status, actor identity, route lifecycle, locks, atom conflicts, freeze/resume, and steward arbitration. A route context is a scoped projection for one task, actor, batch lane, or patch envelope.

## Architecture

```text
Root Router
  owns global task graph, route registry, broker admission, conflict decisions

Route Context
  owns per task/lane progress, claim intent, evidence namespace, patch envelope state

Broker Intent Registry
  owns declared read/write sets, atom CIDs, virtual atom CIDs, lease state

Conflict Matrix
  evaluates physical file, atom, virtual atom, read/write, generated artifact, and unknown-scope cases

Freeze / Resume Protocol
  pauses routes before source pollution expands, requests WIP patch envelopes, and records timeout handling

Patch Envelope / Steward
  stores proposed changes as logical transactions and applies or merges them through a governed writer path
```

## Milestones

| Milestone | Goal | Tasks |
|---|---|---|
| M0 Foundation | Define MAO contracts, state model, and route schema. | `TASK-MAO-0001`, `TASK-MAO-0002` |
| M1 Route Surface | Add route lifecycle commands and task-scoped next routing. | `TASK-MAO-0003`, `TASK-MAO-0004` |
| M2 Admission | Add pre-write intent registration and conflict matrix. | `TASK-MAO-0005`, `TASK-MAO-0006` |
| M3 Arbitration | Add freeze/resume and patch envelope handoff. | `TASK-MAO-0007`, `TASK-MAO-0008`, `TASK-MAO-0009` |
| M4 Proof | Add simulator benchmark and migration guidance from AAO/CID lessons. | `TASK-MAO-0010` |
| M5 ATM Core Runner Broker | Specialize MAO primitives for ATM core derived-artifact production in phased rollout form: `Runner Sync Steward v1` first, full Runner Broker later if needed. See [atm-core-runner-broker-design.md](./atm-core-runner-broker-design.md). | `TASK-MAO-0011` through `TASK-MAO-0022` |

## 2026-06-14 Captain Review Notes

The M5 runner broker extension is reasonable, but it depends on current ATM runner realities that the first draft did not fully account for:

- Current `npm run build` is not yet proven reproducible because release manifests and the onefile payload include wall-clock `generatedAt` values.
- Current root `atm.mjs` stale-runner detection watches `packages/cli/src` and `scripts`, but ATM core runner behavior also depends on `packages/core/src`, `packages/plugin-governance-local/src`, schemas, root launchers, and build config.
- Patch capture must handle uncommitted agent work; a plain `git diff baseline..HEAD` is not sufficient for normal route WIP.
- M5 must use additive extensions to MAO-0005, MAO-0006, MAO-0008, and MAO-0009 instead of introducing a second broker, second envelope, or second task lifecycle.
- `TASK-MAO-0011` is the hard gate for M5. Runner refs, closure binding, mixed-repo closure, and external contributor routing are not valid until reproducible build evidence exists.
- Recommended rollout is staged: `TASK-MAO-0011` to `TASK-MAO-0013` are the v1 lightweight steward lane; `TASK-MAO-0014+` are justified escalation work, not day-one operator burden.

## Command Shape

Target CLI surface:

```bash
node atm.mjs route open --task TASK-CID-0034 --actor 002 --intent write --json
node atm.mjs route status --route ROUTE-0034 --json
node atm.mjs next --route ROUTE-0034 --json
node atm.mjs route register-intent --route ROUTE-0034 --write packages/core/src/broker/steward.ts --atom atom-validator-framework --json
node atm.mjs route freeze --route ROUTE-0034 --reason conflict:TASK-CID-0036 --json
node atm.mjs route submit-patch --route ROUTE-0034 --patch .atm/routes/ROUTE-0034/patch.diff --json
node atm.mjs route resume --route ROUTE-0034 --json
```

## Conflict Semantics

| Case | Default verdict |
|---|---|
| Different physical files and different atoms | allow |
| Same physical file, different atom CID, non-overlapping ranges | allow with range guard |
| Same physical file, unknown range | freeze or require more intent detail |
| Same atom write/write | freeze and request patch envelope |
| Write/read overlap | serialize unless reader has pinned snapshot |
| Same atom but Layer 2 split available | request virtual atom decomposition |
| Generated artifact drift outside declared outputs | freeze affected routes |
| Unknown read/write set | conservative block for write |

## Out of Scope for MAO v1

- Multi-process distributed broker consensus.
- Automatic semantic merge for arbitrary code.
- Replacing Git history or normal commits.
- Forcing every agent into a separate worktree.
- Humanless resolution of ambiguous source ownership.

> The ATM Core Runner Broker (M5, TASK-MAO-0011+) extends these primitives to derived-artifact production. It is documented separately in [atm-core-runner-broker-design.md](./atm-core-runner-broker-design.md) to keep MAO v1 (M0–M4) scope tight. M5 cards may be opened in parallel with M0–M4 implementation, but MAO-0011 (reproducible build) is the gating prerequisite for the rest of M5.

## Open Questions

- Should route IDs be deterministic from task/actor/claim intent, or allocated as opaque IDs?
- Should route context be stored under `.atm/routes/` or inside existing task evidence namespaces?
- What is the smallest patch envelope format that supports both CLI and chat-agent WIP?
- Should generated release artifacts be declared as derived outputs at route open time or inferred by validators?

## Task Roster

Machine-readable shard: [../../tasks/tasks-mao.json](../../tasks/tasks-mao.json).

| Task ID | Card | Purpose |
|---|---|---|
| TASK-MAO-0001 | [TASK-MAO-0001-logical-parallel-routing-architecture-contract.task.md](tasks/TASK-MAO-0001-logical-parallel-routing-architecture-contract.task.md) | Define root router, subroute, broker, and steward boundaries. |
| TASK-MAO-0002 | [TASK-MAO-0002-route-context-state-schema.task.md](tasks/TASK-MAO-0002-route-context-state-schema.task.md) | Define persisted route context state and lifecycle fields. |
| TASK-MAO-0003 | [TASK-MAO-0003-route-lifecycle-cli.task.md](tasks/TASK-MAO-0003-route-lifecycle-cli.task.md) | Add route open/status/close/list CLI contract. |
| TASK-MAO-0004 | [TASK-MAO-0004-next-route-task-selector.task.md](tasks/TASK-MAO-0004-next-route-task-selector.task.md) | Add task/route-aware `next` selector semantics. |
| TASK-MAO-0005 | [TASK-MAO-0005-broker-intent-registry.task.md](tasks/TASK-MAO-0005-broker-intent-registry.task.md) | Add pre-write intent registration model. |
| TASK-MAO-0006 | [TASK-MAO-0006-logical-conflict-matrix.task.md](tasks/TASK-MAO-0006-logical-conflict-matrix.task.md) | Implement logical conflict rules before dirty-tree collision. |
| TASK-MAO-0007 | [TASK-MAO-0007-freeze-resume-protocol.task.md](tasks/TASK-MAO-0007-freeze-resume-protocol.task.md) | Define freeze, ack timeout, force-release, and resume flow. |
| TASK-MAO-0008 | [TASK-MAO-0008-patch-envelope-contract.task.md](tasks/TASK-MAO-0008-patch-envelope-contract.task.md) | Define WIP patch envelope format and storage rules. |
| TASK-MAO-0009 | [TASK-MAO-0009-steward-arbitration-flow.task.md](tasks/TASK-MAO-0009-steward-arbitration-flow.task.md) | Define neutral writer/steward arbitration path. |
| TASK-MAO-0010 | [TASK-MAO-0010-multi-agent-simulator-benchmark.task.md](tasks/TASK-MAO-0010-multi-agent-simulator-benchmark.task.md) | Add simulator benchmark for multi-agent routing and conflict gates. |
| TASK-MAO-0011 | [TASK-MAO-0011-reproducible-runner-build-audit.task.md](tasks/TASK-MAO-0011-reproducible-runner-build-audit.task.md) | Audit and repair runner build reproducibility. |
| TASK-MAO-0012 | [TASK-MAO-0012-runner-build-scope-manifest.task.md](tasks/TASK-MAO-0012-runner-build-scope-manifest.task.md) | Declare runner sync scope and steward-only generated-artifact contract. |
| TASK-MAO-0013 | [TASK-MAO-0013-atm-core-scope-classifier.task.md](tasks/TASK-MAO-0013-atm-core-scope-classifier.task.md) | Classify ATM core routes, widen stale-runner detection, and support the steward lane. |
| TASK-MAO-0014 | [TASK-MAO-0014-runner-ref-publish-primitive.task.md](tasks/TASK-MAO-0014-runner-ref-publish-primitive.task.md) | Add immutable runner refs and moving in-dev HEAD primitive when the lighter steward path is no longer enough. |
| TASK-MAO-0015 | [TASK-MAO-0015-patch-envelope-atm-core-specialization.task.md](tasks/TASK-MAO-0015-patch-envelope-atm-core-specialization.task.md) | Add ATM core fields to the existing patch envelope. |
| TASK-MAO-0016 | [TASK-MAO-0016-runner-submit-patch-pipeline.task.md](tasks/TASK-MAO-0016-runner-submit-patch-pipeline.task.md) | Submit core patches through Broker, build, verify, and publish in-dev. |
| TASK-MAO-0017 | [TASK-MAO-0017-runner-version-stream-state-machine.task.md](tasks/TASK-MAO-0017-runner-version-stream-state-machine.task.md) | Implement built/in-dev stream state and runner leases. |
| TASK-MAO-0018 | [TASK-MAO-0018-closure-runner-binding.task.md](tasks/TASK-MAO-0018-closure-runner-binding.task.md) | Add closure packet runner artifact binding. |
| TASK-MAO-0019 | [TASK-MAO-0019-cross-repo-dual-binding-closure.task.md](tasks/TASK-MAO-0019-cross-repo-dual-binding-closure.task.md) | Formalize mixed ATM-core/adopter closure binding. |
| TASK-MAO-0020 | [TASK-MAO-0020-broker-bootstrap-self-update-recovery.task.md](tasks/TASK-MAO-0020-broker-bootstrap-self-update-recovery.task.md) | Define Broker bootstrap, self-update, and recovery. |
| TASK-MAO-0021 | [TASK-MAO-0021-runner-broker-failure-mode-coverage.task.md](tasks/TASK-MAO-0021-runner-broker-failure-mode-coverage.task.md) | Add deterministic failure-mode coverage. |
| TASK-MAO-0022 | [TASK-MAO-0022-external-core-contributor-pipeline.task.md](tasks/TASK-MAO-0022-external-core-contributor-pipeline.task.md) | Define external PR to Broker patch-envelope pipeline. |

See also the task index: [tasks/README.md](tasks/README.md).
