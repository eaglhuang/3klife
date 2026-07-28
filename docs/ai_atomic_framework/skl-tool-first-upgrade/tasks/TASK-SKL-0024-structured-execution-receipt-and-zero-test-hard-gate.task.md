---
task_id: TASK-SKL-0024
title: Structured execution receipt and zero-test hard gate
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.4
depends_on:
  - TASK-SKL-0022
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/evidence/micro-evidence-receipt.schema.json
  - packages/core/src/evidence/validation-receipt.ts
  - packages/core/src/evidence/index.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/evidence/verbs/verify.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - tests/cli/validator-execution-receipt-hard-gate.test.ts
deliverables:
  - schemas/evidence/micro-evidence-receipt.schema.json
  - packages/core/src/evidence/validation-receipt.ts
  - packages/cli/src/commands/evidence/verbs/run.ts
  - packages/cli/src/commands/taskflow/close-preflight.ts
  - tests/cli/validator-execution-receipt-hard-gate.test.ts
validators:
  - node --strip-types tests/cli/validator-execution-receipt-hard-gate.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes: []
evidence:
  required: no-op-zero-test-and-freshness-negative-matrix
rollback:
  strategy: revert-commit-and-disable-vnext-receipt-admission
atomizationImpact:
  ownerAtomOrMap: atm.validation-evidence
  mapUpdates: []
  extractionCandidates:
    - atom: atm.validator-execution-receipt-gate
      pattern: Evidence Admission Policy
      source: packages/core/src/evidence/validation-receipt.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-25T07:21:38.497Z"
completed_by_agent: "gemini36-skl-0024-captain"
closedAt: "2026-07-25T07:21:38.497Z"
closedByActor: "gemini36-skl-0024-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-25T07-21-38-370Z-close-11802f11440f"
lastTransitionAt: "2026-07-25T07:21:38.497Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "6ea33fd4a21b29348ca627d3d3dbba3db59fb319"
---

# TASK-SKL-0024 Structured execution receipt and zero-test hard gate

## Intent

Bind validation evidence to exact case IDs, non-zero execution counts, result
schema, candidate/base/test/group/runner/build digests, and hard pre-close
freshness rules.

## Acceptance

- [ ] Receipt records case/assertion counts and rejects zero-case success.
- [ ] No-op import, banner-only, broken fixture, wrong-red, timeout,
      unavailable runner, stale test and stale candidate fixtures fail closed.
- [ ] Cache reuse requires exact candidate, scope, test, group, runner and
      environment identity.
- [ ] Advisory or quarantined results cannot satisfy required acceptance.
- [ ] Failure returns a structured reason and recovery route instead of a bare
      refusal.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.856Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0024-structured-execution-receipt-and-zero-test-hard-gate.task.md","contentDigest":"sha256:2c76dcb8040866e05258b1c41273cbc7494084ec7ae297c8b83cc740d76e429b"} -->
