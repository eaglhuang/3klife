---
task_id: ATM-GOV-0327
title: Audit governance bypasses and classify rescue worktree history
status: done
owner: atm-governance
priority: P0
depends_on: [ATM-GOV-0325, TASK-ERR-0007]
causalGraph:
  causalDependencies: [ATM-GOV-0325, TASK-ERR-0007]
  startConditions:
    - Evidence-hold manifest exists for every rescue worktree.
    - The exact planning-root ambiguity ErrorCode contract is registry-backed.
  softRelations: [TASK-TMP-0008]
  changedPublicSeams: [atm.governanceBypassDisposition.v1, atm.rescueWorktreeAudit.v1]
  causalImpactEdges: [override-audit, emergency-audit, rescue-write-classification, inv-atm-008, inv-atm-010]
  parallelFrontierInputs: [protected-override-shards, lease-receipts, git-log, worktree-registry]
  validatorReferences: [validate-framework-development-governance, validate-captain-dispatch-protocol, validate-charter]
  phaseOwner: correction-wave-2
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/analyze-captain-parallel-ledger.ts
  - scripts/captain-parallel-ledger-report.ts
  - packages/cli/src/commands/next/planning-root-preference.ts
  - packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
  - docs/reports/plan-3x-4x-governance-bypass-disposition.json
deliverables:
  - docs/reports/plan-3x-4x-governance-bypass-disposition.json
  - docs/reports/plan-3x-4x-rescue-worktree-audit.json
  - tests/cli/rescue-worktree-normal-write-classification.test.ts
validators:
  - node --strip-types tests/cli/rescue-worktree-normal-write-classification.test.ts
  - node --strip-types packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
  - node --strip-types scripts/validate-charter.ts --mode validate
testContributions:
  - caseId: test_rescue_worktree_inv010_classification_0327
    semanticKey: rescue_worktree_inv010_classification
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [override-audit, emergency-audit, rescue-write-classification, inv-atm-008, inv-atm-010]
    expectedRedPredicate: any unapproved normal contribution write from a detached rescue worktree remains a blocker
    responsibility: task-required
    contractEdge: atm.rescueWorktreeAudit.v1
requiredTestCaseIds: [test_rescue_worktree_inv010_classification_0327]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: retain-audit-events-and-return-to-queue-only
atomizationImpact:
  ownerAtomOrMap: atm.parallel-governance-audit
  mapUpdates: []
  extractionCandidates:
    - atom: atm.rescue-worktree-classifier
      pattern: Policy Object
      source: scripts/analyze-captain-parallel-ledger.ts
      disposition: extract
      inlineReason: null
errorCodes:
  - code: ATM_PLANNING_ROOT_AMBIGUOUS
    disposition: reuse
    category: planning
    trigger: More than one plausible sibling planning root exists and no canonical root is resolved.
    retryable: true
    requiresHumanApproval: false
    recovery: Use an explicit planning root for read-only authoring; preserve rescue evidence until TASK-TMP-0008 receives owner approval.
    sourceOwner: packages/cli/src/commands/next/planning-root-preference.ts
    registryOwnerTask: TASK-ERR-0007
    tests: [packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts]
createdByCommand: atm plan card create
completed_at: "2026-08-10T15:41:33.729Z"
completed_by_agent: "codex-gpt-5.4-mini"
closedAt: "2026-08-10T15:41:33.729Z"
closedByActor: "codex-gpt-5.4-mini"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-10T15-41-33-729Z-close-2bfcb5bdcae8"
lastTransitionAt: "2026-08-10T15:41:33.729Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "aa5c555b3c88ea920e360195048836d9e598ca30"
---

# ATM-GOV-0327 Audit governance bypasses and classify rescue worktree history

## Intent

把每一筆 `--no-verify`、protected override、emergency lease、repair closure、reset 與 rescue worktree 從聊天敘述轉成一對一、可驗證的 disposition。這張卡稽核並修 classifier，不執行 cleanup。

## Acceptance

- [ ] ACC-1: 每個 bypass row 具有 actor、command、time、task、files、HEAD before/after、approval、receipt、normal-route availability、result、disposition。
- [ ] ACC-2: `approvedBy: NONE`、missing receipt 或聊天授權一律不是批准；unknown 不得轉 pass。
- [ ] ACC-3: 精確 23/23 rescue paths 與 detached HEAD 都映射到用途、repair commit、write history；正常 contribution write 無具名例外時判 INV-ATM-010 violation。
- [ ] ACC-4: INV-ATM-008/010 各有 command-backed verdict；cleanup 保持在 TASK-TMP-0008 且尚未被本卡執行。

## Dispatch and stop rules

只讀歷史辨識可在 sealed historical worktree 進行，但不得寫入；所有正常修復留在 canonical main worktree 並走 broker/steward。發現需刪除、prune、reset 或覆蓋 foreign residue 時立即停止。報告需列出 23-row 表、unclassified count、violation count、approved exception count、ambiguous-root reproduction 與 evidence digests。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:33.088Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0327-audit-governance-bypasses-and-classify-rescue-worktree-history.task.md","contentDigest":"sha256:99079f0a770c6b368e17299cb220fdd18db8550a4675ca8cccc70bcfa1b51a67"} -->
