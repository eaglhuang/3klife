---
id: TASK-AAO-0208
task_id: TASK-AAO-0208
title: Sealed runner publication for delivered host close projections
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - release/atm-onefile/**
  - release/atm-root-drop/**
  - packages/*/dist/**
  - .atm/history/evidence/TASK-AAO-0208.*
  - .atm/history/tasks/TASK-AAO-0208.json
  - .atm/history/task-events/TASK-AAO-0208/**
deliverables:
  - release/atm-onefile/**
  - release/atm-root-drop/**
  - packages/*/dist/**
contextMap:
  primary: scripts/run-sealed-runner-build.ts
  direct: scripts/sealed-runner-publication.ts
  secondary: packages/cli/src/commands/broker/steward-queues.ts
  acceptance: packages/core/src/broker/runner-build-output-inventory.ts
validators:
  - ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs doctor --json
  - node atm.mjs taskflow close --task TASK-AAO-0207 --actor codex-gpt-6 --dry-run --json
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-18
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: maintenance
depends: []
notes: "2026-10-18 | 狀態: planned | 驗證: pending | 變更: independent runner-sync planning | 阻塞: authority and foreign WIP audit required"
---
# [TASK-AAO-0208] Sealed runner publication for delivered host close projections

> **任務開卡** — Sealed runner publication for delivered host close projections
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Restore the official AAF runner from delivered TASK-AAO-0207 source using isolated sealed build and governed runner-sync publication; preserve foreign WIP.

## INPUT_CONTRACT

- Required source commit: e63860b8548b166e0f157b029d9cbf8e81a91758 (TASK-AAO-0207 delivery), or a metadata-only descendant with proven identical build-input tree. Do not depend on TASK-AAO-0207 being done: publication unblocks its later closure.
- Before claim/build/publication, inventory all canonical foreign WIP and snapshot/hash every affected release output. Verify exact live task, scope, ticket, lane and publication authority. Preserve owners and existing work.

## OUTPUT_CONTRACT

- [ ] release/atm-onefile/**
- [ ] release/atm-root-drop/**
- [ ] packages/*/dist/**

## VALIDATION_CMD

```bash
ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
node atm.mjs doctor --json
# Add the current lane/profile and delivered source reference required by normal CLI guidance.
node atm.mjs taskflow close --task TASK-AAO-0207 --actor codex-gpt-6 --dry-run --json
git diff --check
```

## ROLLBACK_HINT

```bash
# Use official publication rollback/recovery receipts for this task's outputs only.
# Preserve foreign snapshots; never restore/reset/stash/move another actor's WIP.
```

## 執行步驟

1. Phase 0: this planned card and compact tasks-aao entry only, one planning commit. Phase 1 uses normal target-repo claim/lock and exactly delivery plus closure commits; no planning status mirror.
2. Audit foreign WIP/output hashes and authority first. Use the official sealed-source isolated candidate build and runner-sync steward admission/queue/publication workflow; no handwritten copy or normal-development alternate worktree.
3. Use broker runner-sync admission with this task, actor, sealed SHA and exact required surfaces. The queue protects publication, not private compilation. Validate receipts and CAS snapshots before shared writes.
4. If any required output is dirty without formal exact disposition, retain it and report blocked. No manual stash/move/overwrite of foreign WIP, implicit ownership transfer or success claim for recovery-retained publication. A new card alone does not authorize takeover.
5. Verify the official installed AAF runner is fresh and recognizes target_repo authority: TASK-AAO-0207 close dry-run must be ready and planningMirrorPath=null. Do not execute its close or edit its ledger from this task.

## Acceptance and boundaries

- Receipt proves source SHA, equivalent input-tree hash when applicable, build-input hash, output inventory/digests, exact publication authority, disposition and steward release. Every required runner output is published successfully; recovery-retained is incomplete.
- Compare before/after source and foreign snapshots: only this card's authorized generated outputs/runtime-managed evidence change; no unrelated source, 3KLife or adopter writes.
- Official runner doctor/freshness and 0207 close preview must prove the fresh generation and null planning mirror, without emergency, stale-runner exception or source-first write.
- Only AAF is targeted; no adopter installation. Do not modify framework TypeScript, master or 0207 status. Extra needed files require formal scope amendment before writes, not silent broadening.
- Forbidden: emergency, no-verify, force, manual runner copy, bypassing source-first/freshness gates, moving/stashing/overwriting foreign WIP. If blocked, keep command-backed diagnostics and precise required disposition.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-18*
