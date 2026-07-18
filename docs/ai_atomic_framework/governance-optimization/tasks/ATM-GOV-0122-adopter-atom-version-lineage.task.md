---
doc_id: doc_other_0823
task_id: ATM-GOV-0122
title: Adopter Atom Version Lineage for Evolve Proof
milestone: M5
status: done
depends_on: [ATM-GOV-0116, ATM-GOV-0118, ATM-GOV-0120]
owner: atm-core
related_plan: docs/ai_atomic_framework/governance-optimization/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
hostKind: upstream-framework
alphaGate: validate:standard
public_tracking: false
executionMode: planned-upstream-change
created_at: 2026-05-20T00:00:00+08:00
created_by_agent: codex-gpt-5.5
scopePaths:
  - packages/core/src/registry/**
  - packages/core/src/upgrade/**
  - packages/cli/src/commands/registry-diff.ts
  - packages/cli/src/commands/replacement-lane.ts
  - scripts/validate-registry-diff.ts
  - docs/MAP_REPLACEMENT_PROTOCOL.md
  - docs/ADAPTER_GUIDE.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-002.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-003.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-004.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-18-001.json
  - docs/governance/atm-bug-and-optimization-backlog.md
deliverables:
  - packages/core/src/registry/**
  - packages/core/src/upgrade/**
  - packages/cli/src/commands/registry-diff.ts
  - packages/cli/src/commands/replacement-lane.ts
  - scripts/validate-registry-diff.ts
  - docs/MAP_REPLACEMENT_PROTOCOL.md
  - docs/ADAPTER_GUIDE.md
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-002.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-003.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-17-004.json
  - docs/governance/atm-bug-and-optimization-backlog.items/ATM-BUG-2026-07-18-001.json
  - docs/governance/atm-bug-and-optimization-backlog.md
validators:
  - npm run typecheck
  - npm run build
  - node --experimental-strip-types scripts/validate-registry-diff.ts
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.adopter-atom-version-lineage
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-core.json
    - atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json
  extractionCandidates:
    - atom: atm.registry.adopter-version-lineage
      pattern: Contract
      source: packages/core/src/registry
      disposition: extract
      inlineReason: null
completed_at: "2026-07-18T04:55:36.868Z"
completed_by_agent: "codex-gov-sequence"
closedAt: "2026-07-18T04:55:36.868Z"
closedByActor: "codex-gov-sequence"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-18T04-55-36-868Z-close-481524eb802e"
lastTransitionAt: "2026-07-18T04:55:36.868Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "dea1247be"
---

# ATM-GOV-0122 Adopter Atom Version Lineage for Evolve Proof

## Background

`3klife-npc-brain` reached a real evolve blocker while validating `TASK-ATS-0007`. The ATM `registry-diff` route returned `ATM_DIFF_ATOM_NOT_FOUND` for `ATM-NPCBRAIN-0002`, even though the adopter already has governed map evidence and approved dry-run proposals. This shows that map-level evolve proof still lacks a machine-readable atom-level version lineage contract for adopter-managed atoms.

## Outputs

1. A framework contract for atom-level version lineage that adopter registries can persist or backfill.
2. A CLI/runtime path that lets `registry-diff` and downstream evolve proof resolve adopter atom ids and versions without synthetic evidence.
3. Backfill or migration guidance for existing adopters, plus validator coverage for source-tree and onefile flows.

## Acceptance Criteria

- [ ] An adopter atom with lineage can produce a machine-generated `registry-diff` / hash-diff artifact instead of `ATM_DIFF_ATOM_NOT_FOUND`.
- [ ] Atomize / infect / evolve flows define when and where adopter atom version lineage is born, updated, and validated.
- [ ] Missing-lineage cases return an explicit advisory contract rather than a silent dead end.
- [ ] Source-tree and onefile validation cover the evolve-proof path on a non-JS adopter fixture.

## Target Files

- `packages/core/src/registry/**`
- `packages/core/src/upgrade/**`
- `packages/cli/src/commands/registry-diff.ts`
- `packages/cli/src/commands/replacement-lane.ts`
- `scripts/validate-registry-diff.ts`
- `docs/MAP_REPLACEMENT_PROTOCOL.md`
- `docs/ADAPTER_GUIDE.md`

## Validation Commands

```bash
npm run typecheck
npm run build
node --experimental-strip-types scripts/validate-registry-diff.ts
```

## Notes

2026-05-20 | status: open | validation: pending | change: Opened from the real `TASK-ATS-0007` blocker in `3klife-npc-brain`, where `registry-diff ATM-NPCBRAIN-0002 --from 0.1.0 --to 0.1.1` could not resolve a versioned atom lineage for evolve proof. | blocker: implementation not started
2026-07-18 | status: done | validation: `npm run typecheck`; `npm run build`; `node --experimental-strip-types scripts/validate-registry-diff.ts` | change: Closed in target ledger with historical delivery commit `dea1247be` after prerequisite GOV closeback chain was reconciled for ATM-GOV-0112, ATM-GOV-0114, ATM-GOV-0115, ATM-GOV-0116, ATM-GOV-0117, ATM-GOV-0118, ATM-GOV-0119, and ATM-GOV-0120. | blocker: none
