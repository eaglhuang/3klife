---
task_id: TASK-AAO-0148
title: "Harden same-repo close bundle and scope filtering"
status: done
priority: P0
closure_authority: target_repo
depends_on:
  - TASK-AAO-0141
  - TASK-AAO-0145
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0148-same-repo-close-bundle-and-scope-hardening.task.md"
scopePaths:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
deliverables:
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/close-orchestration.ts"
  - "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
  - "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
validators:
  - "npm run typecheck"
  - "node --strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
  - "node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes:
    - "Revert the governed repair commit and remove any generated transition artifacts introduced only by the failed attempt."
    - "Do not keep regenerated release/ root-drop mirrors in the same commit; rebuild them later from a clean source tree."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates: []
outOfScope:
  - "release/atm-onefile/**"
  - "release/atm-root-drop/**"
  - "packages/core/**"
  - "docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0120-broker-active-read-set-registry.task.md"
  - ".atm/history/protected-override-audit/**"
nonGoals:
  - "Do not ship a release rebuild as part of this repair card."
  - "Do not hard-code one-off path exceptions for a single task id or planning document."
  - "Do not weaken planning-mirror or direction-lock protections globally."
contextMap:
  primary:
    - path: "packages/cli/src/commands/hook.ts"
      reason: "task-scoped protected-state filtering for staged governed bundles"
    - path: "packages/cli/src/commands/taskflow/closeback-orchestration.ts"
      reason: "planning mirror closeback metadata and transition emission"
    - path: "packages/cli/src/commands/taskflow/commit-bundle-assembly.ts"
      reason: "same-repo close bundle assembly and clean temporary-index commit lane"
  secondary:
    - path: "packages/cli/src/commands/taskflow.ts"
      reason: "close bundle stage-file plumbing"
    - path: "packages/cli/src/commands/taskflow/close-orchestration.ts"
      reason: "rollback cleanup for newly created planning transition artifacts"
    - path: "packages/cli/src/commands/tasks.ts"
      reason: "frontmatter normalization used by planning metadata reads"
    - path: "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
      reason: "quoted frontmatter normalization shared by framework diagnostics"
  tests:
    - path: "packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
      reason: "foreign planning-lock false-positive regression"
    - path: "packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts"
      reason: "planning mirror closeback metadata and event regression"
    - path: "packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts"
      reason: "same-repo close bundle assembly regression"
    - path: "packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts"
      reason: "dry-run stage-file contract regression"
completed_at: "2026-06-24T12:32:21.156Z"
completed_by_agent: "codex"
closedAt: "2026-06-24T12:32:21.156Z"
closedByActor: "codex"
closedByCommand: atm tasks close
lastTransitionId: "2026-06-24T12-32-21-156Z-close-3a20c7d6439e"
lastTransitionAt: "2026-06-24T12:32:21.156Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "28f0b1f719a6830df174bbf2f511c4e0925c0268"
---

## Goal
Turn the current in-progress same-repo `taskflow close` repair bundle into one governed, minimal, reusable framework fix instead of a pile of one-off emergency edits and regenerated release artifacts.

## Why
Dogfooding `TASK-CID-0120` exposed a cluster of closely related framework bugs in the close path:

1. same-repo close bundles could be blocked by foreign planning-direction locks that were irrelevant to the staged governed commit;
2. planning mirror closeback could mark the planning card done without a complete close transition packet and rollback-safe event lifecycle;
3. close retry paths could leave generated transition residue behind and poison the next governed attempt;
4. same-repo bundle assembly and planning metadata parsing were not robust enough for framework-repo close flows.

These are all ATM framework bugs in one operator lane. They should be repaired together, but only through generic bundle/scope logic, not task-specific carve-outs.

## Acceptance
- Same-repo `taskflow close --write` no longer fails because a foreign active planning lock is outside the staged governed bundle.
- Planning mirror closeback writes a complete close metadata set and emits a corresponding transition event that is staged with the same governed bundle.
- If same-repo close fails after creating a planning transition artifact, rollback removes the newly created artifact instead of leaving retry-poison residue.
- Same-repo close bundle assembly can build a governed commit bundle from a clean temporary index without depending on unrelated staged state.
- Quoted markdown frontmatter values used by planning close metadata parse correctly instead of surfacing false metadata drift.
- Backlog entries distinguish the newly observed bugs from already tracked residue/hook-lane problems, and note overlap where appropriate.

## Implementation Notes
- Prefer staged-bundle-based filtering over path allowlists keyed to specific task ids, planning repos, or filenames.
- Treat planning mirror closeback as a first-class governed close participant: metadata, transition event, staging, and rollback must all stay in the same lifecycle.
- Keep the repair source-first and minimal. Release mirrors should be regenerated only after the source patch is accepted, not during this card.
- When backlog updates mention previously known failures, annotate them as reconfirmations or narrower manifestations instead of creating duplicate bug stories.

## Verification
```bash
npm run typecheck
node --strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/closeback-orchestration.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/commit-bundle-assembly.spec.ts
node --strip-types packages/cli/src/commands/taskflow/__tests__/taskflow-dryrun.spec.ts
git diff --check
```

## Closure & Reports
1. List the generic bug classes fixed by the patch and map them to the regression tests added or updated.
2. Confirm which dirty files were intentionally excluded from the governed commit bundle.
3. Note whether a follow-up release rebuild card is still required after source acceptance.

## Import Residue Triage
- Keep:
  - `C:/Users/User/3KLife/.atm/history/reports/task-import/2026-06-24T09-48-15-038Z.json`
  - `C:/Users/User/3KLife/.atm/history/reports/task-import/2026-06-24T09-33-25-839Z.json`
  - `C:/Users/User/3KLife/.atm/history/task-events/TASK-AAO-0148/2026-06-24T09-48-15-041Z-import-ccb44ab38dc1.json`
  - `C:/Users/User/3KLife/.atm/history/task-events/TASK-AAO-0148/2026-06-24T09-33-25-842Z-import-7f872b64c102.json`
- Discard:
  - `C:/Users/User/3KLife/.atm/history/reports/task-import/2026-06-24T09-43-10-406Z.json`
  - `C:/Users/User/3KLife/.atm/history/task-events/TASK-AAO-0148/2026-06-24T09-43-10-409Z-import-fbb39d3f4b76.json`
  - `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0148-harden-same-repo-close-bundle-and-scope-filtering.task.md`
