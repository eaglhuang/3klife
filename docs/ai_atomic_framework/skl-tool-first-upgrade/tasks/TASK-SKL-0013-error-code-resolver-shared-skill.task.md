---
task_id: TASK-SKL-0013
title: Error-code resolver shared skill and registry
status: planned
milestone: P1
depends_on:
  - TASK-SKL-0002
  - TASK-SKL-0005
  - TASK-SKL-0007
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
closure_authority: target_repo
scopePaths:
  - "docs/ERROR_CODES.md"
  - "docs/cli-error-policy.md"
  - "docs/governance/**"
  - "templates/skills/**"
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".cursor/rules/skills/**"
  - "integrations/codex-skills/**"
  - "packages/cli/src/commands/**"
  - "scripts/generate-error-code-index.ts"
  - "scripts/validate-skill-templates.ts"
deliverables:
  - "docs/ERROR_CODES.md"
  - "docs/cli-error-policy.md"
  - "docs/governance/**"
  - "templates/skills/**"
  - ".agents/skills/**"
  - ".claude/skills/**"
  - ".cursor/rules/skills/**"
  - "integrations/codex-skills/**"
  - "packages/cli/src/commands/**"
  - "scripts/generate-error-code-index.ts"
  - "scripts/validate-skill-templates.ts"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:skill-templates"
  - "npm run generate:error-codes"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert registry, generator, and skill-template changes if the resolver fragments the error-code source of truth or causes adapter drift."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.error-code-registry"
      pattern: "Registry-backed projection"
      source: "scripts/generate-error-code-index.ts"
      disposition: "extract"
      inlineReason: null
    - atom: "atm.error-code-resolver-skill"
      pattern: "Shared skill reference"
      source: "templates/skills/atm-error-code-resolver.skill.md"
      disposition: "extract"
      inlineReason: null
out_of_scope:
  - "Do not let each skill maintain a private copy of error-code meanings."
  - "Do not replace CLI structured result envelopes with prose-only documentation."
  - "Do not hand-edit generated projections without updating the generator or registry source."
nonGoals:
  - "No requirement to fully rewrite every historical error code in one pass if a staged registry can mark unknown codes as undocumented."
  - "No vendor-specific resolver behavior."
---

# TASK-SKL-0013

## Goal

Create a shared ATM error-code resolver skill backed by one canonical registry
or registry-generated projection. The resolver must let any ATM skill translate
an `ATM_*` code or CLI JSON output into a consistent operator answer:
meaning, severity/category, likely cause, minimal recovery path, retryability,
approval requirements, and related command/runbook.

This card exists because `docs/ERROR_CODES.md` is currently only a generated
source-location index. It is useful for developers, but it is not enough for
agents or humans trying to recover from a live governed workflow blocker.

## Acceptance

- `ATM_*` error-code knowledge has one canonical structured source or generated
  projection with these fields at minimum: code, category, shortDescription,
  commonCauses, remediation, retryable, requiresHumanApproval, relatedCommands,
  and sourceOwner.
- A shared `atm-error-code-resolver` skill exists in the source skill-template
  system and is compiled/installed consistently for supported ATM skill
  surfaces.
- Other ATM skills are instructed to route error-code interpretation through
  the shared resolver instead of duplicating one-off explanations.
- The generator keeps `docs/ERROR_CODES.md` useful while adding or linking to
  operator-facing remediation data.
- Representative codes resolve with useful remediation, including:
  - `ATM_GIT_COMMIT_STDIN_PATHSPEC_ADD_ACTIVE`
  - `ATM_GIT_COMMIT_BRANCH_QUEUE_BUSY`
  - `ATM_NEXT_TASK_SCOPE_NOT_FOUND`
  - `ATM_TASKS_AUDIT_WARNINGS`
  - `ATM_RUNNER_SYNC_REQUIRED`
  - one Team/Broker conflict code.
- Unknown or newly introduced codes fail gracefully with a clear
  "registry entry missing" remediation path, not silence.

## Verification

```bash
npm run typecheck
npm run validate:cli
npm run validate:skill-templates
npm run generate:error-codes
git diff --check
```
