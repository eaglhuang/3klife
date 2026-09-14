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

**Net-benefit accounting:** The benchmark must report ATM's incremental cost
separately from task execution cost. For each arm and each accepted task, retain
`installCost`, `learningCost`, `executionOverheadCost`, and
`maintenanceCost` as observed minutes, tokens, billed currency, and elapsed
time (unknown is never coerced to zero). Compute:

```text
ATM_net_benefit =
  (baseline_delivery_cost - ATM_delivery_cost)
  - (ATM_install_cost + ATM_learning_cost
     + ATM_execution_overhead_cost + ATM_maintenance_cost)
```

The primary currency/time view must be pre-registered, with human minutes and
provider-billed currency reported separately rather than silently exchanged.
Installation includes first-time setup and package acquisition; learning
includes documented onboarding and operator training; execution overhead
includes governance routing, claims, locks, evidence and coordination time;
maintenance includes upgrades, policy upkeep, repair and evidence retention.
The decision cannot claim a positive result unless the lower bound of the
pre-registered confidence/precision analysis remains positive and safety
non-inferiority still holds. Missing any one cost component makes the result
`inconclusive`, not zero-cost.

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

## Publication recovery follow-up

`TASK-PRF-0009` is a transport-and-verification recovery slice. It exists
because the Product Proof source has a fail-closed correction that prevents a
digest-only hidden-corpus claim from being presented as an independent external
acceptance, but the correction must reach protected main and CI without changing
the blocked state of `TASK-PRF-0008`.

The recovery card may publish only the already-reviewed correction and its
generated public runner projections, then verify protected-main CI. It must not
create, reseal, or accept hidden-corpus, adjudication, provider-telemetry, raw
run, or product-decision evidence. `TASK-PRF-0008` remains blocked until those
artifacts are independently produced and verified.

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

## Evidence-ledger completion correction

`TASK-PRF-0010` corrects the gap exposed by the 2026-09-10 caller-level audit.
`TASK-PRF-0005` delivered a provider-neutral ledger and migration prototype,
but its closure did not prove that runtime callers stopped depending on
`.atm/history/evidence`. At audit time Git still tracked 3,191 files under that
root (92,513,826 bytes), and runtime source contained many direct path
references outside the designated legacy reader.

The correction is deliberately interface-first: classify evidence by lifecycle,
route ephemeral runtime payloads through one content-addressed ledger, retain
only compact durable checkpoint/closure receipts in Git, and make the static
boundary validator scan every production caller. It does not rewrite Git
history or delete legacy records. Those destructive actions remain a separate,
owner-approved decision after digest-preserving migration and restore proof.

The phase exit gate is not "a ledger type exists". It is a clean-repository
runtime exercise showing that newly generated command evidence stays outside
the Git candidate set, remains resolvable offline by digest, can be restored
from an exported checkpoint, and leaves only the documented durable receipt
classes eligible for commit.

### Installable-runtime prerequisite correction

`TASK-PRF-0011` is a P0 interruption discovered while preparing PRF-0010. The
compact frozen runner can report version, initialize an adopter and run doctor,
but `atm create --dry-run` fails because the package omits the atom scaffold
templates. This means the published-shape artifact is small but not yet a
functionally closed ATM product. PRF-0011 restores only the runtime-required
templates and adds the exact command to the isolated tarball smoke gate before
Evidence Ledger atom extraction resumes.

### Release-surface disjointness correction

`TASK-PRF-0012` is a P0 follow-up from the 2026-09-10 installability and CI
audit. The compact npm runtime now builds as a 76-file / 3,330,457-byte runtime,
but the current onefile budget rebuild embeds the npm-runtime surface again and
reports 6,128,982 bytes against the 4,500,000-byte cap. The same run reports
`ONEFILE_BUILD_SCRIPT_BOUNDARY_DRIFT`: `package.json`, the sealed runner wrapper,
and `validate-onefile-budget` do not agree on the canonical builder entrypoint.

This correction must make the npm and onefile inventories explicit and
non-overlapping, then bind package scripts, sealed publication, manifests, and
validators to one builder contract. It must preserve the original size cap and
fail closed on missing release evidence. It is independent of `TASK-PRF-0008`:
no external custodian, adjudicator, provider telemetry, or A/B verdict may be
invented or inferred while this packaging work proceeds.

### Clean-install npm proof correction

`TASK-PRF-0013` is the next product-proof slice. The existing Product CI job
checks package metadata and `npm pack --workspaces --dry-run`, but that is not
equivalent to proving that a consumer can install the produced CLI tarball and
execute its public bin from an empty directory. The package must be packed as
the real workspace artifact, installed with scripts disabled in an isolated
temporary consumer, and exercised through the same public command that an
adopter receives. Product CI must run this smoke on every protected-main
candidate and retain the measured tarball inventory and command output as
evidence.

The card is deliberately narrower than publication: it does not publish to
npm, change dist-tags, or claim that remote protected-main CI is green. Its
exit gate is a local, command-backed install proof plus a workflow contract
that fails closed when the clean-install smoke is removed or weakened.

### Protected-main CI re-verification correction

The first remote run after the clean-install work is still not a green
product signal. Read-only inspection of GitHub Actions run `34136912919`
(`a85ed1203a3ddb279c9dc659d24373706bb2172e`, 2026-09-07) shows the Product
CI job failed in the ATM Dogfood lint step on a tracked duplicate import in
`tests/cli/write-ticket-scope-amendment.test.ts`. The current local checkout
now passes `npm run lint`, so the observation is a stale remote-main proof,
not evidence that protected main is green.

`TASK-PRF-0014` is an evidence-and-transport gate, not permission to push or
to weaken CI. It may begin only after the owner authorizes delivery of the
already-reviewed local commits. It must record the exact remote SHA, workflow
run IDs, required Product CI conclusion, and consecutive-run count. A local
green result, a successful sandbox workflow, or a manually supplied receipt
cannot satisfy this gate. If remote CI fails, the task remains open and must
name the first failing command and preserve the run URL; no waiver converts a
red required lane into green.

### Public-registry proof correction

The clean-install tarball proof is still local evidence, not public npm
delivery. A read-only registry check on 2026-09-10 returned `E404` for
`@ai-atomic-framework/cli@0.1.0`; only `create-atm@0.1.0-beta.0` resolved.
`TASK-PRF-0015` therefore owns the public-registry exit gate separately from
the local pack/install implementation. It must first establish owner-approved
npm organization ownership, provenance and token policy, then publish only
after the protected-main Product CI gate is green. The task must verify the
exact public version from an isolated consumer with no workspace link and
record the registry tarball digest. Missing credentials, package ownership,
or a 404 remain blocked/inconclusive; they must not be replaced by a local
tarball or a `create-atm` bootstrap result.

### Public beta closure correction

