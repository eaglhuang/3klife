# Parallel Dogfood: TASK-MAO-0041 + TASK-MAO-0042

**Experiment ID:** `parallel-0041-0042-2026-06-17`  
**Primary (0041):** `cursor-composer-2.5`  
**Secondary (0042):** `antigravity-Gemini-Flash3.5` (display) → ledger actor **`antigravity-gemini-3.5-flash`** (use this for `tasks claim` / `evidence run`)  
**Target repo:** `AI-Atomic-Framework`  
**Wave envelope (wave 0):** `.atm/runtime/team-waves/team-wave-0-1781689097525.json`

## Phase 0 Results (2026-06-17)

| Check | Result |
|-------|--------|
| `tasks parallel --task 0041 --with 0042` | `blocked-cid-conflict` |
| Overlapping files | `close-orchestration.ts`, `taskflow.spec.ts`, `command-list.json`, `evidence-gates.md`, `path-to-atom-map.json` |
| `team wave plan` | **2 waves** (0041 wave 0, 0042 wave 1) — planner serializes by default |
| `team wave dispatch` | Wave 0 admits **0041 only** |

**Interpretation:** Planner default is serial. This dogfood **overrides** with explicit territory split + broker-friendly edits. Do not rely on same-wave admission; rely on **non-overlapping regions** and atom-map row-level merges.

## Territory Split (MANDATORY)

### Agent A — TASK-MAO-0041 ONLY

| Kind | Paths |
|------|-------|
| Exclusive | `evidence.ts`, `historical-delivery.ts`, `evidence.spec.ts`, `evidence.schema.json`, `tests/cli/evidence-bundle-manifest.test.ts` |
| Shared — A owns | `close-orchestration.ts` region `MAO-0041`, `evidence-gates.md` § Evidence Bundle Manifest, `path-to-atom-map.json` rows `atm.evidence-bundle-manifest-map`, `taskflow.spec.ts` summary line for evidence bundle only |

### Agent B — TASK-MAO-0042 ONLY

| Kind | Paths |
|------|-------|
| Exclusive | `validate.ts`, `validate.spec.ts`, `scripts/validate-cli.ts`, `docs/testing-strategy.md` |
| Shared — B owns | `close-orchestration.ts` region `MAO-0042`, `evidence-gates.md` § Validator Scope Taxonomy, `path-to-atom-map.json` rows `atm.validator-scope-taxonomy-map`, `taskflow.spec.ts` summary line for validator taxonomy only |

### Shared — COORDINATOR ONLY (after both report `ready-for-merge`)

- `tests/cli-fixtures/help-snapshots/command-list.json` — regenerate once via `npm run validate:cli`

## Region Markers in `close-orchestration.ts`

```typescript
// === TASK-MAO-0041 evidence-bundle-manifest (cursor-composer-2.5) START ===
// ... 0041 exports only ...
// === TASK-MAO-0041 evidence-bundle-manifest END ===

// === TASK-MAO-0042 validator-scope-taxonomy (antigravity-Gemini-Flash3.5) START ===
// ... 0042 exports only ...
// === TASK-MAO-0042 validator-scope-taxonomy END ===
```

**Rule:** Never edit the other task's marker block.

## Status Board (agents update via checkbox + timestamp)

| Agent | Task | Lock | Claim | Impl | Validators | Ready-for-merge | Close |
|-------|------|------|-------|------|------------|-----------------|-------|
| A | 0041 | cursor-composer-2.5 | done | done | done | [x] | [ ] merge gate done |
| B | 0042 | antigravity-gemini-3.5-flash | done | done | done | [x] | [x] merge gate done |

_Supervision 2026-06-17T10:15Z: 0041 implementation complete (bundle manifest + directory expansion); both lanes ready-for-merge; merge gate pending._

## Phase 2 Real Parallel Broker (2026-06-17 GO)

- Base commit: `82fb0f3990bd9b231900dd3270f1ab6a8800572e`
- Shared overlap files reset to base; exclusive 0041 files remain dirty in worktree.
- **0041 status: `requests-ready`** → `.atm/runtime/broker-parallel-0041-0042/requests/0041/` (11 requests, real repo paths)
- **0042 status: `requests-ready`** → `.atm/runtime/broker-parallel-0041-0042/requests/0042/` (4 requests)
- **Phase 2 apply:** `plan-batch --apply` runId `c393df1d-f9ab-4331-ac3e-3182df57ac45`, planId `batch-bb9c405c993af122`
- **Broker applied (8/11):** atom-map 0041×6 + 0042×1 (mergeable), evidence-gates 0041 (applied)
- **Broker blocked (1):** `REQ-0042-EVIDENCE-GATES` — anchor `## Evidence Bundle Manifest` absent in batch base
- **Manual steward merge (3):** `close-orchestration.ts` (0041+0042 markers), `REQ-0041-ATOMMAP-CLOSE-ORCH` row 222, `REQ-0042-EVIDENCE-GATES` §, `taskflow.spec.ts` merged summary
- **Merge gate:** all green (2026-06-17T19:45Z)
- **Receipt:** `docs/ai_atomic_framework/broker-collision-evidence/runs/c393df1d-f9ab-4331-ac3e-3182df57ac45.json`

## Phase 1 Broker Merge Dogfood (2026-06-17)

Script: `node tools_node/run-broker-parallel-0041-0042-dogfood.js`  
Run receipt: `docs/ai_atomic_framework/broker-collision-evidence/runs/67b193f9-1244-4e41-9f64-1ebbdbeaa9e5.json`

| Shared file | Adapter | Broker outcome | Notes |
|-------------|---------|----------------|-------|
| `path-to-atom-map.json` | `json-record` | **mergeable / applied** (0041×2 + 0042×1 rows) | Distinct `/mappings/N` pointers compose in one batch |
| `evidence-gates.md` | `text-range` | **partial** — 0041 applied, 0042 **queued** | Same `insertAfterHeading` anchor (`## Gate Rules`) conflicts |
| `close-orchestration.ts` | `fallback-file-lock` | **blocked / queued** | `.ts` has no text-range adapter; `plan-batch --apply` does not land fallback mutations |
| `taskflow.spec.ts` | (not in this run) | manual merge in worktree | Same-line summary edit → would conflict under fallback |

**Interpretation:** Broker auto-merge works for row-disjoint JSON edits. Markdown same-anchor inserts serialize. TypeScript marker blocks still require steward/manual merge or a future `.ts` text-range policy — marker split alone is not enough for `plan-batch --apply` on `.ts`.

## Merge Gate (Captain / Primary monitors)

Run after both `ready-for-merge`:

```bash
cd AI-Atomic-Framework
npm run typecheck
npm run validate:schemas
npm run validate:cli
npm run validate:neutrality
node --strip-types tests/cli/evidence-bundle-manifest.test.ts
git diff --check
```

Record broker receipt under `docs/ai_atomic_framework/broker-collision-evidence/runs/` and append `CID衝突解決紀錄log.md`.

## Close Order

1. Agent A: `taskflow close --write` for 0041 (historical-delivery if needed)
2. Agent B: `taskflow close --write` for 0042 with `--historical-delivery` pointing at merged state if required
3. Primary updates this file with commit SHAs
