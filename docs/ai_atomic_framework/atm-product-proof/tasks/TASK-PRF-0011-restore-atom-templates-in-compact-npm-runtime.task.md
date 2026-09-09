---
task_id: TASK-PRF-0011
title: Restore atom templates in compact npm runtime
status: done
owner: atm-release
priority: P0
depends_on: [TASK-PRF-0004]
causalGraph:
  causalDependencies: [TASK-PRF-0004]
  startConditions:
    - The compact npm runtime remains within the original Phase-2 byte and entry caps.
    - The frozen-runner ENOENT reproduction is retained as the red baseline.
  softRelations: [TASK-PRF-0010]
  changedPublicSeams: [npm-runtime-asset-closure, atm-create]
  causalImpactEdges:
    - installed-cli-can-scaffold-an-atom
    - runtime-assets-remain-minimal-and-hash-sealed
  parallelFrontierInputs: [packed-file-inventory, atom-template-runtime-read]
  validatorReferences:
    - test_prf_installed_atm_create_smoke_61c02eab
    - test_prf_compact_runtime_budget_48f7a0cd
  phaseOwner: phase-2-installable-package-correction
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/build-package-dist.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-npm-clean-install.ts
  - scripts/validate-onefile-release.ts
  - scripts/validate-adopter-artifact-manifest.ts
  - templates/atom.spec.template.json
  - templates/atom.test.template.ts
  - schemas/atomic-spec.schema.json
deliverables:
  - scripts/build-package-dist.ts
  - scripts/validate-npm-clean-install.ts
  - scripts/validate-onefile-release.ts
validators:
  - npm run build
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts
  - node --strip-types scripts/validate-npm-clean-install.ts
  - node --strip-types scripts/validate-onefile-release.ts
testContributions:
  - caseId: test_prf_installed_atm_create_smoke_61c02eab
    targetGroupId: null
    semanticKey: installed_atm_create_smoke
    coversAcceptance: [ACC-1, ACC-2, ACC-4]
    coversImpactEdges: [installed-cli-can-scaffold-an-atom]
    expectedRedPredicate: An isolated install of the CLI tarball exits non-zero on atm create --dry-run because a required scaffold template is absent.
    contributionResourceKey: npm-runtime-template-assets
    responsibility: task-required
    dependencyEdge: installed-cli-to-scaffold-template
    contractEdge: atm-create
    resourceKey: cli-tarball
  - caseId: test_prf_compact_runtime_budget_48f7a0cd
    targetGroupId: null
    semanticKey: compact_runtime_budget
    coversAcceptance: [ACC-3]
    coversImpactEdges: [runtime-assets-remain-minimal-and-hash-sealed]
    expectedRedPredicate: The restored assets are absent from the manifest, unhashed, or push the tarball beyond the original Phase-2 caps.
    contributionResourceKey: npm-runtime-manifest
    responsibility: task-required
    dependencyEdge: runtime-assets-to-pack-manifest
    contractEdge: npm-runtime-asset-closure
    resourceKey: cli-artifact-budget
requiredTestCaseIds:
  - test_prf_installed_atm_create_smoke_61c02eab
  - test_prf_compact_runtime_budget_48f7a0cd
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: Revert the runtime-asset copy and smoke assertion together; do not retain a package that advertises atm create while omitting its templates.
atomizationImpact:
  ownerAtomOrMap: atm.cli-npm-runtime-map
  mapUpdates: []
  newScriptsAllowed: false
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-09T23:46:53.876Z"
completed_by_agent: "codex-product-proof"
closedAt: "2026-09-09T23:46:53.876Z"
closedByActor: "codex-product-proof"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-09T23-46-53-876Z-close-147934aa714e"
lastTransitionAt: "2026-09-09T23:46:53.876Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "b5d707452e8dd219e0e15a20fa49bd408bc09186"
---

# TASK-PRF-0011 Restore atom templates in compact npm runtime

## Intent

Restore the minimum immutable scaffold assets required by `atm create` to the
compact CLI tarball and make an isolated installed-package invocation a release
gate, without restoring the full source or development tree.

## Acceptance

- [ ] ACC-1: An isolated `npm pack` installation runs `atm create --bucket CORE --title SmokeAtom --description "Installed runtime smoke" --logical-name atom.smoke.installed --dry-run --json` successfully.
- [ ] ACC-2: Both atom scaffold templates and their atomic-spec schema resolve from the installed runtime and the dry-run performs no repository mutation.
- [ ] ACC-3: The three assets are individually hashed in the runtime manifest; the tarball remains below 3,365,772 unpacked bytes and 308 entries and contains no source, test, cache or evidence tree.
- [ ] ACC-4: The frozen onefile runner executes the same create dry-run successfully so source, onefile and npm-installed behavior cannot drift silently.

## Out of scope

- Publishing to npm, changing public package names or relaxing artifact budgets.
- Bundling the complete repository `templates/` tree or any development source.
- Implementing the Evidence Ledger migration itself.

## Stop rule

Stop if the repair requires widening the package allowlist beyond the two
declared templates plus their directly required atomic-spec schema, exceeds
either original Phase-2 cap, or makes the dry-run
write to the fixture repository.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-09T23:18:13.345Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0011-restore-atom-templates-in-compact-npm-runtime.task.md","contentDigest":"sha256:749dcc694b7118956dc07d1d801c6761e7b7b6ed2f871fab89918b3c7ac24fcb"} -->
