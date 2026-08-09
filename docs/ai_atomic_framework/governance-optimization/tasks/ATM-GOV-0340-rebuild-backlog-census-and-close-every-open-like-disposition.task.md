---
task_id: ATM-GOV-0340
title: Rebuild backlog census and close every open-like disposition
status: planned
owner: atm-backlog-governance
priority: P0
depends_on: [ATM-GOV-0339]
causalGraph:
  causalDependencies: [ATM-GOV-0339]
  startConditions:
    - Hostile dogfood and saturation have produced terminal incident candidates.
    - Backlog item shards are available as the sole record authority.
  softRelations: [ATM-GOV-0341]
  changedPublicSeams: [atm.backlogCensus.v1]
  causalImpactEdges: [shard-authority, projection-parity, open-like-disposition, incident-learning]
  parallelFrontierInputs: [backlog-shards, projection, dogfood-incidents, correction-reports]
  validatorReferences: [validate-governance-projections, validate-backlog-census]
  phaseOwner: closeout-wave-9
related_plan: governance-optimization/plan-3x-4x-false-green-correction-complete-closeout-runbook-2026-08-09.md
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo_plus_planning_closeback
scopePaths:
  - docs/governance/atm-bug-and-optimization-backlog.items/
  - docs/governance/atm-bug-and-optimization-backlog.md
  - scripts/validate-governance-projections.ts
  - scripts/validate-backlog-census.ts
  - schemas/skills/incident-learning-candidate.schema.json
deliverables:
  - scripts/validate-backlog-census.ts
  - tests/cli/backlog-census-authority.test.ts
  - docs/reports/plan-3x-4x-backlog-disposition-census.json
  - docs/governance/atm-bug-and-optimization-backlog.md
validators:
  - node --strip-types tests/cli/backlog-census-authority.test.ts
  - node --strip-types scripts/validate-governance-projections.ts
  - node --strip-types scripts/validate-backlog-census.ts --mode validate
testContributions:
  - caseId: test_backlog_census_shard_authority_0340
    semanticKey: backlog_census_shard_authority
    coversAcceptance: [ACC-1, ACC-2, ACC-3]
    coversImpactEdges: [shard-authority, projection-parity, open-like-disposition]
    expectedRedPredicate: projection-only row count drift missing shard or unclassified status fails census
    responsibility: task-required
    contractEdge: atm.backlogCensus.v1
  - caseId: test_backlog_incident_learning_disposition_0340
    semanticKey: backlog_incident_learning_disposition
    coversAcceptance: [ACC-4, ACC-5]
    coversImpactEdges: [incident-learning, open-like-disposition]
    expectedRedPredicate: candidate-only fix claim deferred exception or missing generic family keeps open-like nonzero
    responsibility: task-required
    contractEdge: atm.backlogCensus.v1
requiredTestCaseIds: [test_backlog_census_shard_authority_0340, test_backlog_incident_learning_disposition_0340]
phaseTestCaseIds: [test_group_plan4_final_certification]
tddMode: required
tddNotApplicableReason: null
tddExemptions: []
methodProfiles: [tdd-oracle-fidelity]
evidence:
  required: command-backed
rollback:
  strategy: retain-item-shards-and-regenerate-projection-from-authority
atomizationImpact:
  ownerAtomOrMap: atm.backlog-projection
  mapUpdates: []
  extractionCandidates: []
errorCodes: []
createdByCommand: atm plan card create
---

# ATM-GOV-0340 Rebuild backlog census and close every open-like disposition

## Intent

直接從 item shards 重建 backlog census 與 Markdown projection，處置所有 open-like items。incident-learning candidate 只擴張測試壓力，不能充當修復或結案證據。

## Acceptance

- [ ] ACC-1: 解釋並消除 378/384、169/167 等歷史 count divergence；輸出 total/open-like/terminal/unclassified、histogram、sorted-open-like-ID digest。
- [ ] ACC-2: Markdown 由 shard 生成且 byte-consistent；禁止手改 projection 增列或改狀態。
- [ ] ACC-3: 每個 open-like item 只有三種 disposition：generic family+owning repair card+test+fresh evidence；durable duplicate/non-confirmed rationale；owner-approved deferred exception。
- [ ] ACC-4: 2026-08-09-001..005、2026-07-31-002..012、runner-sync protected-state、stale/mixed batch、warm latency、crash matrix 全有 terminal evidence。
- [ ] ACC-5: `unclassified=0` 且 `open-like=0` 才通過；任何 deferred exception 仍使整體 NOT COMPLETE。

## Dispatch and stop rules

依 `atm-bug-backlog` 寫 item shard後才重建 projection；不得把多個不同 root cause 合併成一筆「已處理」。shared projection 寫入走 broker。報告含新增/更新 item IDs、每種 disposition、count before/after、projection digest、unknowns、incident candidates 與 rollback。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-08-09T07:23:01.292Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0340-rebuild-backlog-census-and-close-every-open-like-disposition.task.md","contentDigest":"sha256:d0d46d3357ac1e8dd03b07666b4ead2dbfddaa07053998cb98f812231721ab99"} -->
