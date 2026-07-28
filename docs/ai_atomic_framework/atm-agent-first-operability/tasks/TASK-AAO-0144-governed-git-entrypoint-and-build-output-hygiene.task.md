---
task_id: TASK-AAO-0144
title: "Governed git entrypoint and build output hygiene"
status: done
started_at: 2026-06-18T11:00:00Z
started_by_agent: cursor-gpt-5.2
notes: "2026-06-18 | delivery 2c6f90664 | close AAF da9c3dd8 planning fd22e776 | build-release-hygiene + governed git entrypoint"
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0141
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/build-release-hygiene.ts"
  - "scripts/validate-governance-commands.ts"
  - "tests/cli/build-release-hygiene.test.ts"
  - "package.json"
  - "docs/governance/build-release-hygiene.md"
targetAllowedFiles:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/build-release-hygiene.ts"
  - "scripts/validate-governance-commands.ts"
  - "package.json"
  - "docs/governance/build-release-hygiene.md"
  - "tests/cli/build-release-hygiene.test.ts"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/framework-development/build-release-hygiene-hints.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/build-release-hygiene.ts"
  - "scripts/validate-governance-commands.ts"
  - "package.json"
  - "docs/governance/build-release-hygiene.md"
  - "tests/cli/build-release-hygiene.test.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "git diff --check"
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-map"
  mapUpdates:
    - path_pattern: "packages/cli/src/commands/git-governance.ts"
      atom_id: "atm.governed-git-wrapper"
      capability: "Governed commit wrapper, trailers, and fallback diagnostics"
      coverage_status: "active"
outOfScope:
  - "Removing shell access to git entirely."
  - "Changing host repository branch protection or CI policy."
nonGoals:
  - "Do not make build artifacts disappear when the operator explicitly asks to produce a release bundle."
  - "Do not require ATM wrapper for read-only git commands."
contextMap:
  primary:
    - path: "packages/cli/src/commands/git-governance.ts"
      reason: "governed commit wrapper"
    - path: "packages/cli/src/commands/hook.ts"
      reason: "git governance hook diagnostics"
    - path: "packages/cli/src/commands/next.ts"
      reason: "operator playbook guidance"
  secondary:
    - path: "scripts/build-onefile-release.ts"
      reason: "build output policy"
    - path: "docs/**"
      reason: "operator-facing guidance"
  tests:
    - path: "scripts/validate-governance-commands.ts"
      reason: "governance command regression coverage"
completed_at: "2026-06-18T13:27:53.455Z"
completed_by_agent: "cursor-gpt-5.2"
delivery_commit: "2c6f90664"
closedAt: "2026-06-18T13:27:53.455Z"
closedByActor: "cursor-gpt-5.2"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-18T13-27-53-079Z-close-471e790d8431"
lastTransitionAt: "2026-06-18T13:27:53.455Z"
ledgerContractVersion: "task-ledger/v1"
---

## Goal
Make the ATM wrapper the easiest and clearest commit path without over-policing the agent. Direct `git commit` should not be banned at the OS/tool level, but ATM should warn, block, or redirect when governed task closure needs trailers, task attribution, or exact staging.

## Acceptance
- Normal and batch playbooks point to `node atm.mjs git commit ...` for governed commits.
- A direct git commit in a governed close/commit window produces a clear diagnostic explaining the wrapper command when wrapper enforcement applies.
- The wrapper uses host-compatible git invocation and returns a copyable fallback if it cannot complete.
- Build/release scripts clarify whether release mirror outputs are retained or cleaned, and ordinary validation avoids leaving accidental release mirror dirt when possible.

## Exclusion Rules
- Do not remove the ability to use direct git for read-only commands, emergency inspection, or non-governed maintenance.
- Do not silently delete release artifacts that are required delivery evidence.

## Verification
```bash
npm run typecheck
npm run validate:cli
node --strip-types scripts/validate-governance-commands.ts --mode validate
git diff --check
```

## Closure & Reports
1. Include one ATM wrapper success case and one wrapper fallback/diagnostic case.
2. State the exact policy for direct `git commit` versus `atm git commit`.
3. State the build artifact retention/cleanup behavior and how an operator opts into retaining release outputs.
