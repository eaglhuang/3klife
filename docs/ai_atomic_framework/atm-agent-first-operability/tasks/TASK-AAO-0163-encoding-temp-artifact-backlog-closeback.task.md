---
task_id: TASK-AAO-0163
title: "Encoding temp artifact backlog closeback"
status: done
owner: atm-core
priority: P2
milestone: Backlog-P2
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-123
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "git diff --check"
  - "npm run check:encoding:touched"
  - "npm run validate:task-import"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only the canonical backlog closeback row if the historical TASK-AAO-0159 linkage is disproved."
atomizationImpact:
  ownerAtomOrMap: "atm.bug-backlog"
  mapUpdates: []
outOfScope:
  - "Changing encoding guard implementation"
  - "Deleting or quarantining another actor's tmp files"
  - "Changing Team Agents files or shared atom maps"
completed_at: "2026-07-12T10:57:30.984Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T10:57:30.984Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T10-57-30-924Z-close-aa21fac71bf0"
lastTransitionAt: "2026-07-12T10:57:30.984Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "90361542b04b6299bfeb649e027968c08df1e141"
---

# TASK-AAO-0163 Encoding temp artifact backlog closeback

## Problem

`ATM-BUG-2026-07-12-123` still says `Needs task card` even though
`TASK-AAO-0159` delivered the encoding touched guard isolation for unrelated
temporary command transcripts and validated it through the governed close path.

Leaving the row open makes future captains re-select already-completed work.

## Goal

Update the canonical ATM bug backlog row to identify `TASK-AAO-0159` as the
fixing task and retain the follow-up guard expectation.

## Acceptance Criteria

- `ATM-BUG-2026-07-12-123` status becomes `Fixed in TASK-AAO-0159`.
- Evidence / follow-up text names the isolation behavior delivered by
  `TASK-AAO-0159`.
- No implementation files are changed.
- Encoding and backlog duplicate-ID validation still pass.

## Delivery Sequence

1. Inspect the existing backlog row and recent close history.
2. Update only the canonical backlog closeback row.
3. Run whitespace, encoding touched, and task-import validation.
4. Close through normal taskflow with historical delivery evidence.

## Context Map

### Primary
- `docs/governance/atm-bug-and-optimization-backlog.md`

### Test Coverage
- `git diff --check`
- `npm run check:encoding:touched`
- `npm run validate:task-import`
