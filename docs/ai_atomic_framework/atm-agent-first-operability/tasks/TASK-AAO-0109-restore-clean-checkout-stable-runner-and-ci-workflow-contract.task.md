---
doc_id: ""
task_id: TASK-AAO-0109
title: "Restore clean-checkout stable runner and CI workflow contract"
milestone: M15
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: "2026-06-20T12:00:00+08:00"
started_by_agent: "cursor-gpt-5.2"
blocked_by: []
owner: atm-core
priority: P0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: phase1-restore-ci-contract
scopePaths:
  - ".gitignore"
  - ".github/workflows/atm-map-ci.yml"
  - "packages/cli/src/commands/doctor.ts"
  - "release/atm-onefile/atm.mjs"
deliverables:
  - ".gitignore"
  - ".github/workflows/atm-map-ci.yml"
  - "packages/cli/src/commands/doctor.ts"
  - "release/atm-onefile/atm.mjs"
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0109-restore-clean-checkout-stable-runner-and-ci-workflow-contract.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
  - .gitignore
  - .github/workflows/atm-map-ci.yml
  - packages/cli/src/commands/doctor.ts
  - release/atm-onefile/atm.mjs
forbidden_files:
  - packages/cli/src/commands/tasks.ts
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0108-*.task.md
non_goals:
  - "Do not resolve public access permission issues as the root cause of CI failures."
  - "Do not triage or repair Dependabot security PRs."
  - "Do not merge PR #5, #7, #9, #12, or #14."
  - "Do not clean unrelated dirty / untracked files."
  - "Do not mutate other 3KLife task cards."
notes: "2026-06-01 | status: open | validation: pending | change: Phase 0 create card for clean checkout stable runner and CI contract | blocker: TASK-AAO-0108 | risk: artifact tracking vs build order conflicts"
completed_at: "2026-06-20T03:07:08.938Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "c1cc87996"
---

# TASK-AAO-0109 Restore clean-checkout stable runner and CI workflow contract

## Goal
Restore the stable runner build contracts under a clean checkout environment, and repair the `atm-map-ci.yml` syntax errors to ensure that the GitHub Actions CI workflows pass successfully.

## Root Cause Analysis
- Running `node atm.mjs doctor --json` fails in clean checkouts because the entry point script `atm.mjs` depends on compiled output at `release/atm-onefile/atm.mjs` or `packages/cli/dist/atm.js`.
- These output directories `release/` and `dist/` are currently ignored in `.gitignore`, which means a fresh git clone lacks the required compiled runner files.
- On local developer environments, pre-existing build artifacts hide this gap (leading to "false green" states), while fresh CI runner environments (clean checkout) immediately fail with missing module errors.
- Additionally, `atm-map-ci.yml` contains a CLI syntax bug: `npm run --silent -- node ...` which improperly treats `node` as an npm script parameter instead of invoking node directly.

## Phase 1 Scope
- Evaluate and adjudicate between two clean checkout restoration strategies:
  - **A. Artifact Tracking**: Track a pre-compiled stable runner version in release branches so clean clone runtimes can immediately execute `node atm.mjs` without build cycles.
  - **B. Build-First Order**: Explicitly trigger `npm run build` inside all CI/CD pipelines before any `node atm.mjs` execution is invoked.
- Update `.gitignore` and `atm.mjs` bootloaders if Strategy A is chosen.
- Modify `.github/workflows/ci.yml`, `adopter-sentinel.yml`, `neutrality.yml`, and `atm-map-ci.yml` to formalize build dependencies and fix the `npm run --silent` syntax issue.
- Verify clean checkouts execute `doctor` and validators successfully.

## Phase 1 target allowedFiles
- `C:/Users/User/AI-Atomic-Framework/.gitignore`
- `C:/Users/User/AI-Atomic-Framework/atm.mjs`
- `C:/Users/User/AI-Atomic-Framework/release/atm-onefile/atm.mjs`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/dist/atm.js`
- `C:/Users/User/AI-Atomic-Framework/.github/workflows/ci.yml`
- `C:/Users/User/AI-Atomic-Framework/.github/workflows/adopter-sentinel.yml`
- `C:/Users/User/AI-Atomic-Framework/.github/workflows/neutrality.yml`
- `C:/Users/User/AI-Atomic-Framework/.github/workflows/atm-map-ci.yml`

## Acceptance Criteria
- Clean checkouts of the repository can run `npm ci` and successfully execute `node atm.mjs` commands.
- All CI workflows (CI, adopter-sentinel, neutrality, atm-map-ci) pass without failing on missing runner files.
- Syntax errors in `atm-map-ci.yml` are resolved (no `npm run --silent -- node` bugs).
- No emergency bypass, `--no-verify`, or silent waiver overrides are used.

## Forbidden
- Do not bypass verification using `--no-verify`.
- Do not attribute GitHub Actions red state to public permission or visibility issues.
- Do not triage or repair Dependabot PRs (#5, #7, #9, #12, #14).
- Do not clean unrelated dirty / untracked workspace files.
- Do not mutate unrelated 3KLife task cards.

## Validators
- `npm ci`
- `npm run build`
- `node atm.mjs doctor --json`
- `node atm.mjs verify --neutrality --json --cwd .`
- `node --experimental-strip-types scripts/adopter-sentinel.ts --mode validate`
- `node atm.mjs test --map ATM-MAP-0003 --fingerprint-check --json`
- `npm run lint`
- `npm test`
- `npm run validate:standard`
- `node atm.mjs hook pre-push --json`

## Plain-language Anchor
這張 P0 卡負責修復「乾淨下載後主程式缺件跑不動」的 CI 故障。要讓新裝機的電腦先熱機（build）再開跑，並修正自動巡檢中 node命令的語法錯誤。
