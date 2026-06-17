---
task_id: TASK-MAO-0032
doc_id: doc_mao_0032
title: "Validator and reviewer Team Agents roles for waves"
status: done
closeback_note: "Delivered + governed-closed in AI-Atomic-Framework on 2026-06-17 (actor claude-code-opus-4-7); planning mirror synced to done."
owner: atm-core
priority: P1
milestone: M6
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0027"
  - "TASK-MAO-0028"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - ".atm/config/team-recipes/"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert validator/reviewer role definitions, recipe updates, tests, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.team-wave-validator-reviewer-roles-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "External agent spawning"
  - "Humanless merge approval"
nonGoals:
  - "Do not make validator and reviewer roles optional for high-risk waves."
---

# TASK-MAO-0032 - Validator and reviewer Team Agents roles for waves

## Goal

Define wave-specific validator and reviewer roles so speed includes verification, not only writing.

## Implementation Contract

- Add or document recipe role expectations for validator and reviewer agents.
- Validator role owns command execution summary and pass/fail report.
- Reviewer role owns scope drift, task/deliverable mapping, and first diagnostic.
- Evidence agent may normalize reports but cannot override validator/reviewer verdicts.

## Acceptance Criteria

- Team wave recipes expose validator and reviewer roles.
- Reports include role-specific sections.
- High-risk waves fail validation if validator/reviewer role coverage is absent.
