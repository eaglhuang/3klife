---
task_id: TASK-MBX-0004
title: 投影信箱收發指令至 Antigravity
status: planned
owner: unassigned
priority: P2
depends_on: [TASK-MBX-0002]
causalGraph:
  causalDependencies: [TASK-MBX-0002]
  startConditions: ["TASK-MBX-0002 的通用 source template 已有 command-backed evidence。"]
  softRelations: ["Antigravity 是一個 projection consumer；核心 protocol 不依它的產品名稱分支。"]
  changedPublicSeams: ["Antigravity agent-mailbox entry projection"]
  causalImpactEdges: [antigravity-session-registration, antigravity-inbox-check]
  parallelFrontierInputs: []
  validatorReferences: [test_mbx_antigravity_projection_c7184e65]
  phaseOwner: TASK-MBX-0004
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [GEMINI.md, .agents/skills/agent-mailbox/**, tests/cli/agent-mailbox-antigravity-projection.test.ts]
deliverables: [GEMINI.md, .agents/skills/agent-mailbox/SKILL.md, tests/cli/agent-mailbox-antigravity-projection.test.ts]
validators: ["node --strip-types tests/cli/agent-mailbox-antigravity-projection.test.ts", "npm run validate:integration-adapter"]
testContributions:
  - caseId: test_mbx_antigravity_projection_c7184e65
    targetGroupId: null
    semanticKey: antigravity_agent_mailbox_projection
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [antigravity-session-registration, antigravity-inbox-check]
    expectedRedPredicate: "Antigravity entry is absent, diverges from the generic mailbox contract, or treats received text as authority."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-MBX-0002
    contractEdge: agent-mailbox-skill-template
    resourceKey: antigravity-skill-projection
requiredTestCaseIds: [test_mbx_antigravity_projection_c7184e65]
phaseTestCaseIds: []
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
  notes: "只移除 Antigravity entry 與 skill projection；保留 mailbox root。"
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-adapter-projection
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0004 投影信箱收發指令至 Antigravity

## Intent

將通用信箱契約投影到 Antigravity 的入口與 skill。每個對話群取得自己的 `atm-mail` 地址，並只在允許的對話邊界檢查收件匣；訊息的內容永遠不是寫入或派工授權。

## Acceptance

- [ ] Antigravity entry 與 skill 同時引用一份通用 mailbox contract，沒有複製協議實作。
- [ ] 任意 `editor` metadata 都可註冊；Antigravity 僅是其中一個 projection。
- [ ] 聚焦測試證明收件訊息不能觸發 mutation，也不能取代 ATM 治理。

## Out of scope

- 修改 Gemini/Antigravity 的產品層通訊能力。
- 背景監聽、桌面通知或雲端傳輸。

## Stop rule

若既有 `GEMINI.md` 的內容與新增入口產生實質衝突，停止並要求 composition decision；不得覆寫其他 Antigravity governance instruction。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T13:33:06.287Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0004-antigravity-mailbox-projection.task.md","contentDigest":"sha256:c2a2ff55faf06d8351ea2fa595ac709b17536a445974195c6d646b90f4089e60"} -->
