---
task_id: ATM-GOV-0166
title: Add closed-ledger planning source realign verb
status: planned
owner: atm-core
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: >
  Ledger governance verbs belong to the governance-optimization series.
  ATM-GOV-0164 is occupied by unlink-before-worktree-remove and ATM-GOV-0165 is
  occupied by taskflow-runner-staleness-scope-gate, so this card takes the next
  free id ATM-GOV-0166 for ATM-BUG-2026-07-17-004's proper repair.
related_backlog:
  - ATM-BUG-2026-07-17-002
  - ATM-BUG-2026-07-17-003
  - ATM-BUG-2026-07-17-004
scopePaths:
  - packages/cli/src/commands/tasks/realign-plan-source.ts
  - packages/cli/src/commands/tasks/realign-plan-source/**
  - packages/cli/src/commands/tasks/index.ts
  - packages/cli/src/commands/tasks/command-dispatch.ts
  - packages/cli/src/commands/command-specs/tasks.spec.ts
  - packages/cli/src/commands/git-governance/record-commit.ts
  - packages/cli/src/commands/git-governance/**
  - packages/cli/src/commands/tasks/**
  - tests/cli/ledger-realign.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
  - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  - .atm/history/evidence/ATM-GOV-0166.*
  - .atm/history/task-events/ATM-GOV-0166/**
  - .atm/history/tasks/ATM-GOV-0166.json
deliverables:
  - packages/cli/src/commands/tasks/realign-plan-source.ts
  - tests/cli/ledger-realign.test.ts
  - docs/governance/command-surface.md
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types tests/cli/ledger-realign.test.ts
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.task-ledger-source-realignment
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.tasks.realign-plan-source
      pattern: Command Module
      source: packages/cli/src/commands/tasks/realign-plan-source.ts
      disposition: extract
      inlineReason: null
    - atom: atm.git-governance.record-commit-payload-assertion
      pattern: Guard
      source: packages/cli/src/commands/git-governance/record-commit.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0166 - Closed-Ledger Planning Source Realign Verb

## Phase 0 Scope

This card records Phase 0 only: open the planning task card in 3KLife and do
not implement the target AAF changes yet. Phase 1 must run in the
AI-Atomic-Framework target repository as separate governed implementation work.

Phase 0 allowed files:

- `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/ATM-GOV-0166-ledger-plan-source-realign-verb.task.md`
- The corresponding ATM ledger shard if the card is later imported by the ATM
  task-import flow.

## Context

`ATM-BUG-2026-07-17-004` exposed that closed task ledger records can drift when
their planning source cards are moved or renamed after closure. The observed
workaround, `tasks import --force`, is unsafe for closed history: the 2026-07-17
dogfood case showed it can wash lifecycle fields, claim metadata, closure
metadata, and even reset status. Closed ledger source realignment needs a
dedicated metadata-only verb instead of reusing import.

Two adjacent backlog items are part of the same repair envelope:

- `ATM-BUG-2026-07-17-002`: `record-commit` needs a post-commit payload
  assertion that compares the intended staged set with the actual commit diff
  and fails loudly on mismatch.
- `ATM-BUG-2026-07-17-003`: governed commits that assemble metadata-only repair
  payloads must use a temporary index to avoid polluting the shared git index.
- `ATM-BUG-2026-07-17-004`: closed ledger planning-source realignment must be a
  safe metadata verb, not an import-force replay.

## Required Behavior

Add:

```shell
node atm.mjs tasks realign-plan-source --map <from-to.json> [--dry-run]
```

The command must:

- Re-parse `planPath` and `planningSourceSeal.taskCardPath` for closed
  `done` or `abandoned` task ledger records against the planning repository's
  new task-card locations.
- Verify the planning source content digest is unchanged. The move is accepted
  only when the content-only digest proves a pure move.
- Modify only the ledger `source` block and planning-source path fields needed
  for realignment.
- Never mutate closure or lifecycle fields, including `closedAt`,
  `closurePacket`, `owner`, `claim`, `taskDirectionLock`, and `status`.
- Classify the output as low-risk metadata repair that can be delivered in one
  governed batch commit without per-task claims or an emergency lease.
- Assemble that commit with a temporary git index so the shared index is not
  contaminated by unrelated workspace state.
- Add the `record-commit` post-commit payload assertion from
  `ATM-BUG-2026-07-17-002`: compare the intended staged payload with the actual
  commit diff and fail loudly if they differ.

## Acceptance Criteria

- A before/after fixture for the recent 79-card move reproduces the original
  planning-source drift.
- `realign-plan-source --dry-run` reports every proposed source-path update and
  every protected field that must remain unchanged.
- Pure moves pass only when the content digest is unchanged.
- Digest mismatch refuses the realignment with actionable diagnostics.
- After realignment, the pre-push task audit passes.
- Closure metadata is bit-for-bit unchanged for every realigned closed task.
- The implementation includes regression coverage for pure-move allow,
  digest-mismatch refusal, and closure-field immutability.
- The commit payload assertion fails if the staged set differs from the commit
  content diff.

## Context Map

Primary surfaces:

- `packages/cli/src/commands/tasks/`
- New `realign-plan-source` command module
- Git governance `record-commit` payload assertion

Secondary surfaces:

- Planning source seal readers/writers
- Pre-commit cross-task checks, which must recognize realign outputs
- Orphan-cleanup resolver injection pattern; core must not reverse-import CLI

Test surface:

- `tests/cli/ledger-realign.test.ts`

## Forbidden

- Do not use `tasks import --force` as the repair mechanism for closed ledger
  source realignment.
- Do not touch `closedAt`, `closurePacket`, `owner`, `claim`,
  `taskDirectionLock`, `status`, or any closure/lifecycle field.
- Do not require an emergency lease for a digest-proven metadata-only realign.
- Do not use the shared git index for the governed batch commit payload.
- Do not implement Phase 1 during Phase 0 card opening.
- Do not modify the closed ATM-GOV-0164 unlink-before-worktree-remove card or
  its deliverables.

## Validation

Run during Phase 1:

```shell
node --strip-types tests/cli/ledger-realign.test.ts
npm run typecheck
npm run validate:cli
```

After Phase 1 completes, rebuild the runner-sync queue when required. Sealed
build junction wipe was fixed in ATM-GOV-0163/0164; still first-time confirm
host `node_modules` after a live sealed build.

## Reporting Contract

The Phase 1 agent report must be 7-8 concise paragraphs and include an
atomization proposal. It must explicitly cover:

- command shape and dry-run behavior;
- digest and pure-move proof;
- protected closure/lifecycle fields;
- temporary-index commit isolation;
- `record-commit` payload assertion;
- fixture and validator evidence;
- rollback notes;
- atomization proposal and map impact.

## Rollback

Revert the implementation commit. Do not hand-edit closed task ledger records
as a substitute for this command.
