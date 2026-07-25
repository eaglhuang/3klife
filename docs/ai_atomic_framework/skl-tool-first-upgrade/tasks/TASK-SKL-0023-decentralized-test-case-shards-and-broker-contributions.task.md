---
task_id: TASK-SKL-0023
title: Decentralized test case shards and Broker contributions
status: done
owner: atm-agent-skills
priority: P0
milestone: ATM-SKL-VG-R0.4
depends_on:
  - TASK-SKL-0022
related_plan: skl-tool-first-upgrade/SKL-validator-governance-test-case-catalog-plan.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - schemas/validators/test-case-group.schema.json
  - scripts/test-catalog.config.json
  - tests/catalog/groups/**
  - packages/cli/src/commands/test-catalog.ts
  - packages/core/src/broker/test-case-contribution.ts
  - packages/core/src/broker/index.ts
  - tests/cli/test-case-catalog-shards.test.ts
  - tests/core/test-case-contribution-broker.test.ts
deliverables:
  - schemas/validators/test-case-group.schema.json
  - tests/catalog/groups/**
  - packages/cli/src/commands/test-catalog.ts
  - packages/core/src/broker/test-case-contribution.ts
  - tests/cli/test-case-catalog-shards.test.ts
  - tests/core/test-case-contribution-broker.test.ts
validators:
  - node --strip-types tests/cli/test-case-catalog-shards.test.ts
  - node --strip-types tests/core/test-case-contribution-broker.test.ts
  - npm run validate:schemas
  - npm run typecheck
errorCodes: []
evidence:
  required: sharded-case-catalog-and-broker-compose
rollback:
  strategy: revert-commit-and-read-v1-flat-test-catalog
atomizationImpact:
  ownerAtomOrMap: atm.test-catalog
  mapUpdates: []
  extractionCandidates:
    - atom: atm.test-case-contribution
      pattern: Brokered Shared Contribution
      source: packages/core/src/broker/test-case-contribution.ts
      disposition: extract
createdByCommand: atm plan card create
completed_at: "2026-07-25T08:19:33.027Z"
completed_by_agent: "cursor-skl-0023-captain"
closedAt: "2026-07-25T08:19:33.027Z"
closedByActor: "cursor-skl-0023-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-25T08-19-33-027Z-close-f6971e575d5f"
lastTransitionAt: "2026-07-25T08:19:33.027Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "5c0c432995124c0572a729c3201b39e1e311f5d3"
---

# TASK-SKL-0023 Decentralized test case shards and Broker contributions

## Intent

Add deterministic test-case IDs, group-owned registry shards, a generated
read-only catalog, immutable aliases/lineage, and Broker-managed shared
contributions without creating a global sequential allocator.

## Acceptance

- [ ] IDs follow normalized `test_int_*` / `test_task_*` semantics with a
      collision digest and no mutable implementation content.
- [ ] Group shards validate uniqueness, semantic duplicates, aliases, cycles,
      owners, orphans and unresolved references.
- [ ] A feature card can contribute several integration cases through one
      bounded group resource intent without opening a separate test card.
- [ ] Concurrent disjoint case contributions compose with member attribution;
      true same-case conflicts queue or revalidate.
- [ ] Generated catalog is query authority only, not a mutable second registry.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-24T03:32:35.863Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"skl-tool-first-upgrade/tasks/TASK-SKL-0023-decentralized-test-case-shards-and-broker-contributions.task.md","contentDigest":"sha256:aeed4db9d53c133fe996d886d9f0b9769637da3f8172b4445d100b07eaebb389"} -->
