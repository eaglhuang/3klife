---
task_id: TASK-ASP-0006
title: CID v2: line-independent derived atom identity
status: done
completed_at: "2026-10-06T18:20:39.336Z"
completed_by_agent: "claude-code-opus-5"
delivery_commit: "c9fa08971"
owner: claude-code-opus-5
priority: P2
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
related_plan: adapter-guided-atomization-sdk/derived-atoms-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/candidate-bridge.ts
  - packages/core/src/broker/derived-atoms.ts
  - packages/core/src/broker/index.ts
  - packages/core/src/broker/__tests__/candidate-bridge.test.ts
  - tests/cli/derived-atom-identity.test.ts
  - docs/BROKER_GUIDE.md
deliverables:
  - packages/core/src/broker/candidate-bridge.ts
  - packages/core/src/broker/derived-atoms.ts
  - packages/core/src/broker/index.ts
  - packages/core/src/broker/__tests__/candidate-bridge.test.ts
  - tests/cli/derived-atom-identity.test.ts
validators:
  - "node --strip-types packages/core/src/broker/__tests__/candidate-bridge.test.ts"
  - "node --strip-types tests/cli/derived-atom-identity.test.ts"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-ASP-0006 CID v2: line-independent derived atom identity

## Intent

Make derived atom identity line-independent (cid.v2): hash cid.v2 || languageId || sourcePaths || kind || symbol || ordinal; drop line numbers and detectionMethod; merge TS overloads; assign source-order ordinals only to same-kind same-symbol duplicates; track body changes with an LF-normalized contentVersion. No v1 compatibility layer (no persisted consumers).

## Acceptance

- [x] Inserting lines above an atom or upgrading the detector keeps its CID
- [x] Renaming a symbol, changing kind, path, language or ordinal changes the CID
- [x] TS overload signatures plus implementation form one atom
- [x] CRLF and LF produce the same contentVersion
- [x] BROKER_GUIDE matches the code

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-10-06T17:02:09.156Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"adapter-guided-atomization-sdk/tasks/TASK-ASP-0006-cid-v2-line-independent-derived-atom-identity.task.md","contentDigest":"sha256:f82cc4f0f8762885911a201e66fc6600544205072db02e795c9e3f1c8fb9d728"} -->
