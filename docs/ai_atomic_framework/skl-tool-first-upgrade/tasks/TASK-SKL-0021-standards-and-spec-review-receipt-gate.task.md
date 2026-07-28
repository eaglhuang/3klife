---
task_id: TASK-SKL-0021
title: Standards and Spec review receipt gate
status: done
owner: atm-agent-skills
priority: P1
milestone: ATM-SKL-VG-R0.2
depends_on:
  - TASK-SKL-0018
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/review-advisory/review-advisory-report.schema.json
  - packages/plugin-review-advisory/src/index.ts
  - packages/plugin-review-advisory/src/promotion-gates.ts
  - packages/cli/src/commands/review-advisory.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - tests/cli/standards-spec-review-receipt.test.ts
deliverables:
  - schemas/review-advisory/review-advisory-report.schema.json
  - packages/plugin-review-advisory/src/index.ts
  - packages/plugin-review-advisory/src/promotion-gates.ts
  - tests/cli/standards-spec-review-receipt.test.ts
validators:
  - node --strip-types tests/cli/standards-spec-review-receipt.test.ts
  - npm run validate:review-advisory
  - npm run typecheck
errorCodes: []
evidence:
  required: standards-spec-review-candidate-seal
rollback:
  strategy: revert-commit-and-disable-review-preclose-requirement
atomizationImpact:
  ownerAtomOrMap: atm.review-advisory
  mapUpdates: []
  extractionCandidates:
    - atom: atm.standards-spec-review-receipt
      pattern: Review Receipt
      source: packages/plugin-review-advisory/src/promotion-gates.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-24T08:09:24.990Z"
completed_by_agent: "codex-matt-skills-initiative-captain-20260724"
closedAt: "2026-07-24T08:09:24.990Z"
closedByActor: "codex-matt-skills-initiative-captain-20260724"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T08-09-24-702Z-close-166e7915a04f"
lastTransitionAt: "2026-07-24T08:09:24.990Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2cc221956081947a06e9f9e79bd522b49b5ce535"
---

# TASK-SKL-0021 Standards and Spec review receipt gate

## Intent

Extend ReviewAdvisory with a sealed two-axis report: Standards covers Charter,
ATM invariants and repo skill rules; Spec covers the sealed card acceptance,
impact, test IDs, deliverables, backlog links and waivers.

## Acceptance

- [ ] Report binds task, base, candidate, standards digest, spec digest,
      provider/version, findings and dispositions.
- [ ] Semantic review runs after focused red/green stabilization and before
      final task-required cases.
- [ ] Candidate changes invalidate the receipt.
- [ ] Pre-close checks freshness and unresolved findings without re-running the
      model review unnecessarily.
- [ ] Deterministic validators and AtomicCharter remain higher authority.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:34.605Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0021-standards-and-spec-review-receipt-gate.task.md","contentDigest":"sha256:2dd9effe54aeebd8326214e3037993a902849b3573ba4bc9e63d5ec1dac73cae"} -->
