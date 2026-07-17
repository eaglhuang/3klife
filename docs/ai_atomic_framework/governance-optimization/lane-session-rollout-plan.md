# ATM Lane Session Rollout Plan

## Goal

Move ATM's parallel-governance identity from actor handle to a conversation-scoped
lane session. Actor id remains metadata for human readability and git
attribution; ownership decisions should use lane identity when both sides have
one and fall back to actor identity only for legacy records.

This plan also pulls forward the adjacent runner-sync orphan queue-head problem
because it can block the close/build lane needed to deliver lane-session work
safely.

## Planning Authority

- Planning repository: `3KLife`
- Target repository: `AI-Atomic-Framework`
- Closure authority: target repository
- Branch policy: stay on the current branch; do not create a development branch
  or worktree branch for this rollout.

## Highest Parallel Governance Principle

ATM parallel governance follows a Tier model:

- Tier 0 read work never queues behind write lanes.
- Tier 1 private writes to the actor's own ledger, evidence, notes, or planning
  artifacts never queue behind unrelated lanes.
- Tier 2 shared writes to the git index, release mirrors, build artifacts,
  protected runtime state, or other shared mutation surfaces must go through the
  broker or steward lane.

This principle is now the top-level interpretation rule for this rollout:
before any gate serializes work, it must name the concrete Tier 2 shared surface
and the intersecting task, actor, or file set. Active foreign work alone is not
enough to block Tier 0 inspection or Tier 1 private evidence, ledger, or
planning progress.

## Design Decisions

- `atm.laneSession.v1` is a new runtime document under
  `.atm/runtime/lane-sessions/`.
- Append-only lane events live under `.atm/history/session-events/<laneId>/`.
- `ATM_LANE_SESSION_ID` is the runtime identity variable.
- `ATM_COMMIT_LANE_SESSION_ID` is the commit attribution variable. Do not reuse
  `ATM_COMMIT_SESSION_ID`, which already means actor work session.
- Work sessions link to lanes through the existing `guidanceSessionId` field.
- Foreign-owner checks follow one migration rule: if both records have lane ids,
  compare lane ids; otherwise compare actor ids.
- Lane adoption is a lane command, not a task command.
- Existing legacy records are not migrated; optional fields and TTL aging keep
  the rollout additive.

## Execution Order

1. P0 runner-sync queue health:
   - `TASK-LANE-0001`
   - `TASK-LANE-0002`
   - `TASK-LANE-0003`
2. Lane session foundation:
   - `TASK-LANE-0010`
   - `TASK-LANE-0011`
3. Lane session integration follow-up cards:
   - claim stamping and task direction metadata
   - commit attribution
   - lane adoption
   - framework temp lock lane key
   - fresh-task reservation lane key
   - claim conflict and broker lifecycle lane key
   - heartbeat, sweep, analyzer, and error-code docs

## Parallelization

The P0 runner-sync cards and the lane-session foundation cards touch mostly
different files. They may be worked by separate captains only after each worker
has an explicit actor identity and a task claim. Closeout remains serial: each
task must provide focused validator output and task evidence before the next
dependent task is closed.

## Verification Envelope

- Focused tests named in each task card.
- `npm run typecheck`.
- `npm run validate:cli` after each functional chain.
- Final two-lane dogfood: two shells with the same actor handle must receive
  different lane ids, conflict as separate lanes, and support adoption after TTL
  or handoff.

## Known Preflight Risks

- The target worktree may contain unrelated dirty release mirror or task
  residue. Do not mix those files into lane-session commits.
- Integration drift for installed skills may block broad `doctor`; treat it as a
  separate governed maintenance card unless it blocks the specific task close.
- Large or minified modules require extraction-first handling instead of broad
  inline edits.

## Follow-up: Planning Authority Skill Gate

`TASK-SKL-0013` records a dogfood failure found while authoring this rollout:
the Captain initially let the target repository current working directory decide
where source planning cards should be written. The fix must stay repository
neutral. Skills should resolve an external governance workbench repository when
ATM framework work must be planned outside the ATM target ledger, without
hard-coding any specific workbench repo name. Skill changes must be made at the
source-of-truth template first, then synced to installed skill copies. Editing
only an installed `.agents/skills/**` or `integrations/**/SKILL.md` copy is not
sufficient because reinstalling or refreshing the skill pack would overwrite the
fix.

## Lane Session Integration Follow-up Cards

The foundation cards (`TASK-LANE-0010` and `TASK-LANE-0011`) created the lane
runtime store, event stream, visible `atm lane` command, and optional CLI result
envelope. The remaining work migrates ownership checks from actor-only behavior
to lane-aware behavior while preserving legacy actor fallback.

