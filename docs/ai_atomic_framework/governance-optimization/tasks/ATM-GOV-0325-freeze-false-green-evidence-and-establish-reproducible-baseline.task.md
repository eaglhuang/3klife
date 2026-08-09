---
task_id: ATM-GOV-0325
title: Freeze false-green evidence and establish reproducible baseline
status: done
owner: atm-evidence
priority: P0
depends_on: []
causalGraph:
  startConditions:
    - The planning runbook verdict remains NOT COMPLETE.
    - No rescue worktree, audit shard, historical receipt, or shadow certificate has been deleted.
  softRelations: [TASK-ERR-0007]
  changedPublicSeams: [atm.falseGreenEvidenceFreeze.v1]
  causalImpactEdges: [authority-baseline, validator-baseline, rescue-evidence-hold]
  parallelFrontierInputs: [planning-head, target-head, origin-head, worktree-registry, backlog-shards, audit-shards]
  validatorReferences: [validate-git-head-evidence, validate-charter, validate-test-facade, validate-module-boundaries]
  phaseOwner: correction-wave-0
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - scripts/diagnose-plan3-evidence-closure.ts
  - scripts/analyze-captain-parallel-ledger.ts
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
deliverables:
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.json
  - docs/reports/plan-3x-4x-false-green-evidence-freeze.md
validators:
  - node --strip-types scripts/validate-git-head-evidence.ts --mode validate
  - node --strip-types scripts/validate-charter.ts --mode validate
testContributions:
  - caseId: test_false_green_freeze_manifest_complete_0325
    semanticKey: false_green_freeze_manifest
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [authority-baseline, validator-baseline, rescue-evidence-hold]
    expectedRedPredicate: missing source, digest, window, watermark, unavailable receipt, or rescue HEAD fails the manifest
    responsibility: task-required
    contractEdge: atm.falseGreenEvidenceFreeze.v1
requiredTestCaseIds: [test_false_green_freeze_manifest_complete_0325]
tddMode: reasoned-not-applicable
tddNotApplicableReason: Evidence preservation card creates immutable census artifacts without changing runtime behavior.
tddExemptions:
  - kind: docs
    reason: Sealed reports are independently validated and do not count toward TDD success.
methodProfiles: []
evidence:
  required: command-backed
  schema: atm.falseGreenEvidenceFreeze.v1
rollback:
  strategy: discard-incomplete-snapshot-and-rerun
atomizationImpact:
  ownerAtomOrMap: atm.evidence-integrity
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-08-09T08:35:46.556Z"
completed_by_agent: "codex-captain-20260809"
closedAt: "2026-08-09T08:35:46.556Z"
closedByActor: "codex-captain-20260809"
closedByCommand: atm tasks close
lastTransitionId: "2026-08-09T08-35-46-556Z-close-826a636d5d66"
lastTransitionAt: "2026-08-09T08:35:46.556Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9e6f8cf41263dfe3fc289a2585ed18bb6e7f447b"
---

# ATM-GOV-0325 Freeze false-green evidence and establish reproducible baseline

## Dispatch objective

建立後續所有修正工作的不可變起點。這張卡只讀取與封存，不修 code、不改 ledger 狀態、不清 worktree，也不把聊天報告直接當證據。

## Required execution

1. 先依 `atm-dispatch` 清除舊 identity、設定自己的 actor，再執行 prompt-scoped `next`；若 playbook 未允許寫入，停在 dry-run proposal。
2. 記錄 planning/target/origin SHA、runner digest、時間窗、OS/process、worktree registry、tracked/untracked/staged buckets。
3. 建立 affected-card、commit-window、protected-override、emergency-lease、worktree、backlog 六份 census；每份含 command、source availability、window、watermark、count、sorted-ID digest、unknown/unavailable。
4. 封存 `51ab0b3fe`、`a548eb381`、`0d50ba508` lineage，將 hash-placeholder 功能紅與 timeout flake 分成兩列。
5. 對 `validate-skew-matrix` 只做事前宣告的 cold/warm/loaded 樣本；保存 duration、exit、timedOut、stdout/stderr digest。禁止用一次綠燈宣告穩定。
6. 對 23 個 rescue worktrees 建 evidence-hold manifest，逐一保存 path、HEAD、registry state；不得 prune/remove。

## Acceptance

- [ ] ACC-1: 所有 census 都具時間窗、分母、來源、digest 與 unavailable 欄位，可由相同輸入 byte-stable 重建。
- [ ] ACC-2: 23/23 rescue entries 皆在 manifest，且檔案明示 evidence hold。
- [ ] ACC-3: 三點 commit lineage 與 façade timing observations 分開記錄，`a548eb381` 被認列為真修復但整體仍 NOT COMPLETE。
- [ ] ACC-4: 沒有未經授權的產品／證據資料 mutation、cleanup、reset、rebase、merge 或 completion promotion；ATM 所需的 identity、claim、import、evidence 與受治理 commit control-plane 寫入必須最小化、可稽核且在報告中逐一列出。

## Stop rules, rollback, and report

任何 source 消失、digest 衝突、HEAD 改變或外部 actor 正在修改受驗資料時立即停止，將欄位標記 conflicting/unavailable，重新封存新 window。禁止把 ATM control-plane 寫入誤列為產品證據 mutation；若 control-plane 寫入改變 validator 結果，必須停下並把因果關係列為 blocker。報告必含 consumed summaries、missing data、assumption changes、stop rule、shared-write verdict、window/watermark/count/duration/digest、artifact paths 與 `keep-memory write`。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:28.523Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0325-freeze-false-green-evidence-and-establish-reproducible-baseline.task.md","contentDigest":"sha256:57e87ba33ef5f209b2524bdc925d6af622dab0c6c5446e568c0cd59e62a0af29"} -->
