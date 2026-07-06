---
task_id: TASK-CID-0112
title: Broker explicit-input mutation-intent seed
status: done
milestone: M20
depends_on:
  - TASK-CID-0097
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/core/src/broker/**"
  - "packages/cli/src/commands/broker.ts"
  - "schemas/broker/**"
deliverables:
  - "packages/core/src/broker/types.ts"
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/registry.ts"
  - "packages/core/src/broker/__tests__/**"
  - "schemas/broker/**"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "Do not build a general automatic mutation-intent guesser."
  - "Do not infer read/write regions from vague natural-language task text."
  - "Do not hard-block insufficient mutation intent in this card."
nonGoals:
  - "Do not replace existing broker adapter conflict logic."
atomizationImpact:
  ownerAtomOrMap: "atm.broker-mutation-intent"
  mapUpdates: []
---

# TASK-CID-0112

## Goal

Add a small explicit-input mutation-intent seed path for broker conflict analysis.

The broker should accept only structured mutation intent supplied by the caller, such as `MutationRequest[]`, `PatchProposal[]`, owner-shard row target, JSON pointer, text range, or scalar operation. When required location or operation data is missing, return `missingInputs` and do not guess.

## Acceptance

- Broker contracts expose a typed mutation-intent input surface for explicit mutation requests.
- Supported inputs include `MutationRequest[]`, `PatchProposal[]`, owner-shard row target, JSON pointer, text range, and scalar operation.
- Missing target, region, or operation data returns a structured `missingInputs` result.
- Tests prove that vague or incomplete input does not produce guessed conflict keys.
- Existing adapter-aware conflict behavior continues to work for callers that already provide structured request data.

## Non-Goals

- No automatic full-code diff parser.
- No natural-language intent inference.
- No new hard gate in `taskflow close`.

## Verification

```bash
npm run typecheck
npm test
git diff --check
```
