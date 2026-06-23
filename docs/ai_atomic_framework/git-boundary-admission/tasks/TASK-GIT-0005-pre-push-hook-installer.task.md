---
task_id: TASK-GIT-0005
title: Pre-push hook installer
status: planned
milestone: G2
depends_on:
  - TASK-GIT-0004
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/git.ts"
  - "integrations/**"
  - "tests/cli/**"
deliverables:
  - "Install, verify, and uninstall flow for the ATM pre-push hook."
  - "Hook body that delegates to the CLI instead of embedding broker logic."
  - "Clear instructions for manual hook installation."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No global Git config mutation without explicit operator command."
nonGoals:
  - "No attempt to prevent deliberate `--no-verify` bypass."
atomizationImpact:
  ownerAtomOrMap: "atm.git-pre-push-hook"
  mapUpdates: []
---

# TASK-GIT-0005

## Goal

Make the pre-push admission command easy to install and verify without hiding the policy in an opaque hook script.

## Acceptance

- Hook installer writes a minimal, reviewable hook.
- Hook verifier confirms the hook points at the current ATM entry point.
- Uninstall restores the previous hook or reports that no ATM hook was installed.
- Hook output stays short and points to the full evidence report on failure.

