# ATM Bug and Optimization Backlog — 並行與結案

> 這是 `ATM_BUG_OPTIMIZATION_BACKLOG.md` 的「並行與結案」分片。完整索引見 `docs/ai_atomic_framework/ATM_BUG_OPTIMIZATION_BACKLOG.md`。

## Parallel 0041-0042 Dogfood and Close Lane - 2026-06-17

Captain note: several items below were hit during `TASK-MAO-0041` / `TASK-MAO-0042` broker dogfood and
`TASK-MAO-0052` close-operator work. Fixed items stay in the backlog for traceability.

### Quick-repair eligible (small, no new MAO card required)

| Bug | Why quick repair is enough |
|-----|----------------------------|
| `BUG-ATM-0063` | Already fixed + regression test; optional atom-map row only |
| `BUG-ATM-0064` | Already fixed via `TASK-MAO-0052`; backlog cross-link only |
| `BUG-ATM-0065` | Template default cleanup in opener / `tasks new` (~5 lines) |
| `BUG-ATM-0067` | Add implicit close validator to card template or dry-run hint (~10 lines) |
| `BUG-ATM-0069` | Doc / `writeReadinessHint` copy only |

### Prefer small AAO card or extend existing card (not emergency lane)

| Bug | Why not pure hotfix |
|-----|---------------------|
| `BUG-ATM-0066` | Policy: when post-open card edits should re-import without `--force` + emergency lease |
| `BUG-ATM-0070` | Broker batch planner behavior; needs test fixture + adapter rule |

- [x] BUG-ATM-0063: Pre-commit cross-file import scanner treats string/template import lookalikes as real imports
  - Status: fixed (2026-06-17)
  - Severity: P0 close blocker
  - Encountered: During `TASK-MAO-0041` delivery commit, `hook pre-commit` threw `Invalid regular expression ... validatorSurfaces: [` and blocked governed commit.
  - Reproduce / detect: Stage `close-orchestration.ts` with `closebackNote` containing `tasks import`, or stage a file whose template literal contains fake `import { ... } from "..."` while the imported target has unstaged symbol changes; run `node atm.mjs hook pre-commit --json`.
  - Impact: Any framework task touching `close-orchestration.ts` or similar prose can fail pre-commit with an opaque regex error instead of a consistency finding.
  - Root cause: Full-text loose `/import\s+...from.../g` scanning treated non-statement `import` tokens inside strings/templates/object literals as import statements.
  - Fix: `packages/cli/src/commands/hook.ts` now uses `collectImportStatements()` → `collectStaticImportSymbols()` (statement-level scan, skips comments/strings/templates) before `parseImportSymbols()`. `export ... from` is not an import statement and was not the false-match anchor. Secondary hardening: `escapeRegExp()` + identifier-shaped symbol filter.
  - Regression: `packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts` (`testCrossFileConsistencyIgnoresTemplateLiteralImportLookalikes`).
  - Related tasks / commits: `TASK-MAO-0041` delivery blocked then unblocked; hotfix commit `fa9b6b830`; verify with `node --experimental-strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts`.

- [x] BUG-ATM-0064: `next` normal playbook taught `tasks close` instead of `taskflow` close preview lane
  - Status: fixed (2026-06-17)
  - Severity: P0 agent discoverability
  - Encountered: Agents following `node atm.mjs next --json` were not told to run `taskflow pre-close` or `taskflow close` dry-run before `--write`; playbook listed protected `tasks close` as the normal path.
  - Reproduce / detect: Run `node atm.mjs next --prompt TASK-MAO-0052 --json` and inspect `evidence.nextAction.playbook.commandSequence` before fix.
  - Impact: Agents guess parameters, miss dual-repo bundle preview, and need human reminders about dry-run / `writeReadinessHint`.
  - Fix: `TASK-MAO-0052` updated `packages/cli/src/commands/next.ts` normal channel playbook to `pre-close` → `close` dry-run → `close --write`, plus `closePreview` block and `deliveryPrinciple.nextStep` alignment.
  - Related tasks / commits: `TASK-MAO-0052` (`ba96fe2ef` delivery, `9ffd1761d` close); cross-ref `BUG-ATM-0053`, `BUG-ATM-0042`.

- [x] BUG-ATM-0065: `taskflow open --write` template leaves bogus `depends_on: TASK-AAO-0000`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P1 workflow friction
  - Encountered: `TASK-MAO-0052` was imported with template dependency `TASK-AAO-0000` (missing ledger), blocking `next --claim` until force re-import after card edit.
  - Reproduce / detect: `taskflow open --write` with MAO profile using default `aao-l2-split` template; inspect imported `.atm/history/tasks/<id>.json` dependencies before editing the planning card.
  - Impact: Every freshly opened MAO card can fail claim with `ATM_NEXT_CLAIM_DEPENDENCY_BLOCKED` until manual import repair.
  - Possible optimization (quick repair): Remove placeholder dependency from template / host opener; default `depends_on: []` or derive from profile. No new MAO card required.
  - Fix: `aao-l2-split-template.md` defaults `depends_on: []`; `generateTaskCard()` and markdown task-source plugin emit `depends_on_yaml` instead of `TASK-AAO-0000`.
  - Related tasks / commits: `TASK-MAO-0052`; emergency force import `EMG-TASK-MAO-0052-fe57ca25f2`.

