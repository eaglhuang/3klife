---
task_id: TASK-MBX-0001
title: 實作 editor-neutral 信箱地址與 Markdown 訊息生命週期
status: planned
owner: unassigned
priority: P2
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "The MBX plan is registered and this source card imports cleanly into the ATM framework ledger."
  softRelations:
    - "Existing captain-dispatch mailbox remains untouched because it owns queue and stop-loss behavior, not peer conversation delivery."
  changedPublicSeams:
    - "agent-mailbox protocol API"
  causalImpactEdges:
    - "mailbox-address-isolation"
    - "mailbox-atomic-delivery"
    - "mailbox-idempotent-consumption"
  parallelFrontierInputs: []
  validatorReferences:
    - "test_mbx_protocol_lifecycle_1f9d2a7c"
  phaseOwner: TASK-MBX-0001
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: local
scopePaths:
  - scripts/agent-mailbox/**
  - tests/cli/agent-mailbox-protocol.test.ts
  - atomic_workbench/maps/agent-mailbox-protocol-map.json
deliverables:
  - scripts/agent-mailbox.ts
  - scripts/agent-mailbox/**
  - tests/cli/agent-mailbox-protocol.test.ts
  - atomic_workbench/maps/agent-mailbox-protocol-map.json
validators:
  - "node --strip-types tests/cli/agent-mailbox-protocol.test.ts"
  - "npm run typecheck"
testContributions:
  - caseId: test_mbx_protocol_lifecycle_1f9d2a7c
    targetGroupId: null
    semanticKey: agent_mailbox_protocol_lifecycle
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5]
    coversImpactEdges: [mailbox-address-isolation, mailbox-atomic-delivery, mailbox-idempotent-consumption]
    expectedRedPredicate: "A missing protocol implementation cannot create isolated addresses, hide partial files, consume safely without authority, or make acknowledgement idempotent."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: null
    contractEdge: agent-mailbox-protocol-api
    resourceKey: mailbox-filesystem-fixture
requiredTestCaseIds:
  - test_mbx_protocol_lifecycle_1f9d2a7c
phaseTestCaseIds:
  - legacy_cmd_typecheck
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - tdd-oracle-fidelity
evidence:
  required: command-backed
rollback:
  strategy: revert-commit; retain user mailbox roots
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-protocol
  mapUpdates:
    - atomic_workbench/maps/agent-mailbox-protocol-map.json
  extractionCandidates:
    - atom: agent-mailbox-protocol
      pattern: Deep Module
      source: scripts/agent-mailbox.ts
      disposition: extract
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0001 實作 editor-neutral 信箱地址與 Markdown 訊息生命週期

## Intent

Implement the smallest editor-neutral local filesystem protocol that lets any session register an independent address, deliver a Markdown message atomically, consume it once, and acknowledge it idempotently. It is the portable route whenever native conversation messaging is unavailable, including between separate Cursor conversations. `editor` is opaque metadata; no provider-specific branch or participant registry is permitted.

## Acceptance

- [ ] `register` returns a unique address and creates only that session's private mailbox layout.
- [ ] Sender publication never exposes a partial message to inbox enumeration.
- [ ] Re-reading after acknowledgement does not reprocess the same message.
- [ ] Messages may preserve ATM context fields but cannot execute work or grant write authority.
- [ ] The focused test supplies a red-to-green proof for all three causal impact edges.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T10:41:15.383Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0001-editor-neutral-markdown.task.md","contentDigest":"sha256:ec82ef26cef68b793921b12026a751bd418ccc5a69005cc37ed7d3aa4653d136"} -->
