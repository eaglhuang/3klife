---
doc_id: doc_skl_index_tasks_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-06-23
last_updated: 2026-07-26T23:55+08:00
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
| [TASK-SKL-0002](./TASK-SKL-0002-tool-bridge-v1-schema-and-result-adapter.task.md) | P1 | Tool Bridge v1 schema and result adapter | done | `TASK-SKL-0001` | ATM tool bridge |
| [TASK-SKL-0003](./TASK-SKL-0003-next-claim-framework-mode-tools.task.md) | P2 | Next, claim, and framework-mode tools | done | `TASK-SKL-0001`, `TASK-SKL-0002` | ATM CLI / governance entry |
| [TASK-SKL-0004](./TASK-SKL-0004-evidence-guard-taskflow-governed-commit-tools.task.md) | P2 | Evidence, guard, taskflow, and governed commit tools | done | `TASK-SKL-0001`, `TASK-SKL-0002` | ATM operators |
| [TASK-SKL-0005](./TASK-SKL-0005-skill-tool-first-orchestration-migration.task.md) | P1 | Skill tool-first orchestration migration | done | `TASK-SKL-0002`, `TASK-SKL-0007` | ATM skills / integrations |
| [TASK-SKL-0006](./TASK-SKL-0006-governed-commit-and-close-lane-hardening.task.md) | retired | Governed commit and close lane hardening | superseded | completed Plan 3.1/LANE hardening | ATM close/commit safety |
| [TASK-SKL-0007](./TASK-SKL-0007-shared-skill-growth-contract-and-learning-loop.task.md) | P1 | Shared skill growth contract and learning loop | done | `TASK-SKL-0002` | ATM skill growth |
| [TASK-SKL-0008](./TASK-SKL-0008-team-role-skill-pack-and-capability-boundary-contract.task.md) | P3 | Team role skill-pack and capability boundary contract | done | `TASK-SKL-0005`, `TASK-SKL-0007` | Team role contract |
| [TASK-SKL-0009](./TASK-SKL-0009-team-role-routing-matrix-and-playbook-slices.task.md) | P3 | Team role-routing matrix and playbook slices | done | `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0008` | Team playbook routing |
| [TASK-SKL-0010](./TASK-SKL-0010-provider-neutral-role-skill-pack-manifest.task.md) | P4 | Provider-neutral role skill-pack manifest | done | `TASK-SKL-0007`, `TASK-SKL-0008`, `TASK-SKL-0009` | Team runtime manifest |
| [TASK-SKL-0011](./TASK-SKL-0011-agent-plus-skill-runtime-pilot.task.md) | P4 | Agent plus skill runtime pilot | done | `TASK-SKL-0008`, `TASK-SKL-0009`, `TASK-SKL-0010` | Team runtime pilot |
| [TASK-SKL-0012](./TASK-SKL-0012-team-role-growth-and-observability-integration.task.md) | P4 | Agent plus skill growth and observability integration | done | `TASK-SKL-0007`, `TASK-SKL-0010`, `TASK-SKL-0011` | Team growth / observability |
| [TASK-SKL-0013-A](./TASK-SKL-0013-error-code-resolver-shared-skill.task.md) | P1 | Error-code resolver shared skill and registry | done | historical duplicate ID; never re-import | ATM error-code knowledge |
| [TASK-SKL-0013-B](./TASK-SKL-0013-planning-authority-resolution-gate.task.md) | P0 | Planning authority resolution gate | done | none | canonical live-ledger `TASK-SKL-0013` |
| [TASK-SKL-0014](./TASK-SKL-0014-framework-temp-claim-tool-first-workflow.task.md) | P1 | Framework temp claim tool-first workflow and skill route | done | `TASK-SKL-0002`, `TASK-SKL-0003`, `TASK-SKL-0005`, `TASK-SKL-0013` | Framework quickfix governance |
| [TASK-SKL-0015](./TASK-SKL-0015-entry-skill-governance-flow-backwrite.task.md) | P1 | Entry skill governance-flow backwrite | done | `TASK-SKL-0005`, `TASK-SKL-0007` | ATM entry skills / integrations |
| [TASK-SKL-0016](./TASK-SKL-0016-root-drop-release-source-list-stale-generated-output.task.md) | P1 | Root-drop release source-list stale output guard | done | `TASK-SKL-0014` | release assembly |
| [TASK-SKL-0017](./TASK-SKL-0017-git-pathspec-emergency-commit-repair-skill.task.md) | P1 | Git pathspec emergency commit repair skill | done | none | emergency repair guidance |
| [TASK-SKL-0018](./TASK-SKL-0018-provider-neutral-skill-capability-and-provenance-foundation.task.md) | P0 | Provider-neutral skill capability and provenance foundation | done | none | capability foundation |
| [TASK-SKL-0019](./TASK-SKL-0019-skill-definition-vnext-and-progressive-disclosure-compiler.task.md) | P0 | Skill definition vNext and progressive-disclosure compiler | done | `TASK-SKL-0018` | skill compiler |
| [TASK-SKL-0020](./TASK-SKL-0020-first-principles-intake-and-causal-task-graph.task.md) | P0 | First-principles intake and causal task graph | done | `TASK-SKL-0018` | task authoring |
| [TASK-SKL-0021](./TASK-SKL-0021-standards-and-spec-review-receipt-gate.task.md) | P0 | Standards and Spec review receipt gate | done | `TASK-SKL-0018` | review governance |
| [TASK-SKL-0022](./TASK-SKL-0022-causal-validator-contract-and-task-authoring-migration.task.md) | P0 | Causal validator contract and authoring migration | done | `TASK-SKL-0020` | validator contract |
| [TASK-SKL-0023](./TASK-SKL-0023-decentralized-test-case-shards-and-broker-contributions.task.md) | P0 | Decentralized test-case shards and Broker contributions | done | `TASK-SKL-0022` | test catalog |
| [TASK-SKL-0024](./TASK-SKL-0024-structured-execution-receipt-and-zero-test-hard-gate.task.md) | P0 | Structured execution receipt and zero-test hard gate | done | `TASK-SKL-0022` | execution evidence |
| [TASK-SKL-0025](./TASK-SKL-0025-test-case-id-bound-tdd-red-green-lifecycle.task.md) | P0 | Case-ID-bound TDD red/green lifecycle | done | `TASK-SKL-0023`, `TASK-SKL-0024` | TDD evidence |
| [TASK-SKL-0026](./TASK-SKL-0026-causal-validator-selector-and-phase-suite-scheduler.task.md) | P0 | Causal selector and phase-suite scheduler | done | `TASK-SKL-0023`, `TASK-SKL-0024` | validator runtime |
| [TASK-SKL-0027](./TASK-SKL-0027-replaceable-deep-module-refactoring-provider-route.task.md) | P0 | Replaceable deep-module refactoring provider route | done | `TASK-SKL-0018` | architecture review |
| [TASK-SKL-0028](./TASK-SKL-0028-skill-corpus-audit-and-canary-rewrites.task.md) | P0 | Skill corpus audit and canary rewrites | done | `TASK-SKL-0019`, `TASK-SKL-0020`, `TASK-SKL-0027` | skill corpus |
| [TASK-SKL-0029](./TASK-SKL-0029-autonomous-validator-and-review-lifecycle-integration.task.md) | P0 | Autonomous validator and review lifecycle integration | running | `TASK-SKL-0021`, `TASK-SKL-0025`, `TASK-SKL-0026`, `TASK-SKL-0028` | lifecycle integration |
| [TASK-SKL-0030](./TASK-SKL-0030-historical-a-b-replay-verdict-and-migration-guide.task.md) | P0 | Historical A/B replay verdict and migration guide | planned | `TASK-SKL-0029` | measured validator verdict |
| [TASK-SKL-0031](./TASK-SKL-0031-data-driven-skill-tiers-and-full-corpus-integration-profiles.task.md) | P1 | Data-driven skill tiers and full-corpus integration profiles | planned | `TASK-SKL-0029` | ATM skill compiler / integrations |
| [TASK-SKL-0032](./TASK-SKL-0032-editor-global-skill-source-federation-and-overlay-manifests.task.md) | P1 | Editor-global skill source federation and overlay manifests | planned | `TASK-SKL-0031` | Editor-global external skill overlays |
| [TASK-SKL-0033](./TASK-SKL-0033-diagnostic-feedback-loop-provider-and-causal-repair-receipt.task.md) | P1 | Diagnostic feedback loop provider and causal repair receipt | planned | `TASK-SKL-0031` | Diagnostic evidence lifecycle |
| [TASK-SKL-0034](./TASK-SKL-0034-engineering-change-method-profiles-and-fidelity-receipts.task.md) | P2 | Engineering change method profiles and fidelity receipts | planned | `TASK-SKL-0031` | Data-driven engineering methods |
| [TASK-SKL-0035](./TASK-SKL-0035-deep-module-boundary-topology-validator.task.md) | P1 | Deep module boundary topology validator | planned | `TASK-SKL-0031` | Architecture boundary validation |