The first public-registry probe exposed a second actionable failure class:
`@ai-atomic-framework/cli@0.1.0-beta.0` resolves but its workspace dependencies
still request unpublished stable `0.1.0` versions; `0.1.0-beta.1` resolves its
dependency versions but fails in an isolated consumer because the published
runtime cannot resolve `integration-claude-code`. The current worktree's
rebuilt runtime passes the local isolated `scripts/validate-npm-clean-install.ts`
gate, so the remaining gap is publication of a corrected immutable version and
independent registry re-verification.

`TASK-PRF-0016` owns this correction. It must preserve the existing release
workflow's workspace-version synchronization and runtime-closure build, add a
public-beta regression contract for dependency resolution and CLI startup, and
keep publication/provenance owner-authorized. A local tarball pass, a registry
metadata lookup alone, or an old beta tag cannot close the task.

The later sealed benchmark protocol names `@ai-atomic-framework/cli@0.1.0-beta.4`
with tarball digest
`sha256:6b1affb435479a7bf62e0d69d504f979b2f490680273692ad747ec766f460424`.
On 2026-09-11 a fresh public-registry consumer verified that exact beta.4
tarball with no workspace link and a successful `atm --version` startup. This
strengthens the package prerequisite for the benchmark, but does not alter the
benchmark's independent-custodian, adjudication or provider-telemetry gates.

However, public beta.4 is not yet an acceptable size proof: its registry
metadata reports 1,703,377 compressed bytes, 7,599,532 unpacked bytes and 1,152
files, while the current local `npm-runtime` candidate reports 930,475
compressed bytes, 3,357,258 unpacked bytes and 76 generated runtime files.
`TASK-PRF-0018` therefore owns republishing an immutable slim beta and rebinding
the benchmark manifest to that exact tarball. Installability alone does not
close the adopter-bundle requirement.

Implementation checkpoint (2026-09-11): the public-install validator now fails
closed when registry metadata exceeds the declared artifact budget. Both beta.2
and beta.4 are installable/startable but exceed the current 3,365,772-byte and
308-entry limits (beta.4: 7,599,532 unpacked bytes, 1,152 files), so their
reports are explicitly **BLOCKED / INCONCLUSIVE** rather than verified size
proof. The local candidate is 3,357,258 unpacked bytes across 78 files; it is
the rebuild target, not yet a published release. No publish or push is implied
by this checkpoint.

### Independent benchmark execution card

`TASK-PRF-0019` is now registered for the final proof layer. It treats the
worktree-plus-Git workflow as a first-class baseline and requires the same
hidden task corpus, repository snapshots, provider budget and task order in
both arms. The card explicitly measures false blocks, missed conflicts,
human minutes, token usage, wall-clock time, retries and merge/rebase overhead;
it also requires an independent corpus custodian and a preregistered
non-inferiority/cost decision rule. Missing seals or telemetry keep the result
**BLOCKED / INCONCLUSIVE**.

### Protected-main CI burn-in correction

The local Product CI contract, typecheck and lint are currently green, but the
live protected-main evidence is still red/inconclusive: the ten newest `ci`
runs on `main` are historical standard failures and the required set contains
no two release-candidate observations. This means ATM has not yet demonstrated
long-term green CI at the boundary a market adopter would rely on.

`TASK-PRF-0017` owns the next proof gate. It requires a fresh candidate commit
that passes local gates, then a live API verification of ten newest main runs,
at least two manually dispatched release-candidate runs, and successful
`Product CI` in every run. The task explicitly forbids replacing remote proof
with local output or rewriting historical red evidence. Push and dispatch
remain owner-authorized actions; without that authority the result stays red or
inconclusive rather than being waived.

The live run ledger was also corrected for evidence fidelity: run `34136912919`
has `Product CI=success` and `ATM Dogfood=failure`. The latter is advisory and
does not invalidate the required Product CI job, but the run still does not
satisfy the burn-in because it is standard (not release-candidate) and the
current ten-run window lacks the required two release-candidate observations.

### External execution handoff packet

The benchmark verifier and protocol tests are green, but execution is still
blocked by the missing signed hidden-corpus acceptance. The handoff boundary is
therefore explicit:

1. The hidden-corpus custodian signs `hidden-corpus-acceptance.json` with
   `visibility: oracle-only` and the preregistered protocol digest.
2. A neutral steward updates only the mutable execution-prerequisite seals; the
   workload, thresholds, repository SHAs, arm definitions and counterbalancing
   order remain immutable.
3. Baseline and ATM operators run fresh AB and BA pairs, recording raw
   timestamps, prompts, provider tokens, billed cost, human minutes, retries,
   commands and repairs. Workspace links, modeled timing and missing cost data
   invalidate the round.
4. The independent adjudicator signs anonymized labels; the telemetry signer
   supplies the original provider export. The verifier then produces only
   `keep`, `narrow`, `stop` or `inconclusive`.

Until those four roles return signed artifacts, TASK-PRF-0008 remains planned;
no local fixture, synthetic timing or ATM-authored adjudication can substitute
for the external packet.

### Latest command-backed checkpoint (2026-09-11)

The external benchmark protocol, metrics, and decision-rule contract tests all
pass, and protocol validation remains `preregistered` with two repositories;
execution is still `blocked:hiddenCorpusAcceptance`. This proves that the
measurement instrument is internally coherent, not that ATM has won the
comparison.

The slim local runtime build now passes its declared artifact budget
(`3,353,170` bytes / `76` files in the generated npm-runtime directory). After
committing the source change at `c86d88cb539dd0de15f1a28f368039066b6169b1`, a
fresh full sealed build made the frozen runner source seal valid; `doctor`,
adopter-artifact validation, and internal-release validation are green. The
remaining TASK-PRF-0018 gate is the public registry proof for a newly published
slim version, which is intentionally not fabricated from beta.4. Consequently
TASK-PRF-0018 remains open, TASK-PRF-0019 remains dependency-blocked, and no
public npm publish, Git push, or benchmark result is implied by this checkpoint.

### Owner action packet (external-state boundary)

The remaining work now has a narrow external boundary rather than an
implementation ambiguity:

1. **Publish:** an owner-authorized release steward publishes the exact commit
   `c86d88cb539dd0de15f1a28f368039066b6169b1` (or a later reviewed descendant)
   under a new immutable npm version. The steward records the tarball URL,
   integrity, `dist.unpackedSize`, and `dist.fileCount`; the public-install
   validator must pass against that version. Republishing beta.4 is not a
   substitute because it is over budget.
2. **Protected-main CI:** after the reviewed commit reaches the protected
   remote, the owner dispatches two release-candidate `ci` runs and captures
   the newest ten `main` runs. Every required `Product CI` job must succeed;
   advisory `ATM Dogfood` failures remain separately classified. The owner
   retains remote run URLs and commit SHAs as immutable evidence.
