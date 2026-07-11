---
task_id: TASK-AAO-0157
title: "Framework auto-stage must honor claim globs and include dirty release mirrors"
status: in_progress
owner: cursor-captain-backlog
priority: P0
milestone: Backlog-P0
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
related_backlog: ATM-BUG-2026-07-11-108
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
started_at: "2026-07-11T16:30:00.000Z"
started_by_agent: cursor-captain-backlog
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "scripts/validate-governance-commands.ts"
  - "docs/governance/atm-bug-and-optimization-backlog.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-governance-commands.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the framework auto-stage claim-glob matching and the focused release-mirror regression."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Team Agents provider orchestration or packages/cli/src/commands/team.ts behavior"
  - "Broad auto-stage of arbitrary .atm/runtime residue"
  - "Changing protected push or same-commit provenance semantics"
nonGoals:
  - "Do not silently commit out-of-claim dirty files"
  - "Do not weaken staging-required fail-closed diagnostics"
---

# TASK-AAO-0157 - Framework auto-stage claim glob and release mirrors

## Problem

`ATM-BUG-2026-07-11-108`: `node atm.mjs git commit --auto-stage` can return
`ATM_GIT_COMMIT_OK` while committing only `.atm/history/evidence/git-head.jsonl`.
Tracked dirty release mirrors remain in the worktree. Observed on commit
`057ac25cb755` (`chore(release): sync three-vendor Team runtime`).

Root cause: `isFrameworkGeneratedArtifactAllowed()` uses exact
`claimedFiles.has(path)` and does not apply `pathMatchesTaskScope()` to claim
globs such as `release/**`. Dirty release files that are not listed in
`release-*/release-manifest.json` generatedFiles are treated as out-of-scope,
so auto-stage skips them and the staging-required gate also misses them.

## Acceptance

- Claim globs (`release/**`, `packages/cli/src/**`, etc.) match concrete dirty
  paths during framework auto-stage and staging-required inspection.
- `release/atm-root-drop/<claimed-source>` continues to match claimed sources.
- Manifest `generatedFiles` remain allowed when any active claim exists.
- A regression proves: claim includes `release/**`, dirty tracked release
  mirrors exist, `--auto-stage` commits those mirrors (not only git-head), and
  post-commit status for those paths is clean.
- Auto-stage success must fail closed if claim-scoped dirty files remain after
  staging (excluding ignorable evidence side effects).
- Backlog row `ATM-BUG-2026-07-11-108` is updated to Fixed with this task id.

## Context Map

### Primary
- `packages/cli/src/commands/git-governance.ts` — claim-glob matching + fail-closed residual dirty check

### Secondary
- `scripts/validate-governance-commands.ts` — focused auto-stage release-mirror regression

### Test Coverage
- Extend the existing framework auto-stage fixture in `validate-governance-commands.ts`

### Patterns to Follow
- Reuse `pathMatchesTaskScope()` already used by task-scoped staging

## Forbidden

- `--no-verify` / `--force` / SAFE_MODE
- Touching `packages/cli/src/commands/team.ts` or team-runtime providers
- Status-mirror commits in 3KLife after open
- Broad `git add .` or clearing unrelated dirty/untracked residue
