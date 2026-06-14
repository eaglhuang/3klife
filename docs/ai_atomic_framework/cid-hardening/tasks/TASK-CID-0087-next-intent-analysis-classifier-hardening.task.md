---
task_id: TASK-CID-0087
doc_id: doc_cid_0087
title: "Next intent analysis classifier hardening"
status: planned
owner: atm-core
priority: P0
milestone: M18
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-cli.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert classifier ordering and prompt-scoped regression fixtures if analysis prompts stop routing truthfully."
atomizationImpact:
  ownerAtomOrMap: "atm.next-intent-classifier"
  mapUpdates:
    - "packages/cli/src/commands/next.ts"
    - "scripts/validate-prompt-scoped-next.ts"
outOfScope:
  - "Replacing deterministic routing with LLM intent classification"
  - "Changing task lifecycle semantics"
nonGoals:
  - "Do not solve by telling operators to avoid words like development in analysis prompts."
---

# TASK-CID-0087 - Next intent analysis classifier hardening

## Goal

Make `node atm.mjs next --prompt` classify planning and analysis prompts
truthfully when they contain words such as "development" or "開發計畫".

## Trigger

The 2026-06-14 captain review prompt "請分析目前最適合優先執行的開發計畫..."
was routed as `requestedAction: implement`, forcing a framework mutation claim
for a pure analysis request.

## Required Behavior

- Analysis / review wording must win over broad implementation words when both
  appear in the same prompt.
- Implementation prompts that explicitly ask to build, implement, or complete
  deliverables must still route as implementation work.
- Regression coverage must include Traditional Chinese and English prompt
  examples.

## Acceptance Criteria

- The regression proves "分析...開發計畫" resolves to `analyze`.
- Existing implement / close / redo / audit routes remain unchanged.
- `next` no longer asks for a framework mutation claim for pure analysis text.

## Validation

```powershell
npm run typecheck
node --strip-types scripts/validate-prompt-scoped-next.ts
npm run validate:cli
git diff --check
```
