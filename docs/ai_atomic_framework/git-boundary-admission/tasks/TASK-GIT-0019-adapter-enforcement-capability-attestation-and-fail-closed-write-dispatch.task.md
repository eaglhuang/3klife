---
task_id: TASK-GIT-0019
title: Adapter enforcement capability attestation and fail-closed write dispatch
status: planned
owner: atm-core
priority: P0
milestone: G11
depends_on:
  - TASK-GIT-0018
causalGraph:
  causalDependencies: [TASK-GIT-0018]
  startConditions: ["ExternalWorkerLauncher capability receipt is stable."]
  softRelations: [TASK-GIT-0020]
  changedPublicSeams: ["atm.adapterEnforcementCapability.v1"]
  causalImpactEdges: ["adapter probe -> dispatch admission -> launcher capability minting"]
  parallelFrontierInputs: ["TASK-GIT-0020 protected-state integrity chain"]
  validatorReferences: ["tests/cli/adapter-enforcement-capability.test.ts", "tests/cli/external-write-dispatch-admission.test.ts"]
  phaseOwner: "adapter capability"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/team-agents/adapter-enforcement-capability.ts
  - packages/core/src/team-agents/restricted-execution-gateway.ts
  - packages/cli/src/commands/integration-hooks/implementation.ts
  - packages/cli/src/commands/team-runtime-gates.ts
  - packages/cli/src/commands/next.ts
  - packages/integrations-core/src/compiler/skill-templates.ts
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-next.skill.md
  - docs/governance/integration-plugin-matrix.md
  - tests/cli/adapter-enforcement-capability.test.ts
  - tests/cli/external-write-dispatch-admission.test.ts
deliverables:
  - "One AdapterEnforcementCapability deep module with signed/probed capability digest, policy digest, installation state, expiry, and unsupported reason."
  - "External-write dispatch and launcher capability minting consume the same attestation; unsupported or stale adapters are broker-only/read-only."
  - "Integration verification refreshes capability evidence without allowing an adapter to self-assert enforcement from prompt text or a static label."
  - "The integration matrix distinguishes enforced, unsupported, stale, and degraded states with an executable remediation route."
validators:
  - node --strip-types tests/cli/adapter-enforcement-capability.test.ts
  - node --strip-types tests/cli/external-write-dispatch-admission.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-GIT-0019 Adapter enforcement capability attestation and fail-closed write dispatch

## Intent

Replace the current hard-coded editor capability list with observed, expiring
adapter evidence. An adapter may receive external-write work only when it can
prove the same pre-tool/launcher enforcement contract that dispatch relies on.

## First-Principles and Deep-Module Design

`AdapterEnforcementCapability.resolve(adapter, installation, probe)` returns
one attestation consumed by both dispatch and launcher capability minting. It
hides adapter-specific hook probing, installation/version drift, policy digest
binding, expiry, and remediation. Its adapters are integration verification and
external-write dispatch admission.

## Acceptance

- [ ] A supported adapter with a valid probe may receive external-write work only through the launcher.
- [ ] Cursor, Gemini, Antigravity, or any future adapter without a valid enforcement probe are rejected for external-write dispatch, not merely warned.
- [ ] A stale policy digest or removed hook invalidates the attestation before the next launch.
- [ ] Skills and `next` project the same capability result but cannot alter it.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:05.798Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0019-adapter-enforcement-capability-attestation-and-fail-closed-write-dispatch.task.md","contentDigest":"sha256:fdb828d76c9620154d357d4bce4fbf281c33072d87be5c908ac4e3b34a26fbaf"} -->
