---
task_id: TASK-AAO-0159
title: "Scope-aware encoding guard and temporary artifact isolation"
status: done
owner: atm-core
priority: P0
milestone: Backlog-P0
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-12-123
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/check-encoding-touched.ts"
  - "scripts/validate-script-parity.ts"
  - "package.json"
deliverables:
  - "scripts/check-encoding-touched.ts"
  - "scripts/validate-script-parity.ts"
  - "package.json"
validators:
  - "node --strip-types scripts/check-encoding-touched.ts --mode touched --files scripts/check-encoding-touched.ts"
  - "node --strip-types scripts/validate-script-parity.ts --mode validate"
  - "npm run typecheck"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the scope-aware candidate resolver, parity regression, and package-script argument forwarding together."
atomizationImpact:
  ownerAtomOrMap: "atm.encoding-guard"
  mapUpdates: []
outOfScope:
  - "Deleting, moving, or rewriting another actor's tmp artifacts"
  - "Changing ATM task lifecycle or Broker admission semantics"
  - "Writing shared canonical backlog/map paths while another active task owns them"
completed_at: "2026-07-12T10:19:24.722Z"
completed_by_agent: "codex-backlog-captain"
closedAt: "2026-07-12T10:19:24.722Z"
closedByActor: "codex-backlog-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-12T10-19-24-722Z-close-60a97ef85814"
lastTransitionAt: "2026-07-12T10:19:24.722Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9ef6a9661d7c5a10755656e497d8655963917bc5"
---

# TASK-AAO-0159 Scope-aware encoding guard and temporary artifact isolation

## Problem

`ATM-BUG-2026-07-12-123`: `check:encoding:touched` uses the complete untracked
worktree as its default candidate list. A governed task can therefore fail on
another actor's temporary `tmp/*.json` transcript containing U+FFFD, even when
every claimed or staged delivery file is valid UTF-8. The current remediation
implicitly asks an agent to delete or modify files it does not own.

## Goal

Make encoding checks scope-aware by default for governed work while retaining a
deliberate whole-worktree audit mode. Temporary artifacts outside the resolved
delivery scope must be reported as quarantined diagnostics, not silently
treated as task failures.

## Acceptance Criteria

- `--files` remains the exact explicit check surface.
- The touched default prefers task/claim or staged delivery paths when an ATM
  task context is available, and reports excluded untracked temporary files as
  diagnostics with no mutation.
- A deliberate whole-worktree mode remains available and preserves the current
  broad scan behavior for repository health audits.
- Text files outside a task scope are never silently ignored when explicitly
  supplied or when whole-worktree mode is selected.
- Output distinguishes `checked`, `quarantined-temporary`, and `unsupported`
  candidates so a later agent can understand why a file was excluded.
- Regressions cover a claimed clean source file beside foreign malformed
  `tmp/` text, an explicit malformed file failure, staged-only operation, and
  whole-worktree failure.
- Package scripts preserve existing explicit `--files` usage and expose the
  selected candidate policy in their output.

## Shared Closeback Note

This Phase 0 intentionally omits the shared canonical backlog and atom map
from its initial target claim. After the active shared owner releases them,
the implementer must obtain an ATM scope amendment before marking
`ATM-BUG-2026-07-12-123` fixed or updating atom coverage. No manual backlog
edit is permitted during the private implementation lane.

## Delivery Sequence

1. Define candidate policy and diagnostic classification in the encoding
   wrapper without mutating foreign files.
2. Add deterministic temporary-artifact, explicit-file, staged, and
   whole-worktree regressions.
3. Preserve package script parity and CLI argument forwarding.
4. After shared closeback becomes available, amend task scope through ATM,
   update the canonical backlog/map, and run the full task close lane.

## Context Map

### Primary
- `scripts/check-encoding-touched.ts`: candidate discovery, task-aware scope,
  and diagnostic output.

### Secondary
- `scripts/validate-script-parity.ts`: fixture coverage and package route
  parity.
- `package.json`: explicit script modes.

### Test Coverage
- Focused encoding guard policy cases, script parity, typecheck, and diff
  validation.

