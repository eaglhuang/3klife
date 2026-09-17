---
task_id: TASK-PRF-0067
title: Enforce semantic product-acceptance gates before task close
status: planned
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0060]
causalGraph:
  causalDependencies: [TASK-PRF-0060]
  startConditions:
    - "TASK-PRF-0060 is recorded as done even though its report says acceptance.passed=false and the public registry core workflow fails."
    - "The closure packet records exitCode 0 for a validator invoked with --record-blocked, but does not carry a semantic product-acceptance verdict."
  softRelations: [TASK-PRF-0056, TASK-PRF-0062, TASK-PRF-0063]
  changedPublicSeams: [task_close_semantic_acceptance, product_proof_closure_evidence]
  causalImpactEdges: [task_completion_truthfulness, product_delivery_proof]
  parallelFrontierInputs: [acceptance_evidence_contract, closure_packet_semantics, negative_close_fixture]
  validatorReferences: [test_prf0067_semantic_close_gate, test_prf0067_record_blocked_negative, test_prf0067_historical_0060_replay]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/tasks/acceptance-evidence-import.ts
  - packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts
  - tests/cli/closure-acceptance-evidence-gate.test.ts
  - tests/cli/task-close-semantic-acceptance.test.ts
  - docs/reports/atm-task-close-semantic-acceptance.md
deliverables:
  - packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
  - packages/cli/src/commands/tasks/close-orchestrator/closure-packet.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/tasks/acceptance-evidence-import.ts
  - packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts
  - packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts
  - tests/cli/closure-acceptance-evidence-gate.test.ts
  - tests/cli/task-close-semantic-acceptance.test.ts
  - docs/reports/atm-task-close-semantic-acceptance.md
validators:
  - npm run typecheck
  - npm run lint
  - npm run build
  - npm test
  - node --strip-types tests/cli/closure-acceptance-evidence-gate.test.ts
  - node --strip-types tests/cli/task-close-semantic-acceptance.test.ts
  - node --strip-types packages/cli/src/commands/tasks/__tests__/close-orchestrator.spec.ts
  - node --strip-types packages/cli/src/commands/taskflow/__tests__/write-readiness.spec.ts
  - node atm.mjs tasks import --from C:/Users/User/3KLife/docs/ai_atomic_framework/atm-product-proof/tasks/TASK-PRF-0067-enforce-semantic-product-acceptance-gates-before-task-close.task.md --dry-run --json
testContributions:
  - caseId: test_prf0067_semantic_close_gate
    targetGroupId: null
    semanticKey: semantic_product_acceptance_close_gate
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [task_completion_truthfulness]
    expectedRedPredicate: "A product-proof task with acceptance.passed=false or an inconclusive semantic result can be closed as done because its commands exited 0."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0060
    contractEdge: task_close_semantic_acceptance
    resourceKey: closure-packet
  - caseId: test_prf0067_record_blocked_negative
    targetGroupId: null
    semanticKey: record_blocked_is_not_green
    coversAcceptance: [ACC-2, ACC-4]
    coversImpactEdges: [product_delivery_proof]
    expectedRedPredicate: "A validator run with --record-blocked is treated as a passing product gate merely because its process exit code is zero."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0060
    contractEdge: product_proof_closure_evidence
    resourceKey: blocked-receipt
  - caseId: test_prf0067_historical_0060_replay
    targetGroupId: null
    semanticKey: historical_0060_negative_replay
    coversAcceptance: [ACC-5, ACC-6]
    coversImpactEdges: [task_completion_truthfulness]
    expectedRedPredicate: "The 0060 closure evidence is rewritten, silently promoted, or interpreted as public product proof after the semantic gate is added."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-PRF-0060
    contractEdge: product_proof_closure_evidence
    resourceKey: historical-replay
requiredTestCaseIds: [test_prf0067_semantic_close_gate, test_prf0067_record_blocked_negative, test_prf0067_historical_0060_replay]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract]
evidence:
  required: command-backed-semantic-close-gate-and-historical-negative-replay
