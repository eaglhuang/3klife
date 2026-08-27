---
doc_id: pending
title: ATM Product Proof Plan
status: active
family_dir: atm-product-proof
createdByCommand: atm plan doc create
---

# ATM Product Proof Plan

## Delivery contract

This document is the planning authority for the Product Proof family. Its
execution contracts are the separately governed `TASK-PRF-0002` through
`TASK-PRF-0008` cards; their existence is an acceptance condition for this
authoring task, not a request to re-deliver their bytes in this task's planning
commit. Each implementation card carries its own target-repository scope,
evidence, delivery commit, and closeout.

## Owner decision and planning-only exception

The owner authorized a planning-only exception on 2026-08-14. This document may
be authored in 3KLife without claiming or mutating the framework target. The
exception is deliberately narrow:

- Allowed: this plan and future PRF planning/task-card documents in
  `docs/ai_atomic_framework/atm-product-proof/`.
- Forbidden: changes to `C:\Users\User\AI-Atomic-Framework`, runner sync,
  release artifacts, npm publication, Git history rewriting, or task closeout.
- The exception expires for implementation as soon as a PRF task is ready to
  change the framework; that task must use the target repository's normal ATM
  lifecycle and scope lock.

## Decision statement

ATM must earn its complexity against a real worktree plus Git workflow. A green
internal ledger, generated receipt, synthetic benchmark, or completed task is
not product proof. The product is not considered ready until an independent
adopter can install it from npm, complete governed work, and show that the
result is at least as safe and materially more economical than the baseline.

The current evidence does not establish that result. It establishes the
opposite working hypothesis: ATM has material delivery, distribution, storage,
and coordination overhead that requires a bounded product-recovery programme
and an external decision test.

## Observed baseline and causal diagnosis

The plan uses the following observed facts as its starting point. Each phase
must refresh these measurements rather than treat them as permanent truth.

| Area | Observed condition | First-principles consequence |
| --- | --- | --- |
| CI | The latest observed GitHub run fails in ATM Doctor with `ATM_RUNNER_PUBLICATION_PENDING` and `ATM_DOCTOR_INTEGRATION_DRIFT`, before product checks run. | A red or blocked gate cannot attest product quality. Restore a small, deterministic product gate before making governance required. |
| npm | `create-atm` and the referenced `@ai-atomic-framework/*` packages were not installable from the public registry; the release run failed before publish. | A library has no adopter value until an untrusted machine can install and execute its dependency closure. |
| Git evidence | `.atm/history/evidence` contains about 2,639 tracked files and 81.76 MiB; repository pack size is about 1.33 GiB. | Runtime telemetry is an append-heavy operational store, not source code. Keeping it in Git taxes every clone, checkout, diff and CI run. |
| Adopter bundle | The CLI tarball was about 10.74 MiB unpacked with source and compiled tests; the root drop was about 45.73 MiB. | An adopter needs a narrow runtime contract, not the framework's development surface. |
| Benchmark | Existing comparisons use in-repo scenarios and deterministic Git models; p95 is not measured. One real paired sample was slower and used far more tokens in the team arm. | A benchmark that does not execute the alternative cannot prove advantage. Cost must include the work actually performed. |
| Governance | Main did not have conventional required CI/PR branch protection. | A gate without an enforcement point is advisory, not release control. |

## Product thesis and deep modules

The recovery work is intentionally organized around three deep modules. Their
interfaces must stay small while their internal policies remain replaceable.

| Deep module | Public contract | Internal freedom | Non-negotiable proof |
| --- | --- | --- | --- |
| Product Delivery | `buildArtifact`, `verifyArtifact`, `publishArtifact`, `verifyCleanInstall` | npm registry, temporary registry, package layout, release automation | A clean, networked environment installs the public package and performs the documented smoke workflow. |
| Evidence Ledger | `append`, `resolve`, `verify`, `checkpoint` | local content-addressed store, remote immutable store, retention, compaction | No runtime caller knows `.atm/history/evidence`; evidence is retrievable and verifiable after migration. |
| Comparative Evaluation | `runArm`, `adjudicate`, `aggregate` | workload adapters, tool runners, telemetry capture, blinding, statistics | Both ATM and real worktree-plus-Git arms execute the same sealed corpus and are evaluated by an independent oracle. |

