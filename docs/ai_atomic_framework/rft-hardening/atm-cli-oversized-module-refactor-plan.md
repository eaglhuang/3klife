---
doc_id: doc_rft_cli_oversized_module_refactor_plan
title: "ATM CLI oversized module refactor plan (RFT series)"
status: active
created_at: "2026-06-13T22:30:00+08:00"
updated_at: "2026-07-14T00:00:00+08:00"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
related_skill: .agents/skills/atm-atom-map-refactor
related_plan_cid: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
task_family:
  - TASK-RFT-0001
  - TASK-RFT-0002
  - TASK-RFT-0003
  - TASK-RFT-0004
  - TASK-RFT-0005
  - TASK-RFT-0006
  - TASK-RFT-0007
  - TASK-RFT-0008
  - TASK-RFT-0009
  - TASK-RFT-0010
  - TASK-RFT-0011
  - TASK-RFT-0012
  - TASK-RFT-0013
  - TASK-RFT-0017
  - TASK-RFT-0018
  - TASK-RFT-0019
  - TASK-AAO-0154
  - TASK-AAO-0155
  - TASK-AAO-0156
  - TASK-RFT-0020
  - TASK-RFT-0021
  - TASK-RFT-0022
  - TASK-RFT-0023
  - TASK-RFT-0024
  - TASK-RFT-0025
---

# ATM CLI oversized module refactor plan (RFT series)

This plan now also owns the active thin-facade recovery of `packages/cli/src/commands/tasks.ts`. CID history still records the first extraction wave and governance evidence, but the current oversized-module pressure and atom-ownership recovery now belong to the RFT series.

The RFT series is a dual-repo (3KLife planning + AI-Atomic-Framework target) refactor track. Every card uses `taskflow open --write` to create the planning card and import into target runtime, and `taskflow close --write` to produce the dual-repo governed commit bundle. No card uses raw `git commit`, `tasks close`, or `tasks reconcile` as the normal closing path; those are emergency surfaces only.

## Why RFT, not CID

- CID series is the closeout/CID/governance-invariant hardening track. Adding eight non-governance refactors to CID would conflate two concerns.
- RFT (Refactor Tracking) is the size/complexity/atomization track. Cards target oversized files that are at risk of slow comprehension, brittle edits, and undeclared scope leakage.
- A clean naming boundary lets later humans search for either lineage without crosstalk.

## Diagnosis

The target files share the same shape:

- one CLI command file (or one validator script) contains multiple operational concerns;
- helper functions for each concern accumulate in the same file rather than separate atoms;
- focused tests are difficult because pure unit tests cannot reach internal helpers without exporting from the giant file;
- new wording or contract changes (see TASK-CID-0073 retro) hit scope-amendment cycles because the file silently owns several concerns;
- runtime-only callers cannot stub one concern without dragging the whole module's import graph.

The cure is not a single mega-rewrite. The cure is a per-file atomic map: each file becomes a Facade over named atoms, every atom answers exactly one question with a Result Contract Object, and the public surface stays stable through a re-export point.

## Sizes at plan time

| Task | File | Lines | Top-level fn/sym | Pattern |
|---|---|---|---|---|
| TASK-RFT-0010 | `packages/cli/src/commands/tasks.ts` | 7,085 | 100+ | Facade + Policy Object + Strategy Map + Result Contract Object |
| TASK-RFT-0001 | `packages/cli/src/commands/next.ts` | 3,898 | 93 | Strategy Map + Policy Object + Result Contract Object + Facade |
| TASK-RFT-0002 | `packages/cli/src/commands/hook.ts` | 3,023 | 45 | Strategy Map (by hook phase) + Facade |
| TASK-RFT-0003 | `packages/cli/src/commands/framework-development.ts` | 2,757 | 68 | Policy Object (temp-claim lifecycle) + Facade |
| TASK-RFT-0004 | `scripts/validate-task-ledger-governance.ts` | 2,258 | 25+ | Strategy Map (per invariant) + shared envelope |
| TASK-RFT-0005 | `scripts/captain-dispatch-mailbox.ts` | 2,192 | 50+ | Strategy Map (per lane) + Facade |
| TASK-RFT-0006 | `packages/core/src/police/family.ts` | 1,958 | 30+ interfaces | Strategy Map (per police role) + shared Result Contract Object |
| TASK-RFT-0007 | `packages/cli/src/commands/evidence.ts` | 1,782 | 68 | Strategy Map (per verb) + Facade |
| TASK-RFT-0008 | `packages/cli/src/commands/taskflow.ts` / `taskflow-dryrun.spec.ts` | 2,726 / large integration spec | 111+ | Close validation acceleration + test atoms + commit-message Strategy Map |
| TASK-RFT-0009 | `packages/cli/src/commands/taskflow.ts` | 2,726 | 111+ | Production close Facade + Policy Objects + Result Contract Objects |

