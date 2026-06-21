---
task_id: TASK-CID-0119
title: Proposal-gated write admission dogfood and adoption gate
status: done
milestone: M21
depends_on:
  - TASK-CID-0118
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/reports/**"
  - "scripts/**"
  - "packages/cli/src/commands/**"
  - "packages/core/src/broker/**"
  - "tests/cli/**"
deliverables:
  - "docs/reports/**"
  - "scripts/**"
  - "tests/cli/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not invent paper-only synthetic success stories."
  - "Do not mark adoption complete without at least one natural or near-natural same-file dogfood run."
nonGoals:
  - "No broad governance rewrite outside proposal-gated write admission."
atomizationImpact:
  ownerAtomOrMap: "atm.proposal-gated-write-admission-adoption-gate"
  mapUpdates: []
completed_at: "2026-06-21T16:07:33.973Z"
completed_by_agent: "captain"
delivery_commit: "26a5ba4467d73059416adda6a2eade5e9a586e6f"
---

# TASK-CID-0119

## Goal

Dogfood proposal-gated write admission in a real or near-real same-file development flow and decide whether the feature is ready to become the default path for selected hot files.

## Acceptance

- At least one same-file case is captured where broker arbitration happens before the second writer mutates working tree content.
- At least one hot-file case is captured where the first writer enters proposal-first mode before a second writer exists.
- At least one parked-first-writer or equivalent rearbitration trace is captured for uncommitted same-file work.
- At least one composer-routed success trace is captured through the official product path.
- At least one blocked-before-write trace is captured for true overlap.
- A short adoption report states:
  - what should remain opt-in,
  - what should become default for shared hot files,
  - what should stay on the direct fast path.

## Non-Goals

- No claim that every file in the repo should immediately require proposal gating.
- No paper-only framing without product adoption conclusions.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
