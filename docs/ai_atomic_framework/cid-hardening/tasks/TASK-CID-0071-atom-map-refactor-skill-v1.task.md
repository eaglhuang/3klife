---
doc_id: doc_cid_0071
task_id: TASK-CID-0071
title: "Atom map refactor skill v1"
status: done
owner: atm-core
priority: P0
milestone: M8
depends_on:
  - "TASK-CID-0052"
  - "TASK-CID-0053"
related_plan: docs/ai_atomic_framework/cid-hardening/atm-tasks-command-atomic-map-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - ".agents/skills/atm-atom-map-refactor/SKILL.md"
  - ".agents/skills/atm-atom-map-refactor/references/patterns.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  - ".agents/skills/atm-atom-map-refactor/agents/openai.yaml"
deliverables:
  - ".agents/skills/atm-atom-map-refactor/SKILL.md"
  - ".agents/skills/atm-atom-map-refactor/references/patterns.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  - ".agents/skills/atm-atom-map-refactor/agents/openai.yaml"
validators:
  - "python C:/Users/User/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/atm-atom-map-refactor"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the repo-local skill folder if the guidance causes over-broad refactors or conflicts with taskflow governance."
atomizationImpact:
  ownerAtomOrMap: "atm.atom-map-refactor-advisor-skill"
  mapUpdates:
    - ".agents/skills/atm-atom-map-refactor/SKILL.md"
outOfScope:
  - "Implementing TASK-CID-0054 or any production source refactor"
  - "Changing taskflow open/close behavior"
  - "Adding automation that edits source code without human/task-card approval"
  - "Creating a second task lifecycle or task storage model"
nonGoals:
  - "Do not make the skill an auto-refactor tool."
  - "Do not encode every historical case into SKILL.md; use references/casebook.md for growth."
completed_at: "2026-06-13T10:14:18.224Z"
completed_by_agent: "captain"
lastTransitionId: "2026-06-13T10-14-18-143Z-close-2e7b325e2c5d"
delivery_commit: "c7060c8aabdd6da55bd5bd8a035b92751f7c75d3"
---

# TASK-CID-0071 - Atom map refactor skill v1

## Goal

Create a reusable repo-local Codex skill that helps future agents plan ATM atom/map refactors before editing source. The skill should capture the lessons from TASK-CID-0052 and TASK-CID-0053 and guide upcoming TASK-CID-0054 through TASK-CID-0059 / TASK-CID-0062 work.

## Why

ATM core files are still too large and contain safety-critical logic. The team wants every future refactor opportunity to preserve atom/map semantics instead of creating new scattered helpers. This guidance should be reusable and grow through a casebook as more extraction tasks complete.

## Required Behavior

- Add a repo-local skill named `atm-atom-map-refactor`.
- The skill must trigger for ATM framework refactors, atom/map extraction, `tasks.ts` / `next.ts` / `taskflow.ts` thinning, governance invariant extraction, and requests asking how to split a large ATM module.
- The skill must require agents to classify the touched invariant as one of:
  - Policy Object
  - Strategy Map
  - Result Contract Object
  - Facade
  - Adapter/Port
- The skill must require a one-task-at-a-time boundary: extract only the atom already in scope, and record adjacent ideas as follow-up work.
- The skill must remind agents to keep public surfaces stable and avoid bypassing `taskflow open/close`.
- The skill must include guidance to separate source delivery commits from runner-sync commits when `ATM_RUNNER_SYNC_REQUIRED` appears.
- The first casebook must include at least:
  - TASK-CID-0052 closeout provenance atom
  - TASK-CID-0053 dependency gate atom
  - a forward-looking entry for TASK-CID-0054 lifecycle policy
  - a forward-looking entry for TASK-CID-0057 residue strategy map

## Acceptance Criteria

- `SKILL.md` is concise and points to references for details.
- `references/patterns.md` explains the five extraction patterns and when to use each.
- `references/casebook.md` records reusable extraction cases without bloating `SKILL.md`.
- `agents/openai.yaml` exists and matches the skill purpose.
- Skill validation passes with `quick_validate.py`.
- `git diff --check` passes.

## Validation

```powershell
python C:/Users/User/.codex/skills/.system/skill-creator/scripts/quick_validate.py .agents/skills/atm-atom-map-refactor
git diff --check
```

## Report Back

Report the skill path, files created, validation output, and how the skill should be used before TASK-CID-0054 / TASK-CID-0062 style refactors.
