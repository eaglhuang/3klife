---
doc_id: doc_aao_0150
task_id: TASK-AAO-0150
title: "Profile and cut next hot-path latency (~20s per invocation) to under 5s"
status: done
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/"
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/core/src/police/"
  - "scripts/validate-prompt-scoped-next.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:prompt-scoped-next"
  - "git diff --check"
deliverables:
  - "packages/cli/src/commands/next.ts"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any next routing decision, claim admission verdict, or governance readiness hint changes semantically; this card is latency-only."
atomizationImpact:
  ownerAtomOrMap: "atm.next-routing"
  mapUpdates: []
outOfScope:
  - "Changing routing semantics, claim admission rules, or governance hints"
  - "Removing police/source-inventory checks (caching or scoping them is in scope; deleting them is not)"
nonGoals:
  - "Do not trade correctness for speed; every skipped scan must be cache-invalidation-safe"
completed_at: "2026-07-07T15:11:09.303Z"
completed_by_agent: "codex-captain"
closedAt: "2026-07-07T15:11:09.303Z"
closedByActor: "codex-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-07T15-11-08-815Z-close-0ebc5f139cee"
lastTransitionAt: "2026-07-07T15:11:09.303Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "c63c472b41f97988aeed3edb254574d9532ffbfb"
---

# TASK-AAO-0150 — next hot-path latency

## Measurement (2026-07-07, warm frozen runner, idle machine)

- `node atm.mjs --version`: 1.2s (baseline runner cost)
- `node atm.mjs tasks audit` / `orient` / `framework-mode status` / `guard encoding`: ~1.8-2.3s each
- `node atm.mjs next --prompt x --json`: **19.5-20.1s**, stable across runs
- `node atm.mjs doctor`: 7-21s depending on cache state

So `next` performs ~18s of internal work beyond runner startup. Every governed
card cycle invokes next/claim/commit/close several times, so pure CLI overhead
per card is minutes — the top throughput bottleneck for pure-AI teams.

## Plan

1. Profile one `next --prompt` run (`node --cpu-prof` on the extracted dist
   entrypoint, or coarse phase timers) and attribute the ~18s. Suspects:
   police family source-inventory full-repo scan, embedded doctor/audit
   re-runs, task ledger full parse (289 tasks x JSON), guide cache misses,
   repeated git subprocess spawns.
2. Cache or scope the top offenders: e.g. source-inventory keyed by git HEAD +
   dirty file list; audit reuse within a single process; ledger index file
   instead of 289 file reads.
3. Add a latency budget check (warn-level) so regressions surface: `next
   --prompt` p50 under 5s warm on the reference machine.

## Acceptance

- `next --prompt x --json` warm latency under 5s on the same machine, with
  byte-identical routing evidence for a fixed fixture repo (semantic no-change
  proof).
