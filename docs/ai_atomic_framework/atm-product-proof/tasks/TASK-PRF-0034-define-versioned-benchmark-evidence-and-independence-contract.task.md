---
task_id: TASK-PRF-0034
title: Define versioned benchmark evidence and independence contract
status: done
owner: benchmark-contract-owner
priority: P0
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: ["實作前以 target ATM 接手本卡；共用契約由 0034 定義，未交付前可做 docs-first 設計。"]
  softRelations: ["TASK-PRF-0008", "TASK-PRF-0019"]
  changedPublicSeams: ["benchmark_v2_contract"]
  causalImpactEdges: ["benchmark_v2_contract_verified"]
  parallelFrontierInputs: ["sealed-protocol", "role-and-tool-readiness"]
  validatorReferences: ["test_prf_benchmark_v2_contract_1","test_prf_benchmark_v2_contract_2","test_prf_benchmark_v2_contract_3"]
  phaseOwner: benchmark-instrumentation
related_plan: atm-product-proof/atm-product-proof-plan.md
planning_repo: docs
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "schemas/evidence/external-benchmark-v2.schema.json"
  - "scripts/lib/external-benchmark/protocol-v2.ts"
  - "docs/benchmark/independence-contract.md"
  - "tests/cli/external-benchmark-v2-contract.test.ts"
deliverables:
  - "schemas/evidence/external-benchmark-v2.schema.json"
  - "scripts/lib/external-benchmark/protocol-v2.ts"
  - "docs/benchmark/independence-contract.md"
  - "tests/cli/external-benchmark-v2-contract.test.ts"
validators:
  - "node --strip-types tests/cli/external-benchmark-v2-contract.test.ts"
testContributions:
  - caseId: test_prf_benchmark_v2_contract_1
    semanticKey: benchmark_v2_contract_1
    coversAcceptance: [ACC-1]
    coversImpactEdges: ["benchmark_v2_contract_verified"]
    expectedRedPredicate: "同 key 換名、未知 label 當零、事後資料作為 pre-run 前置或 v1 靜默重寫均被拒絕。"
    responsibility: task-required
    contractEdge: benchmark_v2_contract
    resourceKey: benchmark_v2_contract
  - caseId: test_prf_benchmark_v2_contract_2
    semanticKey: benchmark_v2_contract_2
    coversAcceptance: [ACC-2]
    coversImpactEdges: ["benchmark_v2_contract_verified"]
    expectedRedPredicate: "同 key 換名、未知 label 當零、事後資料作為 pre-run 前置或 v1 靜默重寫均被拒絕。"
    responsibility: task-required
    contractEdge: benchmark_v2_contract
    resourceKey: benchmark_v2_contract
  - caseId: test_prf_benchmark_v2_contract_3
    semanticKey: benchmark_v2_contract_3
    coversAcceptance: [ACC-3]
    coversImpactEdges: ["benchmark_v2_contract_verified"]
    expectedRedPredicate: "同 key 換名、未知 label 當零、事後資料作為 pre-run 前置或 v1 靜默重寫均被拒絕。"
    responsibility: task-required
    contractEdge: benchmark_v2_contract
    resourceKey: benchmark_v2_contract
requiredTestCaseIds: ["test_prf_benchmark_v2_contract_1","test_prf_benchmark_v2_contract_2","test_prf_benchmark_v2_contract_3"]
tddMode: required
methodProfiles: [expand-contract]
evidence:
  required: command-backed-bound-case-red-green
rollback:
  strategy: revert-commit-preserve-raw-evidence
  notes: "只回滾本卡程式/公開摘要，原始試驗不可刪改；暫存環境依 owner receipt 清理。"
atomizationImpact:
  ownerAtomOrMap: atm.external-proof-map
  mapUpdates: []
  extractionCandidates:
    - atom: atm.benchmark-v2-contract
      pattern: Policy Object
      source: schemas/evidence/external-benchmark-v2.schema.json
      disposition: follow-up-card
      inlineReason: null
errorCodes: []
createdByCommand: atm plan card create
completed_at: "2026-09-13T05:20:08.761Z"
completed_by_agent: "codex-benchmark-contract"
closedAt: "2026-09-13T05:20:08.761Z"
closedByActor: "codex-benchmark-contract"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-13T05-20-08-761Z-close-d4b52282185e"
lastTransitionAt: "2026-09-13T05:20:08.761Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "da2598dc97519437d645280a1f0e6cb5560e978f"
---

# TASK-PRF-0034 Define versioned benchmark evidence and independence contract

## Intent

版本化既有 v1，定義 operation labels、paired runs、成本來源、證據等級與隔離威脅模型。所有新工程共享此契約。

完整上下文：[隔離 AI benchmark 計畫](../isolated-ai-benchmark-plan.md)。沿用已批准 PRF family；本卡 owner 為角色，不代表已派出或具有外部獨立性。

## Acceptance

- [ ] ACC-1: v1 封存與 digest 不變；v2 可解析，拒絕未支援版本及缺失必要欄位。
- [ ] ACC-2: 操作真值、分母 eligibility、群聚 pair、completion、人工與帳務欄位可表達；unknown 不轉零。
- [ ] ACC-3: 同控制者不同 key 不升級 external；明確分離 pre-run corpus 與 post-run adjudication/telemetry gates。

## 執行與驗證

1. 閱讀母計畫及本卡，以自己的 actor identity 在 target 執行 next --prompt，遵循返回 playbook；不可接任其他歷史卡來代替本卡。
2. 確認依賴的具體產物與角色 readiness。共享 index/公用 schema 才進 broker；不得因不相干卡阻擋只讀或 planning。
3. 建立 tests/cli/external-benchmark-v2-contract.test.ts 並實作三個 case IDs；有意義的同一 case red/green 才可當 TDD，禁止字串存在測試替代行為。
4. 執行 validators 並以 ATM evidence 收錄；validator 尚未實作不是 PASS。無真實執行、零 case 或缺 artifact 不得 close。
5. 報告模型/provider/reasoning、operator/controller、來源版本、case results、raw digests、不可用欄位、總耗時與下一步。

## 負控制與停止規則

同 key 換名、未知 label 當零、事後資料作為 pre-run 前置或 v1 靜默重寫均被拒絕。

遇到缺環境、oracle 洩漏、未設定付費上限或版本不符，保存 readiness/失敗原因，不造數字、不更改 verdict 門檻。
不得讀其他 arm session 或正式 hidden labels。所有大型輸出在 Git 外保存；公開摘要不含密鑰或敏感 raw export。

## 範圍與回滾

只改 scopePaths；新檔案需在本卡 validator 覆蓋。schema/公共 policy 變更先回 0034 契約。
若實際目標模組超過 600 行，先提出可替换 extraction 邊界與更新卡片，不能只延長大模組。
實驗 worktree 限外部測試專案的拋棄式單位，不建立 framework 開發分支；外部 PR 僅能送往明確批准的 fork。
不推送、不改舊卡狀態或刪除使用者變更作為本卡的隱含收尾。負結果保留並列入整體產品決策。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-13T00:19:51.858Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0034-define-versioned-benchmark-evidence-and-independence-contract.task.md","contentDigest":"sha256:86cd030c230b07ede011bc82eac0c5c92f5d47b8fc67a1f69113d7d219592551"} -->
