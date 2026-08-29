---
task_id: TASK-MBX-0006
title: 新增可追蹤信箱身分與信件生命週期
status: planned
owner: unassigned
priority: P2
depends_on:
  - TASK-MBX-0001
causalGraph:
  causalDependencies:
    - TASK-MBX-0001
  startConditions:
    - "TASK-MBX-0001 的基本地址、原子投遞與 core CLI 已有 command-backed green evidence。"
  softRelations:
    - "身份文件是目錄本地資料；不得成為中央 participant registry 或授權來源。"
  changedPublicSeams:
    - "agent mailbox identity and message-lifecycle contract"
  causalImpactEdges:
    - "identity-document-creation"
    - "peer-discovery-without-registry"
    - "new-going-done-atomic-transition"
    - "safe-retirement"
    - "traceable-message-filename"
  parallelFrontierInputs: []
  validatorReferences:
    - "test_mbx_identity_lifecycle_0e73c5a1"
  phaseOwner: TASK-MBX-0006
related_plan: agent-mailbox/agent-mailbox-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - scripts/agent-mailbox.ts
  - tests/cli/agent-mailbox-protocol.test.ts
  - atomic_workbench/maps/agent-mailbox-protocol-map.json
deliverables:
  - scripts/agent-mailbox.ts
  - tests/cli/agent-mailbox-protocol.test.ts
  - atomic_workbench/maps/agent-mailbox-protocol-map.json
validators:
  - "node --strip-types tests/cli/agent-mailbox-protocol.test.ts"
  - "npm run typecheck"
testContributions:
  - caseId: test_mbx_identity_lifecycle_0e73c5a1
    targetGroupId: null
    semanticKey: agent_mailbox_identity_and_lifecycle
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [identity-document-creation, peer-discovery-without-registry, new-going-done-atomic-transition, safe-retirement, traceable-message-filename]
    expectedRedPredicate: "Mailbox lacks its required identity document or state directories, peer discovery persists a registry, retirement loses or bypasses outstanding mail, a message skips a lifecycle state, or filenames cannot be deterministically traced."
    contributionResourceKey: null
    responsibility: task-required
    dependencyEdge: TASK-MBX-0001
    contractEdge: agent-mailbox-core-protocol
    resourceKey: mailbox-filesystem-fixture
requiredTestCaseIds:
  - test_mbx_identity_lifecycle_0e73c5a1
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
  notes: "回復 core lifecycle 實作與測試；絕不刪除使用者已建立的 mailbox root 或歷史信件。"
atomizationImpact:
  ownerAtomOrMap: agent-mailbox-protocol
  mapUpdates:
    - atomic_workbench/maps/agent-mailbox-protocol-map.json
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-MBX-0006 新增可追蹤信箱身分與信件生命週期

## Intent

把基本信箱協議補齊為可人工追蹤的本機信件生命週期與新成員加入／退出工具。`register` 以 `<editor, session>` 建立自己的 `identity.md` 草稿與 `new/`、`going/`、`done/`；既有地址的重複註冊只能驗證，不得覆寫對話群自行補充的角色、任務與職權範圍。`peers` 與 `identity show` 對既有 identity 做唯讀容錯掃描，產生即時可聯絡同儕清單但不寫中央 registry。`retire` 只在 `new/`、`going/` 為空時把 identity 標記為 retired，保留地址與 `done/` 歷史，且後續投遞與活躍同儕名冊都排除 retired 身分。訊息先投遞到 `new/`，收件者以 atomic move 領取到 `going/`，處理完成後再 move 到 `done/`。檔名必須同時含 UTC 日期時間、寄件者單調流水號與 opaque message id，以支持排序與後續追蹤。

## Acceptance

- [ ] `register` 可冪等建立或驗證 `identity.md`、`new/`、`going/`、`done/`；identity 草稿固定包含地址、opaque editor、session id，並保留由對話群補充的角色、任務與職權範圍。
- [ ] `peers` 與 `identity show` 只讀列出格式有效的公開 identity；對缺漏、損壞或重複資料 fail closed，不建立或更新中央 registry。
- [ ] `retire` 在 `new/` 或 `going/` 有任何信件時 fail closed；清空後只更新 identity 為 retired、保留歷史，並使新投遞與預設 peers 排除該地址。
- [ ] 新訊息只在 atomic publish 完成後出現在 `new/`；檔名含 UTC 日期時間、流水號與 opaque id。
- [ ] 只有收件者可用 atomic move 依序 `new → going → done`；任何衝突、遺失或非法轉移都 fail closed，不能重複領取。
- [ ] 聚焦測試驗證地址隔離、身份文件內容與不覆寫、同儕掃描、檔名追蹤性、三段轉移、安全退出及不把 identity／訊息欄位當授權。

## Out of scope

- 中央身份目錄、跨主機探索、身份驗證服務或權限系統。
- 背景重試、過期回收、強制退出、通知、daemon、MCP 或 A2A。

## Stop rule

若目錄的 atomic move 無法在目標檔案系統上保證，停止並回報所缺的檔案系統條件；不得用 copy-and-delete 或背景鎖取代。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-29T13:38:30.441Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"agent-mailbox/tasks/TASK-MBX-0006-identity-and-mail-lifecycle.task.md","contentDigest":"sha256:922cc6059b1d1bd2744aa6c23ca5c50b58dd9cdb831ecada8b66dd463dc2fda8"} -->
