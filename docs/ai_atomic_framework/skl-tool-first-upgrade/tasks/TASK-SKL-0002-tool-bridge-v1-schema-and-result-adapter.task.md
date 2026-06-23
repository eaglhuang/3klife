---
task_id: TASK-SKL-0002
title: Tool Bridge v1 schema and result adapter
status: planned
milestone: P1
depends_on:
  - TASK-SKL-0001
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/**"
  - "packages/core/src/**"
  - "schemas/**"
  - "tests/cli/**"
  - "docs/**"
deliverables:
  - "packages/cli/src/**"
  - "schemas/**"
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
  notes: "Revert the bridge schema/adapter commit if the result surface or compatibility contract regresses."
atomizationImpact:
  ownerAtomOrMap: "atm.tool-bridge-v1-contract"
  mapUpdates: []
out_of_scope:
  - "Do not introduce a second governance engine beside ATM CLI/runtime."
  - "Do not require a remote service for v1."
nonGoals:
  - "No full editor plugin rewrite in this card."
  - "No direct skill migration before the bridge contract is stable."
---

# TASK-SKL-0002

## Goal

定義 Tool Bridge v1 的共同 result shape、CLI result adapter 與 capability registry，讓後續 ATM tools 共用一致 contract。

## Acceptance

- Top-level tool result shape covers `ok`, `command`, `cwd`, `messages`, `evidence`, `nextAction`, `userNotice`, `runnerMode`, and follow-up fields.
- Existing ATM message codes can be preserved as machine-readable `code` values in tool results.
- Bridge transport and parameter validation are separated from governance semantics.
- Focused tests prove tool output remains stable across representative success, blocked, and notice-bearing cases.

## Non-Goals

- No migration of every skill in this card.
- No remote-first broker or MCP service requirement.
- No second schema family that diverges from ATM CLI truth.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Notes

- This card is the contract foundation for the whole SKL lane. Successor cards should consume the shared bridge rather than invent local response wrappers.
