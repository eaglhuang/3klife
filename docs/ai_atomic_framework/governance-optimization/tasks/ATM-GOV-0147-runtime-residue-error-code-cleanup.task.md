---
task_id: ATM-GOV-0147
title: "Teach residue cleanup expired git-index leases and register Team task-required errors"
status: done
owner: atm-release
priority: P1
depends_on: [ATM-GOV-0146]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/residue.ts
  - packages/cli/src/commands/__tests__/residue.spec.ts
  - docs/governance/error-code-registry.json
deliverables:
  - packages/cli/src/commands/residue.ts
  - packages/cli/src/commands/__tests__/residue.spec.ts
  - docs/governance/error-code-registry.json
validators:
  - node --strip-types packages/cli/src/commands/__tests__/residue.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the residue classifier and registry entry. Runtime residue files created by prior commands remain governed runtime state and must not be hand-edited as rollback.
atomizationImpact:
  ownerAtomOrMap: atm.residue-reconcile
  mapUpdates: []
  extractionCandidates:
    - atom: atm.residue-expired-git-index-lease-cleanup
      pattern: Policy Object
      source: packages/cli/src/commands/residue.ts
      disposition: inline
      inlineReason: residue.ts is under the atomization limit and this card only adds one bounded classifier branch plus focused tests.
completed_at: "2026-07-15T16:18:59.949Z"
completed_by_agent: "codex-gpt-5-5-captain"
closedAt: "2026-07-15T16:18:59.949Z"
closedByActor: "codex-gpt-5-5-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-15T16-18-59-853Z-close-c6560d886eb4"
lastTransitionAt: "2026-07-15T16:18:59.949Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ee3dde35ab2a9271526549f825d6e8e15b83a4b1"
---

# ATM-GOV-0147 - Teach residue cleanup expired git-index leases and register Team task-required errors

## Context

During the ATM-GOV-0146 closeout, `node atm.mjs residue status --json` correctly preserved active `TASK-RFT-0039` owner files but left an expired `.atm/runtime/git-index-leases/git-stage-override-*.json` file in `manual-review` because the residue classifier does not recognize `atm.gitIndexOverrideLease.v1`.

The same session also surfaced `ATM_TEAM_TASK_REQUIRED` from `team patrol` without a registry entry in `docs/governance/error-code-registry.json`.

## Acceptance Criteria

- Expired `atm.gitIndexOverrideLease.v1` files under `.atm/runtime/git-index-leases/` are classified as `auto-clean-safe` only when they are expired and not owned by an active task.
- Active or unreadable git-index lease files remain `manual-review` / non-auto-clean.
- `node atm.mjs residue reconcile --apply --json` removes only the expired safe lease and never removes active owner files.
- `ATM_TEAM_TASK_REQUIRED` is registered with canonical meaning, retryability, approval requirement, and next safe action.
- Focused residue tests and typecheck pass.

## Non-goals

- Do not touch `TASK-RFT-0037`.
- Do not touch `TASK-RFT-0039` source, ledger, or runtime files.
- Do not sync release mirror artifacts in this card.
