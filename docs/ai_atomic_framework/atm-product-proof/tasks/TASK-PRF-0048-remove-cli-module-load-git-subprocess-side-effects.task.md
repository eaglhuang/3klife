---
task_id: TASK-PRF-0048
title: Remove CLI module-load Git subprocess side effects
status: done
owner: codex-captain
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/agent-pack-cursor/src/index.ts
  - packages/agent-pack-copilot/src/index.ts
  - packages/agent-pack-gemini/src/index.ts
  - packages/agent-pack-windsurf/src/index.ts
  - packages/integrations-core/src/compiler/skill-templates.ts
  - packages/integrations-core/src/compiler/compile.ts
  - tests/cli/agent-pack-startup-side-effects.test.ts
deliverables:
  - tests/cli/agent-pack-startup-side-effects.test.ts
  - packages/agent-pack-cursor/src/index.ts
  - packages/agent-pack-copilot/src/index.ts
  - packages/agent-pack-gemini/src/index.ts
validators:
  - node --strip-types tests/cli/agent-pack-startup-side-effects.test.ts
  - npm run typecheck
  - npm run lint
  - npm run validate:integration-adapter
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T14:05:08.887Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T14:05:08.887Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T14-05-08-887Z-close-b99bb7f7eb14"
lastTransitionAt: "2026-09-13T14:05:08.887Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "3ed9b5db0117cd89e1b9db83462ea5ecd459d921"
---

# TASK-PRF-0048 Remove CLI module-load Git subprocess side effects

## Intent

Remove unnecessary Git subprocess execution during CLI module loading while preserving agent-pack generation and the public package interface. Claude's external review reports 19 Git calls and about 469 ms of subprocess time; these are hypotheses to reproduce independently, not achieved savings. Source inspection identifies eager createSourceFiles calls in Cursor, Copilot and Gemini packs. Keep the single npm runtime; this card does not claim bundle reduction or external benchmark completion.

## Acceptance

- [ ] ACC-1: Reproduce import-time subprocess calls on the baseline and retain command-backed trace evidence outside Git; the regression test fails on the baseline.
- [ ] ACC-2: Public CLI --version performs zero Git subprocess calls during module loading, including outside a repository and without Git available.
- [ ] ACC-3: All affected packs retain target paths, template bytes and source hashes; test actual generation after deferred loading and repeated access.
- [ ] ACC-4: Preserve ordinary Git checkout and .git-file worktree behavior when generation legitimately needs tracked-file semantics.
- [ ] ACC-5: Compare baseline and candidate timing on the same host with repeated samples and report sample count, p50 and p95. Do not claim the estimated 469 ms as measured savings.
- [ ] ACC-6: Focused regression, typecheck, lint and integration validation pass. Governed packaging verification confirms clean installation and the existing byte budget without changing bundler or budget policy.

## Boundary and rollback

No npm publication, package split, bundler changes or benchmark pilot are included. Generated release artifacts require the normal governed build scope before mutation. Roll back the task-owned source change while retaining diagnostic evidence; preserve prior task closures. Link each acceptance criterion to its actual evidence before close, with unavailable evidence preventing completion.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T13:53:31.266Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0048-remove-cli-module-load-git-subprocess-side-effects.task.md","contentDigest":"sha256:4d1caf1b2c97a1294e6b32cbe8517e009501d81c90578dc82e22e6d39c2bcf8d"} -->