## Per-file atomic map plan

Each card's `## Atom/Map Extraction Pattern` section uses the `atm-atom-map-refactor` skill's pattern language. The skill's `references/casebook.md` will be updated to record an RFT case forward-reference so future agents can cite these splits.

### TASK-RFT-0001 -- `next.ts`

**Concerns**: routing channel selection (fast/normal/batch/quickfix), claim admission, claim-intent flag parsing, prompt-scoped task context, queue locks, runner mode classification, playbook builders, batch checkpoint chaining, taskScopedClaimCommand emission.

**Atoms**:

- `next/channel-strategy.ts` -- Strategy Map mapping `runtime + queue + intent` to one channel name; replaces `decideNextAction`-style branching.
- `next/claim-admission.ts` -- Policy Object encapsulating CID conflict checks, stale-runner gates, claim-intent reconciliation. Returns `atm.nextClaimAdmission.v1`.
- `next/task-scoped-claim-command.ts` -- Result Contract Object producer; this is the field added in TASK-CID-0073 and is currently inlined in the prompt-scoped result builder.
- `next/runner-mode.ts` -- small module that owns `withRunnerMode`, `describeRunnerMode`, `classifyRunnerMode`, currently scattered.
- `next.ts` -- thin Facade: parse argv, dispatch to channel-strategy, format CLI result.

**Tests**: `next/__tests__/channel-strategy.spec.ts`, `claim-admission.spec.ts`, `task-scoped-claim-command.spec.ts`, plus existing `validate-prompt-scoped-next.ts` regression run as a final gate.

### TASK-RFT-0002 -- `hook.ts`

**Concerns**: pre-commit, pre-push, commit-range guard, git hook inspection/install, blocking-finding builders, repair-hint emitters, baseline/environment classifiers.

**Atoms**:

- `hook/pre-commit.ts` -- owns `runPreCommitHook` + blocking-finding builder + repair-hint emitter.
- `hook/pre-push.ts` -- owns `runPrePushHook` + commit-range guard + framework baseline reading.
- `hook/git-hooks-installer.ts` -- owns `inspectGitHooks` + `installGitHooks`.
- `hook/git-index-diagnostics.ts` -- owns `inspectGitIndexAccess` + classification helpers.
- `hook.ts` -- Facade routing `pre-commit`/`pre-push`/`commit-range-guard`/`install` subcommands.

**Tests**: extend existing `hook/context-map-advisor.test.ts` style with `hook/__tests__/pre-commit.spec.ts` and `pre-push.spec.ts`. Add `scripts/validate-hook-atomic-map.ts` to gate the split.

### TASK-RFT-0003 -- `framework-development.ts`

**Concerns**: framework-mode status/claim/release, closure packet schema + validation, historical delivery provenance, task audit, framework repo identity, pinned runner status, normalization helpers (sha256), critical-path gate.

**Atoms**:

- `framework-development/temp-claim.ts` -- Policy Object: claim/release/status of the temporary framework-development lock, including stale-lock classification and recovery commands.
- `framework-development/closure-packet-schema.ts` -- Result Contract Object: `ClosurePacket`, validation issues, repair metadata; pure schema/no I/O.
- `framework-development/critical-path-gate.ts` -- Policy Object: `isTaskCloseGovernanceCriticalPath`.
- `framework-development/sha256-normalization.ts` -- small helper module for the normalize* family.
- `framework-development.ts` -- Facade that wires these atoms to `runFrameworkDevelopment`.

**Tests**: `framework-development/__tests__/temp-claim.spec.ts`, `closure-packet-schema.spec.ts`, `critical-path-gate.spec.ts`. Add `scripts/validate-framework-development-atomic-map.ts`.

### TASK-RFT-0004 -- `validate-task-ledger-governance.ts`

**Concerns**: 25+ async invariant validators (`validateTaskResidueClassification`, `validateTaskflowCloseOrchestration`, `validatePlanningOnlyLedgerAuditBoundary`, etc), shared test fixture builders, JSON I/O helpers.

**Atoms**:

