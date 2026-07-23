---
task_id: ATM-GOV-0252
title: Independent acceptance closure gate and two-key verifier
status: planned
owner: atm-taskflow
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on:
  - ATM-GOV-0251
  - TASK-ERR-0005
  - ATM-GOV-0239
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns task-closure enforcement; the core taxonomy stays pure and taskflow integrates one shared gate rather than plan-specific validators."
scopePaths:
  - packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/framework-development/closure-packet/validator-contract.ts
  - packages/cli/src/commands/framework-development/closure-packet/schema-fragments.ts
  - schemas/governance/closure-packet.schema.json
  - tests/cli/closure-acceptance-evidence-gate.test.ts
  - tests/cli/closure-required-gates-contract.test.ts
  - tests/cli/taskflow-close-readiness-parity.test.ts
  - tests/fixtures/plan3-fake-green/**
deliverables:
  - packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - schemas/governance/closure-packet.schema.json
  - tests/cli/closure-acceptance-evidence-gate.test.ts
  - tests/cli/closure-required-gates-contract.test.ts
  - tests/cli/taskflow-close-readiness-parity.test.ts
validators:
  - node --strip-types tests/cli/closure-acceptance-evidence-gate.test.ts
  - node --strip-types tests/cli/closure-required-gates-contract.test.ts
  - node --strip-types tests/cli/taskflow-close-readiness-parity.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes:
  - ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT
  - ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED
evidence:
  required: independent-acceptance-gate-red-green
rollback:
  strategy: revert-commit
  notes: "Existing non-critical task closure remains available; declared closure-critical evidence remains fail closed."
atomizationImpact:
  ownerAtomOrMap: atm.task-close.acceptance-evidence-gate
  mapUpdates: []
  extractionCandidates:
    - atom: atm.task-close.acceptance-evidence-gate
      pattern: Policy Adapter
      source: packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
      disposition: extract
createdByCommand: atm plan card create
---

# ATM-GOV-0252 Independent acceptance closure gate and two-key verifier

## Intent

Make machine-readable acceptance evidence a real close gate. The closure packet
must carry a per-predicate evidence map reconstructed from authoritative sources
and verified by a second key: either an independent actor without producer write
scope, or a verifier policy and scenario digest sealed before producer work.

The mechanism is risk-based rather than a blanket two-person ceremony. Existing
tasks without closure-critical predicates keep current behavior; tasks that make
performance, safety, release, governance, or other closure-critical claims must
prove the declared verifier mode.

## Acceptance

- [ ] The closure packet records every declared predicate as `pass`, `fail`, or `inconclusive`, with source references/digests, derivation digest, observed and required realness, verifier mode/identity/digest, negative-control result, and reason.
- [ ] Every `closureCritical: true` predicate must pass. A successful command, validator exit code, attestation text, producer boolean, producer counter, or receipt-shaped object is insufficient unless it satisfies the predicate contract.
- [ ] `locked-policy` mode requires the verifier implementation digest, scenario/assertion digest, and thresholds to be sealed before producer work and outside the producer task's mutable scope.
- [ ] `separate-actor` mode requires a different runtime actor whose claim/write scope excludes producer deliverables and whose receipt binds the same evidence window and source digests.
- [ ] Verifier strength is tiered. Per-card closure-critical predicates may use either valid mode, but a plan-global/release-global verdict must include a valid pre-sealed `locked-policy` key; a separate-actor signature may add review evidence but is never sufficient by itself for aggregate closure.
- [ ] The producer cannot select a weaker verifier after seeing results, edit the sealed oracle, self-attest independence, or substitute unavailable observations with zero/empty/healthy defaults.
- [ ] The existing Plan 3 fake-green fixture is rejected: synthetic 420-cell shapes, `not-required` lifecycle, version/sleep workloads, fixed cost/timing, empty blocker input, and caller-supplied correctness zeros remain `inconclusive` or `fail`.
- [ ] A locked positive fixture with real command/event receipts, adequate realness, discriminating negative control, and an independent verifier passes without Plan 3- or task-specific branches.
- [ ] Closure preflight emits `ATM_TASK_CLOSE_ACCEPTANCE_EVIDENCE_INSUFFICIENT` for semantic evidence failure and `ATM_TASK_CLOSE_INDEPENDENT_VERIFIER_REQUIRED` for a missing second key, preserving generated registry recovery semantics.
- [ ] Closure-packet schema, framework-development packet generator, direct task close, and taskflow close use the same gate contract; no adapter owns a second acceptance algorithm.
- [ ] `pre-close`, close dry-run, and close `--write` evaluate the same required validators, broker/commit ownership, and closure-packet contract. A dry-run `ready` followed by a first-write-only gate failure reproduces `ATM-BUG-2026-07-11-098` and must turn red.
- [ ] Commit-wrapper and hook observations used by closure share one ownership/residue classifier; dry-run/write disagreement from `ATM-BUG-2026-07-13-162` is rejected as parity failure.
- [ ] Existing task cards without `acceptanceEvidence` remain backward-compatible. A family or card may opt into closure-critical predicates without forcing unrelated low-risk tasks into a two-actor workflow.
- [ ] Focused tests include forged producer labels, digest substitution, post-hoc threshold change, same-actor verifier, verifier scope overlap, missing data, failed negative control, lower-realness substitution, and valid locked-policy/separate-actor paths.
- [ ] Short English comments explain why adapters collect evidence but cannot decide acceptance, and why `inconclusive` is a terminal block for closure rather than a healthy zero.
- [ ] This closure enforcement path has a card-attributable source/frozen behavior-parity receipt before close. The runner-sync build receipt may be shared, but source-only success or later aggregate parity cannot retroactively satisfy this card.

## Evidence and rollback

Seal red-before/green-after closure packets and error-code outputs. Rollback keeps
declared closure-critical work open; it must not add a waiver or downgrade the
predicate to prose.

## Atomization impact

The core predicate evaluator stays in ATM-GOV-0251. This task owns only source
resolution, verifier validation, packet projection, and close admission.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T04:45:57.111Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0252-independent-acceptance-closure-gate-and-two-key-verifier.task.md","contentDigest":"sha256:66a9a8f935fd06c69b8f1e183062fabdfa5a5deb8bd619eb3773ba7fefb0abc3"} -->
