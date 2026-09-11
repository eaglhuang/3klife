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

## ErrorCode Registry Migration Note

If this family owns error governance, keep the canonical
`docs/governance/error-code-registry.json` in place until a governed migration
task updates emitters, generators, tests and documentation together.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-08-13T16:06:54.992Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/atm-product-proof-plan.md","contentDigest":"sha256:f11f250ccae9ba9126b89000f968a456214ca8415903d8c2a9955debe310d47e"} -->