- `scripts/lib/task-ledger-invariant-registry.ts` -- Strategy Map: `Record<InvariantId, InvariantCheck>` where each check returns a shared envelope (`atm.taskLedgerInvariantResult.v1`).
- `scripts/lib/task-ledger-fixture-builder.ts` -- shared helpers (`makeHostRepo`, `makeFrameworkRepo`, `initGitRepo`).
- `scripts/lib/task-ledger-assertions.ts` -- small assertion helpers (`expectTaskError`, `expectTaskErrorDetails`).
- One file per invariant under `scripts/validators/task-ledger/` (20 files, one per major check).
- `scripts/validate-task-ledger-governance.ts` -- Facade that loads the registry, runs all checks, prints envelope.

**Tests**: each invariant check has at least one positive fixture + one negative fixture. Add `scripts/validate-task-ledger-atomic-map.ts` to enforce that every registered invariant has a corresponding file + at least one positive + one negative test.

### TASK-RFT-0005 -- `captain-dispatch-mailbox.ts`

**Concerns**: layout resolution, lock acquisition, ledger I/O, demo queue seeder, captain-report receiver, dispatch sender, worker poller, stop-loss accounting, unclaimed scanner, frontmatter parser, argument parser.

**Atoms**:

- `scripts/captain-dispatch-mailbox/layout.ts` -- `resolveLayout`, `ensureLayout`, `acquireLock`.
- `scripts/captain-dispatch-mailbox/ledger.ts` -- `readLedger`, `writeLedger`, `createLedger`.
- `scripts/captain-dispatch-mailbox/lanes/inbox.ts` -- `dispatchQueuedWork`, `scanUnclaimed`.
- `scripts/captain-dispatch-mailbox/lanes/outbox.ts` -- `pollWorkers`, `pollOneWorker`, `completeSimulatedWorker`.
- `scripts/captain-dispatch-mailbox/lanes/reports.ts` -- `receiveCaptainReports`, `isThinDoneReport`.
- `scripts/captain-dispatch-mailbox/stop-loss.ts` -- `createStopLossState`, `createWorkerStopLossState`, `normalizeStopLoss`.
- `scripts/captain-dispatch-mailbox/cli.ts` -- `parseArgs`, `printHelp`.
- `scripts/captain-dispatch-mailbox.ts` -- Facade composing the lanes.

**Tests**: `scripts/captain-dispatch-mailbox/__tests__/` with one spec per lane. Add `scripts/validate-captain-dispatch-atomic-map.ts`.

### TASK-RFT-0006 -- `packages/core/src/police/family.ts`

**Concerns**: 30+ exported interfaces (gate inputs, suppression keys, policy templates), shared gate report shape, dedup/demand/quality/map-integration/atomization/decomposition/evolution/polymorph/rollback/evidence-integrity/reversibility/noise-control/adopter-neutrality police roles, all defined inline.

**Atoms**:

- `packages/core/src/police/types.ts` -- all `Police*Input`, `Police*Report` interfaces (pure types).
- `packages/core/src/police/roles/<role>.ts` -- one file per police role (dedup, demand, quality, map-integration, atomization, decomposition, evolution, polymorph, rollback, evidence-integrity, reversibility, noise-control, adopter-neutrality).
- `packages/core/src/police/suppression-keys.ts` -- `buildPolymorphSuppressionKey`, `buildRollbackSuppressionKey`.
- `packages/core/src/police/family.ts` -- Facade `runPoliceFamily` composing the role registry.

**Tests**: extend `scripts/validate-police-family.ts` to assert that every role has a dedicated module and at least one positive + one negative fixture. Add `packages/core/src/police/__tests__/role-registry.spec.ts`.

### TASK-RFT-0007 -- `evidence.ts`

**Concerns**: 7 verbs (add, run, verify, diff, validators, missing, git-head-backfill), validator tier classification, evidence freshness, command-runs normalization, missing-validator report computation.

**Atoms**:

- `evidence/verbs/add.ts`, `run.ts`, `verify.ts`, `diff.ts`, `validators.ts`, `missing.ts`, `git-head-backfill.ts` -- one file per verb.
- `evidence/validator-classification.ts` -- `classifyValidatorTier`, `isClosureRequiredValidator`, `resolveValidatorExpectedCommand`.
- `evidence/command-runs.ts` -- `normalizeEvidenceCommandRuns`, `readCommandRunsInputFile`, `collectRecordCommandRuns`.
- `evidence/missing-report.ts` -- `computeMissingValidatorReport`, `buildMissingValidatorFinding`.
- `evidence.ts` -- Facade routing verbs and re-exporting `verifyTaskEvidence`/`computeMissingValidatorReport` for backwards compat.

**Tests**: `evidence/__tests__/` with one spec per verb. Add `scripts/validate-evidence-atomic-map.ts`.

### TASK-RFT-0008 -- `taskflow.ts`

**Light-touch** because the file is still under the cliff. Goals:

