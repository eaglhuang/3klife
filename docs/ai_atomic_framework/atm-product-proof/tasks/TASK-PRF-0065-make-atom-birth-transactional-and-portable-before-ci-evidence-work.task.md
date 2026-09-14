---
task_id: TASK-PRF-0065
title: Make atom birth transactional and portable before CI evidence work
status: done
owner: atm-generator-maintainer
priority: P0
depends_on: []
causalGraph:
  causalDependencies:
    - relation: validation
      taskId: TASK-PRF-0064
      reason: 0064 cannot safely register its policy atom until atom birth produces a valid portable registry entry or fails without residue.
  startConditions: []
  softRelations:
    - TASK-PRF-0064
  changedPublicSeams:
    - atom-generator-birth-transaction
    - portable-registry-entry
  causalImpactEdges:
    - precommit-validation-to-zero-residue
    - packaged-schema-resolution-to-portable-registry
    - source-hash-to-registry-integrity
  parallelFrontierInputs:
    - TASK-PRF-0064-deep-module-review
  validatorReferences:
    - test_prf0065_failed_birth_leaves_no_residue_8d2f1c6a
    - test_prf0065_registry_paths_are_portable_1e6b4a90
    - test_prf0065_hash_lock_matches_generated_spec_4ac7d2e1
    - test_prf0065_successful_birth_is_idempotent_7b9c0f34
  phaseOwner: atm-product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/manager/atom-generator.ts
  - packages/core/src/registry/registry/entry.ts
  - packages/core/src/registry/registry/paths.ts
  - packages/core/src/registry/registry/document.ts
  - tests/core/atom-generator.test.ts
  - tests/registry/registry-entry-portability.test.ts
  - docs/reports/atm-atom-generator-reliability.md
deliverables:
  - packages/core/src/manager/atom-generator.ts
  - packages/core/src/registry/registry/entry.ts
  - packages/core/src/registry/registry/paths.ts
  - packages/core/src/registry/registry/document.ts
  - tests/core/atom-generator.test.ts
  - tests/registry/registry-entry-portability.test.ts
  - docs/reports/atm-atom-generator-reliability.md
validators:
  - node --strip-types tests/core/atom-generator.test.ts
  - node --strip-types tests/registry/registry-entry-portability.test.ts
  - node --strip-types scripts/validate-generator-provenance.ts --mode validate
  - node --strip-types scripts/validate-registry-core.ts --mode validate
errorCodes:
  - ATM_GENERATOR_REGISTRY_INVALID
methodProfiles:
  - deep-module-refactor
  - tdd-oracle-fidelity
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Restore the generator and retain the failed-birth receipt; never retain a partially registered atom or rewrite existing user files during rollback.
atomizationImpact:
  ownerAtomOrMap: atm.core-atom-generator
  mapUpdates: []
  extractionCandidates: []
createdByCommand: atm plan card create
completed_at: "2026-09-14T07:41:26.387Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-09-14T07:41:26.387Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-14T07-41-26-387Z-close-dd4a0f021503"
lastTransitionAt: "2026-09-14T07:41:26.387Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "69b8fc99ec78d6e62186bd19e8ffca65485e44da"
---

# TASK-PRF-0065 Make atom birth transactional and portable before CI evidence work

## Intent

The first governed attempt to create `ATM-PRF-0001` exposed a product-critical
reliability defect in the existing atom generator. The generator wrote the
workbench files, registry, and catalog before validating the final registry.
The generated entry also carried an ephemeral absolute schema path from the
frozen runner cache and a zero placeholder hash lock. The command returned
`ATM_GENERATOR_REGISTRY_INVALID`, but left tracked projections and generated
files behind until manual quarantine and recovery.

This card repairs the existing `atm.core-atom-generator` boundary. It must
prepare and validate a complete candidate first, commit all artifacts as one
transaction (or roll back every newly created/overwritten artifact), normalize
schema paths to repository-relative `schemas/...` paths, and compute a real
hash lock from the generated spec. The repair must work from both source and
packaged/frozen execution roots without embedding machine-specific paths.

## Acceptance

- [ ] ACC-1: A generated registry candidate is fully schema-validated before
      any registry, catalog, or workbench write. Injected validation failure
      leaves pre-existing files byte-identical and leaves no newly created
      atom directory; the failure receipt names the rejected phase.
- [ ] ACC-2: Every generated registry entry stores a repository-relative
      `schemas/*.schema.json` path. Source and packaged/frozen-root runs must
      never persist an absolute Temp, user-home, drive-letter, or node-module
      cache path.
- [ ] ACC-3: The generated spec and registry entry carry non-placeholder
      SHA-256 hash locks that match the canonical generated spec and source
      snapshot. All hashes remain stable across an unchanged rerun.
- [ ] ACC-4: A successful birth produces a schema-valid registry, catalog,
      workbench witness files, and command-backed test report. Repeating the
      same logical name is idempotent: one registry entry, no duplicate
      catalog row, and no unintended overwrite.
- [ ] ACC-5: Focused red/green tests cover failed birth with no residue,
      portable schema resolution, hash fidelity, successful birth, and
      idempotent rerun. The report records the original 0064 failure receipt
      and the post-repair replay result.

The card does not authorize npm publication, bundler splitting, GitHub push,
or rewriting TASK-PRF-0059/0064 provenance. Frozen-runner synchronization is a
separate governed release surface.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T07:17:42.439Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0065-make-atom-birth-transactional-and-portable-before-ci-evidence-work.task.md","contentDigest":"sha256:92537e8213ec156f64e6ff35db6f2710e256d2ae990fc74ac569d3859ec3f08e"} -->