These are product seams, not new governance abstractions. A proposed change is
rejected if it adds another registry, ledger, receipt format, or policy layer
without reducing one of the above interfaces.

## Economics-first priority order

The order follows dependency and option value, not the attractiveness of a
feature. A later phase cannot yield credible evidence while an earlier one is
false.

1. **Phase 0 — Make governance able to govern delivery.** Fix runner/publication
   drift and the plan-card-to-task-import incompatibility; freeze net-new
   governance expansion. This is first because the current toolchain cannot
   reliably plan, import, or enforce the work it asks users to do.
2. **Phase 1 — Recover a trustworthy product CI signal.** Separate required
   product gates from advisory dogfood/governance diagnostics, repair the actual
   failing standard validation set, then make passing CI enforceable on main.
3. **Phase 2 — Ship an installable package.** Establish dependency closure and
   clean-install proof before optimizing anything a user cannot obtain.
4. **Phase 3 — Remove operational evidence from source history.** This yields
   repeated savings in clone, checkout and CI costs, but only after the new
   ledger preserves integrity and retrieval.
5. **Phase 4 — Reduce adopter payload.** Once the published runtime is known,
   cut it to the adopter contract rather than guessing from the repository.
6. **Phase 5 — Run an independent comparative benchmark and decide.** Only an
   installable, stable, appropriately sized product may be compared fairly.

## Phase plan

### Phase 0 — Governance delivery integrity

**Goal:** make the planner, card generator, task importer and frozen runner one
compatible release line.

**Required work:**

- Reproduce and repair the absence of `plan` in the pinned 3KLife frozen runner.
- Make `plan card create` output losslessly consumable by `tasks import` in the
  same release; `causalGraph` must either round-trip or be rejected before card
  generation with a precise remediation.
- Correct planning-repository versus target-repository closure routing for
  planning-only work; a planning document must not require a framework-target
  mutation claim.
- Add a compatibility matrix test: generated document, registered series,
  generated card, dry-run import, write import and claim preview all run from
  the same packaged runner.
- Freeze new governance features until this matrix, runner publication and
  product CI are green on two consecutive protected-main runs.

**Exit gate:** one released runner passes the compatibility matrix from a clean
3KLife checkout. The new route emits no silent field loss, no source/frozen
behaviour divergence, and no cross-repo closure-authority misroute.

### Phase 1 — Product CI and release control

**Goal:** make a green build mean that installable product behaviour passed,
not merely that governance started.

**Required work:**

- Partition CI into a required `product` lane (install, typecheck, lint, unit,
  package smoke and clean-install smoke) and an advisory `dogfood` lane.
- Repair `validate:standard` and ATM Doctor at the real failing seam; do not
  suppress `ATM_RUNNER_PUBLICATION_PENDING` or integration drift with a waiver.
- Make skipped product checks visible as failure, never as a green result.
- Enforce the required product lane through GitHub branch rules or a ruleset
  that prevents direct main delivery of red changes.
- Publish a compact CI evidence summary with gate name, command, exit code,
  duration, runner version, package version and artifact digest.

**Exit gate:** at least ten consecutive protected-main runs are green, including
two release-candidate runs from a clean checkout. No required product check is
skipped or replaced by a local receipt.

### Phase 2 — Public npm delivery

**Goal:** turn ATM from source-available code into a usable npm product.

**Required work:**

- Define the supported public packages and ownership of npm organization,
  provenance, package access and token rotation. The release must fail closed
  when registry credentials or package ownership are absent.
- Remove unpublished internal runtime dependencies from the CLI distribution,
  or publish every required dependency as a coherent versioned release set.