## Sequencing Note

1. Finish the active `TASK-SKL-0029` lane without adding another writer to its lifecycle scope.
2. After 0029, run `TASK-SKL-0030` and `TASK-SKL-0031` in parallel.
3. After 0031, `TASK-SKL-0032`, `0033`, `0034`, and `0035` become causally ready.
4. `0034` and `0035` share the deep-module skill template; Broker must compose or serialize that shared projection.
5. `TASK-SKL-0006` is retired. Route new close/commit defects to the current owning seam or ATM bug backlog.
6. The two historical `TASK-SKL-0013` files must not be re-imported. `0013-B` owns the live ledger; `0013-A` is retained delivery history.
7. `TASK-SKL-0032` is optional user/editor federation and is not a Plan 3.1 completion prerequisite.

## Current Executable Order

1. Finish the already-running `TASK-SKL-0029`.
2. Run `TASK-SKL-0030` and `TASK-SKL-0031` in parallel after 0029.
3. After 0031, run `TASK-SKL-0032` and `TASK-SKL-0033` in parallel. Start
   `TASK-SKL-0034` and `TASK-SKL-0035` under Broker arbitration; their shared
   template path requires compose or serialization.
4. Prioritize 0033 and 0035 over 0032 and 0034 when capacity is limited.

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
