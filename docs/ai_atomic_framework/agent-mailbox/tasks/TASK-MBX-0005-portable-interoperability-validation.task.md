---
task_id: TASK-MBX-0005
title: 驗證多 Editor 信箱互通與不授權邊界
status: planned
owner: unassigned
priority: P2
depends_on: [TASK-MBX-0003, TASK-MBX-0004]
causalGraph:
  causalDependencies: [TASK-MBX-0003, TASK-MBX-0004]
  startConditions: ["TASK-MBX-0003 與 TASK-MBX-0004 均已輸出 command-backed projection evidence。"]
  softRelations: ["原生 direct message 可優先使用，但不得成為 portable mailbox 成功的前提。"]
  changedPublicSeams: ["agent-mailbox interoperability acceptance contract"]
  causalImpactEdges: [multi-editor-address-isolation, portable-peer-discovery, portable-safe-retirement, portable-round-trip, message-is-not-authority]
  parallelFrontierInputs: []
  validatorReferences: [test_mbx_portable_interoperability_8a1e5c43]
  phaseOwner: TASK-MBX-0005
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths: [tests/cli/agent-mailbox-interoperability.test.ts, atomic_workbench/maps/agent-mailbox-protocol-map.json]
deliverables: [tests/cli/agent-mailbox-interoperability.test.ts, atomic_workbench/maps/agent-mailbox-protocol-map.json]
validators: ["node --strip-types tests/cli/agent-mailbox-interoperability.test.ts", "npm run typecheck"]
testContributions:
  - caseId: test_mbx_portable_interoperability_8a1e5c43
    targetGroupId: null
    semanticKey: portable_editor_mailbox_interoperability
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [multi-editor-address-isolation, portable-peer-discovery, portable-safe-retirement, portable-round-trip, message-is-not-authority]
    expectedRedPredicate: "One editor cannot discover valid active peers, cannot complete a round trip with another, retired addresses still accept mail, unfinished messages are consumed, or context fields act as execution authority."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-MBX-0003,TASK-MBX-0004
    contractEdge: agent-mailbox-interoperability
    resourceKey: local-filesystem-fixture
requiredTestCaseIds: [test_mbx_portable_interoperability_8a1e5c43]
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
  notes: "只回復互通驗收與 map metadata；不刪除使用者信箱。"
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-protocol
  mapUpdates:
    - atomic_workbench/maps/agent-mailbox-protocol-map.json
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0005 驗證多 Editor 信箱互通與不授權邊界

## Intent

以本機檔案 fixture 驗證 Codex、Claude Code、Cursor、Antigravity 的 projection 都可用相同地址協議完成收發。驗收只驗證 portable contract，不需要啟動或自動控制真實 Editor，也不把原生 direct message 視為前提。

## Acceptance

- [ ] 四個 Editor metadata 組合各自取得隔離地址，沒有中央 participant registry。
- [ ] 新註冊對話群可保留自行補充的 identity，並以唯讀 peers 掃描辨識其他有效身分文件。
- [ ] 退出對話群必須先清空 `new/going`；retire 後保留歷史、拒收新訊息，且預設 peers 不再列為活躍成員。
- [ ] Codex/Claude Code 與 Cursor/Antigravity 可經由同一協議完成 request/reply round trip。
- [ ] `.partial` 訊息不會被收件列舉，確認後不會重複消費。
- [ ] `taskId`、`scope`、evidence 等 context 欄位不會變成 command、claim、lock、commit 或 delegation 授權。

## Out of scope

- 真實桌面 App 自動化或不同主機整合測試。
- MCP、A2A 或長連線傳輸。

## Stop rule

若通過測試需依賴產品專屬分支、常駐 process 或自動 mutation，停止並拆回前置卡修正通用契約。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T13:33:08.207Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0005-portable-interoperability-validation.task.md","contentDigest":"sha256:e8eb2cc242a83799e59373f7734922ebb432c2b66ba09247526eaf9f226c8542"} -->
