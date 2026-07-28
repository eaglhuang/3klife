---
doc_id: doc_team_0020
task_id: TASK-TEAM-0020
title: "Team knowledge storage boundary and index contract"
status: done
owner: atm-core
priority: P1
milestone: M2K
depends_on:
  - "TASK-TEAM-0005"
  - "TASK-TEAM-0017"
related_plan: "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/knowledge-index-contract.md"
  - "docs/governance/team-agents/templates/README.md"
  - "docs/governance/team-agents/templates/team-memory-shard-template.md"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-governance-local.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/governance/team-agents/knowledge-index-contract.md"
  - "docs/governance/team-agents/templates/README.md"
  - "docs/governance/team-agents/templates/team-memory-shard-template.md"
  - "packages/plugin-governance-local/src/stores.ts"
  - "scripts/validate-governance-local.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-governance-local.ts"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove knowledge contract doc, template/readme alignment, store path changes, validator updates, and atom map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-knowledge-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
  notes: "Knowledge contract doc, template updates, and governance-local storage boundary must map to one owner atom/map."
outOfScope:
  - "Knowledge query engine implementation"
  - "Vector retrieval or embedding cache"
  - "next / playbook guidance integration"
  - "Automatic mutation of .atm/runtime/** outside generated cache roots"
nonGoals:
  - "Do not create a second registry, task store, or promotion path"
  - "Do not make knowledge hits authoritative over task cards or evidence"
dispatch_pattern:
  shape: "dual-agent (Phase 0 knowledge planner + Phase 1 builder)"
  rationale: "The boundary contract must be precise before runtime query work starts; a read-only sidecar can prepare the storage and guard brief while the builder only touches target-repo files."
  phase_0:
    lane: "helper (read-only sidecar)"
    allowed_files:
      - "docs/ai_atomic_framework/team-agents/團隊自動化代理分工計畫.md"
      - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0020-*.task.md"
    commit_budget: 0
    output: "Phase 1 brief covering canonical shard roots, runtime cache roots, framework/project split, and no-second-registry guard."
  phase_1:
    lane: "external builder 001-006"
    allowed_files_strict: true
    forbidden_files:
      - "C:/Users/User/3KLife/**"
      - ".atm/runtime/**"
      - ".atm/history/**"
    commit_budget: 2
    commit_layout:
      - "commit_1: knowledge contract doc + template/readme alignment"
      - "commit_2: stores/validators/map + close evidence"
  condition_review:
    - "Canonical lesson roots and generated cache roots are defined separately"
    - "Framework lesson and project lesson roots are both explicit"
    - "No file under .atm/history/** becomes part of the contract"
    - "No line describes knowledge as a new registry or authority source"
completed_at: "2026-06-17T17:12:14.543Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-17T17-12-14-022Z-close-41caecd9431b"
delivery_commit: "e7f214a3b458531cf8d88cf3abbed4fd3780b284"
---
# TASK-TEAM-0020 — Team knowledge storage boundary and index contract

## Goal

Define the canonical storage boundary and advisory-only contract for Team Agents knowledge shards and generated indexes.

## Why

Before build/query runtime exists, Team Agents needs one clear answer to:

- where human-reviewable lesson shards live,
- where generated manifest / inverted-index / embedding cache live,
- how framework knowledge differs from project knowledge,
- and how the knowledge layer avoids becoming a second registry.

## Implementation Contract

- Create a framework-facing knowledge contract doc under `docs/governance/team-agents/`.
- Align the team-memory-shard template and templates README with the same storage and boundary rules.
- Teach governance-local path validation about the distinction between canonical shard roots and generated cache roots.
- Keep the whole feature advisory-only; this card defines storage and policy, not query behavior.

## Deliverables

- `docs/governance/team-agents/knowledge-index-contract.md`
- `docs/governance/team-agents/templates/README.md`
- `docs/governance/team-agents/templates/team-memory-shard-template.md`
- `packages/plugin-governance-local/src/stores.ts`
- `scripts/validate-governance-local.ts`
- `scripts/validate-team-agents.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Validators

- `npm run typecheck`
- `node --strip-types scripts/validate-governance-local.ts`
- `node --strip-types scripts/validate-team-agents.ts`
- `git diff --check`

## Acceptance Criteria

- The contract defines canonical shard roots under `.atm/knowledge/**` and generated cache roots under `.atm/runtime/knowledge/**`.
- The contract distinguishes framework-only knowledge from project/adopter-local knowledge.
- The templates remain Markdown-first and advisory-only.
- The validators reject any attempt to treat generated runtime cache as canonical knowledge input.
- The docs explicitly state that the knowledge layer is not a second registry, task store, or promotion path.

## Rollback

Revert the knowledge contract doc, template/readme alignment, storage validation changes, and atom map updates.

## Atomization Impact

- Owner atom/map: `atm.team-agents-knowledge-map`
- Map updates:
- `atomic_workbench/atomization-coverage/path-to-atom-map.json`

## Notes

This card is the boundary contract for all later knowledge tasks. Query, compact, captain brief, and optional vector rerank all depend on this line being drawn first.
