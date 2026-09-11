---
task_id: TASK-PRF-0026
title: Align OSV and npm production dependency security baselines
status: planned
owner: owner-authorized-security-steward
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
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - package.json
  - package-lock.json
  - scripts/validate-dependencies.ts
  - .github/workflows/dependency-scan.yml
deliverables:
  - production lockfile accepted as clean by both npm audit and OSV Scanner
  - compatibility evidence for the packed CLI after the security upgrade
  - documented scanner-baseline decision and rollback record
validators:
  - npm audit --omit=dev --audit-level=high
  - npm run validate:package-install
  - npm run typecheck
  - npm run lint
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0026 Align OSV and npm production dependency security baselines

## Intent

TASK-PRF-0024 removed npm audit findings, but CI run 34623764979 still found
three HIGH brace-expansion advisories through OSV Scanner. This card aligns
both production-security authorities instead of weakening either gate or
allowlisting a known vulnerable range.

## Acceptance

- [ ] Both scanners report zero HIGH/CRITICAL production findings.
- [ ] The selected brace-expansion version is API-compatible with all runtime
  consumers and clean-install package smoke remains green.
- [ ] No scanner is disabled, advisory level lowered, or vulnerability
  suppressed without an owner-approved expiry and explicit evidence.
- [ ] Rollback restores the prior lockfile/manifests and reruns both scanners.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T16:52:16.684Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0026-align-osv-npm-security-baselines.task.md","contentDigest":"sha256:fb2050df36efd569101a444442db29fa53210e207b51531c15bdc7649f62c2ff"} -->