- Extract commit-message templates (`chore(taskflow): close ... target governance bundle` and `docs(taskflow): close ... planning bundle`) into a Strategy Map (`taskflow/commit-messages.ts`) so future host-customization (TASK-CID-0073 follow-up gap C3) has a single seam.
- Keep `scripts/validate-taskflow-size-tripwire.ts` as a diagnostic pressure signal when `taskflow.ts` exceeds 2,200 lines, naming RFT-0009 as the production-size follow-up.
- Add focused test for the commit-message strategy to lock in current behavior.

**No major split**. This card is the lighthouse that keeps the next refactor honest.

**2026-06-19 planning override**: TASK-RFT-0008 is now the close validation acceleration card. Its primary deliverable is the layered `taskflow close` test surface: `close-gates-focused.spec.ts`, reusable close fixtures, reusable broker/commit-queue injection helpers, and reusable write-readiness / close-result assertions. The size tripwire remains a diagnostic signal, but TASK-RFT-0008 no longer owns shrinking the production `taskflow.ts` main body below the threshold.

### TASK-RFT-0009 -- `taskflow.ts`

**Primary purpose**: shrink the production `taskflow.ts` close path after TASK-RFT-0008 has made close validation fast enough.

Atoms:

- `taskflow/close-preflight.ts` -- Policy Object for close eligibility checks.
- `taskflow/write-readiness.ts` -- Policy Object for blocker aggregation and `writeReadinessHint`.
- `taskflow/broker-gate.ts` -- broker conflict and lease epoch interpretation.
- `taskflow/branch-commit-queue-gate.ts` -- branch queue lock diagnostics.
- `taskflow/closeback-orchestration.ts` -- target/planning closeback coordination.
- `taskflow/commit-bundle-assembly.ts` -- governed stage/commit bundle construction.
- `taskflow.ts` -- Facade that keeps CLI behavior and public JSON contracts stable.

Tests:

- focused specs for close preflight, write readiness, closeback orchestration, and commit bundle assembly;
- reuse TASK-RFT-0008 test atoms instead of re-embedding dual-repo fixture setup;
- keep `close-gates-focused.spec.ts` and `taskflow-dryrun.spec.ts` as regression gates.

TASK-RFT-0009 owns making `scripts/validate-taskflow-size-tripwire.ts` pass again.

### TASK-RFT-0010 -- `tasks.ts`

**Primary purpose**: bring the largest remaining CLI command surface back under the RFT queue and complete the thin-facade transition that the earlier extraction wave only started.

Atoms:

- `tasks/close-governance.ts` -- Policy Object for close authority, closure packet trust, blocker-code classification, and recoverable close verdicts.
- `tasks/status-triangulation.ts` -- Strategy Map for live-ledger versus planning truth comparison and residue/recovery route selection.
- `tasks/import-verify.ts` -- Result Contract Object owner for import, verify, and migration envelopes.
- `tasks/result-contracts.ts` -- shared Result Contract Object home for report-heavy task schemas that should not stay inline in the facade.
- `tasks.ts` -- Facade that parses argv, delegates to extracted owners, and keeps the CLI/json surface stable.

Tests:

- focused specs for close governance, status triangulation, import/verify envelopes, and result-contract stability;
- retain `scripts/validate-tasks-atomic-map.ts` as the atomic ownership gate;
- update `docs/reports/tasks-command-atomic-map.md` with before/after line counts and four-layer ownership map.

### TASK-RFT-0011 -- ATM governance-fix wave

**Primary purpose**: fix the three ATM CLI defects surfaced by TASK-RFT-0010's close path so RFT-0012 and RFT-0013 can close through the normal `taskflow close --write` lane without emergency leases.

**Concerns**: auto-evidence command mapping rewrites `node --strip-types scripts/<name>.ts` to `npm run <name>` unconditionally; `tasks import` treats `--reset-open` as an emergency surface even for the `planning-in-progress-no-runtime` case (the standard Phase 0 → Phase 1 shape); `broker register` and `next --claim` gates disagree on the same scope because they consult different conflict tables.

Atoms:

- `packages/cli/src/commands/taskflow/auto-evidence-mapper.ts` -- Policy Object: given a declared command and the current `package.json`, return the command to actually run. Falls back to declared verbatim when the npm script does not exist.
- `packages/cli/src/commands/tasks/import-verify.ts` -- extend with a Strategy Map classifier for import inputs (`fresh-open`, `drift-with-active-claim`, `drift-without-claim`, `planning-in-progress-no-runtime`) so reset-open in the last case runs on the normal lane.
- `packages/cli/src/commands/next/claim-admission.ts` -- claim admission that consults `packages/core/src/broker/conflict-matrix.ts` for the shared verdict, with a divergence diagnostic if broker and CID gates ever disagree.

