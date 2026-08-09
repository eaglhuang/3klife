---
task_id: ATM-GOV-0338
title: Prove six-editor adapter parity from sealed source
status: planned
owner: atm-integration-parity
priority: P0
depends_on: [ATM-GOV-0337]
causalGraph:
  causalDependencies: [ATM-GOV-0337]
  startConditions:
    - Shadow comparison has no escaped defect and its policy epoch is valid.
    - One sealed source template corpus and compiler version are available.
  softRelations: [ATM-GOV-0339]
  changedPublicSeams: [atm.integrationAdapterParity.v1]
  causalImpactEdges: [codex-adapter, claude-adapter, cursor-adapter, copilot-adapter, gemini-adapter, antigravity-adapter]
  parallelFrontierInputs: [sealed-template-corpus, integration-compiler, manifests]
  validatorReferences: [validate-integration-adapter, validate-skill-templates, validate-runner-entrypoints]
  phaseOwner: closeout-wave-8-adapters
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - templates/skills/
  - integrations/
  - .claude/skills/
  - .cursor/rules/skills/
  - .github/instructions/
  - .gemini/commands/
  - scripts/validate-integration-adapter.ts
deliverables:
  - docs/reports/plan4-six-editor-adapter-parity.json
  - tests/cli/six-editor-adapter-parity.test.ts
validators:
  - node --strip-types tests/cli/six-editor-adapter-parity.test.ts
  - npm run validate:integration-adapter
  - npm run validate:skill-templates
testContributions:
  - caseId: test_six_editor_sealed_source_parity_0338
    semanticKey: six_editor_sealed_source_parity
    coversAcceptance: [ACC-1, ACC-2, ACC-3, ACC-4]
    coversImpactEdges: [codex-adapter, claude-adapter, cursor-adapter, copilot-adapter, gemini-adapter, antigravity-adapter]
    expectedRedPredicate: direct-only installed copy edits source drift or missing frozen smoke fail parity
    responsibility: task-required
    contractEdge: atm.integrationAdapterParity.v1
requiredTestCaseIds: [test_six_editor_sealed_source_parity_0338]
phaseTestCaseIds: [test_group_plan4_adapter_parity]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [expand-contract, tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: reinstall-last-known-good-sealed-corpus-and-preserve-degradation-report
atomizationImpact:
  ownerAtomOrMap: atm.integration-projection
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0338 Prove six-editor adapter parity from sealed source

## Intent

從同一 sealed source template corpus 重新編譯、安裝與驗證 Codex、Claude Code、Cursor、Copilot、Gemini、Antigravity；installed copies 不是權威，provider 差異只能透過 compiler/degradation contract 表達。

## Acceptance

- [ ] ACC-1: 六 adapter 都保存 source digest、compiler version、manifest digest、install/verify command、exit、degradation diagnostics。
- [ ] ACC-2: 每個 adapter 各自執行 frozen-runner smoke；缺 early hook 的 adapter 必須明示 external write unsupported，不能以提示文字替代 admission gate。
- [ ] ACC-3: direct-only installed edit、manifest mismatch、missing command、provider-specific authority、stale projection 全部會紅。
- [ ] ACC-4: reinstall byte-stable；source template、projection、manifest 與 frozen runner 版本綁定，rollback 可重現。

## Stop rules and report

任何 skill 變更先改 source template，再由合法 integration command 投影；禁止 `--force` 洗掉不明 drift。報告為六列完整 parity matrix，列明 unsupported/degraded，不得用 overall green 遮蔽單 adapter。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:22:57.009Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0338-prove-six-editor-adapter-parity-from-sealed-source.task.md","contentDigest":"sha256:d3c9e2df3d2d5ef7eea31d2a0b35d5db4ab82730a9f2fa42cf7d429f6db7bd72"} -->
