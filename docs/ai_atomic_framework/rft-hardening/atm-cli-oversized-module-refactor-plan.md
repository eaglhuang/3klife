---
doc_id: doc_rft_cli_oversized_module_refactor_plan
title: "ATM CLI oversized module refactor plan (RFT series)"
status: planned
created_at: "2026-06-13T22:30:00+08:00"
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
---

# ATM CLI oversized module refactor plan (RFT series)

This plan is the follow-up track to `atm-tasks-command-atomic-map-refactor-plan.md` (the CID series that targets `packages/cli/src/commands/tasks.ts`). RFT series targets the **other** oversized governance-critical modules that were not in scope of CID work.

The RFT series is a dual-repo (3KLife planning + AI-Atomic-Framework target) refactor track. Every card uses `taskflow open --write` to create the planning card and import into target runtime, and `taskflow close --write` to produce the dual-repo governed commit bundle. No card uses raw `git commit`, `tasks close`, or `tasks reconcile` as the normal closing path — those are emergency surfaces only.

## Why RFT, not CID

- CID series is the closeout/CID/governance-invariant hardening track. Adding eight non-governance refactors to CID would conflate two concerns.
- RFT (Refactor Tracking) is the size/complexity/atomization track. Cards target oversized files that are at risk of slow comprehension, brittle edits, and undeclared scope leakage.
- A clean naming boundary lets later humans search for either lineage without crosstalk.

## Diagnosis

The eight target files share the same shape:

- one CLI command file (or one validator script) contains multiple operational concerns;
- helper functions for each concern accumulate in the same file rather than separate atoms;
- focused tests are difficult because pure unit tests cannot reach internal helpers without exporting from the giant file;
- new wording or contract changes (see TASK-CID-0073 retro) hit scope-amendment cycles because the file silently owns several concerns;
- runtime-only callers cannot stub one concern without dragging the whole module's import graph.

The cure is not a single mega-rewrite. The cure is a per-file atomic map: each file becomes a Facade over named atoms, every atom answers exactly one question with a Result Contract Object, and the public surface stays stable through a re-export point.

## Sizes at plan time

| Task | File | Lines | Top-level fn/sym | Pattern |
|---|---|---|---|---|
| TASK-RFT-0001 | `packages/cli/src/commands/next.ts` | 3,898 | 93 | Strategy Map + Policy Object + Result Contract Object + Facade |
| TASK-RFT-0002 | `packages/cli/src/commands/hook.ts` | 3,023 | 45 | Strategy Map (by hook phase) + Facade |
| TASK-RFT-0003 | `packages/cli/src/commands/framework-development.ts` | 2,757 | 68 | Policy Object (temp-claim lifecycle) + Facade |
| TASK-RFT-0004 | `scripts/validate-task-ledger-governance.ts` | 2,258 | 25+ | Strategy Map (per invariant) + shared envelope |
| TASK-RFT-0005 | `scripts/captain-dispatch-mailbox.ts` | 2,192 | 50+ | Strategy Map (per lane) + Facade |
| TASK-RFT-0006 | `packages/core/src/police/family.ts` | 1,958 | 30+ interfaces | Strategy Map (per police role) + shared Result Contract Object |
| TASK-RFT-0007 | `packages/cli/src/commands/evidence.ts` | 1,782 | 68 | Strategy Map (per verb) + Facade |
| TASK-RFT-0008 | `packages/cli/src/commands/taskflow.ts` | 1,642 | 111 | Light extraction (Strategy Map for commit-message templates) + size tripwire |

## Per-file atomic map plan

Each card's `## Atom/Map Extraction Pattern` section uses the `atm-atom-map-refactor` skill's pattern language. The skill's `references/casebook.md` will be updated to record an RFT case forward-reference so future agents can cite these splits.

### TASK-RFT-0001 — `next.ts`

**Concerns**: routing channel selection (fast/normal/batch/quickfix), claim admission, claim-intent flag parsing, prompt-scoped task context, queue locks, runner mode classification, playbook builders, batch checkpoint chaining, taskScopedClaimCommand emission.

**Atoms**:

- `next/channel-strategy.ts` — Strategy Map mapping `runtime + queue + intent` to one channel name; replaces `decideNextAction`-style branching.
- `next/claim-admission.ts` — Policy Object encapsulating CID conflict checks, stale-runner gates, claim-intent reconciliation. Returns `atm.nextClaimAdmission.v1`.
- `next/task-scoped-claim-command.ts` — Result Contract Object producer; this is the field added in TASK-CID-0073 and is currently inlined in the prompt-scoped result builder.
- `next/runner-mode.ts` — small module that owns `withRunnerMode`, `describeRunnerMode`, `classifyRunnerMode`, currently scattered.
- `next.ts` — thin Facade: parse argv, dispatch to channel-strategy, format CLI result.

