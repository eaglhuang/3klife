---
task_id: TASK-ERR-0007
title: Register planning-root ambiguity operator contract and recovery
status: planned
owner: atm-error-governance
priority: P0
depends_on: [ATM-GOV-0325]
causalGraph:
  causalDependencies: [ATM-GOV-0325]
  startConditions:
    - The ambiguity trigger is reproduced with the sealed 23-worktree manifest.
    - Existing prefix-documented source behavior is preserved until exact registration is green.
  softRelations: [ATM-GOV-0327, TASK-TMP-0008]
  changedPublicSeams: [ATM_PLANNING_ROOT_AMBIGUOUS]
  causalImpactEdges: [error-registry, generated-error-docs, cli-emitter, recovery-contract]
  parallelFrontierInputs: [error-registry, source-emitter, reproduction]
  validatorReferences: [generate-error-codes, validate-error-codes, planning-root-preference]
  phaseOwner: correction-wave-2-error-contract
related_plan: error-governance/error-governance-plan.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/cli/src/commands/next/planning-root-preference.ts
  - packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
deliverables:
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
validators:
  - npm run generate:error-codes
  - node --strip-types packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts
  - npm run validate:cli
testContributions:
  - caseId: test_planning_root_ambiguous_error_contract_0007
    semanticKey: planning_root_ambiguous_error_contract
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [error-registry, generated-error-docs, cli-emitter, recovery-contract]
    expectedRedPredicate: ambiguity must emit the exact structured code and one safe non-destructive recovery route
    responsibility: task-required
    contractEdge: ATM_PLANNING_ROOT_AMBIGUOUS
requiredTestCaseIds: [test_planning_root_ambiguous_error_contract_0007]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: revert-exact-entry-and-regenerate-docs-while-retaining-prefix-compatibility
atomizationImpact:
  ownerAtomOrMap: atm.error-code-registry
  mapUpdates: []
  extractionCandidates: []
errorCodes:
  - code: ATM_PLANNING_ROOT_AMBIGUOUS
    disposition: register
    category: planning
    trigger: More than one plausible sibling planning root exists and no explicit or canonical root resolves selection.
    retryable: true
    requiresHumanApproval: false
    recovery: Supply an explicit planning root for non-destructive work; inspect and preserve ambiguous roots before any owner-approved cleanup.
    sourceOwner: packages/cli/src/commands/next/planning-root-preference.ts
    registryOwnerTask: TASK-ERR-0007
    tests: [packages/cli/src/commands/next/__tests__/planning-root-preference.test.ts]
createdByCommand: atm plan card create
---

# TASK-ERR-0007 Register planning-root ambiguity operator contract and recovery

## Intent

把現有 prefix-documented `ATM_PLANNING_ROOT_AMBIGUOUS` 補成 canonical exact registry contract，統一 meaning、retryability、approval 與 recovery。此卡不刪 planning roots，也不改成遇到歧義時猜一個路徑。

## Acceptance

- [ ] ACC-1: exact registry entry 的 trigger 與 emitter 一致；正常 explicit root、單一 canonical root、真正 ambiguity 三類 fixture 分流正確。
- [ ] ACC-2: 錯誤輸出包含候選 roots、source availability 與安全下一步；不得自動 cleanup 或靜默選第一個目錄。
- [ ] ACC-3: registry 更新後執行 generator，`docs/ERROR_CODES.md` 只由 generator 產生且與 registry 一致。
- [ ] ACC-4: 0327 與 TMP-0008 引用同一 exact contract；缺 approval 時 recovery 只允許明確 planning root 與唯讀稽核。

## Stop rules and report

single registry 是 shared-write surface，由本卡唯一擁有；其他卡不得同時改 registry。先以相同 case ID 封存 red，再更新 registry/emitter/tests/generator。報告列 resolver output contract、red/green digests、生成 diff、compatibility、consumer refs 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:24:56.852Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"error-governance/tasks/TASK-ERR-0007-register-planning-root-ambiguity-operator-contract-and-recovery.task.md","contentDigest":"sha256:acf2adf31a6c331afcf97af479e22b6312e31fb8f51c9552317db1ce2ba580f6"} -->
