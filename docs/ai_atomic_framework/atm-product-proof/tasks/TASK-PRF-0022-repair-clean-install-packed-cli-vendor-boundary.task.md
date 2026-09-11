---
task_id: TASK-PRF-0022
title: Repair clean-install packed CLI vendor boundary
status: planned
owner: owner-authorized-release-steward
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
closure_authority: owner
scopePaths:
  - scripts/build-cli-npm-runtime.ts
  - packages/cli/package.json
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-ci-burn-in.md
deliverables:
  - packages/cli/dist/npm-runtime/runtime.mjs
  - packages/cli/dist/npm-runtime/manifest.json
  - tests/cli/public-npm-install-contract.test.ts
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-ci-burn-in.md
validators:
  - npm run build --workspace packages/cli
  - npm pack --workspace packages/cli --dry-run --json
  - node --strip-types scripts/validate-adopter-artifact-manifest.ts --mode validate
  - node --strip-types scripts/validate-npm-clean-install.ts
  - node --strip-types tests/cli/public-npm-install-contract.test.ts
  - npm run lint
  - npm run typecheck
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0022 Repair clean-install packed CLI vendor boundary

## Intent

Repair the public package boundary exposed by remote run `34607184874`.
Lint and typecheck passed, but Product CI failed at
`Clean-install packed CLI smoke`: `npm pack --workspace packages/cli` invoked
the runtime build and esbuild reported 280 unresolved imports, beginning with
`dist/commands/agent-pack.js` resolving missing
`../_vendor/agent-pack-sdk/dist/index.js` and the Claude/Copilot/Cursor/Gemini
vendor modules. The local slim inventory is therefore not sufficient evidence
until a clean checkout can pack and install it without relying on workspace
vendor residues.

## Required Work

- Trace why the clean-install build omits `_vendor/agent-pack-*` while the
  source tree still references those modules.
- Choose one explicit, budget-compatible closure: bundle the required runtime
  code, declare installable package dependencies, or remove unreachable
  command paths from the published runtime. Preserve CLI behavior and record
  the boundary decision in the package manifest/report.
- Add a focused regression assertion that runs the same clean-install packed
  smoke path and fails on unresolved vendor imports.
- Rebuild and regenerate only governed runtime artifacts; do not claim public
  npm proof until a fresh clean-install run succeeds.

## Acceptance

- [ ] A clean checkout can run `npm pack --workspace packages/cli` with zero
      unresolved `_vendor` imports.
- [ ] The packed tarball installs in an isolated directory and `atm --help`
      (or the declared smoke command) succeeds.
- [ ] Artifact remains within the declared 3,365,772-byte / 308-entry cap and
      contains no forbidden source, test, or evidence artifacts.
- [ ] Lint, typecheck, and focused package contract pass.
- [ ] Report records run `34607184874`, the root cause, and the successful
      remediation run; historical failure evidence is retained.
- [ ] No npm publish or protected-main push occurs without separate owner
      authorization.

## Rollback

Revert only the package-boundary implementation and regenerated runtime
artifacts; retain the failed-run log and evidence references.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T13:58:34.539Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0022-repair-clean-install-packed-cli-vendor-boundary.task.md","contentDigest":"sha256:394a6370284623f6164593aac3744ef826c773c2deeede9bacfdc40a749beb70"} -->
