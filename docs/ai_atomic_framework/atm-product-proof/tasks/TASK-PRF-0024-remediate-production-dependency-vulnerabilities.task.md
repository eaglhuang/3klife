---
task_id: TASK-PRF-0024
title: Remediate production dependency vulnerabilities
status: done
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
closure_authority: target_repo
scopePaths:
  - package.json
  - package-lock.json
  - packages/*/package.json
  - scripts/validate-dependencies.ts
deliverables:
  - dependency upgrade or bounded override removing all high/critical production audit findings
  - reproducible npm audit evidence with the final lockfile
  - compatibility proof for the CLI packed artifact and clean install
validators:
  - npm audit --omit=dev --audit-level=high
  - npm run typecheck
  - npm run lint
  - node --strip-types scripts/validate-package-skeleton.ts --mode install-smoke
  - node --strip-types scripts/validate-npm-clean-install.ts
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-11T16:43:56.413Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-11T16:43:56.413Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-11T16-43-56-413Z-close-ca72c7e1d368"
lastTransitionAt: "2026-09-11T16:43:56.413Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "44bc8d926c6bf5105de510e26053f2250abd66d8"
---

# TASK-PRF-0024 Remediate production dependency vulnerabilities

## Intent

Remove the three high-severity production dependency findings reported by the
remote Dependency scan (`brace-expansion`, `fast-uri`, and `js-yaml`) without
changing the public CLI contract or smuggling development-only dependencies into
the adopter bundle. Prefer the smallest compatible transitive upgrade; record any
unavoidable advisory exception with owner-approved impact and expiry.

## Acceptance

- [ ] `npm audit --omit=dev --audit-level=high` exits 0 with no high/critical findings.
- [ ] The lockfile and package manifests resolve deterministically on a clean install.
- [ ] Packed CLI size/entry budgets and isolated install remain within existing caps.
- [ ] No runtime dependency is replaced by a dev-only package or hidden override.
- [ ] Evidence records advisory IDs, resolved versions, and the repaired CI run.
- [ ] Rollback restores the prior lockfile/manifests and reruns the package gates.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-11T16:03:02.439Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0024-remediate-production-dependency-vulnerabilities.task.md","contentDigest":"sha256:2186c1ca28547b47e6eb4befa70c6dc36caf53c642ea560c38fce6eefe1f73a4"} -->