---
task_id: TASK-GIT-0011
title: Adopter docs and runbook
status: done
milestone: G4
depends_on:
  - TASK-GIT-0010
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
completed_at: 2026-06-23T06:59:27.099Z
scopePaths:
  - "docs/**"
  - "integrations/**"
  - "packages/cli/src/commands/integration.ts"
deliverables:
  - "Adopter-facing setup guide."
  - "Operator runbook for allow, block, composer-routed, fallback, and bypass cases."
  - "Troubleshooting notes for common Git states."
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
out_of_scope:
  - "No host-specific project policy in framework docs."
nonGoals:
  - "No marketing copy."
atomizationImpact:
  ownerAtomOrMap: "atm.git-boundary-docs"
  mapUpdates: []
---

# TASK-GIT-0011

## Goal

Write the adopter documentation needed for teams to use Git-boundary admission safely.

## Acceptance

- Docs explain the pre-push design in plain terms.
- Docs include install, verify, uninstall, and recovery commands.
- Docs include examples for allow, block, composer-routed, and post-push-fail cases.
- Docs warn that the MVP is local-hook based and not a server-side policy substitute.
