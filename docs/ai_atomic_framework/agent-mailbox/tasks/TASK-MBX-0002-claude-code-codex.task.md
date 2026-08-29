---
task_id: TASK-MBX-0002
title: 將信箱註冊與收件檢查投影至 Claude Code 與 Codex
status: planned
owner: unassigned
priority: P2
depends_on:
  - TASK-MBX-0001
  - TASK-MBX-0006
causalGraph:
  causalDependencies:
    - TASK-MBX-0001
    - TASK-MBX-0006
  startConditions:
    - "TASK-MBX-0001 與 TASK-MBX-0006 都已有 command-backed green evidence。"
  softRelations:
    - "Native same-editor messaging is preferred when available; this adapter remains the portable fallback when it is unavailable, including Cursor conversations."
  changedPublicSeams:
    - "agent-mailbox onboarding and exit skill template projection"
  causalImpactEdges:
    - "portable-session-registration"
    - "portable-peer-discovery"
    - "portable-inbox-check"
    - "portable-safe-retirement"
  parallelFrontierInputs: []
  validatorReferences:
    - "test_mbx_adapter_projection_42bc1e90"
  phaseOwner: TASK-MBX-0002
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:\Users\User\AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/agent-mailbox.skill.md
  - packages/integrations-core/templates/skills/agent-mailbox.skill.md
  - integrations/codex-skills/agent-mailbox/**
  - packages/agent-pack-claude-code/**
  - tests/cli/agent-mailbox-adapter-projection.test.ts
deliverables:
  - templates/skills/agent-mailbox.skill.md
  - packages/integrations-core/templates/skills/agent-mailbox.skill.md
  - integrations/codex-skills/agent-mailbox/SKILL.md
  - packages/agent-pack-claude-code/**
  - tests/cli/agent-mailbox-adapter-projection.test.ts
validators:
  - "node --strip-types tests/cli/agent-mailbox-adapter-projection.test.ts"
  - "npm run validate:integration-adapter"
  - "npm run validate:skill-templates"
testContributions:
  - caseId: test_mbx_adapter_projection_42bc1e90
    targetGroupId: null
    semanticKey: agent_mailbox_adapter_projection
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6, ACC-7]
    coversImpactEdges: [portable-session-registration, portable-peer-discovery, portable-inbox-check, portable-safe-retirement]
    expectedRedPredicate: "The source template is absent, lacks a safe join or exit path, its portable fallback contract is incomplete, or Claude/Codex projections differ from it."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-MBX-0006
    contractEdge: agent-mailbox-skill-template
    resourceKey: skill-corpus-projection
requiredTestCaseIds:
  - test_mbx_adapter_projection_42bc1e90
phaseTestCaseIds:
  - legacy_cmd_validate_integration_adapter
  - legacy_cmd_validate_skill_templates
advisoryTestCaseIds: []
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles:
  - tdd-oracle-fidelity
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "只回復 onboarding and exit skill projections；保留使用者信箱與歷史。"
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-adapter-projection
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0002 將信箱註冊與收件檢查投影至 Claude Code 與 Codex

## Intent

Project one source-of-truth onboarding and exit skill into Claude Code and Codex. For a new conversation, it guides `register`, self-completion of `identity.md`, read-only `peers` discovery, deliberate recipient selection, and `new/going/done` handling only at approved turn boundaries. For an exiting conversation, it guides completion or handoff of outstanding mail before `retire`. It is the portable fallback when a native direct-message path is absent (for example, Cursor conversation-to-conversation messaging). It does not poll, spawn a daemon, inject a turn, replace or mirror native same-editor messaging, create a central registry, force a retirement, or grant authority from a received message.

## Acceptance

- [ ] Claude Code and Codex receive equivalent generated instructions from the same source template.
- [ ] The generic projection accepts arbitrary `editor` metadata; Cursor, Antigravity, and later adapters need no protocol fork.
- [ ] The generated instruction explains the `new → going → done` handling boundary and that the recipient identity document is descriptive context, not authority.
- [ ] A fresh conversation can follow the skill from registration through self-introduction and read-only peer discovery before it sends its first message.
- [ ] The skill guides an exiting conversation to drain `new/going`, run `retire`, and preserve its history without treating retirement as authority to mutate other work.
- [ ] The adapter states that received messages are context only and ATM governance remains mandatory before mutation.
- [ ] The focused test supplies a red-to-green proof for every adapter impact edge.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T10:41:30.311Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0002-claude-code-codex.task.md","contentDigest":"sha256:b4949b16e63b33b48773d40d5152e4129efcf1b29130245aefb1c0b84af82ad1"} -->
