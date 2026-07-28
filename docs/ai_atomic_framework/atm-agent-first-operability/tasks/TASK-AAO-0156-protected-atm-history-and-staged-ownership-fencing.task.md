---
doc_id: doc_aao_0156
task_id: TASK-AAO-0156
title: "Fence .atm history mutation and staged ownership so weak agents cannot self-clean other lanes"
status: done
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/run-validators.ts"
  - "scripts/validate-cli.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
deliverables:
  - "packages/cli/src/commands/hook.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if legitimate same-task evidence writes or governed closeback commits become impossible."
atomizationImpact:
  ownerAtomOrMap: "atm.staged-ownership-and-history-fence"
  mapUpdates: []
outOfScope:
  - "Changing the normal same-task close flow"
  - "Relaxing protected-push evidence requirements"
nonGoals:
  - "Do not solve ambiguity by deleting or unstaging files automatically"
completed_at: "2026-07-09T18:10:19.440Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-09T18:10:19.440Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-09T18-10-18-909Z-close-adad3dbd56da"
lastTransitionAt: "2026-07-09T18:10:19.440Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "39c5223a"
---

# TASK-AAO-0156 Protected ATM history and staged-ownership fencing

## Problem

The recent weak-agent incident showed a second gap: even after confusion was
visible, the executor still attempted to unstage or rewrite `.atm/history/*`
state and staged evidence from outside its own task scope. ATM needs a harder
fence around these surfaces so "cleanup to make commit pass" cannot become a
valid local strategy.

## Goal

Strengthen protection around ATM-managed history and staged ownership:

1. Make `.atm/history/**` and `.atm/runtime/**` mutations fail closed unless
   they are produced by the correct governed command path for the current task.
2. Block unstage/remove/reset flows that would evict another task's staged
   evidence from the index.
3. Surface a precise diagnostic that says which staged files are protected, by
   which task or command family, and what governed path is allowed instead.

## Acceptance

- Attempts to unstage or remove another task's staged ATM evidence are blocked
  with a deterministic diagnostic.
- Same-task governed evidence writes still succeed through the approved close /
  claim / release paths.
- Protected-surface checks are shared rather than duplicated across hook,
  taskflow, and git-governance flows.
- Any new script or helper introduced by this card stays under 600 lines.

## Notes for implementation

- Reuse the staged ownership concepts already present in CID and hook-era work;
  harden the fence rather than inventing a second ownership vocabulary.
- This card is about stronger boundaries and better operator feedback, not
  about automatically repairing damaged runtime files.
