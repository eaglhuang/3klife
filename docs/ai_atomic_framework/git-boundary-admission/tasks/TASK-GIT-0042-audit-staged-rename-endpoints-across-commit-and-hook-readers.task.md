---
task_id: TASK-GIT-0042
title: Audit staged rename endpoints across commit and hook readers
status: planned
owner: unassigned
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: ["GIT-0039, GIT-0040 and GIT-0041 are read-only baselines; do not reopen them"]
  softRelations: ["TASK-GIT-0033", "TASK-GIT-0034", "TASK-GIT-0036"]
  changedPublicSeams: ["staged-rename-endpoint-contract"]
  causalImpactEdges: ["git-rename-scope", "git-hook-commit-parity", "git-content-scan-safety"]
  parallelFrontierInputs: ["disposable-git-fixture", "reader-inventory"]
  validatorReferences: ["test_git_0042_acc1", "test_git_0042_acc2", "test_git_0042_acc3"]
  phaseOwner: "git-boundary-admission"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/git-governance/implementation/git-index-transaction.ts
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/cli/src/commands/hook/pre-commit/input-state.ts
  - packages/cli/src/commands/hook/context-map-advisor.ts
  - packages/cli/src/commands/hook/pre-commit/residue-candidates.ts
  - packages/cli/src/commands/tasks/claim-intent.ts
  - tests/cli/git-rename-endpoint-parity.test.ts
  - docs/reports/atm-git-rename-endpoint-audit.md
deliverables:
  - tests/cli/git-rename-endpoint-parity.test.ts
  - docs/reports/atm-git-rename-endpoint-audit.md
validators:
  - node --strip-types tests/cli/git-rename-endpoint-parity.test.ts
  - git diff --check
errorCodes: []
tddMode: required
methodProfiles: [tdd-oracle-fidelity]
requiredTestCaseIds: ["test_git_0042_acc1", "test_git_0042_acc2", "test_git_0042_acc3"]
phaseTestCaseIds: ["test_git_0042_phase_frozen_runner"]
advisoryTestCaseIds: ["test_git_0042_advisory_latency"]
testContributions:
  - caseId: test_git_0042_acc1
    semanticKey: git_0042_rename_endpoint_inventory
    coversAcceptance: [ACC-1]
    coversImpactEdges: [git-rename-scope]
    expectedRedPredicate: "同一 rename fixture 的 name-only、name-status、raw/index reader 差異會被明確列出；缺 endpoint 不得被當成完整 rename。"
    responsibility: task-required
    contractEdge: git_0042_delivery
    command: "node --strip-types tests/cli/git-rename-endpoint-parity.test.ts"
  - caseId: test_git_0042_acc2
    semanticKey: git_0042_commit_hook_parity
    coversAcceptance: [ACC-2]
    coversImpactEdges: [git-hook-commit-parity]
    expectedRedPredicate: "純 rename、rename+modify、cross-scope rename、foreign deletion 在 commit 與 hook reader 的端點語義必須可比較；故意隱藏舊路徑時 oracle 必須失敗。"
    responsibility: task-required
    contractEdge: git_0042_delivery
    command: "node --strip-types tests/cli/git-rename-endpoint-parity.test.ts"
  - caseId: test_git_0042_acc3
    semanticKey: git_0042_missing_path_safety
    coversAcceptance: [ACC-3]
    coversImpactEdges: [git-content-scan-safety]
    expectedRedPredicate: "刪除端點不存在於工作樹時，內容掃描與 digest 路徑不得把整個變更吞成空集合或未分類成功。"
    responsibility: task-required
    contractEdge: git_0042_delivery
    command: "node --strip-types tests/cli/git-rename-endpoint-parity.test.ts"
  - caseId: test_git_0042_phase_frozen_runner
    semanticKey: git_0042_frozen_runner
    coversAcceptance: [ACC-1, ACC-2]
    coversImpactEdges: [git-rename-scope, git-hook-commit-parity]
    expectedRedPredicate: "正式 frozen runner 的受影響入口與 source fixture 對同一 rename matrix 一致。"
    responsibility: phase-suite
    contractEdge: git_0042_delivery
    command: "node atm.mjs doctor --json"
  - caseId: test_git_0042_advisory_latency
    semanticKey: git_0042_latency
    coversAcceptance: []
    coversImpactEdges: [git-rename-scope]
    expectedRedPredicate: "記錄各 reader p50/p95、Git 子程序數與總耗時；未測量就標 unknown。"
    responsibility: advisory
    contractEdge: git_0042_delivery
    command: "node atm.mjs next --json"
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
      disposition: follow-up-card
      inlineReason: "本卡只建立 rename endpoint oracle；若需統一 reader，另開最小修復卡，不在盤點卡抽象。"
createdByCommand: atm plan card create
---

# TASK-GIT-0042 Audit staged rename endpoints across commit and hook readers

## Intent

修補前先回答一個可重現的產品問題：Git 對 rename 同時有舊路徑與新路徑，
但 ATM 各 reader 可能只用 `--name-only` 取得新路徑。這會讓 scope、ownership、
commit attribution、hook 與內容掃描對同一個變更看到不同集合，形成「測試綠、
實際漏交付」的 false-close。本卡只盤點並建立共同 oracle，不直接重構、
不新增 gate；若 oracle 找到缺口，另開一張最小修復卡。

Planning authority: `C:/Users/User/3KLife`; target/closure authority:
`C:/Users/User/AI-Atomic-Framework`. 來源卡只存在 planning repo；實作者不得
修改 planning repo。

## Acceptance

- [ ] ACC-1：以 disposable Git fixture 產生 deletion-only、pure rename、rename+modify、foreign deletion、cross-scope rename，列出每個 reader 的實際輸出及是否包含 old/new endpoint。
- [ ] ACC-2：同一 fixture 的 commit bundle、pre-commit input、ownership/attribution、context-map advisor、residue/claim readers 必須有可比較的 endpoint 語義；發現不一致時明確列為 follow-up，不以文件宣稱已修好。
- [ ] ACC-3：刪除端點不存在於工作樹時，內容掃描與 digest 路徑不得把整個變更吞成空集合或未分類成功；測試需有負控制。

## Execution limits

先讀 GIT-0033～0041 的既有測試與目前 active claim，記錄 baseline SHA。
只用 disposable fixture 和 read-only reader calls；不得 claim、close、build、
改 frozen dist、直接改 hook 或碰其他代理 WIP。最多兩輪測試調整；若需要
統一 parser、改 public contract 或新增 ErrorCode，立即停手回報並另開卡。

本卡只交付 oracle test 與 audit report；任何 production 修復須另開
follow-up card，避免把盤點與修復混成大卡。

保留每個 reader 的 p50/p95、Git 子程序數與總耗時；unknown 就寫 unknown。
禁止把單次通過、檔案數或新增 evidence 檔當作產品改善。

## Required follow-up decision

Audit report 必須輸出 `keep / fix-in-place / defer` 三選一及理由：

1. 若所有 reader 的 endpoint contract 已一致，標記 keep，不新增抽象。
2. 若只有一至兩個 reader 漏 endpoint，開一張最小 fix card，沿用既有模組。
3. 若需要跨模組新介面或 splitting，標記 defer，先取得 deep-module review，不得在本卡實作。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-23T01:35:07.012Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0042-audit-staged-rename-endpoints-across-commit-and-hook-readers.task.md","contentDigest":"sha256:0788b0399009af44a3cef1d9f2f0d20a8749dd5a99062d805501cde2783f7747"} -->