Tests: one focused spec per atom (`auto-evidence-mapper.spec.ts`, `import-reset-open-ux.spec.ts`, `claim-admission-broker-parity.spec.ts`). Add `scripts/validate-governance-fix-wave.ts` to gate the wave and register `validate:governance-fix-wave` in `package.json` (dogfood the mapper fix).

TASK-RFT-0011 does NOT change public CLI verb names, does NOT change public JSON field names, does NOT remove the emergency lease pathway; it only removes false-positive triggers and unifies the two verdicts.

### TASK-RFT-0012 -- `tasks.ts` orchestrator body extraction

**Primary purpose**: move the three largest orchestrator bodies (`runTasksClose`, `runTasksImport`, `runTasksVerify`) out of `tasks.ts` so the facade drops from ~7,484 to ~6,400 lines and future refactors can target the orchestrators individually.

Atoms:

- `packages/cli/src/commands/tasks/close-orchestrator.ts` -- houses `runTasksClose`; imports existing sibling atoms unchanged.
- `packages/cli/src/commands/tasks/import-orchestrator.ts` -- houses `runTasksImport`; imports `import-verify.ts` and related helpers.
- `packages/cli/src/commands/tasks/verify-orchestrator.ts` -- houses `runTasksVerify`; imports `import-verify.ts` and `result-contracts.ts`.
- `tasks.ts` becomes a true argv-router.

Tests: one spec per orchestrator covering the golden paths (close: normal / historical-delivery / historical-batch / rollback; import: fresh-open / drift / reset-open / emergency-lease; verify: pass / fail / diagnostic-sort). Add `scripts/validate-tasks-orchestrator-atomic-map.ts` to enforce that the three symbols no longer exist in `tasks.ts` and are re-exported from their new homes.

TASK-RFT-0012 depends on RFT-0011 landing first so its own close runs through the normal auto-evidence lane.

### TASK-RFT-0013 -- `tasks.ts` close helper cluster split

**Primary purpose**: extract the four helper clusters that `close-orchestrator.ts` (from RFT-0012) still depends on inside `tasks.ts`, so `tasks.ts` drops below 1,500 lines and the close path becomes a layered atom set.

Atoms:

- `packages/cli/src/commands/tasks/close-helpers/closure-packet-writer.ts` -- closure-packet write / verify / repair.
- `packages/cli/src/commands/tasks/close-helpers/framework-close-transaction.ts` -- open / commit / rollback lifecycle.
- `packages/cli/src/commands/tasks/close-helpers/broker-lifecycle.ts` -- broker register / decision / release during close.
- `packages/cli/src/commands/tasks/close-helpers/plugin-registry.ts` -- plugin registry lookup and dispatch during close.
- `close-orchestrator.ts` imports each helper; `tasks.ts` retains only argv routing plus helpers shared across orchestrators.

Tests: one spec per helper cluster covering happy path + one failure + one rollback path where applicable. Add `scripts/validate-tasks-close-helpers-atomic-map.ts` to enforce that each helper module exists, `close-orchestrator.ts` imports each, and `tasks.ts` is under 1,500 lines. Update `docs/reports/tasks-command-atomic-map.md` with the six-layer map (Facade / Sub-Orchestrators / Policy Objects / Strategy Maps / Result Contracts / Close Helpers).

TASK-RFT-0013 depends on RFT-0012 landing first.

### TASK-RFT-0017 -- `tasks.ts` claim lifecycle extraction

**Primary purpose**: extract the remaining claim lifecycle mass from `tasks.ts`
without touching Lane A `next.ts` work. This is Lane B's first serial card.

Atoms:

- `packages/cli/src/commands/tasks/claim-orchestrator.ts` -- owns
  `runTasksClaimLifecycle` plus claim/renew/release/handoff/takeover routing.
- `packages/cli/src/commands/tasks/claim-preparation.ts` -- owns
  `prepareTaskForClaim`, reservation import orchestration, and the injected
  parser/writer/evidence-writer boundaries.
- `packages/cli/src/commands/tasks/claim-intent.ts` -- owns claim-intent
  resolution.
- `packages/cli/src/commands/tasks/repair-claim-orchestrator.ts` -- owns the
  `runTasksRepairClaim` command body and its option parsing if the extraction
  needs a separate repair lane module.
- `tasks.ts` -- keeps only command routing and imports the extracted claim
  owners.

Tests:

