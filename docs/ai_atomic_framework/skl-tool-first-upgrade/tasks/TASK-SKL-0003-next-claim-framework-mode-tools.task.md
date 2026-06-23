---
task_id: TASK-SKL-0003
title: Next, claim, and framework-mode tools
status: planned
milestone: P1
depends_on:
  - TASK-SKL-0001
  - TASK-SKL-0002
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/**"
  - "packages/core/src/**"
  - "tests/cli/**"
  - "docs/**"
deliverables:
  - "packages/cli/src/commands/**"
  - "tests/cli/**"
  - "docs/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the tool-surface commit if claim/routing boundaries or framework-mode disclosures regress."
atomizationImpact:
  ownerAtomOrMap: "atm.tool-first-routing-surface"
  mapUpdates: []
out_of_scope:
  - "Do not weaken existing blocked commands or route safeguards."
  - "Do not hide framework-temp vs task-boundary distinctions."
nonGoals:
  - "No taskflow close tooling in this card."
  - "No skill migration yet."
---

# TASK-SKL-0003

## Goal

將 `next / claim / framework-mode` 提升成結構化 tool surface，讓 editor 與 skill 可直接消費 route、claim、runner mode 與 boundary diagnostics。

## Acceptance

- `atm_next` can expose `nextAction`, `taskIntent`, `allowedCommands`, and `blockedCommands` through the bridge contract.
- `atm_next_claim` can expose active guidance, allowed scope, and claim diagnostics without lossy text parsing.
- `atm_framework_mode_status` and `atm_framework_mode_claim` can disclose framework-temp boundaries and claim scope in machine-readable form.
- Representative blocked and no-work routes remain fail-closed and clearly surfaced.

## Non-Goals

- No evidence/guard/taskflow tooling in this card.
- No silent downgrade from tool-first to shell-first when the lane is blocked.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- The main design constraint is truthfulness of route status. Tool output must preserve the same safety semantics currently held by `node atm.mjs`.
