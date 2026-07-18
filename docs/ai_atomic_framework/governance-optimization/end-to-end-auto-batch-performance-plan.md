# ATM End-to-End Auto-Batch and Performance Evidence Plan

Status updated: 2026-07-18
Planning authority: `C:/Users/User/3KLife`
Target authority: `C:/Users/User/AI-Atomic-Framework`
Closure authority: target repo ATM ledger

## Product Model

The formal product pipeline is:

```text
Batch selects cards -> Team Wave does cards -> Broker batches shared writes -> Checkpoint closes cards
```

This plan does not create a fourth batch system. It integrates existing Batch
Mode, Team Wave, Broker steward queues, and taskflow Checkpoint/close into one
end-to-end governed lane with evidence that can prove whether governance work is
faster than the serial baseline.

## Current Facts

- `ATM-GOV-0168` is already closed as lane-aware same-task claim conflict and
  adopt rebind. It is treated as prerequisite lane-safety work, not as the
  unified manifest implementation.
- `ATM-GOV-0169` is already closed as foreign/unstaged WIP claim admission. It
  is treated as prerequisite admission-safety work.
- `ATM-GOV-0170` is already closed as the oversized-file extraction claim
  pathway. It unblocked later claim-admission implementation.
- `ATM-GOV-0171` is already closed as the runner-sync receipt and clean-close
  pathway. It provides runner receipt proof needed by later close/build stages.
- `ATM-GOV-0180` is a separate Cursor-owned bug fix and is not part of this
  product plan.
- `ATM-GOV-0172` is closed and now carries the first missing functional
  deliverable from the original plan: `atm.waveManifest.v1`.

Because 0168-0171 were already consumed by prerequisite repairs, the remaining
plan work starts at 0172. Do not rewrite closed historical IDs to make the old
numbering look tidy; record the mapping below and continue from the current
ledger truth.

## Numbering Map

| Current Card | Original Plan Slot | Status | Purpose |
|---|---:|---|---|
| ATM-GOV-0168 | prerequisite | done | Lane-aware same-task claim conflict and adopt rebind |
| ATM-GOV-0169 | prerequisite | done | Foreign/unstaged WIP claim admission |
| ATM-GOV-0170 | prerequisite | done | Oversized-file extraction claim pathway |
| ATM-GOV-0171 | prerequisite | done | Runner-sync receipt and clean-close pathway |
| ATM-GOV-0172 | 0168 | done | Unified Wave Manifest and Policy |
| ATM-GOV-0173 | 0170 | planned | Batch Wave Selector |
| ATM-GOV-0174 | 0171 | planned | Executor-Neutral Team Wave Runtime |
| ATM-GOV-0175 | 0172 | planned | Durable Broker Scheduler |
| ATM-GOV-0176 | 0173 | planned | Shared Delivery Commit Executor |
| ATM-GOV-0177 | 0174/0175 | planned | Shared Build/Projection Executor plus Atomic Wave Checkpoint |
| ATM-GOV-0178 | 0176/0177 | planned | Parallel Analyzer v2 plus End-to-End Failure Matrix |
| ATM-GOV-0179 | 0178/0179 | planned | Strict Paired A/B Dogfood plus Default-On Circuit Breaker |

## Task Plan

### ATM-GOV-0172 - Unified Wave Manifest and Policy

Status: done.

Delivered `atm.waveManifest.v1` in core broker code with lifecycle states,
eligibility policy, summary helpers, and a legacy `atm.teamWaveEnvelope.v1`
adapter. This is the shared contract that later executor, broker, and checkpoint
cards must use.

### ATM-GOV-0173 - Batch Wave Selector

Goal: make Batch Mode select eligible ready cards into one wave manifest.

Required behavior:

- Add `batch current` or equivalent evidence exposing `currentWave`,
  `deferredReasons`, and the dispatch command.
- Select from the current queue head plus compatible ready cards.
- Cap the first implementation at `maxWaveSize = 4`.
- Require same target repo, dependency readiness, compatible surface family,
  and declared validators.
- Produce `atm.waveManifest.v1` records instead of a second batch structure.
- Preserve serial fallback when no eligible batch exists.

### ATM-GOV-0174 - Executor-Neutral Team Wave Runtime

Goal: execute a wave without binding the core protocol to one editor or worker
mechanism.

Required behavior:

- Let Team Wave consume `atm.waveManifest.v1`.
- Support local lanes first; keep editor subagents/team-agents as executor
  options.