- `packages/cli/src/commands/tasks/__tests__/claim-orchestrator.spec.ts`
- `packages/cli/src/commands/tasks/__tests__/repair-claim-orchestrator.spec.ts`
- `scripts/validate-tasks-claim-atomic-map.ts`

TASK-RFT-0017 must lower the tasks facade tripwire from 6,000 to 4,800 lines.

### TASK-RFT-0018 -- `tasks.ts` reconcile / repair / deliver-close extraction

**Primary purpose**: extract the remaining reconciliation and repair delivery
orchestration cluster from `tasks.ts` after TASK-RFT-0017 lands.

Atoms:

- `packages/cli/src/commands/tasks/reconcile-orchestrator.ts` -- owns
  `runTasksReconcile` and historical delivery reconciliation orchestration.
- `packages/cli/src/commands/tasks/repairclose-orchestrator.ts` -- owns
  `runTasksRepairClosure`, repair-closure option parsing, and transition write
  helpers currently tied to that command.
- `packages/cli/src/commands/tasks/deliver-close-orchestrator.ts` -- owns
  `runTasksDeliverAndClose` and its dirty-tree / closeback coordination.
- `tasks.ts` -- keeps only command routing and imports the extracted owners.

Tests:

- `packages/cli/src/commands/tasks/__tests__/reconcile-orchestrator.spec.ts`
- `packages/cli/src/commands/tasks/__tests__/repairclose-orchestrator.spec.ts`
- `packages/cli/src/commands/tasks/__tests__/deliver-close-orchestrator.spec.ts`
- `scripts/validate-tasks-reconcile-atomic-map.ts`

TASK-RFT-0018 must lower the tasks facade tripwire from 4,800 to 3,900 lines.

### TASK-RFT-0019 -- `tasks.ts` card parsing and scope/queue extraction

**Primary purpose**: finish Lane B by moving the card parsing and
scope/queue/parallel/lock residual clusters out of `tasks.ts`, then clean the
facade toward the 1,000-line target.

Atoms:

- `packages/atm-markdown-task-source/src/task-card-parser.ts` -- owns
  `parsePlanMarkdown`, `parseSingleCard`, section parsing, table metadata, and
  card enrichment logic that belongs with markdown task-source behavior.
- `packages/cli/src/commands/tasks/task-card-writer.ts` -- owns
  `writeTaskFiles` and import evidence writing if those cannot move into the
  package without broad package-boundary churn.
- `packages/cli/src/commands/tasks/scope-queue.ts` -- owns scope add /
  repair, lock cleanup, queue, parallel analysis, roster update glue, and the
  shared helpers required by those command families.
- `tasks.ts` -- ends as a thin router/facade with the line-count target
  recorded in `docs/reports/tasks-command-atomic-map.md`.

Tests:

- `packages/cli/src/commands/tasks/__tests__/task-card-parser.spec.ts`
- `packages/cli/src/commands/tasks/__tests__/task-card-writer.spec.ts`
- `packages/cli/src/commands/tasks/__tests__/scope-queue.spec.ts`
- `scripts/validate-tasks-final-facade-atomic-map.ts`

TASK-RFT-0019 must lower the tasks facade tripwire from 3,900 to 1,000 lines,
or record the exact remaining exported glue that justifies any residual budget.

## Test discipline (applies to every RFT card)

Every card MUST declare in its frontmatter `deliverables`:

1. The source files to be modified (Facade target + every new atom file).
2. The new `__tests__/` spec files (one per atom).
3. The `scripts/validate-*-atomic-map.ts` regression guard.
4. Any fixture or snapshot file that the spec touches.
5. The atomic-map report under `docs/reports/<owner>-atomic-map.md`.

This prevents the TASK-CID-0073 retro problem where focused tests and help-snapshot fixtures were missing from `scopePaths` and forced a planning-card scope amendment + force re-import.

