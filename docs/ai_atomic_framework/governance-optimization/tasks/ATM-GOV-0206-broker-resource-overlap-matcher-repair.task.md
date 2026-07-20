---
task_id: ATM-GOV-0206
title: Broker resource overlap matcher repair (pattern-aware conflict detection)
status: planned
milestone: P0
severity: P0
depends_on: []
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "packages/core/src/broker/types.ts"
  - "tests/core/broker-resource-overlap.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/core/src/broker/conflict-matrix.ts"
  - "tests/core/broker-resource-overlap.test.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:broker-proposal"
  - "npm run validate:brokered-write"
  - "git diff --check"
evidence:
  required: command-backed
producer:
  - "Pattern-aware overlap contract and its negative-case fixtures"
consumer:
  - "ATM-GOV-0199 broker decision/outcome telemetry"
  - "Any future parallel admission or compose work"
missingData:
  - "The gateResults-vs-conflicts inconsistency is observed but not root-caused; this card must diagnose before deciding whether it is in scope or a follow-up."
dataDrivenStopRule:
  - "Stop and request owner revision if repair cannot be expressed as a shared matcher used by every resource axis, and instead needs per-axis special cases."
  - "Stop if the fix requires hard-coding path prefixes, task ids, or the telemetry.ts incident."
  - "Stop if making the matcher pattern-aware forces a verdict-model change (that is capability work, not repair, and belongs to a separate card)."
out_of_scope:
  - "Do not add a compose/parallel-admission verdict; this card only makes existing detection correct."
  - "Do not change broker telemetry or seal behaviour; that is ATM-GOV-0199."
  - "Do not widen or narrow any task card's declared scopePaths as a workaround."
nonGoals:
  - "No change to lease, admission trigger, or lane routing policy."
  - "No rewrite of the broker registry storage format."
rollback:
  strategy: revert-commit
  notes: "Revert the matcher change. Pre-fix behaviour is exact-match, which is less safe but well understood; a partial or ambiguous matcher is worse than either, so revert rather than patch forward under time pressure."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-conflict-matrix"
  mapUpdates:
    - "atm.broker"
  extractionCandidates:
    - atom: "atm.broker-resource-overlap-matcher"
      pattern: "Shared pattern-aware resource key matcher"
      source: "packages/core/src/broker/conflict-matrix.ts"
      disposition: "extract"
      inlineReason: null
---

# ATM-GOV-0206

## Severity

P0. The broker currently returns `parallel-safe` for write intents that
physically overlap a live active intent. Two lanes can be admitted to write the
same file concurrently with no conflict recorded and no operator signal. This is
a silent correctness failure in the component whose entire purpose is preventing
exactly that.

## Evidence

Full reproduction, probe files, and root-cause trace:
`docs/ai_atomic_framework/governance-optimization/findings/broker-correctness-sample-0001-glob-false-negative.md`

Summary — two `broker decision` calls, same live registry, same physical file:

| targetFiles | verdict | conflicts |
|---|---|---|
| `packages/cli/src/commands/**` | `parallel-safe` | `[]` |
| `packages/cli/src/commands/telemetry.ts` | `needs-physical-split` | `file-range` overlap |

## Root cause

`packages/core/src/broker/conflict-matrix.ts:351-379`, `hasResourceOverlap`
decides overlap with `Set.has` — exact string equality:

```ts
const activeFiles = new Set(active.resourceKeys.files);
if (newIntent.targetFiles.some(file => activeFiles.has(file))) return true;
```

A glob and the literal path it matches are unequal strings, so the intents are
judged disjoint and every gate is then evaluated against an empty conflict set.

Every other axis in the same function (`atomIds`, `atomCids`, `generators`,
`projections`, `registries`, `validators`, `artifacts`) uses the identical
exact-match shape. The repair must therefore be a shared matcher, not a
patch to the `files` branch.

## Required design

- Introduce one resource-key matcher used by **all** axes. Overlap is true when
  two keys denote any common concrete resource: equal, or either one is a
  pattern matching the other, or both are patterns with a non-empty
  intersection.
- Pattern semantics must match whatever the rest of ATM already uses for
  scopePaths so operators are not asked to learn a second glob dialect. Derive
  this from the existing implementation; do not invent a new one.
- Fail closed on ambiguity. If two keys cannot be decided (unsupported pattern
  syntax, non-path key), treat as overlapping and let the conflict path run. A
  false positive costs a serialization; a false negative costs a corrupted
  concurrent write.
- Direction matters: active-holds-glob vs new-holds-literal and the reverse must
  both be detected. The current bug is symmetric in code but must be tested in
  both directions.

## Acceptance

- The probe A case from the evidence document returns a `file-range` conflict
  instead of `parallel-safe`.
- The probe B literal case is unchanged.
- Both directions (active pattern / new literal, and the reverse) are detected.
- Pattern-vs-pattern intersection is detected (`commands/**` vs
  `commands/taskflow/**`).
- Genuinely disjoint patterns still return `parallel-safe`
  (`templates/skills/**` vs `packages/core/**`) — the fix must not collapse into
  serializing everything.
- Every resource axis is covered by the shared matcher, proven by a test per
  axis, not only `files`.
- Ambiguous/unsupported key syntax resolves to overlap, with a test.
- The `gateResults`-vs-`conflicts` inconsistency noted in the evidence document
  is diagnosed. If it shares this root cause, fix it here; if not, record a
  structured follow-up rather than silently leaving a decision that reports
  `clear` while carrying a conflict.

## Verification

```bash
npm run typecheck
npm run validate:cli
npm run validate:broker-proposal
npm run validate:brokered-write
git diff --check
```

Plus the isolated fixtures above, and a replay of the two probes from the
evidence document against a synthetic registry.

## Notes

This card makes existing detection **correct**. It does not make overlapping
tasks runnable in parallel — that is a capability change to the verdict model
and belongs to its own card. Fixing this one first is what makes that later work
safe to attempt, because you cannot compose conflicts you cannot see.
