---
task_id: TASK-CID-0066
title: "ATM new user workflow guide closeout"
status: done
priority: P1
closure_authority: target_repo
started_by_agent: captain
completed_by_agent: "captain"
completed_at: "2026-06-13T11:07:58+08:00"
depends_on:
  - TASK-CID-0063
scopePaths:
  - "README.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
deliverables:
  - "README.md"
  - "docs/ATM_NEW_USER_WORKFLOW.md"
validators:
  - "git diff --check"
  - "npm run validate:neutrality"
planningReadOnlyPaths:
  - "../3KLife/docs/ai_atomic_framework/cid-hardening/tasks/TASK-CID-0066-atm-new-user-workflow-guide-closeout.task.md"
outOfScope:
  - ".atm/history/task-events/TASK-CID-0025/**"
  - ".atm/history/task-events/TASK-CID-0048/**"
  - ".atm/history/task-events/TASK-CID-0064/**"
  - ".atm/runtime/**"
  - "packages/**"
  - "release/**"
  - "TASK-CID-0065 emergency permission lease implementation"
nonGoals:
  - "Do not implement or change taskflow open/close behavior."
  - "Do not close TASK-CID-0065."
  - "Do not clean legacy .atm residue as part of this documentation task."
contextMap:
  primary:
    - path: "docs/ATM_NEW_USER_WORKFLOW.md"
      reason: "new user workflow guide delivered by 004"
    - path: "README.md"
      reason: "entry link from the public start section"
  secondary:
    - path: "docs/specs/taskflow-profile-v1.md"
      reason: "background contract only; no edits in this task"
  tests:
    - path: "scripts/validate-docs-neutrality.ts"
      reason: "neutrality validation surface behind npm run validate:neutrality"
  patterns:
    - referencePath: "README.md"
      referenceTaskId: "TASK-CID-0066"
      description: "public docs stay simple, framework-neutral, and route agents back through taskflow/next"
closedAt: "2026-06-13T11:07:58+08:00"
closedByActor: "captain"
closedByCommand: "historical planning closeback backfill for TASK-CID-0124"
lastTransitionId: "2026-06-13T03-07-58-611Z-close-97b50c091876"
lastTransitionAt: "2026-06-13T11:07:58+08:00"
ledgerContractVersion: "task-ledger/v1"
delivery_commit: "fc26e6b6e645cb19e0df77c0a2b5782e4455d568"
---

## Goal
Governably close the new ATM first-day workflow documentation delivered by 004. The guide explains the normal operator path from a human's plain-language request through `taskflow open`, `next`, implementation/evidence, and `taskflow close`, without requiring a new adopter to understand internal `.atm/history` details first.

## Acceptance
- `docs/ATM_NEW_USER_WORKFLOW.md` exists and presents a human-readable and AI-readable step-by-step normal workflow.
- `README.md` links to the new guide from the `60-Second Start` section.
- The guide clearly distinguishes official operator lanes (`taskflow open`, `next`, `taskflow close`) from backend/repair surfaces.
- The guide documents the three adoption levels: profile-only, light adaptor, and full adaptor/SDK.
- The guide avoids presenting emergency/backend commands as normal daily workflow.
- The commit for this task does not include unrelated `.atm/history` residue, TASK-CID-0065 source work, or release artifacts.

## Exclusion Rules
- Do not modify ATM CLI source.
- Do not modify release artifacts.
- Do not stage or commit old task-event residue.
- Do not use quickfix for this task; the guide is larger than the quickfix fast-channel line limit.

## Verification
Run the documentation validators:
```bash
git diff --check
npm run validate:neutrality
```

## Closure & Reports
Report:
1. Files committed.
2. Validator commands and exit status.
3. Confirmation that old `.atm/history/task-events/**` residue and TASK-CID-0065 implementation files were excluded.