Every card MUST run these validators before close:

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-<owner>-atomic-map.ts`
- The atom-specific focused test suite (`node --strip-types packages/cli/src/commands/<owner>/__tests__/<spec>.ts`)
- `git diff --check`

Every card MUST go through `taskflow open --write` (open) and `taskflow close --write` (close). Cards using `git commit`, `tasks close`, `tasks reconcile`, `tasks import --write --force`, or any backend surface as a normal commit path are governance-incomplete and will be reopened.

## Dispatch sequence

The cards are independent at the file level and may run in parallel, with one exception: TASK-RFT-0001 (next.ts) and TASK-RFT-0007 (evidence.ts) share the `next --claim`/`evidence run` integration boundary at the `framework-development claim-required` validator, so they should not close on the same day to avoid concurrent runner-sync conflicts.

Recommended order if running serially: RFT-0008 -> RFT-0009 -> RFT-0010 -> RFT-0003 -> RFT-0007 -> RFT-0002 -> RFT-0006 -> RFT-0001 -> RFT-0005 -> RFT-0004. RFT-0008 comes first because close validation speed is the safety net; RFT-0009 follows because it uses that safety net to shrink `taskflow.ts`; RFT-0010 follows because `tasks.ts` is now the largest open oversized-module surface.

## 2026-07-10 progress snapshot

Planning cards and target ledger for the original oversized-module wave are now aligned as `done` for:

- TASK-RFT-0001, 0002, 0003, 0004, 0005, 0006, 0007
- TASK-RFT-0008, 0009, 0010
- TASK-RFT-0017, 0018, 0019
- TASK-AAO-0154, 0155, 0156 (governed hardening follow-ups)

2026-07-10 serial delivery wave (target then planning close bundles):

| Task | Post-delivery facade (approx lines) | Planning close |
|---|---:|---|
| TASK-RFT-0002 | hook.ts ~82 | `f381ef33` |
| TASK-RFT-0007 | evidence.ts ~49 | `9b27cb12` |
| TASK-RFT-0004 | validate-task-ledger-governance.ts ~14 | `5c407ce0` |
| TASK-RFT-0006 | police/family.ts ~337 | `7b0a918a` |
| TASK-RFT-0005 | captain-dispatch-mailbox.ts ~112 | `877c4e8d` |

Residual pressure after this wave is no longer those closed cards. Prefer new cards for:

1. residual `packages/cli/src/commands/next.ts` size after TASK-RFT-0001
2. `packages/cli/src/commands/team.ts`
3. `packages/cli/src/commands/framework-development/closure-packet-schema.ts`
4. `packages/cli/src/commands/git-governance.ts`

## Skill casebook integration

`.agents/skills/atm-atom-map-refactor/references/casebook.md` will gain seven RFT forward-cases (one per card) so any future agent invoking the skill in review mode for one of these files sees the pre-decided pattern, suggested owner module, and required proof shape. The casebook will be updated in the same PR as this plan.

## Out of scope for the RFT series

- Rewriting CLI command names.
- Changing public JSON result schemas (additive fields allowed; field deletion or rename requires a separate `breaking-change` proposal).
- Changing emergency lease validation rules.
- Touching anything under `release/atm-onefile/` or `release/atm-root-drop/` as a source delivery (those are runner-sync outputs of `npm run build`).
- Touching files under `.atm/history/` by hand. All ledger mutations go through ATM CLI verbs.
- Rewriting already-extracted `tasks/*` atoms outside TASK-RFT-0010 without an explicit follow-up card.

## 2026-07-09 governed hardening follow-ups

The RFT lane also exposed a separate operator-governance weakness: a weaker
agent tried to make a commit pass by mutating files and ATM history outside its
task scope, then routing unrelated bug work back onto the same active task.

That is not an oversized-file problem by itself, but it is now part of the
same practical hardening stream because the failure happened during active RFT
execution and directly affected task-boundary safety.

Follow-up cards:

- `TASK-AAO-0154` -- fail closed on cross-task restore/reset/remove and enter
  incident-safe mode;
- `TASK-AAO-0155` -- prevent `next --prompt` from silently attaching divergent
  bug work to the wrong active task;
- `TASK-AAO-0156` -- fence `.atm` history mutation and staged ownership so weak
  agents cannot self-clean other lanes.

These cards are explicitly root-cause treatments. They must not solve the
incident by adding validator downgrade profiles, advisory-only bypasses, or
second-path manual cleanup conventions.

## 2026-07-14 RFT second-wave oversized-module queue

All original `TASK-RFT-0001..0019` cards are closed in the ATM framework
ledger. The second wave targeted residual oversized modules in
`AI-Atomic-Framework` and kept this repository as the planning source only.

Execution rules for this wave:

- Planning repo: `C:/Users/User/3KLife`.
- Target repo and closure authority: `C:/Users/User/AI-Atomic-Framework`.
- Each task must route through ATM before claim and must read the returned
  playbook before editing.
- Each task touches one primary oversized module and extracts one bounded atom
  or map; adjacent refactors become follow-up cards.
- Every newly extracted atom/map/script/report source file must stay at or
  below 600 lines. If an extraction candidate would exceed 600 lines, split it
  into smaller atoms in the same task or open a follow-up before implementing.
- Team Agents may be used for bounded review, grep, fixture scouting, and
  validator triage. External write remains forbidden unless explicitly granted.
- Each implementation report must include a short Team Agents efficiency note:
  roles used, whether parallelism saved wall-clock time, token cost observed,
  and whether the approach should be reused.
- Any workflow failure, governance friction, or validator gap encountered while
  executing this wave must be written to the ATM bug/optimization backlog before
  moving to the next queue head.
- Any durable lesson that changes how agents should perform future oversized
  module extraction must be recorded in the source skill learning reference,
  preferably `.agents/skills/atm-atom-map-refactor/references/casebook.md`.

Queue closeback:

| Task | Primary module | Pattern | Planning status |
|---|---|---|---|
| `TASK-RFT-0020` | `packages/cli/src/commands/git-governance.ts` | Policy Object + Result Contract Object | done; target ledger closed 2026-07-13 |
| `TASK-RFT-0021` | `packages/cli/src/commands/team.ts` | Strategy Map | done; target ledger closed 2026-07-13 |
| `TASK-RFT-0022` | `packages/cli/src/commands/next.ts` | Strategy Map + Result Contract Object | done; target ledger closed 2026-07-13 |
| `TASK-RFT-0023` | `scripts/validate-team-agents.ts` | Validator Suite Map | done; target ledger closed 2026-07-13 |
| `TASK-RFT-0024` | `packages/cli/src/commands/tasks/legacy-impl.ts` | Facade + Strategy Map | done; target ledger closed 2026-07-13 |
| `TASK-RFT-0025` | `packages/cli/src/commands/framework-development/closure-packet-schema.ts` | Result Contract Object | done; target ledger closed 2026-07-13 |

2026-07-17 planning-side cleanup reconciled the source cards to the target
ledger so 3KLife no longer presents this wave as unfinished implementation
work. Future RFT work should start from a new card based on current target file
measurements.

## 2026-07-29 Recovery-Driven Git Transaction Rehabilitation

`TASK-RFT-0101` is a mandatory recovery-driven RFT card. During the GIT G7
lane, commit `39b13905f` preserved a 5,734-line diff in
`packages/cli/src/commands/git-governance/implementation.ts` so shared-worktree
state would not be lost. It is explicitly `ATM-Delivery: false` and must never
be used as feature-completion evidence.

First-principles ruling: the recovery revealed that command parsing, lease
authority, index parking/restoration, commit execution, and failure receipts
had collapsed into one facade. `TASK-RFT-0101` restores the deep-module boundary
before `TASK-GIT-0028` may wire production callers. It must leave a <=600-line
typed facade, a bounded transaction module, bounded test support, a baseline
report, and command-backed proof. This is a hard predecessor of GIT-0028, not
an optional cleanup lane.

## 2026-09-06 Follow-up: typed git-governance implementation modules

`ATM-BUG-2026-07-15-195` remains an active Medium optimization because the
original `TASK-RFT-0032` extraction left a compact implementation carrier
behind. `TASK-RFT-0102` is the bounded follow-up: expand that carrier into
semantically typed modules while preserving the public facade and the already
closed extraction contract. Planning remains in `C:/Users/User/3KLife`; code,
tests, evidence, and closure remain in `C:/Users/User/AI-Atomic-Framework`.

The follow-up must not reopen `TASK-RFT-0032`, must not change public command
behavior, and must leave every new or touched module at or below 600 lines.

## 2026-09-06 Follow-up: tasks legacy semantic modules

`ATM-BUG-2026-07-15-196` remains an active Medium optimization. The current
tasks legacy implementation technically reports only 22 physical lines, but
one line is an approximately 80K-character compressed carrier. `TASK-RFT-0104`
will extract one bounded semantic command family into readable modules and
strengthen the extraction contract to reject oversized physical lines, while
preserving the facade exports and task lifecycle behavior.

## 2026-09-06 Follow-up: pre-commit hook parity contract

`ATM-BUG-2026-07-15-200` remains an active Medium optimization because its
  extraction regression test still asserts the pre-`528c5b5c` task-context
  semantics. `TASK-RFT-0103` updates that test to model a raw commit as an
  explicitly unrelated commit context, while preserving the product behavior
  that a unique staged task is treated as the committing task. The task is test
  contract-only and must not alter the hook implementation or foreign residue.

## 2026-09-07 Follow-up: closure-packet semantic modules

`ATM-BUG-2026-07-15-197` remains an active Medium maintainability optimization.
`TASK-RFT-0105` expands the transitional closure-packet schema implementation
carrier into bounded semantic modules while preserving the public facade and
the already-closed extraction contract. Planning remains in `C:/Users/User/3KLife`;
implementation and closure remain in `C:/Users/User/AI-Atomic-Framework`.
