---
task_id: TASK-AAO-0144
title: "Governed git entrypoint and build output hygiene"
status: planned
priority: P1
closure_authority: target_repo
depends_on:
  - TASK-AAO-0051
  - TASK-AAO-0141
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/framework-development.ts"
  - "packages/cli/src/commands/command-specs/git.spec.ts"
  - "scripts/build-onefile-release.ts"
  - "scripts/**"
  - "package.json"
  - "docs/**"
deliverables:
  - "A clear governed git commit entrypoint story: next/playbooks prefer atm git commit, direct git commit remains possible but diagnostics explain when the wrapper is required."
  - "ATM git commit emits copyable fallback commands, stable trailers, and host-git compatibility guidance when the wrapper cannot complete."
  - "Build workflow documents and/or implements a no-release-dirty default or explicit retain-artifacts mode so ordinary validation does not leave confusing release mirror dirt."
  - "Hook or guidance diagnostics identify direct git commit attempts that should use the ATM wrapper without hard-banning legitimate low-level git use."
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