3. **Benchmark handoff:** once the public version is sealed, an independent
   custodian signs hidden-corpus acceptance, then neutral operators execute
   ATM and worktree+Git arms in AB/BA order. The adjudicator and telemetry
   signer return raw conflict labels, human minutes, provider tokens/cost,
   retries and wall-clock data before the decision rule is evaluated.

Until those owner/external artifacts exist, the product claim is intentionally
limited to **locally installable and internally validated**, not market-proven.

Evidence-fidelity correction was committed in target repo at
`747aad21ea5b9105e39e414d9ff96cd764ca5f68`; the benchmark report now states
that hidden-corpus acceptance is not sealed, matching the protocol fixture.

### Registry snapshot (read-only, 2026-09-11)

The public registry currently exposes only `0.1.0-beta.0` through
`0.1.0-beta.4`; `next` still points to beta.4 and `latest` to beta.0. Beta.4
reports `dist.unpackedSize=7,599,532` and `dist.fileCount=1,152`, confirming
that no new slim public version has appeared. This snapshot is observational
only and does not authorize publication.

The current local Product CI contract, CI product-lane test, and release-trust
contract all pass on the reviewed tree. A read-only API audit of the latest ten
remote `ci.yml` runs found the required `Product CI` job successful in all ten;
the overall workflow is red because the separate advisory `ATM Dogfood` job
fails lint. This is a workflow-health problem, but not a Product CI gate
failure. TASK-PRF-0017 remains open because the window contains zero
release-candidate runs and therefore still lacks the required two candidate
observations for protected-main burn-in.

### Advisory Dogfood lint remediation (TASK-PRF-0021)

The remote failure is now traced to a single historical mechanical lint defect:
run `34136912919` failed `npm run lint` because
`packages/cli/src/commands/tasks/status-triangulation.ts` had a duplicated
import under ESLint `no-duplicate-imports`. The reviewed local worktree now has
one import declaration and `npm run lint` passes, so TASK-PRF-0021 is primarily
a remote-delivery and post-delivery evidence card; it must not duplicate an
already-applied code fix or count/waive TASK-PRF-0017's release-candidate runs.

This distinction improves the evidence model: a green Product CI result proves
the installable product lane; a green advisory Dogfood result proves the
repository's self-hosting hygiene; only the separately observed release-
candidate window can establish protected-main burn-in.

The reviewed local delivery candidate is currently `747aad21ea5b9105e39e414d9ff96cd764ca5f68` (with the slim-runtime source change at
`c86d88cb539dd0de15f1a28f368039066b6169b`). It contains `origin/main` as an
ancestor and passes local lint, but it is not remote evidence until an
authorized steward pushes it and records the resulting workflow runs.

### Post-push CI finding (run 34607184874)

The authorized push reached `origin/main`, and the new CI run confirmed that
the duplicate-import lint regression is gone: Dogfood lint passed. However,
the required Product CI packed-CLI smoke failed during `npm pack` with 280
esbuild resolution errors, beginning with missing
`../_vendor/agent-pack-sdk/dist/index.js` and the Claude/Copilot/Cursor/Gemini
vendor modules. This is stronger evidence than the earlier historical lint
failure: the slim package boundary itself is incomplete in a clean checkout.
TASK-PRF-0022 now tracks the vendor-boundary repair and explicitly blocks npm
publication until an isolated pack/install smoke succeeds. The product proof
remains unestablished.

Initial source inspection narrows the mechanism further: `buildCliRuntimeClosure`
copies only each workspace's declared `files` roots from already-built
`packages/<name>/dist`. In a clean checkout, the agent-pack workspace `dist`
trees are absent, so the closure silently skips them while the CLI transpiled
modules still reference `_vendor/agent-pack-*/dist/*.js`. Local inventories can
pass only because prior builds left those dist trees behind. TASK-PRF-0022 must
therefore make prepack deterministic (build required workspace outputs or use a
validated source-to-runtime transform) and fail closed when a referenced vendor
root is missing.

### Requirement-to-evidence scorecard (2026-09-11)

| Product requirement | Authoritative evidence | Current status | Why this is not yet a market claim |
|---|---|---|---|
| Small, installable npm package | Local `validate-adopter-artifact-manifest` (3,357,258 bytes / 78 files), clean-install validator, and public registry snapshot | **Local PASS; public FAIL** | The only public `next` artifact is beta.4 at 7,599,532 bytes / 1,152 files; no slim version is published. |
| Long-lived green CI | Ten newest remote `ci.yml` runs with `Product CI=success`; zero release-candidate runs; advisory Dogfood lint failure | **Product lane PASS; burn-in INCOMPLETE** | Ten standard observations do not satisfy the two release-candidate requirement, and overall workflow health is still red. |
| Independently rerunnable A/B data | Protocol/metrics/decision validators; fixture has `hiddenCorpusAcceptance.sealed=false` and `runEligibility=blocked:hiddenCorpusAcceptance` | **Instrument PASS; execution BLOCKED** | No independent sealed corpus, adjudication packet, provider telemetry, or measured ATM-vs-worktree result exists. |

The scorecard is deliberately conjunctive: a local package proof cannot
substitute for public installation, standard green runs cannot substitute for
protected-main candidate observations, and a valid benchmark protocol cannot
substitute for independently signed execution data. Product Proof remains
**not established** until all three rows reach their stated evidence level.

## Follow-up: Isolated AI benchmark and independent replication

The owner requested a complete execution plan and all ATM task cards on 2026-09-13.
The detailed plan is [isolated-ai-benchmark-plan.md](isolated-ai-benchmark-plan.md).
Reuse the approved PRF family. TASK-PRF-0034 through TASK-PRF-0044 own the
versioned measurement repair, isolated pilot, formal trial, external replication,
and combined product decision. TASK-PRF-0008 and TASK-PRF-0019 remain historical
blocked execution records until their evidence obligations are reconciled; new
card creation does not close them or claim independent evidence.

The existing planning-only exception applies to this plan and source cards.
Actual framework changes require target admission. Benchmark worktrees are
disposable external-project experimental units, not framework development lanes.

## Follow-up: TASK-PRF-0051 — Re-establish protected-main Product CI burn-in after delivery drift

The current live check exposed a new post-delivery evidence gap without
invalidating the historical cards: the protected `main` workflow has only one
eligible `release-candidate` observation in the current window, and the newest
sample also contains failed standard Product CI runs. The remote validator
therefore fails closed with `protected-main burn-in requires at least two
release-candidate ci runs`. TASK-PRF-0051 is an append-only revalidation card;
it must not rewrite TASK-PRF-0031, TASK-PRF-0043, or any earlier green/blocked
history.

## Follow-up: TASK-PRF-0064 — Scope CI burn-in evidence to the product workflow

