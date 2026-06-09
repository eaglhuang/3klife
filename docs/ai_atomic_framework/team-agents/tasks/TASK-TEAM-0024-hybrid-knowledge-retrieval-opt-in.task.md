---
doc_id: doc_team_0024
task_id: TASK-TEAM-0024
title: "Hybrid knowledge retrieval opt-in"
status: draft
owner: atm-core
priority: P2
milestone: M7K
depends_on:
  - "TASK-TEAM-0021"
  - "TASK-TEAM-0023"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/knowledge-index-contract.md"
  - "package.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/knowledge-index-contract.md"
  - "package.json"
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "node atm.mjs team knowledge query --task TASK-AAO-0005 --top 5 --vector-rerank --json"
  - "node atm.mjs team knowledge stats --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Disable hybrid retrieval, remove vector-specific configuration, and revert map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-knowledge-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Hybrid retrieval remains part of the same knowledge atom/map; it must stay reversible to lexical-only."
outOfScope:
  - "External vector database or hosted retrieval service"
  - "Default-on embeddings"
  - "Committing generated embeddings into the repo"
nonGoals:
  - "Do not replace lexical search as the baseline"
  - "Do not make hybrid retrieval a prerequisite for normal work"
dispatch_pattern:
  shape: "dual-agent (Phase 0 threshold planner + Phase 1 builder)"
  rationale: "Hybrid retrieval should only ship behind explicit thresholds; the sidecar defines the thresholds and downgrade path before any implementation work starts."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0024-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief defining enablement thresholds, fallback-to-lexical behavior, and cache budget."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: opt-in hybrid retrieval configuration"
      - "commit_2: validator/map + close evidence"
  condition_review:
    - "Feature is off by default"
    - "If embeddings are unavailable, query degrades to lexical-only without error"
    - "No embedding artifact is committed as canonical knowledge"
---
# TASK-TEAM-0024 — Hybrid knowledge retrieval opt-in

## Goal

Add an optional hybrid retrieval layer that can rerank lexical shortlist results when shard volume or semantic drift makes lexical-only quality insufficient.

## Why

Vector rerank may eventually help, but it should never be the default cost center or the first design dependency. This card exists so ATM can adopt semantic rerank only when:

- lexical-first has already shipped,
- disk and cache budgets already exist,
- and the system can fall back cleanly to lexical-only.

## Implementation Contract

- Keep lexical search as the baseline path.
- Make vector rerank opt-in via explicit config / flag.
- Store any embeddings only under runtime cache roots.
- Require clean fallback behavior when embeddings are missing, stale, or disabled.

## Deliverables

- `docs/governance/team-agents/knowledge-index-contract.md`
- `package.json`
- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/team-knowledge.ts`
- `packages/plugin-governance-local/src/stores.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-team-agents.ts`
- `node atm.mjs team knowledge query --task TASK-AAO-0005 --top 5 --vector-rerank --json`
- `node atm.mjs team knowledge stats --json`
- `git diff --check`

## Acceptance Criteria

- Hybrid rerank is disabled by default and explicitly opt-in.
- When enabled, it reranks only a lexical shortlist instead of replacing lexical filtering.
- Missing or disabled embeddings degrade cleanly to lexical-only results.
- Embedding cache is runtime-only, size-budgeted, and prunable.
- The feature does not mutate task truth, evidence, or registry semantics.

## Rollback

Disable hybrid retrieval, remove vector-specific config, and revert atom map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-knowledge-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is intentionally later and draft-only. If lexical-first already solves the practical problem, ATM should stop there.
