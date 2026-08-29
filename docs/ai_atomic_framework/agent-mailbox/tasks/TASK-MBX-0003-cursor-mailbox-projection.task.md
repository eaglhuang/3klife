---
task_id: TASK-MBX-0003
title: 投影信箱收發指令至 Cursor 對話群
status: planned
owner: unassigned
priority: P2
depends_on: [TASK-MBX-0002]
causalGraph:
  causalDependencies: [TASK-MBX-0002]
  startConditions: ["TASK-MBX-0002 的通用 source template 與 Claude/Codex projection 已有 command-backed evidence。"]
  softRelations: ["Cursor 不提供原生對話群互傳時，信箱是同 Editor 的可攜後備路徑。"]
  changedPublicSeams: ["Cursor agent-mailbox skill projection"]
  causalImpactEdges: [cursor-session-registration, cursor-inbox-check]
  parallelFrontierInputs: []
  validatorReferences: [test_mbx_cursor_projection_61a9bd20]
  phaseOwner: TASK-MBX-0003
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [.cursor/rules/skills/agent-mailbox/**, tests/cli/agent-mailbox-cursor-projection.test.ts]
deliverables: [.cursor/rules/skills/agent-mailbox/SKILL.md, tests/cli/agent-mailbox-cursor-projection.test.ts]
validators: ["node --strip-types tests/cli/agent-mailbox-cursor-projection.test.ts", "npm run validate:integration-adapter"]
testContributions:
  - caseId: test_mbx_cursor_projection_61a9bd20
    targetGroupId: null
    semanticKey: cursor_agent_mailbox_projection
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [cursor-session-registration, cursor-inbox-check]
    expectedRedPredicate: "Cursor projection is absent, assumes native direct messaging, or permits a received message to authorize mutation."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-MBX-0002
    contractEdge: agent-mailbox-skill-template
    resourceKey: cursor-skill-projection
requiredTestCaseIds: [test_mbx_cursor_projection_61a9bd20]
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
  notes: "只移除 Cursor projection；保留 mailbox root。"
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-adapter-projection
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0003 投影信箱收發指令至 Cursor 對話群

## Intent

將通用信箱契約投影到 Cursor。每個 Cursor 對話群在允許的對話開始邊界註冊自己的地址並檢查收件匣；不得假設 Cursor 具備同 Editor 的原生對話群互傳。不得輪詢、注入訊息、執行收到的內容或繞過 ATM。

## Acceptance

- [ ] Cursor skill 以 opaque `editor` metadata 註冊獨立信箱，沒有產品分支寫進 protocol。
- [ ] Cursor 同 Editor 對話群沒有原生直連時，可用 `register`、`send`、`inbox`、`ack` 完成可攜收發。
- [ ] 收到訊息只作 context；任何 mutation 前仍要求 ATM route。

## Out of scope

- Cursor 服務、雲端 API、通知或背景輪詢。
- 修改核心 mailbox protocol 或其他 Editor projection。

## Stop rule

若 Cursor 無法在允許的對話邊界執行本機 CLI，停止並回報所缺 Editor capability；不得以 daemon 或注入 turn 補償。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T13:33:04.441Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0003-cursor-mailbox-projection.task.md","contentDigest":"sha256:d06e9893ee7056a3fddebdc36e3effd811373d1016b479bd5df88e67c79aeb4d"} -->