The first replayable 0059 export contains 800 protected-main attempts across
three workflow families: 621 `Product CI burn-in (standard)`, 9
`Product CI burn-in (release-candidate)`, and 170 generic `ci` runs. The
collector currently treats every attempt with no explicit `eligible:false` as
eligible, so all 800 records enter the 30-day/90-run evaluator. This mixes
unrelated test/lint runs into a product-delivery claim and makes the observed
620 failures impossible to interpret as a single product workflow signal. The
export also carries a separate `productCi.conclusion`: among the 621 standard
product workflow attempts, the product job is 618 success / 3 failure while
the workflow overall contains 448 failures, mostly isolated `atm-dogfood`
failures. The collector currently maps the workflow-level conclusion onto the
product run, so the observed failures cannot be interpreted as one product
workflow signal.

TASK-PRF-0064 owns the evidence-boundary repair. It must define a
configuration- or schema-backed workflow scope, classify out-of-scope attempts
as excluded with a machine-readable reason, and preserve the original export
and digest. For an in-scope workflow, the product job conclusion must be the
burn-in conclusion; the workflow-level conclusion remains retained as
provenance and must not turn an independent `atm-dogfood` failure into a
product failure. The evaluator must count only scoped, eligible product runs while
reporting excluded counts and reasons; it must never silently turn missing or
ambiguous workflow identity into an eligible run. The chosen scope must be
explicit enough to reproduce against the existing 0059 export and must retain
the release-candidate policy decision as observable data rather than a hidden
string special case.

Acceptance requires a replay of the unchanged 0059 export showing the scoped
run count, excluded generic-`ci` count, failure-class distribution, calendar
window, product-vs-workflow conclusion separation, and semantic verdict.
Focused tests must cover exact in-scope workflow,
out-of-scope workflow, missing workflow identity, explicit exclusion reasons,
and tampered scope configuration. A negative result remains negative when
scoped product failures or unresolved repairs remain. No CI workflow permissions,
thresholds, npm publication, GitHub push, or historical task provenance may be
changed by this card.

The card measures the exact live `Product CI` required context, release-
candidate coverage, failed/cancelled run classifications, and the 90 completed
protected-main runs over at least 30 calendar days. A report may conclude
`insufficient-window`, `unexplained-failure`, or `pass`; only the latter is
eligible for the long-lived green-CI product claim. Raw API exports and mutable
runtime evidence stay outside Git history, while the report records commands,
query bounds, digests, and the observed red/inconclusive state. This follow-up
does not authorize a push, npm publication, threshold waiver, or A/B benchmark
conclusion.

## Current evidence checkpoint: post-0051 revalidation (2026-09-14)

TASK-PRF-0051 is now closed as an evidence-delivery task, not as a successful
burn-in result. Its target ledger and planning mirror agree on `done`, and the
close evidence gate passed. The authoritative reports are
[`atm-product-ci-burn-in.md`](C:/Users/User/AI-Atomic-Framework/docs/reports/atm-product-ci-burn-in.md)
and [`atm-product-proof-checkpoints.md`](C:/Users/User/AI-Atomic-Framework/docs/reports/atm-product-proof-checkpoints.md);
the raw GitHub export remains outside Git at
`C:\\Users\\User\\atm-benchmark-sink\\TASK-PRF-0051\\raw\\`.
The current export is `ci-runs-2026-09-14.json`
(`sha256:485d082e5addd7e9f1c08d6acf2e1a5b04f44ff8d040dfb91b1673c4139e7517`)
and the evaluator output is `burn-in-report-2026-09-14.json`
(`sha256:d257dab99c9a3a822e33ed206b2058eae2883f1dcccef7343ad8ae542b64c215`).

| Product proof line | Fresh observation | Decision |
|---|---|---|
| Small, complete npm package | Candidate clean-install proof: 2,640,961 unpacked bytes / 66 entries; public registry comparison: 3,357,358 bytes / 78 entries; fixed-baseline reduction 21.34% and 15.38% fewer entries. A fresh clean public install of `@ai-atomic-framework/cli@0.1.0` passed install, `--version`, `doctor`, and `bootstrap`, but `atm-chart render` failed because `schemas/governance/default-guards.schema.json` is absent from the published package. | **Installable but core workflow incomplete.** The candidate size result is supported; the public package is not yet a complete adopter delivery. |
| Sustained protected-main CI | 100-run export covering 6.752234 days: 35 successful, 65 failed, current success streak 4; only 1 eligible release-candidate in the newest-ten check. | **Not established.** The 30-day / 90-valid-run gate remains fail-closed; no long-term-green claim is permitted. |
| Independent A/B net benefit | `TASK-PRF-0040` packet remains `blocked-before-run`; metrics and raw refs are absent because isolation, credentials/budget, approved repositories, and independent oracle inputs are not supplied. | **Not established.** Instrumentation and planning do not substitute for external execution. |

The 0051 result updates the scorecard's evidence watermark without rewriting
historical cards: package delivery has a measured candidate result, CI has a
measured negative/inconclusive window, and comparative product value still has
no valid arm data. The public-install receipt is retained outside Git at
`C:\\Users\\User\\atm-benchmark-sink\\TASK-PRF-0051\\public-install-2026-09-14\\public-install-receipt.json`
(`sha256:0216e927043b41f27ab69580c5fcdc4c84b229e014437345d41df9a5704c44ba`).
The overall ATM product proof remains **not established**.

## ErrorCode Registry Migration Note

## Follow-up: TASK-PRF-0058 — Collect protected-main CI lifecycle evidence

The stricter TASK-PRF-0055 evaluator correctly rejects the current GitHub
export because it lacks per-attempt lifecycle data (`firstFailureAt`, retry
count, repair acceptance, failure class, and exclusion reasons). This is an
evidence-collection gap, not permission to weaken the 30-day / 90-valid-run
burn-in contract. TASK-PRF-0058 adds one provider-neutral collector that turns
explicit GitHub run-attempt and job-attempt exports into the evaluator's
newest-first `CiRun` lifecycle receipt.

The collector must fail closed when attempt identity, job outcome, failure
class, repair relationship, or exclusion provenance is missing; it must never
fill missing telemetry with zero or infer repair time from an unrelated
timestamp. Raw provider exports stay outside Git, while the checked-in report
records only query bounds, receipt digests, schema/version, and an offline
replay command. The same sealed fixture must reproduce the same canonical
digest and the same evaluator result, including negative `invalid-input`
cases. This task does not change CI thresholds, workflow permissions, npm
publication, or the external A/B benchmark.

## Follow-up: TASK-PRF-0057 — Preserve complete metadata for explicit candidate tarballs

