---
task_id: TASK-PRF-0054
title: Enforce public npm core-workflow post-publish gate
status: planned
owner: release-runtime-steward
priority: P1
depends_on: [TASK-PRF-0053]
causalGraph:
  causalDependencies: [TASK-PRF-0053]
  startConditions:
    - "The public validator now has a complete core-workflow matrix, but the release workflow does not yet make that registry check an explicit post-publish gate."
    - "The gate must remain fail-closed while the currently published package is incomplete; this card does not authorize npm publish, token changes, or GitHub pushes."
  softRelations: [TASK-PRF-0051, TASK-PRF-0052]
  changedPublicSeams: [release_post_publish_public_registry_gate, release_provenance_receipt]
  causalImpactEdges: [public_install_complete, release_provenance]
  parallelFrontierInputs: [release-version, public-registry-receipt, trusted-publisher]
  validatorReferences: [test_prf_release_public_registry_gate_contract, test_prf_release_public_registry_negative_receipt, test_prf_release_public_registry_provenance]
  phaseOwner: release
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - .github/workflows/release-npm.yml
  - tests/cli/release-public-registry-gate.test.ts
  - docs/reports/atm-public-npm-install-proof.md
  - docs/reports/atm-public-npm-install-proof-beta.md
  - docs/reports/atm-product-proof-checkpoints.md
deliverables:
  - .github/workflows/release-npm.yml
  - tests/cli/release-public-registry-gate.test.ts
  - post-publish receipt artifact bound to exact release version, registry metadata, tarball digest, and full core-workflow matrix
  - append-only report update describing the gate and any blocked result
validators:
  - npm run typecheck
  - npm run lint
  - node --strip-types tests/cli/release-public-registry-gate.test.ts
  - node --strip-types scripts/validate-release-trust.ts
  - npm run validate:public-npm-install -- --package @ai-atomic-framework/cli --version 0.1.0 --require-default-tag --record-blocked --measurement-runs 1
testContributions:
  - caseId: test_prf_release_public_registry_gate_contract
    semanticKey: release_public_registry_gate_contract
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [public_install_complete]
    expectedRedPredicate: "A release can report success without invoking the public registry validator against the exact tagged version and requiring the full core-workflow matrix."
    responsibility: task-required
    contractEdge: release_post_publish_public_registry_gate
    resourceKey: release-workflow
  - caseId: test_prf_release_public_registry_negative_receipt
    semanticKey: release_public_registry_negative_receipt
    coversAcceptance: [ACC-3, ACC-4]
    coversImpactEdges: [public_install_complete, release_provenance]
    expectedRedPredicate: "A blocked or incomplete registry result is relabeled as release success, or the gate is allowed to run in a dry-run without a public publish."
    responsibility: task-required
    contractEdge: release_post_publish_public_registry_gate
    resourceKey: blocked-registry-receipt
  - caseId: test_prf_release_public_registry_provenance
    semanticKey: release_public_registry_provenance
    coversAcceptance: [ACC-4, ACC-5, ACC-6]
    coversImpactEdges: [release_provenance]
    expectedRedPredicate: "The post-publish receipt lacks the exact version, registry digest, workflow identity, or durable artifact retention."
    responsibility: task-required
    contractEdge: release_provenance_receipt
    resourceKey: release-receipt-artifact
requiredTestCaseIds: [test_prf_release_public_registry_gate_contract, test_prf_release_public_registry_negative_receipt, test_prf_release_public_registry_provenance]
phaseTestCaseIds: []
advisoryTestCaseIds: []
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: post-publish-public-registry-clean-install-receipt-with-exact-version-and-provenance
rollback:
  strategy: revert-commit-preserve-public-receipt
  notes: "只回滾本卡 workflow、focused contract test 與報告更新；保留已產生的 blocked/verified registry receipt 與外部 artifact，不刪除歷史證據。"
atomizationImpact:
  ownerAtomOrMap: atm.public-runtime-closure
  mapUpdates: []
  extractionCandidates:
    - atom: atm.release-public-registry-gate
      pattern: Policy Object
      source: .github/workflows/release-npm.yml
      disposition: follow-up-card
      inlineReason: "先把發布後的 registry 驗證與 provenance 綁定在 workflow；若未來多個發布面共享相同判定，再另卡抽成 deep module。"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0054 Enforce public npm core-workflow post-publish gate

## Intent

0053 修復了 public-install validator 的「只跑 version 就假綠」問題，
但若 release workflow 沒有在真正 publish 後強制呼叫該 validator，發布仍可能
把「可下載」誤當成「產品交付完整」。本卡把發布流程的最後一公里補成不可繞過
的 fail-closed gate：只有精確的 release version 已從 registry 重新安裝，並在
乾淨 consumer 完成完整核心矩陣，release 才能成功。

第一性原理邊界：發布前 candidate 驗證回答「我們準備發布的檔案是否正確」；
發布後 registry 驗證回答「市場實際拿到的檔案是否仍然正確」。兩者不能互相
替代，也不能用 mutable `latest`、版本頁面或單一 `--version` 輸出代替完整
工作流。當 registry 套件缺 schema、命令失敗、receipt 不完整或 gate 沒有可追溯
的 artifact 時，workflow 必須失敗並保留 blocked/inconclusive 證據。

本卡只修改 release workflow、focused contract test 與 append-only 報告；不修改
bundler、不重開 0049/0050、不處理 npm token/2FA 設定，也不執行 publish 或 push。

## Acceptance

- [ ] ACC-1: 真正 publish 成功後，release workflow 以 tag 解析出的精確版本呼叫
      `validate:public-npm-install`，並要求 default tag 與完整核心矩陣；validator
      非零退出時 workflow fail closed。命令不可改用 mutable `latest`，也不可只跑
      `--version`/`doctor`。
- [ ] ACC-2: post-publish gate 明確位於 publish 後，並把 requested version、registry
      metadata、tarball integrity/SHA-256、unpacked bytes、entry count、Node/npm
      版本與逐項 exit code 留在可下載的 workflow artifact 或等價外部 receipt。
- [ ] ACC-3: workflow_dispatch / dry-run 路徑不得宣稱 public registry proof；沒有
      真正 publish 時，gate 必須跳過或明確標記未執行，而非以 `--record-blocked`
      把 blocked 結果當成功。
- [ ] ACC-4: focused contract test 對 workflow source 的命令、順序、條件與
      fail-closed 行為提供可重跑的負向測試；既有 incomplete `0.1.0` 的結果可
      保留為 blocked 證據，不得覆寫成 verified。
- [ ] ACC-5: 本卡不記錄任何 token 內容、不改 npm/2FA 政策、不繞過 trusted
      publisher；typecheck、lint、release-trust 與 focused test 全部通過。
- [ ] ACC-6: rollback 可只回滾本卡 workflow/test/report 變更，同時保留已產生的
      registry receipt 與 artifact，且不刪除外部 raw evidence。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-14T02:15:27.919Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0054-enforce-public-npm-core-workflow-post-publish-gate.task.md","contentDigest":"sha256:3506b6731a125c14dc0deb1718bc88f2fcc8b4871f7c4c574fad1a5f767bba13"} -->
