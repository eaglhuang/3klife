---
task_id: ATM-GOV-0251
title: Acceptance evidence predicates and realness taxonomy
status: done
owner: atm-evidence-governance
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on: []
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the reusable acceptance-evidence policy; the task adds no new task model and keeps CLI closure orchestration out of the core taxonomy."
scopePaths:
  - packages/core/src/evidence/acceptance-predicate.ts
  - packages/core/src/evidence/realness.ts
  - packages/core/src/evidence/index.ts
  - schemas/governance/acceptance-evidence-map.schema.json
  - schemas/governance/work-item.schema.json
  - packages/cli/src/commands/tasks/import-task.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - tests/core/acceptance-evidence-predicate.test.ts
  - tests/cli/task-import-acceptance-evidence.test.ts
  - tests/schema-fixtures/acceptance-evidence/**
deliverables:
  - packages/core/src/evidence/acceptance-predicate.ts
  - packages/core/src/evidence/realness.ts
  - schemas/governance/acceptance-evidence-map.schema.json
  - schemas/governance/work-item.schema.json
  - tests/core/acceptance-evidence-predicate.test.ts
  - tests/cli/task-import-acceptance-evidence.test.ts
  - tests/schema-fixtures/acceptance-evidence/**
validators:
  - node --strip-types tests/core/acceptance-evidence-predicate.test.ts
  - node --strip-types tests/cli/task-import-acceptance-evidence.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes: []
evidence:
  required: acceptance-evidence-contract-red-green
rollback:
  strategy: revert-commit
  notes: "The field is additive; existing prose-only cards remain importable and closure-critical use remains fail closed."
atomizationImpact:
  ownerAtomOrMap: atm.evidence.acceptance-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.evidence.realness-taxonomy
      pattern: Ordered Taxonomy
      source: packages/core/src/evidence/realness.ts
      disposition: extract
    - atom: atm.evidence.acceptance-predicate
      pattern: Pure Policy
      source: packages/core/src/evidence/acceptance-predicate.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-22T08:14:48.767Z"
completed_by_agent: "codex-plan31-captain-2"
closedAt: "2026-07-22T08:14:48.767Z"
closedByActor: "codex-plan31-captain-2"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-22T08-14-48-683Z-close-4ac3b5c76b72"
lastTransitionAt: "2026-07-22T08:14:48.767Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "eb397c3d4801fae0baea7d7987c1fe64a1da2838"
---

# ATM-GOV-0251 Acceptance evidence predicates and realness taxonomy

## Intent

Add an optional machine-readable acceptance-evidence contract beside human
acceptance prose. The core contract answers what source is authoritative, how
the claim is derived, what evidence realness is required, who or what verifies
it, which negative controls must discriminate, and what missing data means.

The policy remains side-effect free. Import validates and preserves the
contract, while task closure consumes it in ATM-GOV-0252. This separation keeps
the taxonomy reusable by replay, performance, release, and future plan families
without embedding task IDs or Plan 3-specific conditions in core code.

## Acceptance

- [ ] `work-item.schema.json` accepts an optional `acceptanceEvidence` map. Each predicate has stable `id`, `claim`, `authoritativeSources`, `derivationRule`, `requiredRealness`, `verifier`, `negativeControls`, `missingDataVerdict`, and `closureCritical` fields.
- [ ] Existing prose-only task cards remain import-compatible. Import never invents predicates from prose or upgrades evidence realness from filenames, test titles, command names, or producer labels.
- [ ] The closed, ordered taxonomy is `fixture < unit < command-smoke < integration < sealed-replay < real-dogfood < production-ledger`; extensions require registry/schema change rather than conditional branches.
- [ ] Evidence may satisfy its declared class only when verifiable properties for that class are present. A higher class cannot be satisfied by a lower class plus a caller-provided label.
- [ ] `node atm.mjs --version`, echo/no-op/sleep-only commands, candidate selection, fixed PID/timing/cost fixtures, and self-reported lifecycle labels never qualify as `real-dogfood` or `production-ledger`.
- [ ] Unknown evidence classes, unavailable authoritative sources, failed derivation, and missing closure-critical observations produce `inconclusive`; missing values are never normalized to zero, empty, or healthy.
- [ ] Negative controls are first-class: a predicate that claims discrimination cannot pass unless the sealed negative scenario fails for the expected semantic reason and the positive scenario passes.
- [ ] The evaluator returns a deterministic per-predicate result and reasons without reading the filesystem, invoking commands, or deciding task status.
- [ ] Schema and evaluator fixtures cover lower-class substitution, forged labels, missing observations, invalid ordering, negative-control failure, and a valid real-dogfood contract.
- [ ] No actor, task, repository path, provider, date, workload, or Plan 3 identifier appears in control flow.
- [ ] Short English comments explain the taxonomy-extension boundary and why missing evidence remains `inconclusive`; comments do not duplicate schema prose.

## Evidence and rollback

Seal schema positive/negative fixtures and evaluator red/green receipts. Roll
back by reverting the commit; the additive field remains absent from older
cards and no compatibility migration is required.

## Atomization impact

- `atm.evidence.realness-taxonomy` owns class ordering and required properties.
- `atm.evidence.acceptance-predicate` owns pure predicate evaluation.
- CLI import is an adapter only and must not acquire a second policy table.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T04:45:45.567Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0251-acceptance-evidence-predicates-and-realness-taxonomy.task.md","contentDigest":"sha256:2da77b28f68784e3a2f408a8843b1d3bd42ae754d240872e2d2507ce8357bd47"} -->
