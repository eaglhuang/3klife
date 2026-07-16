---
task_id: TASK-SKL-0001
title: Add planning authority resolution gate to ATM skills
status: planned
owner: atm-skill-maintainer
priority: P0
depends_on: []
related_plan: docs/ai_atomic_framework/governance-optimization/lane-session-rollout-plan.md
planning_repo: governance-workbench
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - integrations/codex-skills/atm-dispatch/SKILL.md
  - integrations/codex-skills/atm-task-card-authoring/SKILL.md
  - .agents/skills/atm-dispatch/SKILL.md
  - .agents/skills/atm-task-card-authoring/SKILL.md
deliverables:
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-task-card-authoring.skill.md
  - integrations/codex-skills/atm-dispatch/SKILL.md
  - integrations/codex-skills/atm-task-card-authoring/SKILL.md
  - .agents/skills/atm-dispatch/SKILL.md
  - .agents/skills/atm-task-card-authoring/SKILL.md
validators:
  - npm run typecheck
  - npm run validate:cli
  - node atm.mjs next --prompt "Author an ATM framework improvement plan without using the target repository as the planning queue" --json
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
atomizationImpact:
  ownerAtomOrMap: atm.skill-routing-governance
  mapUpdates:
    - atomic_workbench/atomization-coverage/path-to-atom-map.json
  extractionCandidates:
    - atom: atm.planning-authority-resolution-gate
      pattern: Skill Governance Rule
      source: templates/skills/atm-dispatch.skill.md
      disposition: inline
      inlineReason: Skill text is the governed source artifact for this rule.
---

# TASK-SKL-0001 - Planning Authority Resolution Gate

## Context

During Lane Session rollout planning, the Captain initially authored source
planning cards in the ATM target repository because the current working
directory was `AI-Atomic-Framework`. That violated the intended separation:
source planning belongs in an external governance workbench repo when ATM
framework work must not be governed by the target ATM ledger itself. The target
repo should receive only imported `.atm/history/**` ledger records.

The skill fix must remain repository neutral. It must not hard-code `3KLife` or
any other local workbench name.

## Required Behavior

Before drafting any ATM plan or task card, the Captain-facing skills must run a
Planning Authority Resolution Gate.

The gate classifies the request as one of:

- ATM framework implementation
- ATM governance optimization planning
- adopter or project work
- dogfood or backlog recording

For ATM framework work that must be planned outside the target ATM ledger, the
gate requires an external governance workbench repo. The agent must not infer
that the current working directory is the planning repo.

Before writing any plan or task card, the agent must output:

- `planning_repo_root`
- `planning_repo_is_external_to_target`
- `target_repo_root`
- `source_plan_path`
- `source_task_card_path`
- `target_import_method`

If no external workbench repo can be resolved, the skill must instruct the agent
to stop and ask the user for the planning repo, or record a backlog item for the
missing planning-authority discovery. It must not create source planning cards
inside the ATM target repo by default.

## Acceptance Criteria

- `atm-dispatch` explains the Planning Authority Resolution Gate in
  repository-neutral terms.
- `atm-task-card-authoring` requires the same gate before creating or revising
  cards.
- The rule is implemented template-first, then synced to repo-local installed
  skill copies.
- Skill edits must update the source-of-truth template files first so reinstall
  or adapter refresh cannot overwrite the fix.
- Direct edits to `.agents/skills/**` or `integrations/**/SKILL.md` alone are
  not sufficient and must fail review.
- No skill text hard-codes a governance workbench repo name such as `3KLife`.
- The import guidance still permits the target repo to receive CLI-imported
  `.atm/history/**` ledger records.

## Validation

Run:

```shell
npm run typecheck
npm run validate:cli
node atm.mjs next --prompt "Author an ATM framework improvement plan without using the target repository as the planning queue" --json
```

Manual review must confirm that the returned or skill-guided next action asks
for or resolves an external planning repo before writing source plans/cards.

Review must also confirm that the template/source skill files contain the
behavioral change before any installed skill copy is considered updated.
