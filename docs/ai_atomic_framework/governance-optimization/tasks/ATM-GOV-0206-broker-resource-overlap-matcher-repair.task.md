---
task_id: ATM-GOV-0206
title: Broker resource overlap matcher repair (pattern-aware conflict detection)
status: done
owner: atm-governance
priority: P0
milestone: P0
severity: P0
depends_on: []
target_repo: AI-Atomic-Framework
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
closure_authority: target_repo
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
series_selection_reason: Extends the registered GOV plan with a P0 generalized matcher repair discovered during broker correctness dogfood.
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
errorCodes: []
evidence:
  required: command-backed
producer:
  - "Pattern-aware overlap contract and its negative-case fixtures"
consumer:
  - "ATM-GOV-0199 broker decision/outcome telemetry"
  - "ATM-GOV-0209 structured overlap evidence"
  - "ATM-GOV-0211 compose-first ticket state machine"
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
    - "atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json"
  extractionCandidates:
    - atom: "atm.broker-resource-overlap-matcher"
      pattern: "Shared pattern-aware resource key matcher"
      source: "packages/core/src/broker/conflict-matrix.ts"
      disposition: "extract"
      inlineReason: null
completed_at: "2026-07-20T08:18:33.104Z"
completed_by_agent: "codex-captain-0206"
closedAt: "2026-07-20T08:18:33.104Z"
closedByActor: "codex-captain-0206"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T08-18-33-018Z-close-5374718b790a"
lastTransitionAt: "2026-07-20T08:18:33.104Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "667dc4cc5a0c539a1aba6e1a957c8352f82c1daf"
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
- Fail closed in the fact layer on ambiguity. If two keys cannot be decided
  (unsupported pattern syntax, non-path key), emit structured `unknown/possible
  overlap` evidence. Before 0211 this matcher remains shadow-only; after 0211
  the fact routes to compose adjudication or a durable queue ticket, never a
  terminal shared-write refusal.
- Direction matters: active-holds-glob vs new-holds-literal and the reverse must
  both be detected. The current bug is symmetric in code but must be tested in
  both directions.

## Acceptance

- The probe A matcher returns a structured `file-range` overlap with matched
  resource keys, normalization, provenance, and input digest; shadow mode
  records the legacy `parallel-safe` discrepancy without live terminal block.
- The probe B literal case is unchanged.
- Both directions (active pattern / new literal, and the reverse) are detected.
- Pattern-vs-pattern intersection is detected (`commands/**` vs
  `commands/taskflow/**`).
- Genuinely disjoint patterns return a structured matcher-clear result; only after
  ATM-GOV-0211 activates the ticket state machine may that result become an
  `execute` ticket rather than a legacy `parallel-safe` terminal verdict.
  (`templates/skills/**` vs `packages/core/**`) — the fix must not collapse into
  serializing everything.
- Every resource axis is covered by the shared matcher, proven by a test per
  axis, not only `files`.
- Ambiguous/unsupported key syntax returns a structured
  `unknown/possible-overlap` fact and shadow discrepancy, with a test. It may
  map to compose/queue only after ATM-GOV-0211 is sealed and must never become
  a direct terminal overlap block.
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

## v2.1 Activation Gate

- 本卡可完成source/tests/shadow telemetry並獨立close，但不得單獨live-enable成更廣的`blocked-shared-surface`或`blocked-cid-conflict`。
- live activation的硬條件是0211 durable ticket state machine已sealed：different-task命中只能轉execute/compose-batch/queue ticket；R1同卡第二lane仍依憲章hard reject。
- 0206與0211互相引用stop rule：matcher與0209 structured facts不一致、ticket persistence/CAS未通過、或任何cross-task命中回bare refusal時保持shadow並停止rollout。
- genuinely disjoint case仍為clear；ambiguous case是unknown/possible-overlap fact，不可藉機序列化所有工作。
