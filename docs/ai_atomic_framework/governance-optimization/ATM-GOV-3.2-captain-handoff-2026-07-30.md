# Plan 3.2 Captain Handoff - 2026-07-30

## Purpose

This handoff supersedes `ATM-GOV-3.1-captain-handoff-2026-07-29-git-recovery.md`.
The old handoff described a recovery window where Plan 3.1, GIT, RFT, AAO, and
SKL work were still partially open or blocked. That is no longer the live truth.

Use this handoff when continuing ATM governance optimization after Plan 3.1. It
records:

- whether Plan 3.1 follow-up test goals and instrumentation targets were met;
- the evidence that Plan 3.1 is eligible to hand off to Plan 3.2;
- every Plan 3.2 plan/task artifact and the correct implementation order;
- the known governance pitfalls that must not be rediscovered by the next
  captain.

Target truth remains the ATM live ledger in `AI-Atomic-Framework`. Planning
cards in `3KLife` are source specifications; they are not permission to bypass
ATM claim, evidence, checkpoint, close, or push gates.

## Repository Heads And Push Boundary

| Repository | HEAD at handoff | Remote parity | Notes |
| --- | --- | --- | --- |
| `AI-Atomic-Framework` | `ddb976ce1837ef26c3b1fcf431a11c9c9081a581` | `origin/main` matches | Contains imported Plan 3.2 target ledger records and backlog item `ATM-BUG-2026-07-30-282`. |
| `3KLife` | `ec7e6a37998edbb220392a7e16c27c15262e813d` | `origin/master` matches | Contains Plan 3.2 source plan, five source cards, and GOV registry update. |

Both worktrees were clean after push. If a future agent sees local dirty files,
inspect them as new state; do not assume they came from this handoff.

## Plan 3.1 Completion Verdict

Plan 3.1 delivery is handed off to Plan 3.2, but this is not a plan-level
completion verdict. The four-plan objective/evidence matrix must still prove
every Plan 3.1 goal with fresh sealed and real-dogfood evidence before any
overall completion claim.

Live ATM projection checked these 32 Plan 3.1 frontier items:

- `ATM-GOV-0240` through `ATM-GOV-0268`;
- `TASK-RFT-0101`;
- `TASK-SKL-0029`;
- `TASK-SKL-0030`.

All 32 reported:

```text
status: done
claimState: released
residueBucket: no-residue
```

Planning source cards `ATM-GOV-0240` through `ATM-GOV-0268` were also checked in
`3KLife`; all 29 source cards are `status: done` and carry delivery commits.

`TASK-AAO-0206`, `TASK-RFT-0101`, and `TASK-GIT-0024` through `TASK-GIT-0028`
also closed after the old handoff. The old recovery order is useful historical
context only; do not reopen those tasks from the old document.

## Plan 3.1 Follow-up Test Goals And Instrumentation

The final evidence artifact is:

```text
artifacts/generated/atm-plan3-final/verdict.json
```

Its verdict:

```json
{
  "verdict": "close",
  "queueAction": "allow-global-close",
  "semanticClosure": {
    "verdict": "ready-to-close"
  }
}
```

### Test goals

| Goal | Verdict | Evidence |
| --- | --- | --- |
| Executed dogfood proof | Achieved | `semanticClosure.status.executedDogfood = "proven"`; original orchestrator source was missing, but derived dogfood evidence was available and passed. |
| Matched performance proof | Achieved | `semanticClosure.status.matchedPerformance = "proven"` and `matrixCells = 70`. |
| Rollback parity / closeback readiness | Achieved | `semanticClosure.status.rollbackParity = "proven"` and closeback summary source passed. |
| Backlog clear enough for close | Achieved | `semanticClosure.status.backlog = "clear"` and `blockers = []`. |
| Final Plan 3.1 verdict | Achieved | `semanticClosure.status.finalVerdict = "ready-to-close"`; top-level verdict `close`. |

### Instrumentation counters

| Counter | Value | Interpretation |
| --- | ---: | --- |
| `sourcesTotal` | 11 | Total final-verdict source slots. |
| `sourcesAvailable` | 10 | Directly available sources. |
| `sourcesMissing` | 1 | `artifacts/generated/atm-plan3-dogfood/orchestrator.json` was missing. |
| derived dogfood source | available | Derived dogfood evidence filled the semantic gap and passed. |
| `blockers` | 0 | No final close blocker remained. |
| `matrixCells` | 70 | Matched evidence matrix was populated. |
| `commandBackedMatrixCells` | 0 | Important caveat: matrix closure was artifact/digest-backed, not per-cell command-backed. Plan 3.2 should not ignore this; it is one reason to improve validation observability and evidence freshness. |

### Gate timing measurements carried forward

These were measured during the final dogfood/closeout window and are now the
economic baseline for Plan 3.2:

| Gate | Observed cost |
| --- | ---: |
| `typecheck` | about 11.5 seconds |
| `validate:cli` | about 47 seconds |
| `validate:git-head-evidence` | about 98 seconds |
| `pre-push` | about 13 to 14 seconds per run |
| `doctor` | about 18 seconds |
| `validate:standard -- --json` | exceeded 30 minutes and timed out |

First-principles conclusion: Plan 3.1 was not slow because every card was too
large. Feature/source implementation was often much shorter than closeout.
Time was burned by close-time validation avalanche, hidden recovery lanes,
runner/pre-push/evidence/close cycles, and one opaque heavyweight validator.

## Plan 3.2 Source Plan

Plan 3.2 is now the active successor plan:

```text
docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
```

Registered family:

```text
series: GOV
prefix: ATM-GOV
familyDir: governance-optimization
```

Why GOV: this work changes ATM governance economics, close validation,
evidence freshness, recovery lanes, attestation authority, and closeback
architecture. It is not ERR, TMP, RFT, or GIT.