- [ ] BUG-ATM-0066: Post-open planning card edits require `tasks import --force` + emergency lease
  - Status: open
  - Severity: P1 workflow friction
  - Encountered: After `taskflow open --write`, editing planning frontmatter (scope, depends_on) hit `ATM_TASKS_IMPORT_DRIFT` then `ATM_EMERGENCY_LANE_APPROVAL_REQUIRED` for `--force`.
  - Reproduce / detect: Open a card, edit planning `.task.md`, run `tasks import --write --force` without emergency lease; then retry with `emergency approve --allowed-flag --force`.
  - Impact: Normal "fix the card after open" flow feels like emergency maintenance; agents need Captain intervention.
  - Possible optimization: Allow governed re-import when `source.planPath` hash drift is from the same actor/session within claim window, or expose `taskflow open --refresh` for planning mirror sync. Likely small AAO card, not a one-line hotfix.
  - Related tasks / commits: `TASK-MAO-0052`; `BUG-ATM-0012` (planning mirror drift family).

- [x] BUG-ATM-0067: Close gate requires `validate:git-head-evidence` but task cards omit it from `validators`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P1 closeback surprise
  - Encountered: `taskflow close --write` for `TASK-MAO-0052` failed with `ATM_TASK_CLOSE_CLOSURE_PACKET_INVALID` / absent `validate:git-head-evidence` though the card listed only `typecheck`, `validate:cli`, `git diff --check`.
  - Reproduce / detect: Close any task without running `evidence run` for `validate:git-head-evidence`; inspect closure packet missing list.
  - Impact: Agents complete all card-listed validators yet still fail close; dry-run does not always surface this early enough.
  - Possible optimization (quick repair): Add implicit close validators to `taskflow close` dry-run / `writeReadinessHint`, and/or append `validate:git-head-evidence` to MAO task template defaults. Cross-ref `BUG-ATM-0029`.
  - Fix: template lists `npm run validate:git-head-evidence`; `preflightBlockersToWriteReadinessBlockers()` maps all preflight blockers (including stale evidence) into `writeReadinessHint`.
  - Related tasks / commits: `TASK-MAO-0052`, `TASK-MAO-0041`.

- [x] BUG-ATM-0068: After delivery commit lands, `taskflow close --write` requires `--historical-delivery` without promoting dry-run `nextCommand`
  - Status: fixed (2026-06-17, TASK-AAO-0136 lane slice)
  - Severity: P1 close ergonomics (extends `BUG-ATM-0053` / `BUG-ATM-0058`)
  - Encountered: `TASK-MAO-0052` first `--write` partially committed delivery; second close returned `framework delivery already landed; supply --historical-delivery` instead of a copy-paste dry-run command with the delivery SHA.
  - Reproduce / detect: Commit delivery via `taskflow close --write` or governed git commit, then rerun `taskflow close --dry-run` without `--historical-delivery`; `writeReadinessHint.blockers[0].requiredCommand` must include detected SHA.
  - Impact: Two-step close is correct but easy to miss; agents treat it as failure rather than expected phase-2 close.
  - Fix: `detectHistoricalDeliveryCommit()` in `historical-delivery.ts` resolves delivery SHA from planning-card `delivery_commit`, `ATM-Task` trailer git log, or scoped recent commits; `buildTaskflowCloseWriteReadinessHint()` promotes it into `requiredCommand` / `nextCommand`.
  - Regression: `taskflow-dryrun.spec.ts` post-delivery second-close fixture; `historical-delivery.test.ts` detection unit tests.
  - Related tasks / commits: `TASK-MAO-0052` (`ba96fe2ef` → `9ffd1761d` with `--historical-delivery`); `BUG-ATM-0053`, `BUG-ATM-0058`, `TASK-AAO-0136`; AAF `00519573b`.

- [x] BUG-ATM-0069: Manual `git add` of out-of-bundle file blocks `taskflow close` with `INDEX_NOT_ISOLATED`
  - Status: fixed (2026-06-17, quick repair)
  - Severity: P2 operator clarity
  - Encountered: Staging `hook.ts` hotfix while closing `TASK-MAO-0041` caused `ATM_TASKFLOW_CLOSE_INDEX_NOT_ISOLATED` until `git restore --staged`.
  - Reproduce / detect: Stage a file outside `governedCommitBundle.targetRepo.stageFiles`, rerun `taskflow close --write`.
  - Impact: Correct fail-closed behavior, but remediation (`restore --staged` vs `--defer-foreign-staged`) is easy to miss during hotfix pressure.
  - Possible optimization (quick repair): Surface `unexpectedStagedFiles` and exact `git restore --staged -- <paths>` in top-level `writeReadinessHint.summary`. Doc-only acceptable.
  - Fix: `historical-close-preflight` adds `unexpectedStagedNonBundleFiles` blocker with `git restore --staged` command; `verifyRepoIndexIsolation` details include `restoreCommand`; dry-run `writeReadinessHint` merges the blocker.
  - Related tasks / commits: `TASK-MAO-0041`; `BUG-ATM-0054` family.

- [ ] BUG-ATM-0070: Broker `plan-batch` blocks same-anchor `insertAfterHeading` second request when first request creates anchor
  - Status: open
  - Severity: P2 broker dogfood (parallel merge)
  - Encountered: Parallel `0041`/`0042` dogfood: `REQ-0041-EVIDENCE-GATES` applied first; `REQ-0042-EVIDENCE-GATES` blocked because batch base lacked `## Evidence Bundle Manifest` at plan time.
  - Reproduce / detect: Batch two `insertAfterHeading` requests where request B targets a heading introduced by request A; run `broker plan-batch --apply`.
  - Impact: Real parallel markdown merges need steward pass or sequential batch ordering; broker cannot auto-queue dependent heading inserts.
  - Possible optimization: Teach batch planner dependency edges for heading creation, or auto-requeue blocked requests after prior batch mutates anchor. Small broker card, not emergency hotfix.
  - Related tasks / commits: `parallel-0041-0042` run `c393df1d-f9ab-4331-ac3e-3182df57ac45`; receipt `docs/ai_atomic_framework/broker-collision-evidence/runs/c393df1d-....json`.