| Task | Purpose | Primary gate |
| --- | --- | --- |
| `TASK-LANE-0012` | Stamp claims, work sessions, and task direction metadata with lane ids. | Claim and task-direction regression tests |
| `TASK-LANE-0013` | Add lane attribution to governed git commits without reusing work-session ids. | Git governance commit attribution tests |
| `TASK-LANE-0014` | Implement explicit lane adoption and handoff semantics. | Lane command adoption tests |
| `TASK-LANE-0015` | Key framework temporary locks by lane when available. | Framework temp-claim tests |
| `TASK-LANE-0016` | Key fresh task reservation by lane when available. | Next fresh reservation tests |
| `TASK-LANE-0017` | Make claim conflict, broker lifecycle, and stale-owner diagnostics lane-aware. | Claim admission and broker lifecycle tests |
| `TASK-LANE-0018` | Add lane heartbeat, sweep, analyzer, and error-code documentation. | Lane lifecycle and error-code validation |
| `TASK-LANE-0019` | Persist append-only lane session events and connect them to the parallel ledger analyzer. | Analyzer reports `maxConcurrency >= 2` from lane evidence |
| `TASK-LANE-0020` | Adjudicate the cross-lane `repair-claim` on `TASK-CODEX-0204` and capture guard/backlog follow-up if it was unsafe. | Repair-claim adjudication report |

## Follow-up: First Real Parallel Evidence

The first Lane Session dogfood wave produced hard-overlap evidence that was not
available in earlier ledger mining. While `TASK-CODEX-0204` was still in an
active claim window, lane actors completed `TASK-LANE-0001`, `TASK-LANE-0002`,
`TASK-LANE-0003`, and `TASK-LANE-0010`. The sample proves real task-level
parallelism with `maxConcurrency = 2`, but the proof currently depends on task
claim windows plus git attribution rather than an append-only lane event
history.

Two follow-up cards preserve that evidence path:

- `TASK-LANE-0019` turns lane runtime snapshots into durable event evidence and
  teaches the analyzer to report the overlap automatically.

## Follow-up: Runner Gate Precision for Parallel Work

The GOV-0156 sealed-runner build cache work exposed a different bottleneck:
current runner gates are safe but too broad. They serialize ledger-only or
docs-only closeback behind unrelated source WIP, and they report
`ATM_RUNNER_SYNC_FOREIGN_WIP_BLOCKED` without enough precision to tell whether
the foreign lane actually intersects the sealed build input surface.

The approved direction is not emergency override. The fix is a full parallelism
governance pass that turns scope classification, dependency gates, close
preflight, runner-sync admission, broker tickets, and batching into one coherent
system.

The constitutional rulings for this pass are fixed:

| Rule | Decision |
|---|---|
| R1 same task card | One task card binds to one lane session. A second lane session claiming the same card receives `ATM_LOCK_CONFLICT`; no waitlist and no broker queue. Handoff/adopt/takeover remains the only legal transfer route. |
| R2 semantic dependencies | Dependency gates block code mutation only. Docs, planning artifacts, card fields, blueprint updates, and ledger/evidence writes may continue before dependency close. |
| R3 single main branch commit | The single main branch remains the minimum serial core. Broker batching is allowed only for related tasks in the same wave and compatible surface family; unrelated tasks do not share commits. |
| R4 docs versus code | Document writes are document-management work and do not enter parallel write governance. Code writes always remain governed by claim scope plus broker/steward where needed. |

Six cards implement the sequence:

| Card | Purpose | Parallelism |
|---|---|---|
| `ATM-GOV-0159` (F1) | Promote `code` / `docs` / `ledger` scope classification plus lane event append coverage into shared policy. | Foundation; run first. |
| `ATM-GOV-0160` (F2) | Make dependency gates block code claims only while allowing docs/ledger/planning claims. | May run after F1 and in parallel with F3/F4. |
| `ATM-GOV-0157` (F3) | Skip runner staleness close blockers when `scopeClass` contains no code. | May run after F1 and in parallel with F2/F4. |
| `ATM-GOV-0158` (F4) | Make runner-sync foreign-WIP admission block only landed-not-closed build-input conflicts. | May run after F1 and in parallel with F2/F3. |
| `ATM-GOV-0161` (F5) | Convert code-class Tier 2 shared-surface refusals into broker tickets with queue/session events. | Runs after F1-F4 and lane event history. |
| `ATM-GOV-0162` (F6) | Add related-task batching for commit/build/projection windows using `waveId` and compatible surface families. | Runs after F5. |

`ATM-GOV-0156` remains on the independent build-cache line and depends on
`ATM-GOV-0157`, `ATM-GOV-0158`, and `ATM-GOV-0155` closeback.

Metrics required by this follow-up:

- `ATM-GOV-0157`: close/pre-close evidence exposes
  `runnerGateDecision: "skipped-non-code" | "required"` so the analyzer can
  measure build-free closeback rate.
- `ATM-GOV-0158`: admission refusals expose `blockingTaskId`,
  `blockingActorId`, `heartbeatAt`, and `intersectingFiles` so the analyzer can
  measure false-positive or overbroad blocking.
- `ATM-GOV-0161`: broker ticket events expose `ticketId`, `position`,
  `headOwner`, `headHealth`, `batchEligible`, `enqueuedAt`, and `waitedMs`.
- `ATM-GOV-0162`: batch evidence exposes `batchRate` and `buildsPerWave`.
- `ATM-GOV-0156`: release manifests expose `buildSkipped`,
  `buildInputsTreeHash`, and phase timings so the analyzer can measure build
  time per wave before and after the optimization.
- `TASK-LANE-0020` reviews the `2026-07-16T16:52:32Z` repair claim against
  `TASK-CODEX-0204` to decide whether it was a valid orphan repair or the first
  recorded cross-lane interference incident.
