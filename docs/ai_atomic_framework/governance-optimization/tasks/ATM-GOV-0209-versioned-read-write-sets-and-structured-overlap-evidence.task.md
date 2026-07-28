---
task_id: ATM-GOV-0209
title: Versioned read write sets and structured overlap evidence
status: done
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0206
  - ATM-GOV-0207
  - ATM-GOV-0208
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan by preserving overlap facts that the current boolean matcher and prose diagnostics discard.
scopePaths:
  - packages/core/src/broker/conflict-matrix.ts
  - packages/core/src/broker/conflict-key-overlap.ts
  - packages/core/src/broker/candidate-bridge.ts
  - packages/core/src/broker/intent-enrichment.ts
  - packages/core/src/broker/resource-overlap.ts
  - packages/core/src/broker/types.ts
  - packages/cli/src/commands/next/claim-helpers.ts
  - schemas/governance/write-intent.schema.json
  - schemas/governance/patch-proposal.schema.json
  - schemas/governance/resource-overlap.schema.json
  - tests/core/broker-structured-overlap.test.ts
deliverables:
  - packages/core/src/broker/intent-enrichment.ts
  - packages/core/src/broker/resource-overlap.ts
  - schemas/governance/resource-overlap.schema.json
  - tests/core/broker-structured-overlap.test.ts
validators:
  - node --strip-types tests/core/broker-structured-overlap.test.ts
  - node --strip-types tests/core/broker-resource-overlap.test.ts
  - npm run validate:broker-proposal
  - npm run validate:schemas
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Versioned read/write-set contract, enriched intents, structured ResourceOverlap facts, and matcher shadow-parity report.
consumer:
  - ATM-GOV-0210 isolated proposal lanes
  - ATM-GOV-0211 ticket state machine
  - ATM-GOV-0212 transactional composer
  - ATM-GOV-0213 semantic adjudicator
missingData:
  - Real intent coverage, content-anchor resolution rate, and unknown-resource frequency must be reported; missing intent is not equivalent to no conflict.
dataDrivenStopRule:
  - Stop if downstream policy still has to parse human detail strings or a boolean to recover resource identity.
  - Stop if unknown/unsupported evidence is classified as clear or parallel-safe.
  - Stop if 0206 matcher shadow and the structured overlap set disagree without a root-caused normalization/provenance explanation.
out_of_scope:
  - No execute/queue/batch policy, no scheduler, no patch apply, no semantic validator, and no shared commit.
rollback:
  strategy: revert-commit
  notes: Disable structured-overlap consumers, preserve emitted facts for audit, retain backward-compatible intent reads, and keep 0206 in shadow until the discrepancy is resolved.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.broker-intent-enrichment
      pattern: Adapter/Port
      source: packages/core/src/broker/intent-enrichment.ts
      disposition: extract
      inlineReason: null
    - atom: atm.broker-resource-overlap-result
      pattern: Result Contract Object
      source: packages/core/src/broker/resource-overlap.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-overlap-evidence
completed_at: "2026-07-20T08:32:47.304Z"
completed_by_agent: "codex-captain-0209"
closedAt: "2026-07-20T08:32:47.304Z"
closedByActor: "codex-captain-0209"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-20T08-32-47-183Z-close-5ae1ff9204fe"
lastTransitionAt: "2026-07-20T08:32:47.304Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "355895571b170bb05775ad39698560d369abcea0"
---

# ATM-GOV-0209 Versioned read write sets and structured overlap evidence

## Intent

把 scope/path/diff/proposal 轉成帶 base version 與 content anchor 的 canonical read/write set，並讓 conflict analysis 回傳完整 `ResourceOverlap[]`，不再以 boolean 或人類字串丟掉相交資源、左右 owner、region、provenance、confidence 與可組合性證據。

## Required Work

- `WriteIntent`/`PatchProposal` 明確攜帶 base digest、read-set、write-set 與 content anchors；task-card scope 只形成 candidate surface，不直接等於 confirmed conflict。
- `ResourceOverlap` 保存 resource kind/key、normalized file、左右 task/actor/lane/intent、左右 anchors、intersection、matcher/resolver version、provenance、confidence 與 `disjoint|overlap|unknown`。
- 0206 pattern-aware matcher 以 shadow facts 輸入/比對，live policy 不在本卡啟用。
- JSON、Markdown、generated surface、glob/literal、pattern/pattern、slash normalization、single-line scope 與 unknown intent 有 fixtures。
- telemetry 直接記 structured facts/digest，不從 reason prose 用 regex 反推。

## Acceptance

- [ ] `hasResourceOverlap` 類 predicate 的 canonical path 能取得 matched resource set，不再只回 boolean。
- [ ] glob/literal、pattern/pattern、slash、single-line 與同檔 disjoint anchors 均有結構化、可重放結果。
- [ ] unknown/unsupported 保持 unknown；不得被當作 clear 或 confirmed conflict。
- [ ] matcher shadow parity report 可定位每個不一致的 normalization、provenance 與 input digest。
- [ ] focused tests、broker proposal/schema validators、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:36.665Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0209-versioned-read-write-sets-and-structured-overlap-evidence.task.md","contentDigest":"sha256:4dc50317ae48c502f9387e0c373c3cbe6980d5a17f1b4d92905aefc104136167"} -->
