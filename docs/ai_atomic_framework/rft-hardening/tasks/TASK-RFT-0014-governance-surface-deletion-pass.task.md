---
doc_id: doc_rft_0014
task_id: TASK-RFT-0014
title: "Governance surface deletion pass (delete deprecated reserve/promote, delete disabled git-head evidence path, merge overlapping validators, dedupe skill registration)"
status: done
owner: atm-core
priority: P1
milestone: RFT-M5
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/tasks/command-dispatch.ts"
  - "packages/cli/src/commands/tasks/lifecycle-state.ts"
  - "packages/cli/src/commands/tasks/result-contracts.ts"
  - "packages/cli/src/commands/tasks/status-triangulation.ts"
  - "packages/cli/src/commands/tasks/close-governance.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "packages/cli/src/commands/git-head-evidence.ts"
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/doctor.ts"
  - "packages/cli/src/commands/hook.ts"
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/evidence.ts"
  - "packages/cli/src/commands/framework-development/closure-packet-schema.ts"
  - "packages/cli/src/commands/tasks/close-helpers/close-window-diagnostics.ts"
  - "scripts/validate-git-head-evidence.ts"
  - "scripts/run-validators.ts"
  - "package.json"
  - ".claude/skills/"
  - "integrations/"
  - "docs/reports/tasks-command-atomic-map.md"
deliverables:
  - "packages/cli/src/commands/tasks.ts"
  - "packages/cli/src/commands/command-specs/tasks.spec.ts"
  - "scripts/run-validators.ts"
  - "package.json"
  - "docs/reports/tasks-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "npm run validate:tasks-surface"
  - "npm run validate:governance-commands"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if any adopter workflow still invokes tasks reserve/promote or depends on the disabled git-head evidence enforcement path; the deletion commit must be a single revertable unit per deletion cluster."
atomizationImpact:
  ownerAtomOrMap: "atm.tasks-command-atomic-map"
  mapUpdates:
    - "docs/reports/tasks-command-atomic-map.md"
outOfScope:
  - "Changing taskflow open/close semantics"
  - "Rewriting active (non-disabled) evidence gates: same-commit governed provenance, closure packet, evidence-only repair, task closeout remain untouched"
  - "Deleting validators that are merely similar in name; only merge validators with proven duplicate coverage"
nonGoals:
  - "Do not replace deletion with deprecation flags or config disables; the point of this card is physical removal (Musk step 2)"
  - "Do not add new governance surfaces while deleting old ones"
completed_at: "2026-07-07T03:29:49.080Z"
completed_by_agent: "codex"
closedAt: "2026-07-07T03:29:49.080Z"
closedByActor: "codex"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-07T03-29-49-080Z-close-cff1c1716449"
lastTransitionAt: "2026-07-07T03:29:49.080Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "43e444297bf1835896226243364b4fa6a1ecacfd"
---

# TASK-RFT-0014 — Governance surface deletion pass

## Goal

Apply Musk algorithm step 2 (delete the part) to the ATM governance surface. The 2026-07-02
governance review found that ATM deprecates and disables but almost never deletes, so the
command surface and validator count keep growing. This card performs a true deletion pass
across four clusters, each landed as its own revertable commit.

## Deletion Clusters

1. **`tasks reserve` / `tasks promote`** — deprecated lifecycle surfaces already rejected by
   default for AI-facing flows. Delete the actions, their parsers, result contracts, help text,
   and the `--maintainer-override-legacy-lifecycle` escape hatch. `next --claim` is the only
   claim path afterwards.
2. **Disabled per-critical-commit git-head evidence path** — `perCriticalCommitGitHeadEvidence`
   enforcement is `disabled` in next/hook/doctor hints but the machinery is still shipped.
   Delete the dead enforcement branch and its plumbing in `git-head-evidence.ts`,
   `git-governance.ts`, `hook.ts`, `next.ts`, `doctor.ts`, `evidence.ts`, and
   `closure-packet-schema.ts`. Keep the four retained strict boundaries untouched.
3. **Overlapping validators** — inventory the 129 `validate:*` scripts, identify pairs with
   duplicate assertion coverage (candidates: the per-module atomic-map validators that assert
   the same map file, quick/standard overlap), merge them, and delete the redundant scripts
   plus their package.json entries.
4. **Duplicate skill registration** — `atm-dispatch` (and audit any others) is registered twice
   in the skill surface (bare and namespaced with divergent descriptions). Deduplicate so each
   skill has exactly one registration per integration target.

## Required Behavior

- `tasks --help` no longer lists reserve/promote; invoking them returns the standard unknown-action usage error.
- No behavior change for any non-deleted surface: `validate:cli`, `validate:tasks-surface`, and `validate:governance-commands` pass.
- Validator merge preserves total assertion coverage (each deleted validator's assertions exist in the surviving one).

## Execution Plan

- One commit per deletion cluster, each independently revertable.
- Before each deletion, grep adopter-facing docs/templates for references and clean them in the same commit.
- Measure and report: command-surface action count, validator count, and total deleted lines in the close report.

## Why This Card Exists

Musk step 2 review verdict (2026-07-02): "the system only disables and deprecates, it never
deletes." If nothing from this card ever needs to be added back, the next deletion pass should
cut deeper.
