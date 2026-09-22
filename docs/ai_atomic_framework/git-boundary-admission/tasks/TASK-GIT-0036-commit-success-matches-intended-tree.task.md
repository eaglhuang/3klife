---
task_id: TASK-GIT-0036
title: Commit success matches intended tree
status: done
owner: unassigned
priority: P0
depends_on: ["TASK-GIT-0033","TASK-GIT-0034","TASK-GIT-0035"]
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-framework-branch.ts
  - packages/cli/src/commands/git-governance/implementation/commit-task-scoped-branch.ts
  - packages/cli/src/commands/git-governance/implementation/record-commit-command.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/cli/governed-commit-surface-audit.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
  - packages/cli/src/commands/git-governance/implementation/commit-framework-branch.ts
  - packages/cli/src/commands/git-governance/implementation/commit-task-scoped-branch.ts
  - packages/cli/src/commands/git-governance/implementation/record-commit-command.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
  - tests/cli/governed-commit-surface-audit.test.ts
validators:
  - node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts
  - node --strip-types tests/cli/governed-commit-surface-audit.test.ts
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0036_acc1","test_git_0036_acc2","test_git_0036_acc3"]
phaseTestCaseIds: []
advisoryTestCaseIds: []
testContributions:
  - caseId: test_git_0036_acc1
    semanticKey: git_0036_acc1
    coversAcceptance: [ACC-1]
    coversImpactEdges: []
    expectedRedPredicate: "一般 task、framework quickfix、record-only 各正式入口涵蓋其合法變更；預期的新增修改刪除rename確實入 tree，無 foreign 路徑。"
    responsibility: task-required
    contractEdge: git_0036_delivery
    command: "node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts"
  - caseId: test_git_0036_acc2
    semanticKey: git_0036_acc2
    coversAcceptance: [ACC-2]
    coversImpactEdges: []
    expectedRedPredicate: "故意漏傳一個預期路徑、丟棄 tombstone 或替換 blob 時不能報完整成功；oracle 不使用待測 helper 產生預期值。"
    responsibility: task-required
    contractEdge: git_0036_delivery
    command: "node --strip-types tests/cli/governed-commit-surface-audit.test.ts"
  - caseId: test_git_0036_acc3
    semanticKey: git_0036_acc3
    coversAcceptance: [ACC-3]
    coversImpactEdges: []
    expectedRedPredicate: "部分 staged 保持 staged bytes 語義；允許的生成 evidence 單獨列明；先修 bundle discovery，再重用既有 postcondition，不新增平行 manifest。"
    responsibility: task-required
    contractEdge: git_0036_delivery
    command: "node --strip-types tests/cli/governed-commit-surface-audit.test.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates:
    - source: packages/cli/src/commands/git-governance/implementation/sealed-commit-attribution.ts
      disposition: inline
      inlineReason: Owner requires bounded quickfix and complexity reduction; reuse existing boundaries and do not extract solely for line-count compliance.
createdByCommand: atm plan card create
completed_at: "2026-09-22T15:19:03.870Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-22T15:19:03.870Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T15-19-03-870Z-close-cea1d9683d43"
lastTransitionAt: "2026-09-22T15:19:03.870Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "ad5dc3a5e79bf675bb3ff17e1461a4348381d848"
---

# TASK-GIT-0036 Commit success matches intended tree

## Intent

以使用者預期的變更對照實際 commit tree，關閉『成功建立 commit 但漏交付』缺口。沿用 sealed attribution 的既有 proof，不加新 gate。

系列：GIT，既有 Git 交付與發布邊界的最接近系列。詳細共同方法見母計畫 G18；本卡只實作以下範圍。

## Acceptance

- [ ] ACC-1: 一般 task、framework quickfix、record-only 各正式入口涵蓋其合法變更；預期的新增修改刪除rename確實入 tree，無 foreign 路徑。
- [ ] ACC-2: 故意漏傳一個預期路徑、丟棄 tombstone 或替換 blob 時不能報完整成功；oracle 不使用待測 helper 產生預期值。
- [ ] ACC-3: 部分 staged 保持 staged bytes 語義；允許的生成 evidence 單獨列明；先修 bundle discovery，再重用既有 postcondition，不新增平行 manifest。

## 執行方法與防偏移

1. 先確認現況、相鄰卡與既有測試，記錄 baseline SHA。已修功能不可重做；未重現不可猜測修補。
2. 在 tests 的 disposable Git fixture 寫行為斷言，先證明有效 red；新測試檔是本卡交付物，須先建立才能執行上述 validator。caseId 對應實際 assertion，不得以 exit 0/字串存在當交付正確。
3. 最小修補既有深模組邊界；保留多 AI 不相交並行、真衝突阻擋及 attribution。不得新增 CLI、審批、常駐服務、ledger、dashboard 或放寬現有 gate。
4. 對修改做負控制：故意還原問題行為，必須使相同 oracle 失敗；setup 錯誤不算 red。每項 ACC 對應上述 required case。
5. 記錄同機同 fixture ABAB 至少各 10 次的 p50/p95 毫秒、Git 子程序數、重試/build 次數、source 完成至提交分鐘數。CI 噪音或資料不足寫 unknown。正確性成本揭露，禁止偽稱加速；性能目標須有配對改善。
6. source focused tests 通過即整合；使用正式 frozen 產物重跑受影響入口才算交付。release 由既有 build lane 合併建置一次，不手改 dist，也不讓每卡自行重建整包。保留 caller 回傳的 process id，確認 exit code 後再決定重試。
7. 最多兩輪修正；越界或第三次候選前停止，回報最小重現和需調整假設。沒有 bug 可交付測試與檢查結果，但不得將未修程式計作 bug 修復。

## 範圍及交付限制

scopePaths 是允許的 source/test 清單；deliverables 為可能修改集合，實際 diff 只保留必要子集。新增 production 檔案、ErrorCode 或共享 registry 變更先明確調整卡片；現有錯誤傳遞優先，不在本卡設計新錯誤分類。實作開始前核對既有 active claim，從 target 的 next 取得正式路線，使用自己的 actor，不沿用 Captain 身份。規劃依序執行不是額外的全域串行鎖；depends_on 只表因果輸入。

## 回報與回滾

一份簡短回報列 baseline/candidate/commit、改動原因、ACC 案例及負控制、毫秒及成本、foreign WIP 保護、程式碼淨增減與刪除的重複邏輯。raw evidence 放 repo 外，不新增版本化 runtime logs。原則偏移是未通過：縮回 scope/移除新增機制後重驗，不能以補文件結案。回滾只 revert 本卡提交，循既有 lane 重建；禁止 reset/覆蓋他人 WIP。總結不得宣稱全 ATM 無 bug。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T14:24:00.360Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0036-commit-success-matches-intended-tree.task.md","contentDigest":"sha256:2ac44aa825c47846196fa6199c75f28e2502485afbb821731d3e543c46a79b5c"} -->
