---
task_id: TASK-RFT-0100
title: Automatic RFT continuation-card generation
status: done
owner: atm-release
priority: P1
depends_on:
  - TASK-RFT-0099
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - scripts/validate-physical-line-budget.ts
  - scripts/generate-rft-continuation-cards.ts
  - tests/cli/rft-continuation-card-generation.test.ts
  - docs/governance/command-surface.md
deliverables:
  - scripts/generate-rft-continuation-cards.ts
  - tests/cli/rft-continuation-card-generation.test.ts
  - docs/governance/command-surface.md
validators:
  - node --strip-types scripts/generate-rft-continuation-cards.ts --dry-run --json
  - node --strip-types tests/cli/rft-continuation-card-generation.test.ts
  - node --strip-types scripts/validate-physical-line-budget.ts --json
  - npm run typecheck
  - npm run validate:cli
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the generator, command documentation, and focused regression if generated cards duplicate existing tasks or over-broaden scope.
atomizationImpact:
  ownerAtomOrMap: atm.rft-continuation-card-generator
  mapUpdates: []
  extractionCandidates:
    - atom: atm.rft-continuation-card-generator
      pattern: Generator
      source: scripts/generate-rft-continuation-cards.ts
      disposition: extract
      inlineReason: null
outOfScope:
  - Automatically importing or claiming generated continuation cards without human review.
  - Closing any generated cards.
  - Changing TASK-RFT-0098 or TASK-RFT-0099 enforcement policy.
completed_at: "2026-07-18T03:06:25.204Z"
completed_by_agent: "codex-main"
closedAt: "2026-07-18T03:06:25.204Z"
closedByActor: "codex-main"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T03-06-25-019Z-close-82dd7b426b21"
lastTransitionAt: "2026-07-18T03:06:25.204Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "beba951a40eaa309772c495029b2a4323996b3c4"
---

# TASK-RFT-0100 - Automatic RFT Continuation-Card Generation

## Objective

Create a dry-run-first generator that turns post-split physical and semantic
RFT inventories into candidate continuation task cards, without importing,
claiming, or closing them automatically.

## Acceptance

- The generator reads current line-budget and semantic metric evidence and
  proposes candidate `TASK-RFT` cards with scope, deliverables, validators,
  rollback notes, and atomization impact.
- Dry-run JSON includes skipped candidates with reasons, duplicate detection,
  and the next proposed task id.
- The generator refuses to write cards unless the planning repository root and
  target repository root are explicit.
- Focused regression covers a generated card, a duplicate candidate, and an
  empty inventory.
- Documentation names the generator as an authoring aid, not as an automatic
  import/claim/close mechanism.

## Notes

- Generated card text must still pass the normal task-card import dry-run before
  it can enter the ATM ledger.
- This card should preserve the authority split: full source cards live in
  3KLife; the framework target receives only imported ledger state.
