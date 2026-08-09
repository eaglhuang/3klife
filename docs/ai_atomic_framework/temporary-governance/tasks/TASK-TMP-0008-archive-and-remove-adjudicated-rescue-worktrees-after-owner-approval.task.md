---
task_id: TASK-TMP-0008
title: Archive and remove adjudicated rescue worktrees after owner approval
status: planned
owner: atm-recovery
priority: P0
depends_on: [ATM-GOV-0327, TASK-ERR-0007]
causalGraph:
  causalDependencies: [ATM-GOV-0327, TASK-ERR-0007]
  startConditions:
    - ATM-GOV-0327 reports 23/23 audit rows with immutable archive digests.
    - The project owner has separately approved the exact cleanup paths after reviewing the audit.
    - No rescue worktree contains unique unarchived commits or active process handles.
  softRelations: [ATM-GOV-0325, ATM-GOV-0339]
  changedPublicSeams: [atm.rescueCleanupReceipt.v1]
  causalImpactEdges: [archive-preservation, path-bounded-removal, planning-root-recovery]
  parallelFrontierInputs: [rescue-audit, owner-approval, worktree-registry]
  validatorReferences: [validate-charter, planning-root-preference]
  phaseOwner: correction-wave-2-cleanup
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - C:/Users/User/ATM-rescue-0287
  - C:/Users/User/ATM-rescue-0288
  - C:/Users/User/ATM-rescue-0289
  - C:/Users/User/ATM-rescue-0290
  - C:/Users/User/ATM-rescue-0291
  - C:/Users/User/ATM-rescue-0296
  - C:/Users/User/ATM-rescue-0297
  - C:/Users/User/ATM-rescue-0298
  - C:/Users/User/ATM-rescue-0299
  - C:/Users/User/ATM-rescue-0300
  - C:/Users/User/ATM-rescue-0302
  - C:/Users/User/ATM-rescue-0303
  - C:/Users/User/ATM-rescue-0305
  - C:/Users/User/ATM-rescue-0307
  - C:/Users/User/ATM-rescue-0312
  - C:/Users/User/ATM-rescue-0313
  - C:/Users/User/ATM-rescue-0314
  - C:/Users/User/ATM-rescue-0318
  - C:/Users/User/ATM-rescue-0319
  - C:/Users/User/ATM-rescue-0320
  - C:/Users/User/ATM-rescue-0321
  - C:/Users/User/ATM-rescue-0322
  - C:/Users/User/ATM-rescue-SKL0037
deliverables:
  - docs/reports/rescue-worktree-cleanup-receipt.json
validators:
  - node atm.mjs next --prompt "verify planning root after approved rescue cleanup" --json
  - node --strip-types scripts/validate-charter.ts --mode validate
testContributions:
  - caseId: test_rescue_cleanup_preconditions_and_poststate_0008
    semanticKey: rescue_cleanup_preconditions_and_poststate
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [archive-preservation, path-bounded-removal, planning-root-recovery]
    expectedRedPredicate: missing owner approval archive digest unique commit path mismatch or remaining ambiguity blocks cleanup
    responsibility: task-required
    contractEdge: atm.rescueCleanupReceipt.v1
requiredTestCaseIds: [test_rescue_cleanup_preconditions_and_poststate_0008]
tddMode: reasoned-not-applicable
tddNotApplicableReason: This is a destructive recovery operation governed by precondition and post-state receipts rather than runtime behavior TDD.
tddExemptions: []
methodProfiles: []
evidence:
  required: owner-approved-path-bounded-command-backed
rollback:
  strategy: recover-from-archived-heads-and-do-not-delete-unreachable-objects-before-retention-window
atomizationImpact:
  ownerAtomOrMap: atm.rescue-governance
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - code: ATM_PLANNING_ROOT_AMBIGUOUS
    disposition: reuse
    category: planning
    trigger: Rescue sibling roots remain visible to planning-root discovery.
    retryable: true
    requiresHumanApproval: true
    recovery: Review ATM-GOV-0327 archive and approve exact TASK-TMP-0008 paths before cleanup.
    sourceOwner: packages/cli/src/commands/next/planning-root-preference.ts
    registryOwnerTask: TASK-ERR-0007
    tests: [packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts]
createdByCommand: atm plan card create
---

# TASK-TMP-0008 Archive and remove adjudicated rescue worktrees after owner approval

## Intent

這張卡是一次性 cleanup carrier，不是一般開發卡。它只在完整稽核、archive、unique-commit 檢查與 owner 對精確 23 路徑另行核准後，移除已裁決 worktrees 並恢復 planning-root 確定性。目前「卡片存在」不等於「已核准執行」。

## Acceptance

- [ ] ACC-1: 逐路徑驗證 resolved absolute path 精確位於 `C:/Users/User/ATM-rescue-*` 清單；禁止 glob、workspace root、junction traversal 或遞迴擴張。
- [ ] ACC-2: 保存 before registry、HEAD、commit reachability、unique commits、write history、archive digest 與 owner approval；任何缺失立即停止。
- [ ] ACC-3: 只使用 ATM playbook/合法 Git worktree route；先逐一 remove，再做受限 prune，不能用廣域 filesystem delete。
- [ ] ACC-4: after registry 不含 23 entries、其他 worktrees 不變、真正 node_modules/junction targets 完好、prompt-scoped next 不再回 ambiguity；產生可復原 cleanup receipt。

## Hard stop and report

未取得本卡執行階段的 owner 明確批准、發現 unique unarchived commit、active handle、path resolution mismatch 或 foreign change時不得動任何路徑。報告必列 owner approval ref、23-path before/after、archive digests、removed/pruned commands、remaining worktrees、recoverability 與不可逆部分。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:23:18.108Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0008-archive-and-remove-adjudicated-rescue-worktrees-after-owner-approval.task.md","contentDigest":"sha256:17215a62a7b57df2e8769b0627cff8cbea7871166c745704cb6977166ef69c78"} -->