The completed TASK-PRF-0056 candidate proof validates the full core workflow,
but a fresh invocation with `--candidate-tarball` exposed a provenance gap:
the validator installs and exercises the supplied tarball successfully while
recording `version: local`, `unpackedBytes: 0`, `entryCount: 0`, and an empty
file list. This violates the same complete-install evidence contract that the
candidate-directory path already satisfies and makes an externally supplied
tarball impossible to compare or rerun faithfully.

TASK-PRF-0057 is an append-only evidence-contract repair. It must inspect the
explicit tarball itself, recover package name/version, unpacked byte total,
entry count, and deterministic file metadata, and fail closed for malformed or
metadata-incomplete archives. Candidate-directory and explicit-tarball modes
must retain their source distinction but produce equivalent metadata for the
same archive. The card does not alter the runtime boundary, the size budget,
the public registry, or npm publish authorization; it must preserve the failed
public-package evidence and candidate-only labeling.

## Follow-up: TASK-PRF-0056 — Require the complete core workflow in candidate npm proof

The TASK-PRF-0053 review confirmed that the public-registry validator now runs
the complete core workflow, but `scripts/validate-candidate-npm-install.ts`
still proves only the legacy `version`, `next`, `tasks`, and `doctor` smoke
commands. This leaves a semantic gap: a candidate tarball can be called
installable even when `bootstrap`, `atm-chart render`, or `atm-chart verify`
cannot execute from the unpacked package. The local candidate currently carries
the required chart schemas, so this follow-up is an evidence-contract repair,
not a new bundler split or a publish authorization.

TASK-PRF-0056 extends the candidate validator and its contract tests to use the
same clean-consumer core workflow required by the public proof, while retaining
the candidate/registry/baseline separation and fail-closed behavior. It must
record the exact command matrix, module-resolution failures, metadata and
workspace-link status. A negative fixture with a missing chart schema must stay
blocked. The card may close with a candidate PASS even while the public
registry remains blocked, but it must never convert that candidate result into
a public-release claim. No npm publish or push is authorized by this card.

If this family owns error governance, keep the canonical
`docs/governance/error-code-registry.json` in place until a governed migration
task updates emitters, generators, tests and documentation together.

## Follow-up: TASK-PRF-0031 — Continuous Product CI burn-in retention

The latest burn-in measurement showed only a 6.17-day observation window,
despite the Product CI lane itself passing. The workflow currently runs on
pushes and manual dispatches but has no recurring protected-main observation.
TASK-PRF-0031 adds a low-cost daily schedule and a fail-closed contract that
preserves the existing Product CI checks, denies publish/write permissions,
and keeps the burn-in evaluator as the sole source of the long-term claim.

The task does not alter historical records, claim long-term success early, or
substitute scheduled CI for the independent A/B benchmark.

## Follow-up: TASK-PRF-0033 — Fail-closed timeout and diagnostics for Standard Dogfood

The protected-main observation `34708532902` delivered a successful Product CI,
but remained in progress at `ATM Dogfood -> Validate Standard` with no updated
timestamp or available live log. Local execution shows the validator suite is
progress-aware and can run for a long time, so the current workflow cannot
distinguish a slow legitimate suite from a stalled runner. This follow-up adds
an outer job timeout and preserves the validator progress/active-validator
diagnostic when the bound is exceeded. It must keep Product CI independent and
must classify timeout separately from ordinary validator failure.

The task changes the measurable CI contract (bounded completion and actionable
timeout evidence), not the burn-in thresholds; a timeout remains a non-green
observation and cannot be silently excluded from the history.

## Follow-up: TASK-PRF-0045 — Repair nullable human-cost benchmark contract

Release dry-run `34743456433` passed the version-synchronization step after
TASK-PRF-0020, then failed TypeScript validation at
`scripts/lib/external-benchmark/metrics.ts(75,5)`: the aggregate implementation
returns `null` for unavailable human minutes while its declared result contract
still required `number`. TASK-PRF-0045 aligns the public result type with the
fail-closed cost policy and adds focused regression coverage. It must complete
before another release dry-run; it does not authorize npm publication or alter
benchmark conclusions.

## Follow-up: TASK-PRF-0059 — Collect real protected-main CI lifecycle export

The TASK-PRF-0058 collector and evaluator are now available, but the current
GitHub export still contains only one record per workflow run and omits the
attempt-level lifecycle fields required for a defensible long-term claim. A
read-only audit of the latest 100 protected-main runs found 36 successes and 64
failures across only 2026-09-06 through 2026-09-14; every run has
`run_attempt=1`, so the current evidence cannot prove retry, repair, or a
30-day/90-run window. This is an evidence acquisition gap, not grounds to relax
the burn-in policy.

TASK-PRF-0059 collects a bounded GitHub Actions run-attempt and Product CI job
export covering the full policy window, records immutable run/attempt/job
identifiers, start/end timestamps, protected branch and event, commit SHA,
conclusion, failure class, retry/repair relationship, and explicit exclusion
reasons. Raw provider JSON must remain outside Git; only a digest-bearing,
sanitized receipt/report and the exact offline replay command may enter the
repository. The receipt must be accepted by
`scripts/collect-ci-burn-in-evidence.ts` and replayed by
`scripts/measure-product-ci-burn-in.ts` without weakening thresholds or
inventing missing telemetry. A failed or incomplete export remains
`invalid-input`/unproven and must be reported as such.

The task does not change workflow permissions, CI thresholds, npm publication,
the external A/B benchmark, or historical task provenance.

## Follow-up: TASK-PRF-0060 — Restore a complete npm runtime boundary

The public `@ai-atomic-framework/cli@0.1.0` tarball remains installable only for
the shallow smoke path: a clean registry consumer passes `version`, `doctor`,
and `bootstrap`, but `atm-chart render` and `atm-chart verify` fail. A direct
tarball listing shows the published `dist/npm-runtime` does not contain the
five schema assets referenced by the ATMChart implementation. This confirms
that the previous size result was not a valid product delivery; missing runtime
assets reduced bytes by removing required behavior.

The independent deep-module review also found that variable dynamic imports
and code-splitting are unsafe remedies: splitting increased total bytes and
entry count, while literal imports can preserve a single-file runtime. The
next repair must therefore define the runtime boundary from reachable command
contracts and immutable data assets, build one self-contained candidate, and
measure packed bytes, unpacked bytes, entry count, dependency footprint, and
startup only after a clean install passes the complete core workflow.

TASK-PRF-0060 owns that boundary contract. It may revise the npm runtime build
and its asset manifest, but must not claim slimming unless the same candidate
passes `version`, `doctor`, `bootstrap`, `atm-chart render`, and
`atm-chart verify` in a clean consumer. The card must compare against the
fixed published baseline, retain the failed 0.1.0 receipt, and stop if the
required behavior cannot be preserved within the declared budget. It does not
authorize npm publish or GitHub push; publication remains a separate,
owner-authorized handoff.

## Follow-up: TASK-PRF-0061 — Reconcile sealed runner publication inventory after product-proof delivery

