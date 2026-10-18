---
id: TASK-AAO-0212
title: Sealed runner sync for host projection import cleanup
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - release/atm-onefile/**
  - release/atm-root-drop/**
  - packages/*/dist/**
  - .atm/history/tasks/TASK-AAO-0212.json
  - .atm/history/evidence/TASK-AAO-0212.*
  - .atm/history/task-events/TASK-AAO-0212/**
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
  - ATM_RUNNER_PUBLICATION_TASK=TASK-AAO-0212 ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
  - node atm.mjs doctor --json
  - node atm.mjs taskflow close --task TASK-AAO-0211 --actor codex-gpt-6 --dry-run --json
  - git diff --check
priority: P1
phase: Backlog-P1
created: 2026-10-18
created_by_agent: codex-gpt-6
owner: codex-gpt-6
status: planned
type: maintenance
depends: []
notes: "2026-10-19 | 狀態: planned | 驗證: pending | 變更: independent runner publication planning | 阻塞: Phase 1 authority required"
---
# [TASK-AAO-0212] Sealed runner sync for host projection import cleanup

> **任務開卡** — Sealed runner sync for host projection import cleanup
> **定位**：Backlog-P1
> **前置依賴**：無

## 問題描述

Publish the official AAF sealed runner containing delivered host projection import cleanup through isolated build and steward publication.

## INPUT_CONTRACT

- Delivered source: 70874859cc79731319a5d24fb4384ede4ea12f52, or a metadata-only descendant proven to have an equivalent build-input tree. No dependency on TASK-AAO-0211 being done; publication unblocks its later closure.
- Before build/publication, inventory all foreign WIP and hash/snapshot required outputs. Verify live actor, task, lane, ticket, scope and publication authority. Formal inventory-bound producer takeover may be used only after exact receipt/digest/CAS validation; a new card alone is not ownership.

## OUTPUT_CONTRACT

- [ ] release/atm-onefile/**
- [ ] release/atm-root-drop/**
- [ ] packages/*/dist/**

## VALIDATION_CMD

```bash
ATM_RUNNER_PUBLICATION_TASK=TASK-AAO-0212 ATM_RETAIN_RELEASE_ARTIFACTS=1 npm run build
node atm.mjs doctor --json
# Supply current lane/profile/source references required by normal guidance.
node atm.mjs taskflow close --task TASK-AAO-0211 --actor codex-gpt-6 --dry-run --json
git diff --check
```

## ROLLBACK_HINT

```bash
# Use official publication recovery receipts for this task's outputs only.
# Never reset the shared checkout or move/stash/restore foreign WIP.
```

## 執行步驟

1. Phase 0: one planning commit with only this planned card and compact tasks-aao entry. Phase 1: normal AAF claim/lock, exactly delivery plus closure commits. No game status mirrors or read-only shard refresh.
2. Audit required outputs first. If dirty required outputs lack valid formal disposition, stop blocked before publishing or a build that may partially sync clean outputs. Preserve all foreign bytes and retain precise evidence; no implicit takeover.
3. Use official isolated sealed-source candidate build and runner-sync steward enqueue/admission/publication. The queue guards publication, not private compilation. Validate exact inventory and CAS immediately before shared writes.
4. Run the build once through normal evidence execution so build/proof and publication are one attempt. Do not publish first and rerun merely for evidence: that can invalidate the original takeover snapshot.
5. Verify the fresh official runner natively accepts packages/*/dist/** against package dist descendants, without expanding to 27 concrete scopes to hide matcher failure. On failure record and stop.
6. Doctor/freshness and TASK-AAO-0211 target-owned close dry-run must show no stale-runner blocker and planningMirrorPath=null, with no external planning writes. Root handles any normal 0209 ticket renewal under its own task; this card neither closes nor edits its ledger.

## Acceptance and boundaries

- A published receipt proves source SHA, equivalent input tree where applicable, build-input hash, output inventory/digests, exact authority, publication disposition and steward release. recovery-retained is incomplete, never success.
- Compare all foreign/source snapshots before and after: no foreign loss or unrelated source/game writes. Only authorized generated AAF outputs and this card's managed evidence/ledger/events may change.
- AAF only: no adopter installation, no TypeScript source edits, no master changes, no original acceptance-card edits and no TASK-AAO-0211 lifecycle/status mirroring.
- Forbidden: emergency, force, no-verify, manual runner copying, moving/stashing/overwriting foreign WIP, stale-runner/source-first bypass. Needed scope changes require normal amendment before writes; new product fixes require another card.

*由 codex-gpt-6 透過 task-card-opener 開立 | 2026-10-18*

## Additional execution constraints

- TASK-AAO-0211 close preview requires its full historical source delivery and current live lane; root supplies those references. Verify the actual writerBoundary.planningMirrorPath is null, not merely an advisory field.
- Keep packages/*/dist/** as the native grant; do not expand it to concrete paths to mask directory-glob failure.
- Product CI create-atm/dist/index.js mode 100644 versus 100755 and empty-delivery handling are separate root causes, out of scope.
- For a normal CRLF stat-only residue, refresh only explicitly named tracked index entries with git add -u after proving both empty content diff and unchanged bytes/hash. No force or content rewriting; do not stage unrelated files.
- Complete normal TASK-AAO-0211 closure first, then TASK-AAO-0212 closure. This order is not a dependency on 0211 done for starting publication; retain exactly delivery plus closure commits in AAF.