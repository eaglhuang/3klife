---
task_id: TASK-MAO-0035
doc_id: doc_mao_0035
title: "Staged cross-file consistency and session residue guardrails"
status: in-progress
started_at: "2026-06-16T17:02:16+08:00"
started_by_agent: "antigravity-gemini-3.5-flash"
milestone: M3
priority: P0
closure_authority: target_repo
depends_on: []
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書2.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/framework-mode.spec.ts"
  - "packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "scripts/validate-framework-development-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/command-specs/framework-mode.spec.ts"
  - "packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "scripts/validate-framework-development-governance.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-framework-development-governance.ts"
  - "node --strip-types packages/cli/src/commands/__tests__/framework-mode-staged-residue.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert staged-residue guardrail changes, tests, and atom-map updates."
atomizationImpact:
  ownerAtomOrMap: "atm.framework-session-residue-guardrails-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Auto-stash on framework-mode release"
  - "Integration manifest enforcement"
  - "Batch checkpoint or closeback changes"
nonGoals:
  - "Do not create a second task lifecycle."
  - "Do not auto-commit user work."
  - "Do not solve the entire broker/team-lane integration backlog in this card."
---

# TASK-MAO-0035 - Staged cross-file consistency and session residue guardrails

## Goal

Prevent partial staged WIP from leaking across session transitions or leaving the source view in a broken cross-file state.

## Implementation Contract

- Add one shared guardrail that can detect staged residue during framework-mode session transitions and on commit-adjacent checks.
- If staged files exist outside the active claim or session boundary, fail closed with a deterministic recovery hint.
- If a staged file set imports symbols that are not satisfied by the staged sibling files, reject the staged set before it can poison the source view.
- Keep the recovery path explicit: adopt, stash, or widen scope through a governed route.
- Do not invent a new registry, task lifecycle, or auto-stash shortcut.

## Acceptance Criteria

- Session-end and resume checks report orphan staged residue with an actionable recovery hint.
- Stage-time checks reject the partial broker/team-lane style mismatch that caused the source-first runner failure.
- Valid staged sets for a single governed task still pass.
- Regression coverage covers the observed partial-stage incident class.
- The guardrail remains a thin CLI/hook addition and does not expand into a separate workflow engine.