After the TASK-PRF-0060 delivery, `node atm.mjs doctor --json` correctly
reported `ATM_RUNNER_PUBLICATION_INVENTORY_INCOMPLETE`. The current
`release/atm-onefile/release-manifest.json` binds the generated runner to sealed
source `4d4858f3cc9ecfbd36bc637a5a2b40fd8c59e801`, while the repository has no
runner-sync receipt with that sealed source (matching receipt count: zero).
The existing TASK-PRF-0052 receipt is `recovery-retained` for a different
sealed source and cannot silently authorize these outputs. The runner-sync
queue is empty, so the failure is an unassigned terminal-disposition gap, not
an active build that may be ignored.

TASK-PRF-0061 owns the recovery contract. It must inventory every dirty
publication path, bind it to one exact sealed source and receipt, and choose a
receipt-backed `published`, `recovery-retained`, or explicitly abandoned
disposition. The result must make `doctor` pass without deleting unreviewed
artifacts, absorbing foreign WIP, changing historical task provenance,
publishing npm, or pushing GitHub. A dry-run must prove the selected receipt
and output inventory before any shared release surface is written; the final
report must preserve the before/after digests and an executable rollback path.

## Follow-up: TASK-PRF-0062 — Re-establish measured entry reduction after complete runtime closure

The first complete-runtime repair exposed a product-level regression in the
earlier slimming claim. The historical TASK-PRF-0049 candidate measured 66
entries and a 15.38% entry reduction against the published `0.1.0` baseline,
but it omitted the chart schema assets later restored by TASK-PRF-0052. A fresh
2026-09-14 measurement of the current complete candidate (including those
assets) still passes the core workflow and reduces unpacked bytes by 20.04%,
but contains 71 entries, only an 8.97% reduction. The older 15.38% result is
therefore not evidence of a complete product delivery.

TASK-PRF-0062 is an append-only follow-up; it must not reopen or rewrite the
0049 closure. It owns one cohesive boundary problem: reduce entry count again
while retaining every asset required by `bootstrap`, `atm-chart render`, and
`atm-chart verify`. The implementation must start from reachable command and
asset contracts, preserve a single self-contained npm runtime, and compare a
cleanly installed candidate against the fixed public `0.1.0` baseline. Code
splitting, extra runtime downloads, threshold changes, and package omission are
not default remedies; any such proposal requires a separate measured review.

The card must fail closed if the complete core workflow regresses, if any
required asset disappears, or if the candidate does not reach the existing 20%
unpacked-byte and 15% entry-count reductions. If no safe boundary design meets
both thresholds, the stop rule is an explicit unproven result with the full
measurement receipt preserved; it is not permission to weaken the product
contract. Candidate and public-registry evidence remain separate, and no npm
publish or GitHub push is authorized by this follow-up.

## Follow-up: TASK-PRF-0063 — Make CI lifecycle receipts replayable and semantically fail-closed

TASK-PRF-0059's first real external export exposed two independent defects. The
GitHub export and collector are able to produce a digest-bearing lifecycle
wrapper, but the card's prescribed replay sends that wrapper directly to an
evaluator that accepts only a `CiRun[]`; the command therefore exits zero in
`--report-only` mode while returning `invalid-input: history-empty`. Separately,
the same export evaluates to `unexplained-failure` (800 records over 50.789502
days, 180 successes, 620 failures, zero retries, 620 unresolved failures).

TASK-PRF-0063 owns one cohesive evidence-contract boundary: make the canonical
receipt format consumable by the evaluator without an undocumented extraction
step, and make report-only evidence preserve the semantic claim status rather
than treating any zero exit code as a passing validator. The repair must retain
the wrapper's source/receipt digests, accept a complete real export, reject
missing lifecycle/exclusion provenance, and keep `long-term-green` impossible
when failures or unresolved repairs remain.

Allowed implementation surfaces are the collector, evaluator, focused tests,
and the two CI evidence reports. The card must add a regression for wrapper
replay, a regression proving semantic `unexplained-failure` cannot be recorded
as green evidence, and a negative case for missing lifecycle data. It must
replay the existing external 0059 export before and after the change, preserve
the raw files outside Git, and show that the result remains negative until the
underlying CI failures are repaired. It does not alter CI permissions or
thresholds, delete failed runs, publish npm, push GitHub, or rewrite 0059's
history.

## Follow-up: TASK-PRF-0066 — Make Product CI coverage match the burn-in claim

The scoped burn-in evaluator now counts the `Product CI` job, but the current
`.github/workflows/ci.yml` product job only runs `npm ci`, typecheck, a narrow
lint command, the focused product contract, package skeleton validation,
packed-CLI smoke, workspace packing, and a repeat install. It does not run the
repository build or the full `npm test` suite. A 90-run green count over this
job would therefore not satisfy the product objective's explicit build,
test, packaging, and clean-install coverage.

The current `tests/cli/ci-product-lane-contract.test.ts` also passes while
asserting only that incomplete command set; its own green result therefore
cannot certify build/test coverage. TASK-PRF-0066 must repair both layers—the
workflow and the contract test—and retain this observed false-green as a
negative baseline.

TASK-PRF-0066 owns this evidence-boundary correction. It must add explicit
`npm run build` and `npm test` steps to the required Product CI lane, preserve
the existing package and clean-install checks, and extend the workflow-scope
receipt so an export without proof that every required step ran is excluded or
reported inconclusive rather than counted as a valid burn-in observation. The
contract test must assert the required command set, while the collector and
evaluator must retain step-coverage provenance without treating an overall job
conclusion as a substitute for missing step evidence.

The existing 0059 export must remain a negative, historical observation: it
lacks step-level coverage and must not be retroactively promoted to green. New
protected-main exports after the workflow change are the only observations that
can accumulate toward the 30-day/90-run gate. The task must not weaken
thresholds, exclude real failures, alter npm publication, or change the
independent A/B benchmark contract.

## Follow-up: TASK-PRF-0067 — Enforce semantic product-acceptance gates before task close

The TASK-PRF-0060 closure exposed a separate governance/product boundary
failure. Its live ledger and planning mirror agree on `done`, but the formal
report records `acceptance.passed=false`, the entry-count reduction misses its
15% threshold, and the public registry core workflow still fails. The closure
packet nevertheless records exit code `0` for a public validator invoked with
`--record-blocked` and carries no semantic product-acceptance verdict.

TASK-PRF-0067 is an append-only repair. It makes product-proof acceptance a
first-class close predicate: `taskflow pre-close`, dry-run close, and the close
writer must reject `fail` or `inconclusive` closure-critical predicates even
when every process exits zero. The closure packet must persist the semantic
verdict and predicate results, while a blocked receipt remains explicitly
blocked/inconclusive. A 0060-shaped negative fixture must be rejected and a
genuine all-pass fixture must remain closable. The original 0060 ledger,
report, closure packet, digests and external receipts are immutable historical
evidence and must not be rewritten or promoted retroactively.

