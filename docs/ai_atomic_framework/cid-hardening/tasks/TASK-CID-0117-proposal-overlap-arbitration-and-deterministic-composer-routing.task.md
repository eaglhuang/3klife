---
task_id: TASK-CID-0117
title: Proposal overlap arbitration and deterministic-composer routing
status: planned
milestone: M21
depends_on:
  - TASK-CID-0116
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/BROKER_GUIDE.md"
  - "tests/cli/**"
deliverables:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/broker.ts"
  - "packages/cli/src/commands/team.ts"
  - "docs/BROKER_GUIDE.md"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not implement semantic code understanding beyond proposal overlap / atom hints / anchors."
  - "Do not broaden to non-brokered editor writes."
nonGoals:
  - "No final dogfood archive in this card."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-overlap-arbitration"
  mapUpdates: []
---

# TASK-CID-0117

## Goal

Teach broker to use submitted proposals for early arbitration so same-file work can be classified before write:

- same proposal region / same atom => block before write;
- same file but disjoint bounded region => deterministic-composer route before write;
- disjoint safe case => direct write admitted.

This card also owns the first-writer recovery path when local work already exists but has not yet committed:

- park first writer,
- extract or submit current patch,
- rearbitrate before granting second-writer authority.

## Acceptance

- Broker can compare proposal overlap using available atom ids, atom cids, anchors, and bounded-region hints.
- Same-file different-region work can be routed to `deterministic-composer` before a second writer mutates the file.
- Same-region overlap can be emitted as `blocked-before-write`.
- A parked-first-writer rearbitration path exists for uncommitted local work on collision-prone files.
- Tests cover at least one case where the second writer is held while the first writer is parked and rearbitrated.
- Tests cover at least one early block and one early composer route on the same source file.

## Non-Goals

- No automatic natural-language intent inference.
- No broad format-adapter redesign beyond proposal overlap support.
- No full editor-specific patch harvesting framework beyond the minimum runtime path needed for rearbitration.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
