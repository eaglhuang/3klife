---
doc_id: doc_team_0021
task_id: TASK-TEAM-0021
title: "Team knowledge build and query dry-run"
status: planned
owner: atm-core
priority: P1
milestone: M4K
depends_on:
  - "TASK-TEAM-0020"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-governance-local.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team-knowledge.ts"
  - "packages/cli/src/commands/command-specs/team.spec.ts"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-cli.ts"
  - "scripts/validate-team-agents.ts"
  - "scripts/validate-governance-local.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-local.ts"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "node atm.mjs team knowledge build --scope project --dry-run --json"
  - "node atm.mjs team knowledge query --task TASK-AAO-0005 --top 5 --json"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert team knowledge build/query command surfaces, generated-root handling, validator updates, and atom map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-knowledge-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "The dry-run build/query surface and its validators must map to the same Team Agents knowledge atom/map."
outOfScope:
  - "Vector rerank or embedding generation"
  - "Automatic query execution from next / playbook"
  - "Knowledge-based gating or task blocking"
nonGoals:
  - "Do not require every agent to query the corpus before work"
  - "Do not commit generated cache files"
dispatch_pattern:
  shape: "dual-agent (Phase 0 retrieval planner + Phase 1 builder)"
  rationale: "A sidecar can define the query contract and test corpus first, then the builder implements only the target-repo command and validator surface."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0021-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief covering query filters, topK budget, lexical-first ranking, and degraded no-index behavior."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: build/query command surface + validators"
      - "commit_2: stores/map + close evidence"
  condition_review:
    - "Build/query works without vector dependencies"
    - "Query returns compact top hits, not full-corpus dumps"
    - "No generated cache file is added as a deliverable"
---
# TASK-TEAM-0021 — Team knowledge build and query dry-run

## Goal

Implement a lexical-first dry-run build/query surface for Team Agents knowledge.

## Why

The knowledge layer is only useful if Captain / Planner / Knowledge Scout can query it quickly before work starts. This card proves the system can:

- build a manifest / inverted index from canonical shards,
- query top hits with metadata filters,
- and degrade safely when no index exists yet.

## Implementation Contract

- Add a Team Agents knowledge build/query command surface under `team`.
- Use metadata filters first (`repo / channel / domain / path / atom / validator`) and lexical ranking second.
- Keep the feature dry-run friendly and advisory-only.
- Read full shard bodies only after shortlist selection; do not stream the whole corpus into every response.

## Deliverables

- `packages/cli/src/commands/team.ts`
- `packages/cli/src/commands/team-knowledge.ts`
- `packages/cli/src/commands/command-specs/team.spec.ts`
- `packages/plugin-governance-local/src/stores.ts`
- `scripts/validate-cli.ts`
- `scripts/validate-team-agents.ts`
- `scripts/validate-governance-local.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `npm run validate:cli`
- `node --strip-types scripts/validate-governance-local.ts`
- `node --strip-types scripts/validate-team-agents.ts`
- `node atm.mjs team knowledge build --scope project --dry-run --json`
- `node atm.mjs team knowledge query --task TASK-AAO-0005 --top 5 --json`
- `git diff --check`

## Acceptance Criteria

- `team knowledge build --dry-run` can discover canonical shards and report planned manifest / lexical index outputs.
- `team knowledge query` supports metadata filtering and lexical ranking with compact top-hit output.
- When no index exists, query reports the missing build step instead of failing obscurely.
- The implementation is lexical-first and does not require vector or embedding support.
- The feature remains advisory-only and does not mutate task selection, task status, or evidence authority.

## Rollback

Revert build/query commands, validator changes, generated-root handling, and atom map entries.

## Atomization Impact

- Owner atom/map: `atm.team-agents-knowledge-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card proves that indexed lessons can be fast enough to use before work, without turning the knowledge layer into a heavyweight vector feature.