This follow-up closes a product-proof gap rather than adding another task
registry: governance state is necessary provenance, but it cannot substitute
for the measured product acceptance required by the three proof lines.

## Follow-up: TASK-PRF-0068 — Measure complete dependency footprint bytes for npm proof

The fixed-baseline measurements for TASK-PRF-0060 and TASK-PRF-0062 report
direct dependency names, but not the byte cost of the resolved transitive
dependency closure in a clean consumer. That is insufficient for the product
claim: a smaller package payload can simply move cost into `node_modules`.

TASK-PRF-0068 adds one evidence boundary for this missing cost dimension. It
must install candidate and baseline tarballs into separate empty consumers,
prove there is no workspace link, pre-existing install, cache or unrelated
package, resolve every transitive dependency, and report package payload,
dependency-only bytes and whole-consumer install bytes separately. Missing or
unresolved dependencies remain inconclusive; the task must not rewrite the
0060/0062 reports or promote their incomplete dependency claims.

## Follow-up: TASK-PRF-0069 — Provider-neutral deep-module review before bundler changes

The current runtime boundary is a product trade-off, not a file-size contest.
The candidate can be smaller while the public package remains incomplete, and
variable dynamic imports have already created an installable-but-broken bundle.
Before any bundler change, code splitting, or package split, an independent
reviewer must map the runtime topology and decide whether a deeper module would
remove caller complexity behind a stable interface or merely add another layer.

TASK-PRF-0069 is review-only and provider-neutral. Its receipt must apply the
deletion test, classify dependencies, require two concrete adapters before a
replaceable seam, compare static/lazy/split packaging on completeness and total
cost, and preserve the `deep-module-refactor` method profile. Missing evidence
is `inconclusive`; file length alone is not a refactor reason. The reviewer may
write only the planning-repository receipt and dispatch brief. No target source,
dist artifact, npm package, Git history, task ledger, or runtime evidence may be
changed until Captain accepts the sealed review.

## Current revalidation checkpoint — 2026-09-14

Fresh read-only checks after TASK-PRF-0067 planning confirm that the product
proof has not advanced merely because the ledger is consistent:

| Proof line | Fresh observation | Current decision |
|---|---|---|
| Public npm delivery | Fresh clean registry replays are retained outside Git at `C:\Users\User\atm-benchmark-sink\TASK-PRF-0071-public-npm-recheck-2026-09-14.md` (SHA-256 `019e76de4b1a3cdb034001f91336910f0e52acd633b6cf6a1ee62311a1bf1b71`) and rerun `C:\Users\User\atm-benchmark-sink\TASK-PRF-0071-public-npm-recheck-2026-09-14-rerun.md` (SHA-256 `0290cd9fee8104db54065550045e30c9fb99d2e1486d731b8a43d36849229393`). `@ai-atomic-framework/cli@latest` is still `0.1.0`; registry metadata reports 78 files and 3,357,358 unpacked bytes; rerun startup p50 is 0.83–1.48 s across commands. `atm-chart render` and `atm-chart verify` both exit 2, so the public core workflow remains incomplete. | **Not proven.** The candidate runtime is not the same as the public package, and the public core workflow remains incomplete. |
| Protected-main Product CI | Run `34802911175` is green under workflow file SHA `ec15472e0ff2ec49ee133a94ca8dd526f87ff36f`. Its `Product CI` job executes clean install, typecheck, lint, focused product contract, package skeleton smoke, clean-install packed CLI smoke, workspace package smoke, and repeat install; it does **not** execute `npm run build` or full `npm test`. Full test runs appear only in the separate `ATM Dogfood` job, so they are not covered by the required product-delivery lane. Detailed replay evidence: `reviews/TASK-PRF-0066-product-ci-coverage-recheck-2026-09-14.md`. | **Not eligible for the 30-day/90-run claim.** TASK-PRF-0066 must establish step-level build/test/package/clean-install coverage before new runs accumulate. |
| Close truthfulness | `TASK-PRF-0060` is `done` in both ledgers while its report says `acceptance.passed=false`; its closure packet records a zero exit from a `--record-blocked` validator without semantic acceptance. | **Governance defect recorded.** TASK-PRF-0067 is the immutable repair path; 0060 remains historical evidence. |
| External A/B net benefit | The isolated pilot remains `blocked-before-run` with no valid ATM/baseline pair, independent oracle result, or cost sample. | **Not proven.** No complexity-vs-benefit conclusion is permitted. |

The revalidation is a negative evidence checkpoint, not a release decision. It
prevents a green command, a state-parity report, or a candidate-only tarball
from being promoted into any of the three product claims.

## Follow-up: TASK-PRF-0070 — Classify and externalize runtime evidence without breaking provenance

The latest read-only inventory found 3,552 Git-tracked evidence/report files
totalling 99,218,037 bytes; 2,593 contain stdout/stderr-like fields, 696 contain
raw/provider/telemetry-like fields, and 80 exceed 100 KB. One JSON file is
malformed. These counts are discovery facts, not permission to delete: governance
receipts, closure packets, raw runtime payloads, compact manifests, malformed
files, and provider data are currently mixed. The key scan is only a
conservative lead—runner-sync receipts may legitimately carry telemetry
metadata—so the runtime-evidence Git boundary is not yet proven complete.

TASK-PRF-0070 is a planning-only follow-up that classifies the inventory before
any history rewrite or relocation. It requires a schema-based retention policy,
per-item provenance and digest mapping, immutable external-copy references,
fresh-store restore/replay evidence, before/after byte and path counts, and
fail-closed negative controls for missing artifacts, digest mismatch, receipt
relocation, malformed JSON, credential leakage, and raw output still tracked in
Git. Closure packets, task events, seals, and governance receipts remain
retained and offline-verifiable unless a later approved contract says otherwise.

The card may write only its planning-repository review/spec and dispatch brief.
It does not move, delete, redact, rewrite, publish, or close anything. A later
implementation card may proceed only after the Owner accepts the sealed review
and grants an explicit migration lane with dual-store rollback.

## Follow-up: TASK-PRF-0071 — Instrument complete incremental ATM cost accounting

TASK-PRF-0019 measures task-level human, token, billed-currency, elapsed,
retry, and repair costs, but a net-benefit claim also needs the costs ATM adds
around the task. TASK-PRF-0071 defines a planning-only cost-ledger contract for
first-time installation, operator learning, governance execution overhead, and
ongoing maintenance. Each row must bind to the paired arm/run/task/provider/
version and source digest, retain observed units separately, and preserve
unknown or modeled values as non-claimable.

