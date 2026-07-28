---
doc_id: doc_rft_0016
task_id: TASK-RFT-0016
title: "Trim onefile payload back under the 4.5MB size budget (root-drop payload diet)"
status: done
owner: atm-core
priority: P2
milestone: RFT-M5
depends_on: [TASK-RFT-0014]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "scripts/build-root-drop-release.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/validate-onefile-budget.ts"
  - "scripts/validate-onefile-release.ts"
  - "scripts/validate-root-drop-release.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:onefile-budget"
  - "npm run validate:onefile-release"
  - "npm run validate:root-drop-release"
  - "git diff --check"
deliverables:
  - "scripts/build-onefile-release.ts"
  - "scripts/validate-onefile-budget.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if excluding additional payload entries breaks onefile bootstrap, doctor, or self-host-alpha flows in a blank repo."
atomizationImpact:
  ownerAtomOrMap: "atm.release-pipeline"
  mapUpdates: []
outOfScope:
  - "Changing the payload format or extraction protocol"
  - "Loosening the 4.5MB budget without a maintainer decision recorded on this card"
nonGoals:
  - "Do not silence validate:onefile-budget; make it pass by shrinking the payload"
completed_at: "2026-07-07T05:50:46.260Z"
completed_by_agent: "codex"
closedAt: "2026-07-07T05:50:46.260Z"
closedByActor: "codex"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-07T05-50-46-181Z-close-336bdaad3d5e"
lastTransitionAt: "2026-07-07T05:50:46.260Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "fe0bff300c21c5e36ca07a07917ca86564804ec0"
---

# TASK-RFT-0016 — Onefile size budget trim

## Context (2026-07-06 measurement)

After TASK-RFT-0015 removed the nested previous-generation launcher, the onefile
artifact dropped 28.5MB -> 7,504,827 bytes, but `validate:onefile-budget` still
fails against its 4,500,000-byte budget (pre-existing failure, previously masked
by the much larger recursion bloat). Largest remaining payload entries:
`release-manifest.json` (490KB), `packages/cli/src/commands/tasks.ts` (229KB),
`packages/cli/dist/commands/tasks.js` (227KB), `next.js` (201KB), `next.ts` (200KB),
`scripts/validate-task-ledger-governance.ts` (169KB), `hook.ts` (168KB).

## Fix Directions

- The payload currently ships BOTH TypeScript sources and compiled dist for the
  CLI. The extracted launcher only needs `packages/cli/dist` (plus package.json
  manifests); evaluate excluding `packages/*/src/**` and `scripts/**` dev-only
  validators from the onefile payload while keeping them in root-drop.
- Drop or slim `release-manifest.json` duplication inside the payload.
- Keep `validate:onefile-release`'s functional checks green (bootstrap, doctor,
  self-host-alpha, extraction-lock handoff) as the definition of "nothing needed
  was trimmed".

## Why After TASK-RFT-0014

The deletion pass shrinks tasks.ts/next.ts and removes dead validators, which
directly reduces payload size; do the diet after the deletions land.