- Test `npm pack` contents against an allowlist: compiled runtime, schemas,
  templates and required docs only. Exclude source tests, repository fixtures,
  private evidence and development scripts.
- Run clean-install acceptance in a temporary directory and, before public
  release, an isolated temporary registry. The test must execute `--help`,
  `init`, one documented smoke flow and uninstall/cleanup.
- Publish a prerelease, then stable only after the same tarball is independently
  installed from the public registry.

**Exit gate:** `npm view` resolves all public packages; a clean external machine
installs the public version with no workspace link, can execute the smoke flow,
and reports the expected version/digest.

### Phase 3 — Evidence Ledger migration and Git-history reduction

**Goal:** make runtime evidence verifiable without making every source clone
carry the operational database.

**Required work:**

- Introduce the Evidence Ledger interface and a content-addressed local adapter
  first. Keep the current path only as a temporary read adapter.
- Migrate all direct `.atm/history/evidence` callers through the interface; add
  a static guard that prohibits new direct path references outside the adapter.
- Define retention, encryption/access policy, checkpointing, replication,
  recovery drill, immutable IDs, content digests and offline behaviour.
- Export, verify and retain a migration manifest before removal. Prove that a
  sampled historical receipt resolves to identical digest and provenance in the
  new store.
- Treat Git history rewrite as a separately owner-approved operation with a
  clone/mirror rollback plan. It must not be bundled with behavioural changes.

**Exit gate:** no runtime source caller references the legacy evidence path;
new evidence is stored outside Git and resolves by immutable digest; a restore
drill succeeds. Only then may a separate history-rewrite proposal be opened.

### Phase 4 — Adopter bundle minimisation

**Goal:** ship only what an adopter executes.

**Required work:**

- Produce three explicitly different artifacts: npm runtime, optional
  single-file adopter runner, and developer kit. No artifact may be a generic
  repository copy.
- Generate a manifest explaining every packed file and its importing runtime
  entrypoint. Reject orphan source, tests, CI fixtures, operational evidence and
  duplicate development assets.
- Add pack-size and file-count budgets to CI, measured from `npm pack` rather
  than repository size.
- Preserve package correctness with clean-install and smoke tests after every
  reduction.

**Initial budgets to validate against the Phase-2 baseline:** reduce unpacked
CLI bytes by at least 70%, entry count by at least 80%, and root-drop bytes to
less than 25% of the observed baseline. Budgets may be revised only with a
published dependency-level explanation and owner approval.

**Exit gate:** each artifact passes clean-install smoke, manifest audit and its
budget. The developer kit is never transitively required by the runtime.

### Phase 5 — Independent external comparative benchmark

**Goal:** make an evidence-based keep, narrow, or stop decision for ATM.

**Design requirements:**

- Use at least two external repositories not authored as ATM benchmark
fixtures, selected before implementation and with their commit SHAs sealed.
- Run the baseline with real `git worktree` and normal Git/PR workflow, not a
  deterministic model. Run the ATM arm using the published npm package only.
- Use AB/BA counterbalancing, equivalent task briefs, fixed model/provider
  configurations where possible, and a pre-registered retry policy.
- Keep the hidden conflict oracle separate from both arm implementers. Include
  positive conflicts, benign concurrency, semantic conflicts, stale-base cases,
  recoveries and negative controls.
- Capture raw timestamps, prompts, model/token usage, provider cost, human
  intervention minutes, retries, commands, merge/repair time and independent
  oracle outcomes. `p95` is measured from raw runs, never derived.
- Release anonymised raw logs, corpus version, scripts, environment manifest,
  adjudication rubric and aggregate analysis so another party can rerun it.

**Metric definitions:**

| Metric | Definition |
| --- | --- |
| False block | ATM blocks or serializes a change pair that the independent oracle labels safe to run concurrently. |
| Missed conflict | ATM permits concurrent progression that the independent oracle labels as requiring coordination or repair. |
| Human cost | Wall-clock minutes of intervention outside normal task execution, coded by a published taxonomy. |
| Token and cash cost | Provider-reported input/output/reasoning tokens and actual billed currency, reported per completed accepted task. |
| Delivery cost | End-to-end elapsed time, retries, repair/merge time, failed runs and successful completion rate. |

