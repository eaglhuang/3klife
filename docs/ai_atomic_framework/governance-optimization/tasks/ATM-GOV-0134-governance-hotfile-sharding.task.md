---
doc_id: doc_atm_gov_0134
task_id: ATM-GOV-0134
title: "Shard governance hotfiles behind generated compatibility projections"
status: done
owner: atm-core
priority: P0
milestone: GOVOPT-Foundation
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - ".agents/skills/atm-bug-backlog/SKILL.md"
  - "scripts/validate-governance-projections.ts"
  - "tests/cli/governance-hotfile-sharding.test.ts"
deliverables:
  - ".agents/skills/atm-bug-backlog/SKILL.md"
  - "scripts/validate-governance-projections.ts"
  - "tests/cli/governance-hotfile-sharding.test.ts"
validators:
  - "node --strip-types tests/cli/governance-hotfile-sharding.test.ts"
  - "node --strip-types scripts/validate-governance-projections.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.governance-hotfile-map"
  mapUpdates: []
  extractionCandidates: []
outOfScope:
  - "Deleting the public compatibility Markdown projection in the first migration."
---

# ATM-GOV-0134 - Shard governance hotfiles behind generated compatibility projections

## Acceptance

- Backlog source moves to one physical item file per bug or optimization record while preserving the existing Markdown path as generated projection.
- Projection generation is deterministic, validated, and safe for existing readers during migration.
- Each agent writes only its owned shard/item file; closer or generator rebuilds shared projections.
- Inventory covers other mandatory global files such as atom-map projections, rosters, and registries before moving them.