**Tests**: `next/__tests__/channel-strategy.spec.ts`, `claim-admission.spec.ts`, `task-scoped-claim-command.spec.ts`, plus existing `validate-prompt-scoped-next.ts` regression run as a final gate.

### TASK-RFT-0002 — `hook.ts`

**Concerns**: pre-commit, pre-push, commit-range guard, git hook inspection/install, blocking-finding builders, repair-hint emitters, baseline/environment classifiers.

**Atoms**:

- `hook/pre-commit.ts` — owns `runPreCommitHook` + blocking-finding builder + repair-hint emitter.
- `hook/pre-push.ts` — owns `runPrePushHook` + commit-range guard + framework baseline reading.
- `hook/git-hooks-installer.ts` — owns `inspectGitHooks` + `installGitHooks`.
- `hook/git-index-diagnostics.ts` — owns `inspectGitIndexAccess` + classification helpers.
- `hook.ts` — Facade routing `pre-commit`/`pre-push`/`commit-range-guard`/`install` subcommands.

**Tests**: extend existing `hook/context-map-advisor.test.ts` style with `hook/__tests__/pre-commit.spec.ts` and `pre-push.spec.ts`. Add `scripts/validate-hook-atomic-map.ts` to gate the split.

### TASK-RFT-0003 — `framework-development.ts`

**Concerns**: framework-mode status/claim/release, closure packet schema + validation, historical delivery provenance, task audit, framework repo identity, pinned runner status, normalization helpers (sha256), critical-path gate.

**Atoms**:

- `framework-development/temp-claim.ts` — Policy Object: claim/release/status of the temporary framework-development lock, including stale-lock classification and recovery commands.
- `framework-development/closure-packet-schema.ts` — Result Contract Object: `ClosurePacket`, validation issues, repair metadata; pure schema/no I/O.
- `framework-development/critical-path-gate.ts` — Policy Object: `isTaskCloseGovernanceCriticalPath`.
- `framework-development/sha256-normalization.ts` — small helper module for the normalize* family.
- `framework-development.ts` — Facade that wires these atoms to `runFrameworkDevelopment`.

**Tests**: `framework-development/__tests__/temp-claim.spec.ts`, `closure-packet-schema.spec.ts`, `critical-path-gate.spec.ts`. Add `scripts/validate-framework-development-atomic-map.ts`.

### TASK-RFT-0004 — `validate-task-ledger-governance.ts`

**Concerns**: 25+ async invariant validators (`validateTaskResidueClassification`, `validateTaskflowCloseOrchestration`, `validatePlanningOnlyLedgerAuditBoundary`, etc), shared test fixture builders, JSON I/O helpers.

**Atoms**:

- `scripts/lib/task-ledger-invariant-registry.ts` — Strategy Map: `Record<InvariantId, InvariantCheck>` where each check returns a shared envelope (`atm.taskLedgerInvariantResult.v1`).
- `scripts/lib/task-ledger-fixture-builder.ts` — shared helpers (`makeHostRepo`, `makeFrameworkRepo`, `initGitRepo`).
- `scripts/lib/task-ledger-assertions.ts` — small assertion helpers (`expectTaskError`, `expectTaskErrorDetails`).
- One file per invariant under `scripts/validators/task-ledger/` (≥10 files, one per major check).
- `scripts/validate-task-ledger-governance.ts` — Facade that loads the registry, runs all checks, prints envelope.

**Tests**: each invariant check has at least one positive fixture + one negative fixture. Add `scripts/validate-task-ledger-atomic-map.ts` to enforce that every registered invariant has a corresponding file + at least one positive + one negative test.

### TASK-RFT-0005 — `captain-dispatch-mailbox.ts`

**Concerns**: layout resolution, lock acquisition, ledger I/O, demo queue seeder, captain-report receiver, dispatch sender, worker poller, stop-loss accounting, unclaimed scanner, frontmatter parser, argument parser.

**Atoms**:

- `scripts/captain-dispatch-mailbox/layout.ts` — `resolveLayout`, `ensureLayout`, `acquireLock`.
- `scripts/captain-dispatch-mailbox/ledger.ts` — `readLedger`, `writeLedger`, `createLedger`.
- `scripts/captain-dispatch-mailbox/lanes/inbox.ts` — `dispatchQueuedWork`, `scanUnclaimed`.
- `scripts/captain-dispatch-mailbox/lanes/outbox.ts` — `pollWorkers`, `pollOneWorker`, `completeSimulatedWorker`.
- `scripts/captain-dispatch-mailbox/lanes/reports.ts` — `receiveCaptainReports`, `isThinDoneReport`.
- `scripts/captain-dispatch-mailbox/stop-loss.ts` — `createStopLossState`, `createWorkerStopLossState`, `normalizeStopLoss`.
- `scripts/captain-dispatch-mailbox/cli.ts` — `parseArgs`, `printHelp`.
- `scripts/captain-dispatch-mailbox.ts` — Facade composing the lanes.

