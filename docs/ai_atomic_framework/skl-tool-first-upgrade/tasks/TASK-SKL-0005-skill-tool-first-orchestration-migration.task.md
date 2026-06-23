---
task_id: TASK-SKL-0005
title: Skill tool-first orchestration migration
status: planned
milestone: P2
depends_on:
  - TASK-SKL-0002
  - TASK-SKL-0003
  - TASK-SKL-0004
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "integrations/**"
  - "packages/**"
  - "docs/**"
  - ".claude/**"
  - ".github/**"
deliverables:
  - "integrations/**"
  - "docs/**"
  - ".claude/**"
  - ".github/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the migration commit if skills lose route fidelity or fallback behavior becomes ambiguous."
atomizationImpact:
  ownerAtomOrMap: "atm.skill-tool-first-orchestration"
  mapUpdates: []
out_of_scope:
  - "Do not remove CLI fallback entirely."
  - "Do not require every editor integration to support tools on day one."
nonGoals:
  - "No broad copy rewrite of every planning document."
  - "No hidden shell fallback that masks blocked tools."
---

# TASK-SKL-0005

## Goal

把 ATM 主要 skill 改寫成 tool-first orchestration，並明確保留 CLI fallback policy，避免 tool-capable editor 仍走舊式 shell-first flow。

## Acceptance

- Core governance skills detect tool-capable environments and prefer tool calls before shell commands.
- Skills preserve route truth by surfacing blocked tool results instead of silently bypassing them.
- CLI fallback remains available for read-only inspection, legacy editors, or explicit fallback paths.
- Updated docs and integration entry files explain the tool-first preference and fallback rules.

## Non-Goals

- No removal of existing CLI entrypoints.
- No forcing all integrations to adopt a new plugin or connector in this card.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- The migration must optimize for determinism and operator clarity, not for theatrical abstraction. Skills should get shorter, not more magical.