The card adds negative controls for missing setup cost, modeled maintenance,
run/ledger mismatch, duplicated human time, and unit mismatch. Its independent
verifier must recompute the preregistered net-benefit formula and apply the
existing safety/non-inferiority and 20% primary delivery-cost rule. Missing cost
components force `inconclusive`; two failed independent rounds trigger the
existing shrink/stop rule. No benchmark run, oracle, provider export, target
source, npm artifact, Git history, or `.atm` state is changed by this card.

## Follow-up: TASK-PRF-0072 — Reconcile public runtime budget metadata with the manifest

The fixed public `@ai-atomic-framework/cli@0.1.0` tarball now has a
planning-only budget-binding receipt. Its npm payload is internally consistent
(3,357,358 unpacked bytes and 78 files), but the package metadata declares a
runtime closure of 3,340,892 bytes while the 75 entries listed by
`dist/npm-runtime/manifest.json` sum to 3,334,180 bytes. The manifest also says
`fileCount=76` while its entry array contains 75 files. This is a provenance and
budget-accounting defect: it can make a size gate appear reproducible while the
declared number is not derived from the shipped file set.

TASK-PRF-0072 is a follow-up implementation-and-test card, not permission to
publish. It must choose one authoritative runtime-closure boundary, generate
the manifest and package budget from that same boundary in one build, and make
the release validator fail closed on byte/count drift. Acceptance must compare
the packed tarball, manifest entries, package metadata, and clean-install
runtime files; a changed file, omitted file, stale count, or mismatched digest
must produce a semantic failure. The historical 0068 receipts remain
immutable, and any public re-run occurs only after governed implementation and
explicit release authorization.

## Follow-up: TASK-PRF-0073 — Restore public chart schema closure before any bundle optimization

The 2026-09-14 Captain-side lifecycle replay narrowed the public npm defect:
`bootstrap` succeeds, but `atm-chart render` fails with
`ATM_CHART_SCHEMA_SOURCE_MISSING` because
`schemas/governance/default-guards.schema.json` is not reachable from the
published runtime; `verify` then fails with `ATM_CHART_MISSING`. This is a
real completeness defect, not a size measurement or a reason to open package
splitting.

TASK-PRF-0073 is a follow-up implementation card that must restore the
smallest complete runtime boundary. It may package or embed only the schema
sources actually required by the chart lifecycle, must prohibit hidden
network downloads, and must prove the same fixed candidate in a clean
consumer with `bootstrap → render → verify`. It also requires a missing-schema
negative control and a receipt that records the resolved framework root,
source kind/path/digest, packed and unpacked bytes, dependency bytes, and
startup measurements. The card does not authorize npm publish, bundler
optimization, code splitting, package splitting, or mutation of historical
0068/0069/0071 evidence. Those decisions remain gated by the independent
deep-module review and budget reconciliation.

## Follow-up: TASK-PRF-0092 — Make the runtime evidence boundary portable

The TASK-PRF-0091 read-only audit found that production writers already use
`.atm/runtime/evidence-ledger`, but the repository itself does not ignore that
directory. The current checkout is protected only by a developer-local
`.git/info/exclude`, so a clean clone can report runtime payloads as untracked
and undermine the claim that runtime evidence is outside Git history. The same
audit found 3,398 legacy evidence files (93,473,105 bytes) still tracked; that
historical footprint must not be silently conflated with the future-write
boundary.

TASK-PRF-0092 is the smallest follow-up that closes the portable boundary. It
adds a versioned ignore rule, makes the boundary test prove the rule comes from
the repository (not local excludes), and makes the validator fail closed if a
runtime-ledger path is tracked. It also documents the measured baseline and the
separate, owner-authorized migration lane required for any historical rewrite.
It does not delete, redact, relocate, or rewrite existing history, and it does
not change the durable receipt allowlist.

The historical migration remains a separate future card. That card must first
classify retention classes, export an immutable restore manifest, measure pack
and clone impact, and obtain explicit owner approval before any destructive Git
operation.

The current `tests/cli/runtime-evidence-git-boundary.test.ts` is not sufficient
evidence for this boundary: its fixture writes its own `.gitignore` containing
`.atm/runtime/` before creating the runtime payload. It therefore proves only
that an injected fixture rule works, not that a fresh adopter clone receives a
repository-owned rule. TASK-PRF-0092 must replace this false-green setup with a
clean-clone test that uses the checked-in `.gitignore` as the sole ignore source.

## Follow-up: TASK-PRF-0093 — Close the runtime boundary negative-test coverage gap

The 0092 delivery is governed-done and must remain immutable, but its evidence
review identified two residual coverage gaps: the clean-clone test directly
probes only a bundle path rather than the records and work-item index paths,
and no test invokes the full boundary validator against a fixture that lacks
the repository-owned rule. These are evidence-quality gaps, not reasons to
reopen 0092.

TASK-PRF-0093 is a test-only follow-up. It must prove that all three runtime
ledger classes (bundles, content-addressed records, and work-item indexes) are
ignored by the checked-in `.gitignore` with global and local excludes disabled.
It must also exercise the complete validator in two negative fixtures: missing
repository rule and a forcibly tracked runtime-ledger file. The migration
baseline and legacy retention assertions remain unchanged. No runtime storage
policy, durable allowlist, history, package artifact, or publish workflow may
change.

## Follow-up: TASK-PRF-0094 — Require job-level provenance before CI burn-in replay

The TASK-PRF-0059 external export is correctly retained as a negative result:
the replay observed 800 completed attempts spanning the requested window but
returned `unexplained-failure` (180 successes, 620 failures, and no retries).
The evidence review also identified that the source records do not carry an
immutable Product CI job identifier, name, and URL for each attempt. Without
that attribution, an evaluator cannot distinguish a genuine product failure
from an incomplete provider export, nor audit the failure class and repair path.

This is not a reason to reopen 0059, and it is not a wrapper-replay bug: the
canonical wrapper contract was repaired by TASK-PRF-0063. TASK-PRF-0094 is a
follow-up implementation card that strengthens the collector/evaluator input
boundary. Every in-scope attempt must preserve Product CI job provenance through
retry grouping, while missing or malformed provenance fails closed. The existing
0059 raw export, receipt, failure counts, and report remain byte-for-byte
unchanged; only an append-only note may reference this card.

The card changes only the CI lifecycle evidence contract, its focused tests, and
the lifecycle report. It does not change workflow permissions, burn-in
thresholds, npm publication, benchmark arms, task history, or external raw
evidence. Completion is proven by command-backed collector/evaluator tests,
typecheck, and the encoding guard; it does not establish long-term green until
a new independently sourced export passes the 30-day/90-run policy.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-13T16:06:54.992Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-product-proof-plan.md","contentDigest":"sha256:2d46db99108aeffcba1bf465ed329695af6f99516e09ad8d4bd91090392ebce9"} -->
