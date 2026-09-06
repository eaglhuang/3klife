---
task_id: TASK-RFT-0108
title: Extract bounded semantic modules from evidence bundle IO implementation
status: done
owner: atm-cli
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
related_plan: rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/evidence/bundle-io.ts
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/evidence/bundle-io/**/*.ts
  - tests/cli/evidence-bundle-io-extraction.test.ts
deliverables:
  - packages/cli/src/commands/evidence/bundle-io/implementation.ts
  - packages/cli/src/commands/evidence/bundle-io/**/*.ts
  - tests/cli/evidence-bundle-io-extraction.test.ts
validators:
  - node --strip-types tests/cli/evidence-bundle-io-extraction.test.ts
  - npm run typecheck
  - npm run validate:cli
methodProfiles:
  - expand-contract
tddMode: required
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the governed delivery commit and closeout bundle together.
atomizationImpact:
  ownerAtomOrMap: atm.cli-evidence-bundle-io
  extractionCandidates:
    - atom: atm.cli-evidence-bundle-reader
      pattern: Reader
      source: packages/cli/src/commands/evidence/bundle-io/implementation.ts
      disposition: extract
    - atom: atm.cli-evidence-bundle-writer
      pattern: Writer
      source: packages/cli/src/commands/evidence/bundle-io/implementation.ts
      disposition: follow-up-card
errorCodes: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-06T17:53:14.583Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-06T17:53:14.583Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-06T17-53-14-583Z-close-5d9edd8b3928"
lastTransitionAt: "2026-09-06T17:53:14.583Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e75075c5d998ae4fc82343ea99b04b7ab877e703"
---

# TASK-RFT-0108 Extract bounded semantic modules from evidence bundle IO implementation

## Intent

TBD.

## Acceptance

- [ ] Deliverables and validators are filled before import or implementation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-06T17:43:45.514Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"rft-hardening/tasks/TASK-RFT-0108-extract-bounded-semantic-modules-from-evidence-bundle-io-implementation.task.md","contentDigest":"sha256:058b35ed7bfea76323a466886222b312f6502d3bfa6dfd6fd8feb6fdd62c7844"} -->