rollback:
  strategy: revert-commit-preserve-0060-history
  notes: "回滾只撤銷新的 close gate、schema/validator 與測試；不得修改、重開、刪除或重寫 TASK-PRF-0060 的 ledger、報告、closure packet 或外部 receipts。"
atomizationImpact:
  ownerAtomOrMap: atm.task-close-assurance
  mapUpdates: []
  extractionCandidates:
    - atom: atm.semantic-product-acceptance-gate
      pattern: Policy Object
      source: packages/cli/src/commands/tasks/close-orchestrator/acceptance-evidence-gate.ts
      disposition: extract
      inlineReason: null
errorCodes: []
acceptanceEvidence: '{"semantic-close-proof":{"id":"semantic-close-proof","claim":"A product-proof task reaches done only when its declared semantic acceptance predicates pass.","authoritativeSources":["task-document.acceptanceEvidence","closure-packet.acceptanceVerdict","command-backed-validation-receipt"],"derivationRule":"all closure-critical predicates pass and every required product validator is semantically green","requiredRealness":"sealed-replay","verifier":{"mode":"separate-actor"},"negativeControls":[{"id":"blocked-receipt","expectedFailureReason":"record-blocked receipt is not semantic acceptance"}],"missingDataVerdict":"inconclusive","closureCritical":true}}'
createdByCommand: atm plan card create
---

# TASK-PRF-0067 Enforce semantic product-acceptance gates before task close

## Intent

TASK-PRF-0060 exposed that ATM can report a task as `done` while the product
objective is still false. The live ledger and planning mirror agree on `done`,
but the task report records `acceptance.passed=false`, the entry-count target
failed, and the public registry core workflow still fails. Its closure packet
accepted command exit code `0` from validators run with `--record-blocked` and
stored no semantic product-acceptance verdict.

This card is an append-only repair to the close-assurance boundary. It must make
task completion truthfully distinguish governance state from product delivery:
an evidence-driven product-proof task may close as `done` only when its
closure-critical acceptance predicates are semantically `pass`. A process exit
code of zero, a generated receipt, or state parity alone is necessary but not
sufficient. The historical 0060 artifacts remain immutable negative evidence.

## Acceptance

- [ ] **ACC-1 — Semantic close invariant:** For tasks that declare
      `acceptanceEvidence`, `taskflow close` and its backend close path require
      every closure-critical predicate to have a semantic `pass`; `fail` and
      `inconclusive` return a structured blocker and cannot transition to
      `done`. The closure packet records the evaluated verdict and predicate
      results.
- [ ] **ACC-2 — Exit code is not acceptance:** A command-backed validator with
      `--record-blocked`, an explicit blocked result, or `acceptance.passed=false`
      cannot satisfy a product-proof gate even when its process exit code is
      zero. The result is `blocked` or `inconclusive`, never green.
- [ ] **ACC-3 — Readiness/close parity:** `taskflow pre-close`, dry-run close,
      and close write expose the same semantic blocker and do not allow the
      dry-run to pass when the write path would reject it.
- [ ] **ACC-4 — Negative regression:** A fixture reproducing 0060 (all listed
      commands exit zero, public validator uses `--record-blocked`, and the
      product acceptance field is false) is rejected by both readiness and
      close. A genuine all-pass fixture remains closable.
- [ ] **ACC-5 — Historical preservation:** Replaying or inspecting 0060 keeps
      its original `done` ledger state, report text, closure packet, digests,
      and external receipts unchanged; the new report labels it as a historical
      governance false-green and does not retroactively rewrite the result.
- [ ] **ACC-6 — Evidence quality:** typecheck, lint, build, full tests, focused
      close-gate tests, and planning-card import dry-run pass. The report
      records command digests, semantic verdicts, and the exact replay command;
      no npm publish, GitHub push, task close, or target-repo mutation is
      authorized by this planning card.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T08:40:41.653Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0067-enforce-semantic-product-acceptance-gates-before-task-close.task.md","contentDigest":"sha256:3e147090eb622f959c83554b5e2503ed05060e70c0b0b70359de803dff3eff66"} -->
