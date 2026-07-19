---
task_id: ATM-GOV-0204
title: Task import parser canonical ID boundary repair
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0203
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV governance-optimization plan with task import correctness repair discovered by 2.0 dry-run dogfood.
scopePaths:
  - packages/cli/src/commands/tasks/**
  - packages/cli/src/commands/task-option-parsers.ts
  - scripts/validate-task-import/**
  - scripts/validate-task-import.ts
  - tests/cli/task-import-canonical-id-boundary.test.ts
  - tests/cli/task-import.test.ts
deliverables:
  - packages/cli/src/commands/tasks/**
  - scripts/validate-task-import/**
  - tests/cli/task-import-canonical-id-boundary.test.ts
validators:
  - node --strip-types tests/cli/task-import-canonical-id-boundary.test.ts
  - node --strip-types scripts/validate-task-import.ts
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the previous importer parser and keep the failing 2.0 dry-run output as regression evidence; do not edit target ledger task files by hand.
atomizationImpact:
  ownerAtomOrMap: atm.task-import-parser-map
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.canonical-task-id-boundary-parser
      pattern: Parser Contract
      source: packages/cli/src/commands/tasks/
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0204 Task import parser canonical ID boundary repair

## Intent

The 2.0 plan import dry-run currently parses a spurious `ATM-GOV-018` work item
from text that legitimately references `ATM-GOV-0182..0190`. This card repairs
the root cause in the task import parser so Markdown headings, tables, links,
body prose, sibling cards, and frontmatter all share one canonical task-id
boundary contract.

The implementation must not hard-code `ATM-GOV-018`, the 2.0 plan path, or any
single false-positive string. It must first identify which extractor admits the
prefix fragment, then replace the local pattern with a general parser rule that
only accepts complete task ids with valid boundaries and, when importing from a
plan document, a supporting sibling task card or complete task metadata.

## Problem Signal

- `node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md --dry-run --cwd . --json` parses real cards plus a fake `ATM-GOV-018`.
- The fake item has no sibling card, no frontmatter contract, no deliverables,
  and appears to be derived from a partial numeric prefix rather than an actual
  task declaration.
- Backlog item `ATM-BUG-2026-07-19-039` already records this dogfood failure.

## Root-Cause Requirements

- Locate every task-id extractor used by `tasks import`, including heading,
  table cell, markdown link, frontmatter, sibling-card merge, and body-section
  fallback paths.
- Define one reusable canonical-id parser with explicit left/right boundaries.
  A match must reject numeric-prefix fragments such as `ATM-GOV-018` inside
  `ATM-GOV-0182`, ranges such as `ATM-GOV-0182..0190`, and prose fragments
  that lack a complete task declaration.
- Preserve valid ids across supported families and digit widths, including
  `ATM-GOV-0182`, `ATM-GOV-0204`, `TASK-ERR-0001`, `TASK-TMP-0001`, and other
  registered prefixes discovered from the planning registry or target ledger.
- When a plan document references ids in prose but no sibling card/frontmatter
  exists, classify the reference as `reference-only` or emit a warning; do not
  create an importable work item from the reference alone.
- Keep the parser generic enough for future families; do not special-case GOV,
  018, 2.0, or this one plan file.

## Data-Driven Decision Contract

- Producer: task import parser, plan-card merge logic, import diagnostics.
- Consumer: 0204 implementation validators, 0202/0203 follow-up import checks,
  and any future plan executor dry-run.
- Window: start from the failing 2.0 dry-run output, then add generalized
  fixtures for complete ids, prefix fragments, ranges, prose references, table
  rows, and sibling-card-backed declarations.
- Missing-data semantics: if an extractor cannot attribute a candidate to a
  declaration source, it must not silently import it; it must mark the source
  as unavailable/reference-only or warn with enough path/line context to debug.

## Acceptance

- [ ] Root-cause report names the exact extractor path that admitted the false
      `ATM-GOV-018`, with file/function references.
- [ ] A shared canonical task-id boundary helper or equivalent parser contract
      is used by all task import candidate paths touched by the bug.
- [ ] Regression fixture proves `ATM-GOV-0182..0190` and similar numeric ranges
      do not produce `ATM-GOV-018` or any other prefix fragment.
- [ ] Regression fixture proves valid complete ids still import, including
      `ATM-GOV-0182`, `ATM-GOV-0204`, `TASK-ERR-0001`, and `TASK-TMP-0001`.
- [ ] Plan prose references without sibling cards or complete metadata are
      ignored or reported as `reference-only`, not imported as work items.
- [ ] The 2.0 plan dry-run parses only real task ids and excludes
      `ATM-GOV-018`; warnings explain any ignored partial/reference-only ids.
- [ ] The fix is generic: no code branch or fixture assertion is hard-coded to
      simply suppress `ATM-GOV-018` for the 2.0 plan.
- [ ] Validation includes the focused regression, `scripts/validate-task-import`,
      `npm run typecheck`, and `npm run validate:cli`.

## Non-Goals

- Do not edit `.atm/history/tasks/**` manually.
- Do not change existing task ids or rewrite historical ledger records.
- Do not add a second task store or a plan-specific allow/deny list.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-19T16:42:46.930Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0204-task-import-parser-canonical-id-boundary-repair.task.md","contentDigest":"sha256:37b93f67e73227aac6a6207e707754f0762d6be2f6a396e681649aa06f3b4503"} -->