**Decision rule:** ATM may claim advantage only if the pre-registered analysis
shows no statistically and operationally material regression in missed conflict
or completion rate, no worse false-block rate, and at least 20% improvement in
one primary delivery-cost metric without a material worsening in human time,
token/cash cost or repair burden. The protocol must include a sample-size or
precision analysis before runs begin.

**Stop rule:** after two independent rounds fail the decision rule, stop
expanding general governance. Reduce ATM to the smallest independently useful
capability—such as an optional conflict detector or evidence ledger—and rerun a
narrow benchmark only if that module has a separately credible value claim.

## Cross-phase controls

- Every phase has a source-of-truth artifact, a raw-evidence location, a named
  rollback, an independent validator and a public exit gate.
- A task cannot close merely because ATM accepts its receipt. It closes only
  when its phase exit evidence is fresh, reproducible and tied to the released
  artifact or sealed benchmark corpus.
- New policy, registry or receipt layers require deletion of an equivalent
  existing layer or an explicit owner decision describing why the net complexity
  is justified.
- CI, npm publication and benchmark execution must disclose when evidence is
  unavailable. `unknown` is valid; fabricated, modeled or derived values must
  never be presented as measured outcomes.

## Initial task decomposition

The next PRF cards should be created through `atm plan card create` after Phase
0 resolves the compatibility defect. `TASK-PRF-0002` and `TASK-PRF-0003` are a
parallel-start pair: 0002 supplies a compatibility-matrix validation input to
the 0003 product-CI lane, but does not block its claim. Their results join at
compose and acceptance, where a failed matrix remains fail-closed. Subsequent
cards use proposal-first start and defer predecessor outputs to compose and
acceptance unless a typed six-fact hard-causal proof establishes that no stable
interface, fixture, late binding or deferred compose can substitute for that
output. The following is intended delivery ordering, not a claim-serialization
rule:

1. `TASK-PRF-0002`: frozen/source runner and plan-import compatibility matrix.
2. `TASK-PRF-0003`: required product CI split and protected-main enforcement.
3. `TASK-PRF-0004`: npm dependency closure, pack allowlist and clean-install
   release proof.
4. `TASK-PRF-0005`: Evidence Ledger contract, migration adapter and path guard.
5. `TASK-PRF-0006`: three-artifact bundle manifests and CI budgets.
6. `TASK-PRF-0007`: external benchmark protocol, corpus sealing and oracle.
7. `TASK-PRF-0008`: external benchmark execution, analysis and keep/narrow/stop
   decision.

### Shared-manifest compose amendment

`TASK-PRF-0004` and `TASK-PRF-0006` may prepare proposals concurrently against
the same `packages/cli/package.json` baseline. Their shared-file intents are
distinct resources: the runtime allowlist owns `/files` through
`atom.npm-package.runtime-allowlist` (`ATM-CORE-0006`), while the artifact
budget owns `/atmArtifactBudget` through `atom.npm-package.artifact-budget`
(`ATM-CORE-0007`). A neutral Broker steward is the only writer for their
composed transaction. A shared filename alone is never a reason to serialize
their claims; compose remains fail-closed on an overlapping resource, stale
base, CAS mismatch, or unsupported format adapter.

No task in Phase 3–5 may start merely because its predecessor has a green
internal task status; it requires the predecessor's stated external exit gate.

## ErrorCode Registry Migration Note

If this family owns error governance, keep the canonical
`docs/governance/error-code-registry.json` in place until a governed migration
task updates emitters, generators, tests and documentation together.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-13T16:06:54.992Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-product-proof-plan.md","contentDigest":"sha256:f11f250ccae9ba9126b89000f968a456214ca8415903d8c2a9955debe310d47e"} -->
