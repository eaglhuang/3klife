---
task_id: TASK-AAO-FABLE-006
title: "Extraction-first atomization contract in card-authoring and refactor skills"
status: done
owner: claude-fable-5
priority: P1
milestone: Backlog-P1
depends_on: []
related_plan: docs/governance/atm-bug-and-optimization-backlog.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - ".agents/skills/atm-task-card-authoring/SKILL.md"
  - ".agents/skills/atm-atom-map-refactor/SKILL.md"
deliverables:
  - ".agents/skills/atm-task-card-authoring/SKILL.md"
  - ".agents/skills/atm-atom-map-refactor/SKILL.md"
validators:
  - "git diff --check"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert skill text; atomizationImpact bookkeeping fields keep working unchanged."
atomizationImpact:
  ownerAtomOrMap: "atm.agent-skills"
completed_at: "2026-07-13T06:18:02.573Z"
completed_by_agent: "claude-fable-5"
closedAt: "2026-07-13T06:18:02.573Z"
closedByActor: "claude-fable-5"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-13T06-18-02-513Z-close-99636bd06f74"
lastTransitionAt: "2026-07-13T06:18:02.573Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "429f6c3ecb05481d440b166d224015de4085f580"
---

# TASK-AAO-FABLE-006 Extraction-first atomization skill contract

ATM's core intent — prefer extracting a change as an atom or atom map instead
of inline-editing a large module — exists today only as bookkeeping
(`atomizationImpact` owner fields). No skill states the proactive bias, so
agents legally inline-edit 1500+ line governance modules with no extraction
proposal (observed in TASK-AAO-FABLE-002/003/005).

## Acceptance

- `atm-task-card-authoring`: `atomizationImpact` gains an
  `extractionCandidates` convention (atoms this card could extract in
  passing). Any card whose scope touches a module over 600 lines must declare
  either an extraction plan or `inline` with a recorded reason; extraction is
  the default unless a human declines, and the decline reason is recorded on
  the card.
- `atm-atom-map-refactor`: trigger widens from "refactor tasks" to "any task
  card whose scope touches a large governance module"; the skill's owner/
  pattern selection step becomes the vehicle for the extraction proposal.
- Both skills cross-reference each other and the dispatch report obligation
  (atomization proposal in the agent report when touching >600-line modules).
