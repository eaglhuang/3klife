---
task_id: ATM-GOV-0215
title: Broker overlap call-site convergence repair (finish ATM-GOV-0206)
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on:
  - ATM-GOV-0206
target_repo: AI-Atomic-Framework
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
closure_authority: target_repo
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
series_selection_reason: Continuation of the registered GOV plan; repairs the incomplete ATM-GOV-0206 delivery in the same broker conflict-detection family rather than opening a new series. This card supersedes the unmet acceptance of ATM-GOV-0206.
scopePaths:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/decision/**"
  - "packages/core/src/broker/resource-overlap.ts"
  - "packages/core/src/broker/conflict-key-overlap.ts"
  - "tests/core/broker-overlap-callsite-inventory.test.ts"
  - "tests/core/broker-resource-overlap.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/decision.ts"
  - "packages/core/src/broker/decision/**"
  - "tests/core/broker-overlap-callsite-inventory.test.ts"
  - "tests/core/broker-resource-overlap.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:broker-proposal"
  - "npm run validate:brokered-write"
  - "npm run validate:broker-compose"
  - "git diff --check"
errorCodes: []
evidence:
  required: command-backed
producer:
  - "Converged overlap matcher contract across every broker call site"
  - "Call-site inventory test preventing exact-match reintroduction"
  - "Frozen-runner behavioural proof of the sample 0001 case"
consumer:
  - "ATM-GOV-0199 broker decision/outcome telemetry (paired correctness samples)"
  - "TASK-SKL-0014, which depends on trustworthy shared-write overlap verdicts"
missingData:
  - "The gateResults-vs-conflicts inconsistency carried over from ATM-GOV-0206 is still not root-caused; diagnose before deciding in-scope or follow-up."
  - "Whether normalizeBrokerPath in decision/surfaces.ts is a fourth semantics or reusable as the canonical normalizer is unresolved at authoring time."
dataDrivenStopRule:
  - "Stop and request owner revision if convergence cannot be expressed as one shared data-driven matcher and instead requires per-call-site or per-axis special cases."
  - "Stop if the fix requires hard-coding any path prefix, task id, family name, or the telemetry.ts incident."
  - "Stop if convergence forces a verdict-model change; that is capability work and belongs to a separate card."
  - "Stop if the call-site inventory cannot be derived programmatically and would need a hand-maintained list."
out_of_scope:
  - "Do not add a compose/parallel-admission verdict; this card only makes detection correct."
  - "Do not change broker telemetry or seal behaviour; that is ATM-GOV-0199."
  - "Do not widen or narrow any task card's declared scopePaths as a workaround."
  - "Do not proceed with TASK-SKL-0014 under this card."
nonGoals:
  - "No change to lease, admission trigger, or lane routing policy."
  - "No rewrite of the broker registry storage format."
rollback:
  strategy: revert-commit
  notes: "Revert the convergence commit. Pre-fix behaviour is exact-match at every site: unsafe but uniform and understood. A half-converged matcher where some axes are pattern-aware and others are not is worse than either, so revert rather than patch forward under time pressure."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-conflict-matrix"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:
    - atom: "atm.broker-resource-overlap-matcher"
      pattern: "Shared pattern-aware resource key matcher"
      source: "packages/core/src/broker/resource-overlap.ts"
      disposition: "extract"
      inlineReason: null
    - atom: "atm.broker-overlap-callsite-inventory"
      pattern: "Programmatic call-site inventory guard"
      source: "tests/core/broker-overlap-callsite-inventory.test.ts"
      disposition: "extract"
      inlineReason: null
completed_at: "2026-07-20T15:31:27.660Z"
completed_by_agent: "claude-captain"
closedAt: "2026-07-20T15:31:27.660Z"
closedByActor: "claude-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T15-31-27-543Z-close-80c697b95e3b"
lastTransitionAt: "2026-07-20T15:31:27.660Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e290914ed"
---

# ATM-GOV-0215

## Why this card exists

`ATM-GOV-0206` was closed as `done` with delivery commit `667dc4cc5`
("fix(broker): make resource overlap pattern aware"). Its acceptance required
that the probe A case return a `file-range` overlap instead of `parallel-safe`.

**That acceptance was never actually satisfied.** 0206 converted exactly one
function — `hasResourceOverlap` in `conflict-matrix.ts` — and left every other
overlap call site on exact string equality, including the one that produces the
verdict the original defect was reported against.

This card finishes the job. It does not re-litigate 0206's design, which was
correct; it repairs the coverage.

## Evidence (backlog ATM-BUG-2026-07-20-213)

Three facts, all command-backed, all reproducible:

**1. The live false negative is at `decision/physical-overlap.ts:33`.**

```ts
if (!activeIntent.resourceKeys.files.includes(newFile)) {
  continue;
}
```

`Array.includes` is exact string equality. This is the call site that emits
`Physical file overlap on '<path>'`, i.e. the verdict path the original report
was filed against. A glob and the literal path it contains are unequal strings,
so the loop `continue`s and no conflict is recorded.

**2. The defect survives a full rebuild of the frozen runner.**

Full sealed-runner-build at `ccc215b71` on 2026-07-20 21:21 with
`ATM_RETAIN_RELEASE_ARTIFACTS=1`, receipt published, queue released. Probes
re-run against the rebuilt `node atm.mjs` with holder intent
`PROBE-HOLDER-0002` holding `packages/cli/src/commands/telemetry.ts`:

| targetFiles | verdict | conflicts |
|---|---|---|
| `packages/cli/src/commands/**` | `parallel-safe` | 0 — **WRONG** |
| `packages/cli/src/commands/telemetry.ts` | `needs-physical-split` | 1 |
| `templates/skills/**` | `parallel-safe` | 0 — correct |

Three checks rule out misdiagnosis: the compiled matcher tested in isolation is
correct (`packages/core/dist/broker/resource-overlap.js` `resourceListsOverlap`
returns `true` for glob-vs-literal); the built commit `ccc215b71` does contain
0206's fix (22 references in source); and `physical-overlap.ts` was added
`7b7998331` on 2026-07-16, four days *before* the fix. This is an incomplete
fix, not a regression and not a stale runner.

**3. Twelve exact-match call sites remain, four of them in the file 0206 edited.**

| file | lines | axis |
|---|---|---|
| `broker/conflict-matrix.ts` | 135, 145, 155, 165 | projections, registries, validators, artifacts |
| `broker/decision.ts` | 67, 72, 77, 82 | projections, registries, validators, artifacts |
| `broker/decision/physical-overlap.ts` | 33 | files |
| `broker/decision/decomposition.ts` | 109 | files |
| `broker/decision/proposal-overlap.ts` | 27, 184 | files |

`broker/decision/surfaces.ts:4` additionally builds a `Set` over
`normalizeBrokerPath(...)`, a third normalization semantics whose relationship
to the canonical matcher must be resolved rather than assumed.

Inventory command (re-run it; do not trust this table as frozen truth):

```bash
rg -n "resourceKeys\.\w*\.includes\(|targetFiles\.includes\(|\.files\.includes\(" \
   packages/core/src packages/cli/src
```

## Required design

- **One matcher, data-driven.** Every overlap / resource-intersection /
  physical-conflict decision routes through the single matcher established by
  0206. No call site may re-implement equality, and no axis may get a bespoke
  comparison. Charter invariant 008 applies: the matcher answers with structured
  facts, never a bare refusal.
- **No hard-coding.** Path prefixes, family names, task ids, actor ids, and the
  `telemetry.ts` incident must not appear in the implementation. Semantics are
  derived from the resource keys themselves.
- **Resolve normalization once.** Determine whether `normalizeBrokerPath` is the
  canonical normalizer or a divergent fourth semantics, and converge it. Two
  normalizers behind one matcher is the same class of defect at one remove.
- **Fail closed in the fact layer.** Undecidable key pairs emit structured
  `unknown/possible-overlap` evidence, consistent with the amended 0206
  contract — never a terminal shared-write refusal.
- **Inventory must be programmatic.** The guard test derives the call-site set
  from the source tree. A hand-maintained list is explicitly rejected by the
  stop rule, because it degrades the moment someone adds a decision module.

## Acceptance

- Every call site in the inventory routes through the shared matcher; proven per
  site, not in aggregate.
- **Sample 0001 / probe A passes on the frozen runner**: with an active intent
  holding `packages/cli/src/commands/telemetry.ts`, a write intent declaring
  `packages/cli/src/commands/**` returns a `file-range` conflict, not
  `parallel-safe`. This must be demonstrated through `node atm.mjs broker
  decision` after rebuild — not via a unit test against source, and not via
  `packages/core/dist`. 0206 passed its unit tests while the shipped runner
  stayed broken; that failure mode is what this criterion exists to catch.
- The literal case is unchanged (`needs-physical-split`).
- Disjoint patterns still return clear (`templates/skills/**` vs
  `packages/core/**`) — convergence must not collapse into serializing
  everything.
- Both directions detected: active-pattern/new-literal and the reverse.
- Pattern-vs-pattern intersection detected (`commands/**` vs
  `commands/taskflow/**`).
- Every axis covered — files, atom ids, atom cids, generators, projections,
  registries, validators, artifacts — with a test per axis.
- **Call-site inventory test** fails when a new exact-match comparison against a
  resource-key collection is introduced anywhere in the broker tree. Prove it by
  adding a deliberate violation in the test and asserting the guard catches it.
- Ambiguous key syntax yields structured `unknown/possible-overlap`, with a test.
- The `gateResults`-vs-`conflicts` inconsistency inherited from 0206 is
  diagnosed; fixed here if it shares this root cause, otherwise recorded as a
  structured follow-up.
- Runner rebuilt after the fix and the frozen `node atm.mjs` behaviour verified;
  the runner-sync receipt is part of closure evidence.

## Verification

```bash
npm run typecheck
npm run validate:cli
npm run validate:broker-proposal
npm run validate:brokered-write
npm run validate:broker-compose
git diff --check
```

Then, mandatorily, the frozen-runner replay:

```bash
ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
node atm.mjs broker register --task <holder> --actor <actor> --intent-file <literal-holder>.json --json
node atm.mjs broker decision --intent-file <glob-probe>.json --json
```

The holder intent must declare the literal path; the probe declares the glob.

Closure evidence must include the before/after decision JSON for probe A and the
runner-sync receipt proving the verified binary is the shipped one.

## Downstream

- `ATM-GOV-0199` receives the paired correctness samples: the existing
  `false-negative` (sample 0001) and the `correct` sample this card finally makes
  producible. Do not synthesize the positive sample before this card lands.
- `TASK-SKL-0014` stays paused until this closes. It is not blocked by broker
  code, but it relies on trustworthy shared-write overlap verdicts; starting it
  first would invert the governance evidence order.

## Backlog Disposition

- `ATM-BUG-2026-07-20-213` is core evidence for this card and should be included
  in the ATM-GOV-0215 delivery commit. Do not commit it separately under an
  unowned framework temp claim.
- `ATM-BUG-2026-07-20-214` and `ATM-BUG-2026-07-20-215` are consumed by
  `ATM-GOV-0218` and `TASK-ERR-0002`; this card may reference them as context
  but must not implement runner-sync recovery or ErrorCode registration.
- `ATM-BUG-2026-07-20-216` records the task import parser defect where a
  shell-comment-looking line inside a fenced code block is treated as a
  Markdown heading and leads to a misleading empty-plan/import diagnostic. This
  is parser/ErrorCode evidence, not an ATM-GOV-0215 implementation scope item.

## Notes

The lesson worth carrying: 0206's stop rule forbade per-axis patching but said
nothing about call-site coverage, so a fix that satisfied every stated
constraint still shipped the original defect. Correctness of a *predicate* is
not correctness of a *system* until every caller uses it. That is why the
inventory guard, not the matcher, is this card's most durable deliverable.
