---
task_id: TASK-CID-0077
doc_id: doc_cid_0077
title: "Prompt-scoped empty-queue no-work normalization"
status: planned
owner: atm-core
priority: P1
milestone: M16
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0073"
  - "TASK-CID-0076"
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/route-predicates.ts"
  - "scripts/validate-prompt-scoped-next.ts"
  - "packages/cli/src/commands/command-specs/next.spec.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if empty-scope normalization starts treating truly unknown task scopes as success or hides required fail-closed guidance."
atomizationImpact:
  ownerAtomOrMap: "atm.next-prompt-scope-empty-queue-route"
  mapUpdates:
    - "packages/cli/src/commands/next.ts"
    - "scripts/validate-prompt-scoped-next.ts"
outOfScope:
  - "Changing batch routing semantics for non-empty queues"
  - "Treating unknown explicit task ids as no-work"
  - "Changing task claim or close authority"
nonGoals:
  - "Do not keep the empty queue case indistinguishable from an unknown task scope."
  - "Do not weaken fail-closed behavior for prompts that genuinely match no known task family, task id, or plan path."
contextMap:
  primary:
    - path: "packages/cli/src/commands/next.ts"
      reason: "owns prompt-scoped route classification and public ATM_NEXT_* message emission"
  secondary:
    - path: "packages/cli/src/commands/next/route-predicates.ts"
      reason: "holds route-shape contracts that should distinguish no-open-work from unknown-scope"
  tests:
    - path: "scripts/validate-prompt-scoped-next.ts"
      reason: "already locks the current scope-not-found behavior and must prove the new no-work branch"
  patterns:
    - referencePath: "packages/cli/src/commands/next.ts"
      referenceTaskId: "TASK-CID-0073"
      description: "reuse task-scoped next result contracts and public operator wording rather than inventing a second routing surface"
---

# TASK-CID-0077 - Prompt-scoped empty-queue no-work normalization

## Goal

Teach `node atm.mjs next --prompt ...` to distinguish between:

- a prompt that points at a real ATM task scope but has no open imported work
  left; and
- a prompt whose task scope genuinely cannot be resolved.

The public route should report the first case as clean no-open-work, not as a
fake lookup failure.

## Problem

The captain closeback run ended with `importedTaskQueue.openTaskCount = 0`, but
`next --prompt "finish CID"` still emitted `ATM_NEXT_TASK_SCOPE_NOT_FOUND`.
That message reads like ATM failed to find the CID scope at all, even though the
real state is "the CID queue is empty." This is operator-hostile because it
turns a successful cleanup into a misleading failure.

## Required Behavior

- Before source edits, run the repo-local `atm-atom-map-refactor` skill in
  review mode.
- Use it to decide whether the result should stay inline or whether a tiny
  in-scope prompt-scope result helper should be extracted.
- Only keep the extraction if it stays completely inside this card's declared
  files.
- Prompt-scoped routing must keep failing closed for:
  - explicit task ids that do not exist;
  - named plan prompts with no matching task cards;
  - ambiguous low-confidence task-card surface matches.
- When the prompt clearly targets a known task family or scope root but the
  imported queue has zero open tasks for that scope, `next` must emit a distinct
  no-open-work result/status/message.
- The new result must preserve `runnerMode`, `decisionTrail`, and
  `importedTaskQueue` evidence so operators can see why no work remains.
- The result must not tell operators to re-run the same task-scoped prompt as if
  discovery failed. It should surface a clean status plus allowed follow-up
  commands.

## Acceptance Criteria

- A prompt-scoped empty queue returns a stable no-open-work style result instead
  of `ATM_NEXT_TASK_SCOPE_NOT_FOUND`.
- Explicit unknown task ids still fail closed with task-scope-not-found.
- `scripts/validate-prompt-scoped-next.ts` proves both branches.
- `npm run validate:cli` stays green after the route contract change.

## Validation

```powershell
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-prompt-scoped-next.ts
git diff --check
```

## Report Back

Report the new status/message code, the exact decision rule that separates
empty-scope from unknown-scope, and the regression cases that prove the old
scope-not-found failures still remain fail-closed.
