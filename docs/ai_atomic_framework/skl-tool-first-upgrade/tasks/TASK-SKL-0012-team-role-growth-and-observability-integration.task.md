---
task_id: TASK-SKL-0012
title: Team role growth and observability integration
status: done
milestone: P4
depends_on:
  - TASK-SKL-0007
  - TASK-SKL-0010
  - TASK-SKL-0011
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/**"
  - "packages/**"
  - "integrations/**"
  - ".github/**"
deliverables:
  - "docs/**"
  - "packages/**"
  - "integrations/**"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the role-growth integration commit if Team role learning becomes fragmented or observability cannot map back to role contracts."
atomizationImpact:
  ownerAtomOrMap: "atm.team-role-growth-observability"
  mapUpdates: []
out_of_scope:
  - "Do not create a second memory product outside shared skill references."
  - "Do not couple observability to one vendor bridge."
nonGoals:
  - "No role-specific incompatible learning-loop formats."
  - "No mandatory knowledge retrieval gate before every Team action."
completed_at: "2026-07-10T06:45:08.386Z"
completed_by_agent: "codex-captain-m8e"
closedAt: "2026-07-10T06:45:08.386Z"
closedByActor: "codex-captain-m8e"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-10T06-45-08-386Z-close-cf6f65bd5c9a"
lastTransitionAt: "2026-07-10T06:45:08.386Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "e3f9f2e66f0421e0b4e5968013235dcfc14a5e1b"
---

# TASK-SKL-0012

## Goal

把 shared growth contract 與 observability 接到 Team role skill packs，讓每個角色既能累積自己的專業經驗，又能維持跨 role 共用的分類法與 promotion 規則。

## Acceptance

- Team role learning events can be observed and mapped back to role contracts.
- Shared taxonomy works across Coordinator, Implementer, Validator, Review, and other role packs.
- Growth data remains reference-first and does not bloat every role skill entry file.
- Observability can distinguish role-specific friction from shared ATM routing friction.

## Non-Goals

- No new standalone memory subsystem.
- No requirement that every minor note immediately changes SKILL.md.

## Verification

```bash
npm run typecheck
npm run validate:cli
git diff --check
```
