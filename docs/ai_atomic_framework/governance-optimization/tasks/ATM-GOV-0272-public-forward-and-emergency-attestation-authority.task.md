---
task_id: ATM-GOV-0272
title: Public forward and emergency attestation authority
status: planned
owner: unassigned
priority: P1
depends_on:
  - ATM-GOV-0271
causalGraph:
  causalDependencies:
    - ATM-GOV-0271
  startConditions:
    - Close saga identifies attestation-required recovery lanes.
  softRelations:
    - ATM-BUG-2026-07-30-280
  changedPublicSeams:
    - atm.attestationAuthority.v1
    - atm.forwardWorkAdmissionAttestation.v1
  causalImpactEdges:
    - public-attestation-api
    - pre-push-recovery
    - emergency-governance-provenance
  parallelFrontierInputs:
    - Plan 3.1 hidden attestation and forward-provenance recovery reports
  validatorReferences:
    - node --strip-types tests/cli/historical-work-admission-attestation.test.ts
    - node --strip-types packages/cli/src/commands/hook/__tests__/pre-push.spec.ts
    - npm run typecheck
  phaseOwner: attestation-authority
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3-2.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/historical-work-admission-attestation.ts
  - packages/cli/src/commands/hook/pre-push.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/command-specs/hook.spec.ts
  - tests/cli/historical-work-admission-attestation.test.ts
  - packages/cli/src/commands/hook/__tests__/pre-push.spec.ts
deliverables:
  - packages/core/src/broker/historical-work-admission-attestation.ts
  - packages/cli/src/commands/hook/pre-push.ts
  - packages/cli/src/commands/git-governance/implementation/git-head-evidence-transaction.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - tests/cli/historical-work-admission-attestation.test.ts
  - packages/cli/src/commands/hook/__tests__/pre-push.spec.ts
validators:
  - node --strip-types tests/cli/historical-work-admission-attestation.test.ts
  - node --strip-types packages/cli/src/commands/hook/__tests__/pre-push.spec.ts
  - npm run typecheck
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert public command surface and attestation validator together; existing immutable attestations remain readable.
atomizationImpact:
  ownerAtomOrMap: atm.attestation-authority
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.forward-attestation-authority
      pattern: Authority Facade
      source: packages/core/src/broker/historical-work-admission-attestation.ts
      disposition: extract
      inlineReason: null
---

# ATM-GOV-0272 Public forward and emergency attestation authority

## Intent

Promote forward/emergency attestation from hidden or inferred recovery behavior
into a documented public API with dry-run, write, status, and validate surfaces.

## Deep-module contract

Public interface:

```ts
createForwardAttestation({
  taskId,
  commit,
  reason,
  evidenceRefs,
  emergencyClass,
  scope
})
```

Adapters:

- pre-push hook adapter that explains missing/invalid attestations.
- governed CLI adapter such as `attest forward/status/validate`.

Deletion test: deleting this module would push attestation creation rules back
into pre-push, git-governance, historical admission, and manual operator
recovery prose.

Dependency classes:

- in-process: historical attestation validator and commit metadata reader.
- local-substitutable: filesystem attestation ledger.
- true-external: git commit graph and remote push target.

## Acceptance

- [ ] Public CLI/API exposes dry-run, write, status, and validate for forward
      attestations.
- [ ] pre-push reports the exact public command when attestation is missing.
- [ ] Emergency use requires reason, scope, immutable commit metadata, and
      evidence references; no hidden command is required.
- [ ] Existing historical attestation files remain readable.
- [ ] Implementation is generic across task ids, actors, commits, and repos.
