---
doc_id: doc_rft_0007
task_id: TASK-RFT-0007
title: "evidence.ts verb split"
status: done
owner: atm-core
priority: P0
milestone: RFT-M2
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
related_skill: .agents/skills/atm-atom-map-refactor
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/evidence/verbs/add.ts"
  - "packages/cli/src/commands/evidence/verbs/run.ts"
  - "packages/cli/src/commands/evidence/verbs/verify.ts"
  - "packages/cli/src/commands/evidence/verbs/diff.ts"
  - "packages/cli/src/commands/evidence/verbs/validators.ts"
  - "packages/cli/src/commands/evidence/verbs/missing.ts"
  - "packages/cli/src/commands/evidence/verbs/git-head-backfill.ts"
  - "packages/cli/src/commands/evidence/validator-classification.ts"
  - "packages/cli/src/commands/evidence/command-runs.ts"
  - "packages/cli/src/commands/evidence/missing-report.ts"
  - "packages/cli/src/commands/evidence/__tests__/add.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/run.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/verify.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/diff.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/validators.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/missing.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/git-head-backfill.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/validator-classification.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts"
  - "scripts/validate-evidence-atomic-map.ts"
  - "docs/reports/evidence-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/evidence/verbs/add.ts"
  - "packages/cli/src/commands/evidence/verbs/run.ts"
  - "packages/cli/src/commands/evidence/verbs/verify.ts"
  - "packages/cli/src/commands/evidence/verbs/diff.ts"
  - "packages/cli/src/commands/evidence/verbs/validators.ts"
  - "packages/cli/src/commands/evidence/verbs/missing.ts"
  - "packages/cli/src/commands/evidence/verbs/git-head-backfill.ts"
  - "packages/cli/src/commands/evidence/validator-classification.ts"
  - "packages/cli/src/commands/evidence/command-runs.ts"
  - "packages/cli/src/commands/evidence/missing-report.ts"
  - "packages/cli/src/commands/evidence/__tests__/add.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/run.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/verify.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/diff.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/validators.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/missing.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/git-head-backfill.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/validator-classification.spec.ts"
  - "packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts"
  - "scripts/validate-evidence-atomic-map.ts"
  - "docs/reports/evidence-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-evidence-atomic-map.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/add.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/run.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/verify.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/diff.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/validators.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/missing.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/git-head-backfill.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/validator-classification.spec.ts"
  - "node --strip-types packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts"
  - "npm run validate:git-head-evidence"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any evidence verb changes its JSON output shape or exit code."
atomizationImpact:
  ownerAtomOrMap: "atm.evidence-command-atomic-map"
  mapUpdates:
    - "docs/reports/evidence-command-atomic-map.md"
outOfScope:
  - "Changing evidence verb names or argument flags"
  - "Changing atm.evidenceRecord or atm.taskEvidence schema"
  - "Modifying taskflow.ts close-time evidence consumption"
  - "Touching packages/cli/src/commands/tasks.ts (owned by TASK-RFT-0010)"
nonGoals:
  - "Do not change evidence freshness defaults."
  - "Do not merge evidence run and evidence add."
completed_at: "2026-07-10T01:09:00.015Z"
completed_by_agent: "cursor-composer-rft0007"
closedAt: "2026-07-10T01:09:00.015Z"
closedByActor: "cursor-composer-rft0007"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T01-08-59-939Z-close-7a670b1c9e00"
lastTransitionAt: "2026-07-10T01:09:00.015Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "4b8362a4385e69d02dabe8e291a2b42451c6f2cd"
---

# TASK-RFT-0007 - evidence.ts verb split

## Goal

Reduce `packages/cli/src/commands/evidence.ts` (2,822 lines as of 2026-06-20, now the third-largest open RFT surface) into a thin Facade by extracting each verb plus three shared concerns (validator classification, command-runs normalization, missing-report computation).

## Atom/Map Extraction Pattern

Use the `atm-atom-map-refactor` skill (`Strategy Map` per verb + `Facade`). Per casebook RFT-0007 forward case:

1. **`evidence/verbs/<verb>.ts`** — one file per verb: `add.ts`, `run.ts`, `verify.ts`, `diff.ts`, `validators.ts`, `missing.ts`, `git-head-backfill.ts`. Each owns its argv parser and main runner.
2. **`evidence/validator-classification.ts`** — `normalizeValidatorGateName`, `classifyValidatorTier`, `isClosureRequiredValidator`, `resolveValidatorExpectedCommand`, `classifyValidatorEvidenceState`.
3. **`evidence/command-runs.ts`** — `collectRecordCommandRuns`, `readRecordValidationPasses`, `readRecordFreshness`, `normalizeEvidenceCommandRuns`, `readCommandRunsInputFile`, `hashString`.
4. **`evidence/missing-report.ts`** — `computeMissingValidatorReport`, `buildMissingValidatorFinding`.
5. **`evidence.ts`** — thin Facade: `runEvidence(argv)` dispatches to verb modules; re-exports `verifyTaskEvidence` and `computeMissingValidatorReport` for backwards compat.

## Required Behavior

- All 7 verbs keep their CLI argv shape, exit codes, and JSON output verbatim.
- `verifyTaskEvidence` and `computeMissingValidatorReport` exported symbols continue to exist on `evidence.ts`.
- `evidence.ts` after the split must be under 250 lines.
- Atomic-map report enumerates each verb, each shared concern module, and pre/post line counts.

## Testing Requirements

- `add.spec.ts`:
  - one valid add case with full command-backed evidence;
  - one missing-required-field case (`--command` without `--exit-code`);
  - one duplicate-record idempotency case.
- `run.spec.ts`:
  - one passing-validator case (zero exit code);
  - one failing-validator case (non-zero exit, `ATM_EVIDENCE_VALIDATION_PASS_FAILED_COMMAND`);
  - one recent-run flag case.
- `verify.spec.ts`:
  - one gate=close happy case;
  - one gate=commit failing case;
  - one gate=pr edge case.
- `diff.spec.ts`:
  - one identical-content case;
  - one differing-content case;
  - one missing-baseline case.
- `validators.spec.ts`:
  - one `--list` case showing all required validators;
  - one filter-by-tier case;
  - one fresh-vs-historical-reference case.
- `missing.spec.ts`:
  - one all-validators-present case (empty report);
  - one missing-validator case;
  - one absent-vs-failed distinction case.
- `git-head-backfill.spec.ts`:
  - one normal backfill case;
  - one with-reason override case;
  - one already-backfilled idempotency case.
- `validator-classification.spec.ts`:
  - one case per tier;
  - one closure-required-but-not-in-task-validators case;
  - one expected-command resolution case.
- `command-runs.spec.ts`:
  - one round-trip JSON case;
  - one freshness defaulting case;
  - one input-file reading case.

Add `scripts/validate-evidence-atomic-map.ts` asserting:

- 7 verb modules exist under `verbs/`;
- 3 shared concern modules exist;
- `evidence.ts` line count is below 250;
- `verifyTaskEvidence` and `computeMissingValidatorReport` are still exported from `evidence.ts`.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-evidence-atomic-map.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/add.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/run.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/verify.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/diff.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/validators.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/missing.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/git-head-backfill.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/validator-classification.spec.ts
node --strip-types packages/cli/src/commands/evidence/__tests__/command-runs.spec.ts
npm run validate:git-head-evidence
git diff --check
```

## Closing

Use `taskflow open --write` / `taskflow close --write`.
