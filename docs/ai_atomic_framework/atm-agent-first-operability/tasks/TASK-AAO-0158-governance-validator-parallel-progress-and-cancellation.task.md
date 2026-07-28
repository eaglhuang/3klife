---
task_id: TASK-AAO-0158
title: "Governance validator parallelism, progress, and cancellation"
status: done
owner: atm-core
priority: P0
milestone: Backlog-P0
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-122
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-governance-commands/**"
  - "package.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-governance-commands.ts"
  - "package.json"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "npm run validate:governance-commands"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the validator scheduler, progress protocol, fixture changes, and task-specific npm scripts together. The sequential validator remains the compatibility fallback."
atomizationImpact:
  ownerAtomOrMap: "atm.governance-validation"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
team:
  required: false
  size: L3
outOfScope:
  - "Changing task, evidence, or claim lifecycle semantics"
  - "Bypassing validator failures or reducing fixture coverage"
  - "Modifying TASK-TEAM-0075 or TASK-TEAM-0076 implementation files"
completed_at: "2026-07-12T10:09:11.118Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T10:09:11.118Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T10-09-11-054Z-close-b9feb8a9ba1e"
lastTransitionAt: "2026-07-12T10:09:11.118Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "831030ff5c1216fc93a2bd613338a879c86ac7a2"
---

# TASK-AAO-0158 Governance validator parallelism, progress, and cancellation

## Problem

`ATM-BUG-2026-07-12-122`: the focused governance command validator is a large
single-file sequential program. During TASK-AAO-0157 it exceeded an interactive
command budget without any phase output, making an operator unable to
distinguish a healthy long fixture lane from a hang or safely stop and resume.

The independent fixture groups do not need to wait for one another. Failure
output still needs stable, command-backed evidence that identifies the fixture
group, command, elapsed time, and causal error.

## Goal

Bring the normal governance-validator route below a 30-second interactive
target where the fixture dependency graph permits it, while retaining a
deterministic full integration mode. Expose phase progress and cancellation
without losing failure evidence.

## Acceptance Criteria

- Independent fixture groups run through a bounded parallel scheduler; groups
  that mutate shared fixture state remain explicitly serialized.
- Progress is emitted at phase start and completion with stable phase ids and
  elapsed milliseconds, so terminals never remain silent during a healthy run.
- Cancellation via `SIGINT` or abort signal stops queued work, waits for active
  children to settle or terminate, returns a non-success exit code, and writes
  a concise reason naming unfinished phases.
- A single failed phase preserves the phase id, command/case, elapsed time,
  captured error, and any remaining phase disposition. It must not erase
  evidence from completed phases.
- A fast default lane and a deterministic full integration lane are named in
  package scripts or documented CLI flags. The full lane preserves existing
  coverage semantics.
- Regression coverage proves parallel scheduling, shared-state serialization,
  progress ordering, cancellation cleanup, and failure evidence.
- The measured default command completes under 30 seconds on the Windows
  development host when caches are warm; if environment variance prevents the
  target, evidence identifies the dominant phase and the card remains open.
- Backlog row `ATM-BUG-2026-07-12-122` is updated with the measured outcome
  and task id only after acceptance evidence passes.

## Delivery Sequence

1. Profile every existing phase and classify its fixture-state dependencies.
2. Extract a small scheduler boundary while retaining each existing assertion
   and deterministic ordering for shared-state groups.
3. Add structured phase progress, timing, cancellation, and failure-summary
   reporting.
4. Add focused scheduler regressions and split fast versus full package lanes.
5. Measure warm and uncached execution, then update the ATM backlog and atom
   map with evidence-backed completion status.

## Context Map

### Primary
- `scripts/validate-governance-commands.ts`: phase graph, fixture isolation,
  scheduler, terminal reporting, cancellation, and test execution.

### Secondary
- `package.json`: named fast and full validator routes.
- `docs/governance/atm-bug-and-optimization-backlog.md`: lifecycle outcome for
  the reproduced interactive timeout.

### Test Coverage
- Existing validator fixtures plus focused scheduler/cancellation regressions.
- `npm run typecheck`, fast validator, full validator, and `git diff --check`.

### Patterns To Follow
- Preserve command-backed ATM evidence, fail-closed validator results, and
  fixture cleanup patterns already present in the validator.