## Plan 3.2 Task Queue

All five Plan 3.2 cards were created through `atm plan card create`, filled with
deep-module contracts, dry-run imported successfully, and imported into the
target ledger.

Planned target ledger rows currently show `status: planned`, `claimState: null`,
and `residueBucket: ambiguous-manual-review`. For these newly imported planned
cards, the residue label is advisory/projection noise, not a blocker. Routing
was verified:

```text
node atm.mjs next --prompt "ATM-GOV-0269" --json
=> task-route-ready, claim command for ATM-GOV-0269
```

### Required implementation order

1. `ATM-GOV-0269`
2. `ATM-GOV-0270`
3. `ATM-GOV-0271`
4. `ATM-GOV-0272`
5. `ATM-GOV-0273`

Do not skip directly to a later task unless the later work is explicitly
read-only design review. `ATM-GOV-0270` depends on validator run metadata from
`0269`; `0271` depends on freshness from `0270`; `0272` depends on close-saga
recovery lanes from `0271`; `0273` depends on saga and attestation boundaries.

### Task summary

| Task | Priority | Deep module | Main seam | First adopter |
| --- | --- | --- | --- | --- |
| `ATM-GOV-0269` | P0 | Validation Plan Orchestrator | `atm.validationPlanOrchestrator.v1` / `atm.validatorRunProgress.v1` | `scripts/run-validators.ts` |
| `ATM-GOV-0270` | P0 | Evidence Freshness Engine | `atm.evidenceFreshnessVerdict.v1` / `atm.closeValidatorRerunPlan.v1` | `taskflow close` |
| `ATM-GOV-0271` | P1 | Governance Close Saga Coordinator | `atm.closeSagaPlan.v1` / `atm.legalRecoveryLane.v1` | `taskflow pre-close/close` |
| `ATM-GOV-0272` | P1 | Public Attestation Authority | `atm.attestationAuthority.v1` / `atm.forwardWorkAdmissionAttestation.v1` | pre-push / historical admission |
| `ATM-GOV-0273` | P1 | Closeback Boundary Facades | `atm.targetClosure.v1` / `atm.planningCloseback.v1` / `atm.runnerPublicationBoundary.v1` | cross-authority closeback |

## Queue-head Dispatch Guidance

The next captain should start with:

```text
node atm.mjs next --claim --actor <actor-id> --prompt "ATM-GOV-0269" --auto-intent --json
```

After claiming, read `evidence.nextAction.playbook` and the source card:

```text
C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0269-validation-plan-observability-and-resumable-standard-gate.task.md
```

Do not begin with `ATM-GOV-0270` unless `ATM-GOV-0269` has landed or the work is
strictly no-write design review.

## Known Pitfalls From This Handoff

- `validate:standard -- --json` is the highest-priority optimization target:
  it exceeded 30 minutes and did not produce an adequate terminal summary.
- Close should not rerun all heavyweight validators when commit/content hashes
  and validator receipts prove freshness.
- `runner-sync`, `pre-push`, `evidence`, and `close` must return legal recovery
  lanes instead of circular blocker chains.
- Forward/emergency attestation must become a public API; hidden commands or
  manual inference are not acceptable normal operations.
- Target close, planning closeback, and runner publication must become
  separately explainable/retryable deep modules.
- Freshly imported planned task records exposed a new commit deadlock:
  `git record-commit` and pre-commit can both block the same import record. This
  is recorded as `ATM-BUG-2026-07-30-282`.

## Backlog Items To Keep In View

The following backlog items are directly relevant to Plan 3.2:

- `ATM-BUG-2026-07-30-275`: single-card close should not require all-repo
  `validate:standard`.
- `ATM-BUG-2026-07-30-276`: `validate:standard -- --json` timeout lacks
  terminal summary/run-id visibility.
- `ATM-BUG-2026-07-30-277`: lane-id mismatch and stale lane fallback UX.
- `ATM-BUG-2026-07-30-278`: no same-owner metadata-only import/seal refresh
  lane.
- `ATM-BUG-2026-07-30-279`: ignored declared artifact deliverables not included
  by close bundle.
- `ATM-BUG-2026-07-30-280`: runner-sync / protected evidence hook deadlock.
- `ATM-BUG-2026-07-30-282`: task import record-commit deadlock for newly
  imported planned tasks.
- `ATM-BUG-2026-07-29-258` and `ATM-BUG-2026-07-29-266`: planning mirror
  reconcile can write a no-op transition while leaving `stale-import`.

## Stop Rules

- Do not use `validate:standard` as the normal single-card close validator until
  `ATM-GOV-0269` makes it decomposed, observable, timeout-safe, and resumable.
- Do not encode Plan 3.1 task ids, actor ids, dates, local paths, or incident
  strings in production control flow.
- Do not use raw Git, hidden commands, or emergency `--no-verify` as the normal
  path. If a governed route deadlocks, record or update the backlog and use the
  smallest path-bounded emergency lane only when explicitly authorized.
- Do not reopen Plan 3.1 cards from the old handoff; the live ledger and final
  verdict are the current authority.
- Do not treat planned-card `ambiguous-manual-review` projection as a close
  blocker unless `next --prompt <task>` fails to route or `tasks status` gives a
  concrete recovery command.

## Memory Write Check

- Confirmed pitfall + fix this session: yes, but it is already recorded in
  `ATM-BUG-2026-07-30-282`; no keep-memory write needed.
- Major closure snapshot: yes, captured in this handoff and Plan 3.2 source
  plan; no separate memory note needed.
- Human corrected working method: yes, Plan 3.2 was explicitly requested as the
  proper successor shape; captured in the plan and this handoff.
- Existing memory note proven wrong: none observed.