**Tests**: `scripts/captain-dispatch-mailbox/__tests__/` with one spec per lane. Add `scripts/validate-captain-dispatch-atomic-map.ts`.

### TASK-RFT-0006 — `packages/core/src/police/family.ts`

**Concerns**: 30+ exported interfaces (gate inputs, suppression keys, policy templates), shared gate report shape, dedup/demand/quality/map-integration/atomization/decomposition/evolution/polymorph/rollback/evidence-integrity/reversibility/noise-control/adopter-neutrality police roles, all defined inline.

**Atoms**:

- `packages/core/src/police/types.ts` — all `Police*Input`, `Police*Report` interfaces (pure types).
- `packages/core/src/police/roles/<role>.ts` — one file per police role (dedup, demand, quality, map-integration, atomization, decomposition, evolution, polymorph, rollback, evidence-integrity, reversibility, noise-control, adopter-neutrality).
- `packages/core/src/police/suppression-keys.ts` — `buildPolymorphSuppressionKey`, `buildRollbackSuppressionKey`.
- `packages/core/src/police/family.ts` — Facade `runPoliceFamily` composing the role registry.

**Tests**: extend `scripts/validate-police-family.ts` to assert that every role has a dedicated module and at least one positive + one negative fixture. Add `packages/core/src/police/__tests__/role-registry.spec.ts`.

### TASK-RFT-0007 — `evidence.ts`

**Concerns**: 7 verbs (add, run, verify, diff, validators, missing, git-head-backfill), validator tier classification, evidence freshness, command-runs normalization, missing-validator report computation.

**Atoms**:

- `evidence/verbs/add.ts`, `run.ts`, `verify.ts`, `diff.ts`, `validators.ts`, `missing.ts`, `git-head-backfill.ts` — one file per verb.
- `evidence/validator-classification.ts` — `classifyValidatorTier`, `isClosureRequiredValidator`, `resolveValidatorExpectedCommand`.
- `evidence/command-runs.ts` — `normalizeEvidenceCommandRuns`, `readCommandRunsInputFile`, `collectRecordCommandRuns`.
- `evidence/missing-report.ts` — `computeMissingValidatorReport`, `buildMissingValidatorFinding`.
- `evidence.ts` — Facade routing verbs and re-exporting `verifyTaskEvidence`/`computeMissingValidatorReport` for backwards compat.

**Tests**: `evidence/__tests__/` with one spec per verb. Add `scripts/validate-evidence-atomic-map.ts`.

### TASK-RFT-0008 — `taskflow.ts`

**Light-touch** because the file is still under the cliff. Goals:

- Extract commit-message templates (`chore(taskflow): close ... target governance bundle` and `docs(taskflow): close ... planning bundle`) into a Strategy Map (`taskflow/commit-messages.ts`) so future host-customization (TASK-CID-0073 follow-up gap C3) has a single seam.
- Add `scripts/validate-taskflow-size-tripwire.ts` that fails when `taskflow.ts` exceeds 2,200 lines, naming RFT-0008 as the next-step card.
- Add focused test for the commit-message strategy to lock in current behavior.

**No major split**. This card is the lighthouse that keeps the next refactor honest.

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

Recommended order if running serially: RFT-0008 → RFT-0003 → RFT-0007 → RFT-0002 → RFT-0006 → RFT-0001 → RFT-0005 → RFT-0004 (smallest to largest, except RFT-0008 first as the size tripwire that gates the rest).

## Skill casebook integration

`.agents/skills/atm-atom-map-refactor/references/casebook.md` will gain seven RFT forward-cases (one per card) so any future agent invoking the skill in review mode for one of these files sees the pre-decided pattern, suggested owner module, and required proof shape. The casebook will be updated in the same PR as this plan.

## Out of scope for the RFT series

- Rewriting CLI command names.
- Changing public JSON result schemas (additive fields allowed; field deletion or rename requires a separate `breaking-change` proposal).
- Changing emergency lease validation rules.
- Touching anything under `release/atm-onefile/` or `release/atm-root-drop/` as a source delivery (those are runner-sync outputs of `npm run build`).
- Touching files under `.atm/history/` by hand. All ledger mutations go through ATM CLI verbs.
- Touching `packages/cli/src/commands/tasks.ts` (owned by CID series).
