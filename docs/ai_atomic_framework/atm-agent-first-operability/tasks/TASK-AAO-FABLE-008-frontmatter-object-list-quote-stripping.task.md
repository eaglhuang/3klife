---
task_id: TASK-AAO-FABLE-008
title: "Strip quotes from frontmatter nested object-list scalar values"
status: done
owner: claude-fable-5
priority: P3
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
deliverables:
  - "packages/cli/src/commands/tasks/task-import-validators.ts"
validators:
  - "git diff --check"
  - "npm run typecheck"
  - "node --strip-types --test packages/cli/src/commands/tasks/__tests__/import-orchestrator.spec.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert quote-stripping; downstream consumers already tolerate quoted strings, so this is cosmetic-only."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger"
  extractionCandidates:
    - atom: "atm.task-import-frontmatter-parser"
      pattern: "inline"
      source: "packages/cli/src/commands/tasks/task-import-validators.ts"
      disposition: "inline"
      inlineReason: "extractFrontMatter is already the single owner module for frontmatter parsing (TASK-AAO-0064 slice); the fix is a one-line application of the existing normalizeYamlScalar helper at the two nested object-list value sites, not a new boundary."
completed_at: "2026-07-13T08:04:22.103Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-13T08:04:22.103Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T08-04-22-103Z-close-5c2deefce7be"
lastTransitionAt: "2026-07-13T08:04:22.103Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "7196151048d6bd1c459c595d979c75afc578dac6"
---

# TASK-AAO-FABLE-008 Frontmatter object-list quote stripping

`extractFrontMatter`'s nested object-list branches
(`objectListObjectMatch` / `objectListObjectFieldMatch`, around line 65-82 of
`task-import-validators.ts`) store the raw trimmed line value without
stripping surrounding quotes, unlike every other scalar field which goes
through `normalizeYamlScalar`. Observed on
`atomizationImpact.extractionCandidates` entries authored with quoted YAML
strings (e.g. `atom: "atm.task-import-extraction-patrol"` parses to the
literal string `"atm.task-import-extraction-patrol"` including the quote
characters).

## Acceptance

- Both nested object-list value assignments apply `normalizeYamlScalar`
  before storing.
- A regression proves a quoted nested object-list scalar parses without
  literal quote characters, while an existing unquoted case is unaffected.
- No other frontmatter parsing behavior changes.
