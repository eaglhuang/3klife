---
task_id: TASK-SKL-0033
title: Diagnostic feedback loop provider and causal repair receipt
status: done
owner: atm-agent-skills
priority: P1
milestone: ATM-SKL-VG-R1.1
depends_on:
  - TASK-SKL-0031
causalGraph:
  causalDependencies:
    - TASK-SKL-0031
  startConditions:
    - TASK-SKL-0031 is done and the diagnostic specialist can be distributed by the complete corpus profile.
  softRelations:
    - Matt Pocock diagnosing-bugs at ed37663cc5fbef691ddfecd080dff42f7e7e350d
  changedPublicSeams:
    - Diagnostic provider contract
    - Causal repair receipt
    - Evidence lifecycle diagnostic admission
  causalImpactEdges:
    - exact symptom -> red-capable reproducer
    - minimized reproducer -> falsifiable hypothesis experiment
    - winning hypothesis -> regression case and green repair evidence
  parallelFrontierInputs: []
  validatorReferences:
    - node --strip-types tests/cli/diagnostic-feedback-loop.test.ts
    - node --strip-types tests/core/causal-repair-receipt.test.ts
  phaseOwner: atm-agent-skills
related_plan: skl-tool-first-upgrade/SKL-tool-first-upgrade-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/evidence/diagnostic-loop-receipt.schema.json
  - packages/core/src/evidence/diagnostic-loop.ts
  - packages/core/src/evidence/index.ts
  - packages/cli/src/commands/evidence/verbs/diagnose.ts
  - packages/cli/src/commands/evidence/implementation.ts
  - templates/skills/atm-diagnostic-loop.skill.md
  - templates/skills/atm-diagnostic-loop.files/**
  - tests/catalog/groups/test_group_diagnostic_loop.shard.json
  - tests/cli/diagnostic-feedback-loop.test.ts
  - tests/core/causal-repair-receipt.test.ts
deliverables:
  - schemas/evidence/diagnostic-loop-receipt.schema.json
  - packages/core/src/evidence/diagnostic-loop.ts
  - packages/cli/src/commands/evidence/verbs/diagnose.ts
  - templates/skills/atm-diagnostic-loop.skill.md
  - tests/cli/diagnostic-feedback-loop.test.ts
  - tests/core/causal-repair-receipt.test.ts
validators:
  - node --strip-types tests/cli/diagnostic-feedback-loop.test.ts
  - node --strip-types tests/core/causal-repair-receipt.test.ts
  - npm run validate:schemas
  - npm run validate:skill-templates
  - npm run typecheck
requiredTestCaseIds:
  - test_task_skl_0033_diagnostic_loop_4cc1c8b1
  - test_task_skl_0033_causal_repair_receipt_01c82ab4
phaseTestCaseIds: []
advisoryTestCaseIds: []
outOfScope:
  - Language-specific debugger implementations.
  - Treating a hypothesis or model explanation as repair evidence.
  - Replacing the ATM bug backlog or TDD lifecycle.
errorCodes: []
evidence:
  required: command-backed-red-reproducer-hypothesis-and-repair-receipt
rollback:
  strategy: revert-commit-and-disable-diagnostic-provider-route
atomizationImpact:
  ownerAtomOrMap: atm.evidence-lifecycle
  mapUpdates: []
  extractionCandidates:
    - atom: atm.diagnostic-feedback-loop
      pattern: Policy Object
      source: packages/core/src/evidence/diagnostic-loop.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-30T18:57:08.159Z"
completed_by_agent: "codex-skl-captain"
closedAt: "2026-07-30T18:57:08.159Z"
closedByActor: "codex-skl-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-30T18-57-08-159Z-close-b3e63c4ee34f"
lastTransitionAt: "2026-07-30T18:57:08.159Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "42bb218b6a8d7b68bb1c74bedf33cdda40793ba4"
---

# TASK-SKL-0033 Diagnostic feedback loop provider and causal repair receipt

## Intent

Add a provider-neutral diagnostic loop that requires an exact, red-capable
reproducer before repair, minimizes the failing case, records falsifiable
hypotheses and one-variable experiments, and seals the winning causal path into
a regression case plus green repair evidence.

## Acceptance

- [ ] A versioned receipt binds exact symptom, reproducer command, candidate and
      environment digest, reproduction rate, minimized fixture, hypotheses,
      experiments, winning hypothesis, regression case and green evidence.
- [ ] Admission fails closed when the command cannot reproduce the declared
      symptom; "no crash", broad logs and unrelated red failures do not qualify.
- [ ] Hypotheses carry predicted observations and one-variable experiment
      results. A model explanation alone cannot authorize repair.
- [ ] The regression case reuses TASK-SKL-0025 case-ID semantics and the receipt
      freshness lifecycle sealed by TASK-SKL-0029.
- [ ] Emergency or trivial compile-failure paths require a bounded, expiring
      rationale rather than weakening the default diagnostic contract.
- [ ] Temporary instrumentation is removed or explicitly promoted as a
      maintained observability seam before close.
- [ ] The specialist skill is provider-neutral and distributed through
      TASK-SKL-0031 profiles; ATM runtime does not import upstream prose.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-26T15:30:46.574Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0033-diagnostic-feedback-loop-provider-and-causal-repair-receipt.task.md","contentDigest":"sha256:025a1543eced6a33d9a794005a3d3796056e9ce8bbdb880a072c09f8ba04636b"} -->
