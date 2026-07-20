---
task_id: ATM-GOV-0208
title: Content anchored code boundary and resolver substrate
status: planned
owner: atm-governance
priority: P0
depends_on:
  - ATM-GOV-0207
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: Extends the registered GOV plan with the missing content identity substrate required for safe same-file composition.
scopePaths:
  - packages/core/src/broker/boundaries/**
  - packages/core/src/broker/types.ts
  - packages/core/src/broker/adapters/text-range.ts
  - packages/core/src/git/admission.ts
  - packages/language-js/src/**
  - schemas/governance/content-anchor.schema.json
  - schemas/governance/write-intent.schema.json
  - schemas/governance/patch-proposal.schema.json
  - scripts/validate-content-anchor.ts
  - tests/core/content-anchor-resolver.test.ts
deliverables:
  - packages/core/src/broker/boundaries/**
  - packages/language-js/src/**
  - schemas/governance/content-anchor.schema.json
  - schemas/governance/write-intent.schema.json
  - schemas/governance/patch-proposal.schema.json
  - scripts/validate-content-anchor.ts
  - tests/core/content-anchor-resolver.test.ts
validators:
  - node --strip-types tests/core/content-anchor-resolver.test.ts
  - node --strip-types scripts/validate-content-anchor.ts
  - npm run validate:schemas
  - npm run typecheck
  - npm run validate:cli
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: command-backed
producer:
  - Canonical content anchor schema, resolver port, JavaScript/TypeScript adapter, and stale/ambiguous resolution evidence.
consumer:
  - ATM-GOV-0209 versioned read/write sets
  - ATM-GOV-0212 transactional composer
  - ATM-GOV-0213 semantic revalidation
missingData:
  - Rename, reorder, formatting, duplicate-context, generated-file, and unsupported-language resolution rates are unknown until the resolver is exercised against real diffs.
dataDrivenStopRule:
  - Stop if correctness still depends on absolute lineStart/lineEnd after an earlier proposal changes line positions.
  - Stop if a language-specific AST implementation is imported into broker core instead of using an adapter port.
  - Stop if public JSON schemas, TypeScript types, CLI parsing, and proposal serialization cannot evolve compatibly in one versioned contract.
out_of_scope:
  - No overlap verdict, admission policy, ticket scheduling, semantic revalidation, patch application, commit, or push.
  - Do not claim that path-to-atom-map already contains line or symbol boundaries.
rollback:
  strategy: revert-commit
  notes: Disable anchor-based compose eligibility, retain anchors as shadow diagnostic evidence, keep legacy intent readers, and return to the existing safe broker path without absolute-line fallback. Durable queue routing is activated only after ATM-GOV-0211 is sealed.
atomizationImpact:
  ownerAtomOrMap: atom-core-broker
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-plugins.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-scripts.json
  extractionCandidates:
    - atom: atm.content-anchor-contract
      pattern: Result Contract Object
      source: packages/core/src/broker/boundaries/content-anchor.ts
      disposition: extract
      inlineReason: null
    - atom: atm.content-boundary-resolver
      pattern: Adapter/Port
      source: packages/core/src/broker/boundaries/resolver.ts
      disposition: extract
      inlineReason: null
waveId: auto-batch-perf-v2-m5-compose-first
surfaceFamily: broker-content-boundary
---

# ATM-GOV-0208 Content anchored code boundary and resolver substrate

## Intent

從零建立可在同檔多次變動後仍能定位的內容邊界原語。權威 identity 由 sealed base blob/tree、content context/hash 與 adapter 可提供的 AST/node/symbol anchor 組成；行號只保留為人類診斷。這張卡修正「atom map 已有 sourceRange」的錯誤假設，也補齊 TypeScript contract 與 JSON schema 漂移。

## Required Work

- 新增 versioned `atm.contentAnchor.v1`：base digest、file identity、anchor kind、context/preimage digest、symbol/AST path、provenance、confidence、resolver version 與 resolution status。
- resolver outcome 固定為 `resolved|stale|ambiguous|unsupported`，並提供候選與理由；不得 silent pick 第一個同名符號或重複 context。
- JavaScript/TypeScript 經 language adapter 產 AST/symbol anchor；plain text 使用 git-style context/preimage；generated/binary/unsupported surface 明確標 unsupported。
- rename、line insertion、formatting、reorder、duplicate context、same-name symbol 與 base mismatch 有 deterministic fixtures。
- `sourceRange` 若保留，只能是 resolution 後的 observation，不得作持久 identity；schema 與 TypeScript/CLI/proposal 同步。

## Acceptance

- [ ] 早期 proposal 插入行後，後續 disjoint anchor 仍定位到原目標；不再以舊 absolute line 套用。
- [ ] rename/reorder/format/duplicate/same-name/base-mismatch fixtures 對 resolved/stale/ambiguous 結論可重現。
- [ ] unsupported/ambiguous 不會被標 compose-safe，且 downstream 可轉成 re-arbitration/queue ticket。
- [ ] write-intent 與 patch-proposal schemas 接受同一 content-anchor contract，無 additionalProperties 漂移。
- [ ] focused validator、schema validation、typecheck 與 validate:cli 全數通過。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-20T06:04:34.254Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0208-content-anchored-code-boundary-and-resolver-substrate.task.md","contentDigest":"sha256:1a9765a02cabbc45dfea1d830f37abb36bdb6685f17863fc5c4a3fcd1e9b1297"} -->
