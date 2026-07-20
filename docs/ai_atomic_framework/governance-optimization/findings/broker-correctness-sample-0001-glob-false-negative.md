---
doc_id: doc_atm_broker_correctness_sample_0001
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
consumer_card: ATM-GOV-0199
repair_card: ATM-GOV-0206
created_at: 2026-07-20T00:00:00+08:00
sample_kind: broker-correctness
correctness_verdict: false-negative
conflict_axis: file-overlap
---

# Broker correctness sample 0001 — glob targetFiles false negative

This is the first real (non-fixture) broker correctness sample for the 2.0 plan.
Until now `ATM-GOV-0199` had **0 correctness samples**, which is why M2 stayed
`inconclusive`. This sample was produced incidentally during a routine
`TASK-SKL-0014` preflight on 2026-07-20, not by a synthetic harness.

It is a **false negative**: the broker returned `parallel-safe` for a write
intent that physically overlapped a live active intent.

## Environment

- target repo: `C:/Users/User/AI-Atomic-Framework`
- HEAD at capture: `f0625e71379741f7d27e64c85aa62784837e7c5a`
- live active intent: `intent-1784520028374`, task `ATM-GOV-0196`,
  actor `codex-captain`, lane `direct-brokered`, lease 1800s
- active intent `resourceKeys.files` included
  `packages/cli/src/commands/telemetry.ts`

## Reproduction

Two `broker decision` calls against the same live registry state. Only
`targetFiles` differs, and the two values denote **the same physical file**.

Probe A — glob form (as written in the `TASK-SKL-0014` card scope):

```json
"targetFiles": ["packages/cli/src/commands/**"]
```

Probe B — literal form:

```json
"targetFiles": ["packages/cli/src/commands/telemetry.ts"]
```

Both run as:

```bash
node atm.mjs broker decision --intent-file <probe>.json --json
```

## Observed result

| probe | verdict | conflicts | admission.state |
|---|---|---|---|
| A (glob `commands/**`) | `parallel-safe` | `[]` | `not-required` |
| B (literal `telemetry.ts`) | `needs-physical-split` | `file-range: Physical file overlap on 'packages/cli/src/commands/telemetry.ts'` | `composer-routed` |

Probe A's `conflictMatrix` reported **all seven gates `clear`**, including
`file-range`.

Probe A is the false negative. `packages/cli/src/commands/**` contains
`packages/cli/src/commands/telemetry.ts`; two lanes would have been admitted to
write the same file concurrently with no conflict record and no operator signal.

## Root cause

`packages/core/src/broker/conflict-matrix.ts:351-379`, `hasResourceOverlap`:

```ts
const activeFiles = new Set(active.resourceKeys.files);
if (newIntent.targetFiles.some(file => activeFiles.has(file))) return true;
```

Overlap is decided by `Set.has` — **exact string equality**. A glob and the
literal path it matches are unequal strings, so the intents are judged disjoint
and every downstream gate is evaluated against an empty conflict set.

The same exact-match shape is used for every other axis in the function
(`atomIds`, `atomCids`, `generators`, `projections`, `registries`, `validators`,
`artifacts`), so the defect is structural across the resource model, not
specific to `files`.

## Secondary observation (not yet diagnosed)

In probe B the decision carried a `file-range` conflict, yet the matching
`gateResults` entry still reported `status: "clear"`. `conflicts[]` and
`gateResults[]` therefore disagree within a single decision. Suspected origin is
the ternary at `conflict-matrix.ts:66`, but this was not traced to a confirmed
root cause and needs its own investigation.

## Why this was invisible

Per plan line 122, `atm.brokerDecisionTelemetry.v1` is supposed to record
`conflictDetected`, `conflictAxis: file-overlap` and
`correctnessVerdict: false-negative`. At capture time:

```
node atm.mjs telemetry report  -> ATM_TELEMETRY_STATUS: Telemetry is disabled
node atm.mjs telemetry --help  -> positional: []
```

The top-level `telemetry` command still exposes the legacy opt-in surface
(`cliVersion`/`osFamily`), with no `seal`/`report` action for gate telemetry.
The 0193 gate-telemetry interface was not reachable there — it may be wired
elsewhere; that was not confirmed. Either way, no durable record of this wrong
decision was produced by the system itself.

This is the mechanism the M3 wave (0196-0199) exists to close: the plan
predicted "broker correctness samples = 0" and this sample shows the blind spot
is not merely missing data but actively hiding a wrong admission.

## Consumption contract

`ATM-GOV-0199` should ingest this as its first `correctnessVerdict:
false-negative` sample with `conflictAxis: file-overlap`. Repair of the
underlying defect is owned by `ATM-GOV-0206`; 0199 owns proving the decision
would now be *observed and adjudicated*, which is a separate claim from the
decision being *correct*.

Do not treat repair of 0206 as satisfying 0199. A fixed matcher with no
telemetry is still an unobservable broker.
