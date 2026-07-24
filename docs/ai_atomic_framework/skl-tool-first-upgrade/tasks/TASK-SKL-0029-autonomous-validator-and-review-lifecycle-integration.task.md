---
task_id: TASK-SKL-0029
title: Autonomous validator and review lifecycle integration
status: planned
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.7
depends_on:
  - TASK-SKL-0021
  - TASK-SKL-0025
  - TASK-SKL-0026
  - TASK-SKL-0028
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/review-advisory.ts
  - templates/skills/atm-evidence.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/autonomous-validator-review-lifecycle.test.ts
deliverables:
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/taskflow/auto-evidence-mapper.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - templates/skills/atm-evidence.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - tests/cli/autonomous-validator-review-lifecycle.test.ts
validators:
  - node --strip-types tests/cli/autonomous-validator-review-lifecycle.test.ts
  - npm run validate:skill-templates
  - npm run typecheck
errorCodes: []
evidence:
  required: autonomous-authoring-tdd-review-preclose-path
rollback:
  strategy: revert-commit-and-disable-vnext-lifecycle-feature-flag
atomizationImpact:
  ownerAtomOrMap: atm.taskflow
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-review-lifecycle-gate
      pattern: Taskflow Policy
      source: packages/cli/src/commands/taskflow/close-preflight.ts
      disposition: extract
createdByCommand: atm plan card create
---

# TASK-SKL-0029 Autonomous validator and review lifecycle integration

## Intent

Integrate authoring readiness, test contributions, TDD receipts,
Standards/Spec review, causal execution, phase ownership and pre-close freshness
into one autonomous lifecycle without making model review authoritative.

## Acceptance

- [ ] Import exposes exact missing contract/case/group fields and recovery.
- [ ] Evidence runner executes selected case IDs and preserves structured output.
- [ ] Candidate changes invalidate TDD, review and required-case receipts.
- [ ] Pre-close rejects unresolved required cases, zero-test results and stale
      phase ownership while advisory checks remain non-blocking.
- [ ] A representative captain can complete a card without step-by-step human
      instructions unless the card/scope/provider is genuinely invalid.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.857Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0029-autonomous-validator-and-review-lifecycle-integration.task.md","contentDigest":"sha256:0ef667f3eca5f7089eaaa82e64d7c79c7fdc9ba49df4f7420cf50a27269c9f27"} -->
