---
task_id: TASK-AAO-0107
title: "Dependency security CI triage"
status: open
priority: P0
created_at: 2026-06-01T16:10:00+08:00
created_by_agent: codex-gpt-5
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - TASK-AAO-0103
scopePaths:
  - package.json
  - package-lock.json
  - eslint.config.mjs
  - .github/workflows/ci.yml
  - .github/workflows/adopter-sentinel.yml
  - scripts/adopter-sentinel.ts
  - scripts/run-validators.ts
  - .atm/history/evidence/TASK-AAO-0107.json
  - .atm/history/evidence/TASK-AAO-0107.closure-packet.json
  - .atm/history/tasks/TASK-AAO-0107.json
deliverables:
  - "Lockfile sync that restores npm ci on a clean GitHub Actions runner."
  - "Dependabot PR triage report for PR #5, #7, #9, #12, and #14."
  - "A controlled merge/defer/supersede decision for ESLint, @eslint/js, typescript, @types/node, and typescript-eslint updates."
  - "CI evidence showing adopter-sentinel and standard validators pass after dependency decisions."
validators:
  - "npm ci"
  - "npm run typecheck"
  - "npm run lint"
  - "npm run validate:cli"
  - "npm run validate:git-hooks-enforcement"
  - "npm run validate:task-ledger-governance"
  - "node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate"
  - "gh pr list --repo eaglhuang/AI-Atomic-Framework --state open --json number,title,statusCheckRollup"
rollback:
  strategy: revert-commit
  notes: "Revert only the dependency/lockfile/CI-triage delivery commit and TASK-AAO-0107 closure ledger. Do not revert unrelated Dependabot branches or task-card drafts."
atomizationImpact: "Keeps external clone/install health separate from feature work so public adopters and AI agents can run npm ci before evaluating the framework."
outOfScope:
  - "Feature source changes outside dependency compatibility fixes."
  - "Blindly merging all Dependabot PRs without validator evidence."
  - "Major TypeScript or ESLint migration refactors beyond the minimum needed to classify the PR."
  - "Changing repository visibility or GitHub organization settings."
  - "Closing unrelated PRs without a documented decision."
nonGoals:
  - "Fix every future Dependabot alert in this single task."
  - "Treat Node.js 20 action deprecation warnings as the current adopter-sentinel failure root cause."
notes: "2026-06-01 | status: open | validation: pending | change: classify GitHub Actions npm ci failure and Dependabot security PR failures | blocker: package-lock missing @ai-atomic-framework/atm-markdown-task-source | risk: public adopters and AI tools may judge the repo unhealthy when clean install fails"
---

# TASK-AAO-0107 Dependency security CI triage

## Goal
Restore clean dependency install and make a governed decision on the open Dependabot security PRs.

The immediate red CI failure is not caused by the adopter sentinel logic itself. GitHub Actions fails earlier at `npm ci` because `package.json` and `package-lock.json` are out of sync for `@ai-atomic-framework/atm-markdown-task-source`.

This card keeps that lockfile fix tied to the related dependency PR triage without turning it into a broad feature refactor.

## Dependabot PRs In Scope
- PR #5: `security(deps-dev): bump @eslint/js from 9.39.4 to 10.0.1`
- PR #7: `security(deps-dev): bump eslint from 9.39.4 to 10.4.0`
- PR #9: `security(deps): bump typescript from 5.9.3 to 6.0.3`
- PR #12: `security(deps-dev): bump @types/node from 24.12.3 to 25.9.1`
- PR #14: `security(deps-dev): bump typescript-eslint from 8.59.2 to 8.60.0`

## Required Decisions
- Decide whether the lockfile sync should be a standalone delivery commit before dependency PR work.
- Decide whether ESLint-related PRs should be merged individually or superseded by a combined compatibility branch.
- Decide whether TypeScript 6 and Node 25 type bumps are safe now or should be deferred with a compatibility note.
- Record each PR as `merge`, `defer`, or `supersede`, with validator evidence.

## Acceptance Criteria
- `npm ci` passes on a clean checkout.
- `node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate` passes after install.
- The Node.js 20 Actions deprecation warning is documented as non-root-cause unless a workflow update is actually needed.
- PR #5, #7, #9, #12, and #14 each have a written outcome.
- No feature source changes are included unless they are the minimal compatibility fix required by a dependency update.
- `package-lock.json` changes are intentional and explained, not silently absorbed from an unrelated task.

## Validators
- `npm ci`
- `npm run typecheck`
- `npm run lint`
- `npm run validate:cli`
- `npm run validate:git-hooks-enforcement`
- `npm run validate:task-ledger-governance`
- `node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate`

## Rollback
Revert the dependency/lockfile delivery commit and the matching TASK-AAO-0107 closure ledger. If a Dependabot PR was merged separately and later fails, revert that PR merge independently with its own evidence.
