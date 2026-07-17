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
- `TASK-LANE-0020` reviews the `2026-07-16T16:52:32Z` repair claim against
  `TASK-CODEX-0204` to decide whether it was a valid orphan repair or the first
  recorded cross-lane interference incident.
