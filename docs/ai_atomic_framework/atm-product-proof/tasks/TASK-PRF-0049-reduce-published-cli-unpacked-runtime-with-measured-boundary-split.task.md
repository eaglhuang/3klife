---
task_id: TASK-PRF-0049
title: Reduce published CLI unpacked runtime with measured boundary split
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
  - packages/cli/src/atm.ts
  - scripts/build-cli-npm-runtime.ts
  - scripts/validate-public-npm-install.ts
  - tests/cli/npm-clean-install.test.ts
  - tests/cli/external-benchmark-protocol.test.ts
deliverables:
  - candidate runtime boundary implementation and focused tests
  - reproducible baseline-vs-candidate package measurement receipt outside Git history
  - clean-consumer install proof for the candidate package
validators:
  - npm run validate:package-install
  - npm run validate:public-npm-install
  - node --strip-types tests/cli/external-benchmark-protocol.test.ts
  - command-backed baseline-vs-candidate measurement with retained receipt
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T16:58:56.431Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-13T16:58:56.431Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T16-58-56-431Z-close-c1a4cf263276"
lastTransitionAt: "2026-09-13T16:58:56.431Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "d025ade1e790bbc30424f319cb5c2078a11ae28d"
---

# TASK-PRF-0049 Reduce published CLI unpacked runtime with measured boundary split

## Intent

Deliver a real reduction in the public `@ai-atomic-framework/cli` runtime, measured against the currently published stable package. A deep module boundary or smaller runtime entry is acceptable only if it preserves the documented CLI install and command surface.

## Acceptance

- [ ] Baseline records published tarball bytes, unpacked bytes, entry count, Node version, and representative command smoke results.
- [ ] Candidate clean install succeeds without workspace links and preserves `atm --version`, `next`, `tasks`, and `doctor` smoke commands.
- [ ] Candidate unpacked bytes decrease by at least 20% and entry count by at least 15% versus baseline; otherwise no split is accepted.
- [ ] Covered generated adopter files remain byte/hash equivalent; unsupported commands fail explicitly with actionable guidance.
- [ ] Same-host repeated measurements report p50/p95 install and startup latency, bytes, entries, and failure reasons.
- [ ] Existing package budget and release CI remain green; changing thresholds or metadata alone cannot satisfy acceptance.

## Out of scope

Do not run the paid external pilot, alter hidden oracle data, weaken CI policy, or claim value from validator-only/package-metadata changes.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T14:07:16.402Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0049-reduce-published-cli-unpacked-runtime-with-measured-boundary-split.task.md","contentDigest":"sha256:94fc9a4b7583f5fe258ebdaec7097cceb660eed5cee8f82430fa039d6251a476"} -->
