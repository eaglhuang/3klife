---
task_id: TASK-AAO-0142
title: "Auto-run declared validators into evidence before close"
status: planned
priority: P0
closure_authority: target_repo
depends_on:
  - TASK-AAO-0015
  - TASK-AAO-0016
  - TASK-AAO-0017
  - TASK-AAO-0140
scopePaths:
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/taskflow.ts"
  - "packages/cli/src/commands/taskflow/**"
  - "packages/cli/src/commands/command-specs/evidence.spec.ts"
  - "packages/cli/src/commands/command-specs/taskflow.spec.ts"
  - "scripts/validate-cli.ts"
  - "tests/**"
deliverables:
  - "A governed close/pre-close auto-evidence mode that discovers task-card declared validators and runs the missing required ones without requiring the operator to pass --validators by hand."
  - "A dry-run plan that lists validators to run, already-satisfied validators, skipped out-of-scope validators, and commands that require explicit operator approval."
  - "Command-backed evidence records for successful auto-runs, using the same validator identity normalization as evidence validators --list and evidence missing."
  - "CLI help/spec updates showing that --validators is an override, not the normal happy path."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.cli-evidence-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/evidence.ts"
      atom_id: "atm.evidence-command-runner"
      capability: "Validator discovery, identity normalization, and command-backed evidence capture"
      coverage_status: "active"
outOfScope:
  - "Running arbitrary validators outside the task card or framework-required close gate without explicit operator opt-in."
  - "Replacing taskflow close or evidence run with a separate lifecycle command."
nonGoals:
  - "Do not make every global validator mandatory for every task."
  - "Do not hide failed validator output; failure must remain a close blocker with rerunnable commands."
contextMap:
  primary:
    - path: "packages/cli/src/commands/evidence.ts"
      reason: "validator catalog, missing report, evidence run, and identity normalization"
    - path: "packages/cli/src/commands/taskflow.ts"
      reason: "close/pre-close orchestration entry"
  secondary:
    - path: "packages/cli/src/commands/command-specs/evidence.spec.ts"
      reason: "operator-facing surface"
    - path: "packages/cli/src/commands/command-specs/taskflow.spec.ts"
      reason: "close/pre-close surface"
  tests:
    - path: "scripts/validate-cli.ts"
      reason: "CLI regression coverage"
---

## Goal
Make ATM run the validators already declared by the task contract during close preparation, so an agent can choose an automatic evidence path instead of manually guessing `--validators` values. This keeps the loose/tight rhythm: implementation stays flexible, but close converges through deterministic evidence.

## Acceptance
- `taskflow pre-close` or `taskflow close --dry-run` exposes an auto-evidence plan for missing required validators.
- A write/execute mode records successful required validators as command-backed evidence without asking for manual `--validators` when the command maps to a declared validator.
- Failed validator runs do not create validation pass evidence and produce a clear rerunnable remediation command.
- Existing explicit `--validators` behavior still works as an override for extra evidence outside the task-card baseline.

## Exclusion Rules
- Do not run validators that are not declared by the task card or required by framework close policy unless the operator explicitly asks.
- Do not weaken evidence freshness or command-run proof requirements.

## Verification
```bash
npm run typecheck
npm run validate:cli
git diff --check
```

## Closure & Reports
1. Report which commands were auto-discovered and how their validator names were normalized.
2. Include one passing auto-evidence case and one failed-validator blocker case.
3. Confirm the operator docs no longer imply manual `--validators` is required for normal declared validators.
