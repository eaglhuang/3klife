---
task_id: TASK-SKL-0025
title: Test case ID bound TDD red-green lifecycle
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.5
depends_on:
  - TASK-SKL-0023
  - TASK-SKL-0024
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/evidence/tdd-cycle.ts
  - packages/core/src/evidence/index.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/tdd-case-id-red-green-lifecycle.test.ts
deliverables:
  - packages/core/src/evidence/tdd-cycle.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/tdd-case-id-red-green-lifecycle.test.ts
validators:
  - node --strip-types tests/cli/tdd-case-id-red-green-lifecycle.test.ts
  - npm run typecheck
errorCodes: []
evidence:
  required: same-case-red-green-candidate-binding
rollback:
  strategy: revert-commit-and-return-tdd-mode-to-advisory
atomizationImpact:
  ownerAtomOrMap: atm.validation-evidence
  mapUpdates: []
  extractionCandidates:
    - atom: atm.tdd-cycle-receipt
      pattern: TDD Evidence Contract
      source: packages/core/src/evidence/tdd-cycle.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-25T11:58:30.796Z"
completed_by_agent: "cursor-skl-0025-captain"
closedAt: "2026-07-25T11:58:30.796Z"
closedByActor: "cursor-skl-0025-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-25T11-58-30-413Z-close-ec63c9c9c8f5"
lastTransitionAt: "2026-07-25T11:58:30.796Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9cd36eae21cedffc8acdd98f39e0fecc02d0d44f"
---

# TASK-SKL-0025 Test case ID bound TDD red-green lifecycle

## Intent

Implement a case-ID-bound TDD receipt and lifecycle for behavior changes,
governance gates and bug fixes, including integration cases contributed by the
same feature task.

## Acceptance

- [ ] `tddMode` supports required, recommended and reasoned not-applicable.
- [ ] Red and green bind the same case ID, test digest, acceptance, public seam
      and sealed baseline/candidate lineage.
- [ ] Syntax, setup, environment and unrelated failures cannot count as red.
- [ ] One task may contribute and prove multiple integration case IDs.
- [ ] Mechanical/docs exemptions are typed, reviewed and excluded from TDD
      success-rate inflation.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.470Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0025-test-case-id-bound-tdd-red-green-lifecycle.task.md","contentDigest":"sha256:5083b3590803691933c6a069e72ce71908f6f5cc8cbc07f8097d0f6906188fef"} -->