- Workers return `atm.patchEnvelope.v1`, validator evidence, timing, and scope
  attribution.
- Coordinator detects partial worker failure and marks `needs-review` or
  `failed-retryable`.
- Workers do not commit or close tasks; coordinator owns shared write and close.

### ATM-GOV-0175 - Durable Broker Scheduler

Goal: make shared write queues durable and wave-aware.

Required behavior:

- Add durable broker tickets keyed by `waveId`, `surfaceFamily`, task id, and
  payload digest.
- Cover commit, runner-sync/build, and projection shared surfaces.
- Track states: `queued`, `head`, `batched`, `executing`, `released`,
  `failed`, and `cancelled`.
- Attach ticket ids back to the wave manifest.
- Add TTL/cleanup/reseal behavior for stale ticket heads.

### ATM-GOV-0176 - Shared Delivery Commit Executor

Goal: allow broker-owned shared delivery commits for same-wave compatible tasks.

Required behavior:

- Implement `broker batch execute --surface commit` or equivalent executor.
- Verify claims, sealed base, HEAD, scope, validators, and stage set before
  commit.
- Use a temporary index to avoid shared-index contamination.
- Emit `atm.sharedWriteReceipt.v1` with wave id, task ids, manifest digest,
  commit sha, file slices, and payload digest.
- Refuse unrelated tasks even if they are waiting in the same branch window.

### ATM-GOV-0177 - Shared Build/Projection Executor and Atomic Wave Checkpoint

Goal: coalesce generated writes and close wave members atomically after delivery.

Required behavior:

- Run one sealed runner build and one projection regeneration for a wave when
  inputs prove compatibility.
- Reuse GOV-0156 content-addressed build skip when available.
- Emit build/projection receipts and fan them out to task evidence.
- Add `batch checkpoint --wave <id>` as the close integration point.
- Close member ledgers only after delivery/build/projection receipts satisfy
  each member.
- Keep planning closeback compare-and-swap safe; failed planning closeback must
  leave `reconcile-required` evidence.

### ATM-GOV-0178 - Parallel Analyzer v2 and End-to-End Failure Matrix

Goal: prove the pipeline is measurable and failure-safe.

Required behavior:

- Analyze manifests, session events, broker tickets, receipts, task events, and
  commits.
- Report max concurrency, hard-overlap minutes, makespan, active throughput,
  waitedMs p50/p95, batchRate, builds/projections/commits per wave, false
  blocks, repair closure rate, lane intervention count, and executor cost.
- Add fixture repos for happy-path wave, conflict, docs-only runner skip,
  worker partial failure, HEAD moved, build retry, projection retry, checkpoint
  retry, lane conflict, kill switch, and serial fallback.

### ATM-GOV-0179 - Strict Paired A/B Dogfood and Default-On Circuit Breaker

Goal: prove or reject the performance claim before default-on rollout.

Required behavior:

- Run paired serial-control and auto-batch-treatment waves.
- Use AB/BA ordering to reduce cache/order bias.
- Match task pairs by scope class, validator cost, LOC, build requirement, and
  executor type.
- Acceptance targets: median makespan improves at least 25 percent, active
  throughput improves at least 25 percent, eligible treatment `batchRate >=
  0.70`, `buildsPerWave <= 1`, `projectionsPerWave <= 1`, validators/close
  audit pass 100 percent, out-of-scope and R1 violations are zero.
- Default-on only if data supports it; otherwise report `inconclusive` or
  `regressed`.
- Add config/env controls: `batch.autoBatch.enabled`,
  `batch.autoBatch.maxWaveSize`, `batch.autoBatch.collectionTimeoutMs`,
  `ATM_AUTO_BATCH=0`, `--auto-batch off`, and
  `ATM_AUTO_BATCH_CIRCUIT_OPEN`.

## Execution Rules

- Work on main only. Do not use branch development for these GOV cards.
- Each card must leave its own target worktree scope clean before moving on.
- Do not touch `ATM-GOV-0180` artifacts unless the human explicitly redirects.
- Code writes are governed by task claim plus broker/steward rules.
- Docs/planning updates live in the planning authority and should not mutate the
  target runtime ledger directly.
- Runner/build/projection writes must go through the runner-sync and broker
  evidence chain when the task scope includes code.

## Evidence Standard

Every implementation card must provide command-backed evidence. The final A/B
card must include a machine-readable analyzer report and a concise human summary
stating whether ATM governance cards became faster, slower, or inconclusive.
