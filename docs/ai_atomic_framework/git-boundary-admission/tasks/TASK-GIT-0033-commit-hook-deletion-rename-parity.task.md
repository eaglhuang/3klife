---
task_id: TASK-GIT-0033
title: Commit hook deletion rename parity
status: done
owner: unassigned
priority: P0
depends_on: []
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
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/cross-task-admission.ts
  - packages/cli/src/commands/hook/git-index-diagnostics.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
deliverables:
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/pre-commit/cross-task-admission.ts
  - packages/cli/src/commands/hook/git-index-diagnostics.ts
  - tests/cli/git-commit-task-scoped-staging.test.ts
  - tests/cli/commit-attribution-sealed-transaction.test.ts
validators:
  - node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts
  - node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0033_acc1","test_git_0033_acc2","test_git_0033_acc3"]
phaseTestCaseIds: []
advisoryTestCaseIds: []
testContributions:
  - caseId: test_git_0033_acc1
    semanticKey: git_0033_acc1
    coversAcceptance: [ACC-1]
    coversImpactEdges: []
    expectedRedPredicate: "正式 CLI 在 deletion-only、修改加刪除、純 rename、rename 加修改皆提交預期 tree；hook 看見相同變更語義。"
    responsibility: task-required
    contractEdge: git_0033_delivery
    command: "node --strip-types tests/cli/git-commit-task-scoped-staging.test.ts"
  - caseId: test_git_0033_acc2
    semanticKey: git_0033_acc2
    coversAcceptance: [ACC-2]
    coversImpactEdges: []
    expectedRedPredicate: "跨 scope rename 任一端及 foreign deletion 均受到原有 ownership 防護；合法不相交變更可並行。"
    responsibility: task-required
    contractEdge: git_0033_delivery
    command: "node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts"
  - caseId: test_git_0033_acc3
    semanticKey: git_0033_acc3
    coversAcceptance: [ACC-3]
    coversImpactEdges: []
    expectedRedPredicate: "內容掃描跳過不存在的檔案；不得對所有 ACMRT 盲目加 D。移除 D 的負控制必須令入口測試失敗。"
    responsibility: task-required
    contractEdge: git_0033_delivery
    command: "node --strip-types tests/cli/commit-attribution-sealed-transaction.test.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.cli-command-router-map
  mapUpdates: []
  newScriptsAllowed: false
  extractionCandidates:
    - source: packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
      disposition: inline
      inlineReason: Owner requires bounded quickfix and complexity reduction; reuse existing boundaries and do not extract solely for line-count compliance.
createdByCommand: atm plan card create
completed_at: "2026-09-22T14:54:53.448Z"
completed_by_agent: "codex-captain"
closedAt: "2026-09-22T14:54:53.448Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-22T14-54-53-448Z-close-29385a481bb5"
lastTransitionAt: "2026-09-22T14:54:53.448Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "9dc70d9e390643e10c07a9268738a0231a8c6ca2"
---

# TASK-GIT-0033 Commit hook deletion rename parity

## Intent

修完整 commit 與 pre-commit 的變更集合，保留 rename 舊路徑與新路徑的 scope 意義。承接 GIT-0030；d1b1ab7 已修單一路徑的 D，不能把這一行當全鏈通過。

系列：GIT，既有 Git 交付與發布邊界的最接近系列。詳細共同方法見母計畫 G18；本卡只實作以下範圍。

## Acceptance

- [ ] ACC-1: 正式 CLI 在 deletion-only、修改加刪除、純 rename、rename 加修改皆提交預期 tree；hook 看見相同變更語義。
- [ ] ACC-2: 跨 scope rename 任一端及 foreign deletion 均受到原有 ownership 防護；合法不相交變更可並行。
- [ ] ACC-3: 內容掃描跳過不存在的檔案；不得對所有 ACMRT 盲目加 D。移除 D 的負控制必須令入口測試失敗。

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

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-22T14:23:11.539Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0033-commit-hook-deletion-rename-parity.task.md","contentDigest":"sha256:a5876005645cf66a9bfa3346a9a2ac9944ba2f2749ab70eed1332f0c01722fd0"} -->
