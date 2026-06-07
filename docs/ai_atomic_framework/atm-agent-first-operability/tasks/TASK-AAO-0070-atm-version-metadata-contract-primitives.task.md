---
doc_id: doc_other_aao_0070
task_id: TASK-AAO-0070
title: "ATM version metadata contract primitives (Slice 1 identity correction)"
status: done
owner: atm-core
priority: P1
milestone: M17
depends_on: []
related_plan: "docs/ai_atomic_framework/atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/core/src/index.ts"
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/index.ts"
deliverables:
  - "packages/core/src/index.ts"
  - "packages/plugin-governance-local/src/versioning.ts"
  - "packages/plugin-governance-local/src/index.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Slice 1 landed as commit 7d6b04c. Rollback would remove the dataVersion / artifactVersion type and the semver-scoped helpers in versioning.ts. No on-disk runtime state was written by this slice; rollback requires no migration."
atomizationImpact:
  ownerAtomOrMap: "atm.task-ledger-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Slice 1 commit 7d6b04c landed without an atomization map entry for packages/plugin-governance-local/src/versioning.ts. Adding that entry is a residue task carried into the Slice 2 scope review; this card does not modify the map directly."
outOfScope:
  - "Modifying the closed TASK-AAO-0065 ledger record"
  - "Amending commit 7d6b04c"
  - "Introducing dataVersionSource or artifactVersionSource fields (Slice 2 only)"
  - "Introducing a versionKind discriminator (Slice 2 only)"
  - "Wiring the new fields into stores.ts, bootstrap/**, or any persisted record (Slice 2 only)"
  - "Renaming or rewriting the existing semver-scoped helpers (separate hygiene patch)"
  - "Editing the AI-Atomic-Framework source tree (this card is docs-only)"
nonGoals:
  - "Do not edit the closed TASK-AAO-0065 ledger record"
  - "Do not amend commit 7d6b04c"
  - "Do not introduce source-provenance enums"
  - "Do not sweep existing schemaVersion or specVersion callers"
  - "Do not open Slice 2 work under this card"
tags:
  - "governance-correction"
  - "framework-maintenance"
  - "agent-operability"
closed_at: "2026-06-07T12:50:00+08:00"
closed_by_agent: "captain-bulk-reconcile-2026-06-07"
reconcile_note: "Bulk reconcile 2026-06-07: deliverables and/or close-commits verified by audit; status backfilled from planned."
---

# TASK-AAO-0070 - ATM version metadata contract primitives (Slice 1 identity correction)

## Goal

Formally record the task identity for commit `7d6b04c0c697d132fa05f4cc8a7749a2943066c6` ("feat(atm): add version metadata contract primitives"), which landed Slice 1 of the ATM version metadata salvage matrix. The commit added a `dataVersion` / `artifactVersion` contract primitive to `@ai-atomic-framework/core` and a pure helper module (`packages/plugin-governance-local/src/versioning.ts`) with semver-scoped resolvers and comparators. This card supplies the governance identity that 7d6b04c did not embed at commit time.

## Why

Commit 7d6b04c was reported externally as TASK-AAO-0065. That attribution is provably wrong:

- TASK-AAO-0065 is "CLI output-json file writer flag", closed at `2026-05-28T16:59:32.020Z` with scope `packages/cli/src/commands/shared.ts`, `next.ts`, `tasks.ts`, `next.spec.ts`, `tasks.spec.ts`.
- Commit 7d6b04c landed at approximately `2026-05-28T17:40:51Z` — after TASK-AAO-0065's closure — and touched `packages/core/src/index.ts`, `packages/plugin-governance-local/src/versioning.ts`, `packages/plugin-governance-local/src/index.ts`. Zero file overlap with TASK-AAO-0065.
- The commit produced no `Task-ID:` trailer and carries no ATM governance metadata in its message.

The work product is real and durable (new exported types from `@ai-atomic-framework/core` that downstream code may already import), so it must carry a correct, addressable task identity rather than be silently miscovered by an unrelated closed card. This card is a docs-only governance correction: it documents the actual identity of the slice while leaving both the closed TASK-AAO-0065 ledger record and the landed commit untouched.

## Acceptance Criteria

- A planning card with `task_id: TASK-AAO-0070` exists in 3KLife and is import-clean: `node atm.mjs tasks import --from <path> --dry-run --json` returns `ok: true` with zero `importDiagnostics`.
- The card's `scopePaths` and `deliverables` enumerate exactly the three production files touched by commit 7d6b04c: `packages/core/src/index.ts`, `packages/plugin-governance-local/src/versioning.ts`, `packages/plugin-governance-local/src/index.ts`. No additional files.
- The card body explicitly states both (a) that 7d6b04c is the source of truth for the landed Slice 1 and (b) that TASK-AAO-0065 was misattributed.
- The card does NOT request edits to the closed TASK-AAO-0065 ledger record.
- The card does NOT request amendment of commit 7d6b04c.
- The AAO README roster includes a row for TASK-AAO-0070 with `status: planned`. The status does not falsely claim closure in the ATM ledger.

## Notes

- **Slice 1 status**: landed on `main` as commit `7d6b04c` at 2026-05-29 01:40:51 +08:00 (≈ 2026-05-28T17:40:51Z). The commit produced no `Task-ID:` trailer and carries no closure metadata; this card retroactively assigns the identity.
- **Existing helper semantics**: `versioning.ts` currently provides `isValidVersionString` and `compareVersions` that assume semver inputs. These helpers will silently produce wrong answers for git SHA or content hash inputs (`compareVersions('7d6b04c', 'abc1234')` parses both sides to `[NaN]` arrays and returns `0`). The recommended corrective rename (`isValidSemverVersionString`, `compareSemverVersions`) is a separate hygiene patch and is **not** part of this card.
- **No atomization map update in this card**: the Slice 1 commit landed without adding an ownership entry for `versioning.ts` to `atomic_workbench/atomization-coverage/path-to-atom-map.json`. That residue is recorded here in `atomizationImpact.notes` and is deferred to the Slice 2 scope review, where the map entry can be added together with the consumer wiring.

## Rollout / Governance

- **Closure path**: when this card is eventually imported and closed, closure must use a `--historical-delivery` (or equivalent) closure mode that references the existing commit `7d6b04c` as the delivery anchor. Do not synthesize a new delivery commit. Do not require additional source changes.
- **Slice 2 preconditions** (must be satisfied before any Slice 2 card opens; not part of this card):
  1. A captain-decision shard names the allowed `versionKind` enum values (e.g., `'semver' | 'git-sha' | 'sha256' | 'opaque'`) and the comparison rule (within-kind only; cross-kind comparison returns `null` or is a type error).
  2. The semver-helper rename (`compareVersions` → `compareSemverVersions`, `isValidVersionString` → `isValidSemverVersionString`) has either landed as a separate hygiene patch or been explicitly deferred with a documented mitigation.
  3. Exactly one concrete write path in `packages/plugin-governance-local/src/stores.ts` is named as the Slice 2 consumer. No sweep across `bootstrap/**` or other persisted record sites.
- **Out of scope for this card** (explicit, repeated for clarity):
  - `dataVersionSource` and `artifactVersionSource` fields — Slice 2 only.
  - `versionKind` discriminator — Slice 2 only.
  - Wiring the contract into `stores.ts`, `bootstrap/**`, or any other persisted record path — Slice 2 only.
  - Renaming `compareVersions` / `isValidVersionString` — separate hygiene patch.
  - Editing the closed TASK-AAO-0065 ledger record — forbidden (closure-history corruption).
  - Amending commit 7d6b04c — forbidden (the commit is referenced by `.atm/history/evidence/git-head.json` and amending breaks the evidence chain).

## Stop Conditions

- If a reviewer requests merging this card into the M17 Agent Operability series (TASK-AAO-0062 to TASK-AAO-0069), stop — those cards address agent-facing CLI ergonomics; this card addresses a framework contract primitive, a distinct surface and distinct governance domain.
- If a reviewer requests that this card itself wire Slice 2 semantics (source enums, kind discriminator, store consumer), stop — this card is governance-correction-only; Slice 2 has separate preconditions documented above.
- If a reviewer requests amending commit 7d6b04c to add a `Task-ID: TASK-AAO-0070` trailer, stop — the commit has landed and is referenced by downstream evidence (`.atm/history/evidence/git-head.json` parentCommitShas / treeSha chain); amending it rewrites history and breaks the evidence chain.
- If a reviewer requests editing the closed `TASK-AAO-0065` ledger record to back-reference 7d6b04c, stop — closed ledger records are historical and must not be rewritten. The correct correction surface is this new card plus an external communication update.
