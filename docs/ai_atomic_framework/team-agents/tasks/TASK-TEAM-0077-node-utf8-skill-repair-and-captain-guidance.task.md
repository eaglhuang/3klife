---
doc_id: doc_team_0077
task_id: TASK-TEAM-0077
title: "Node UTF-8 verification and Captain encoding guidance"
status: done
owner: atm-core
priority: P0
milestone: "Captain Operability"
depends_on: []
related_plan: "docs/ai_atomic_framework/team-agents/CROSS-VENDOR-TEAM-MARKDOWN-HANDOFF-PLAN-2026-07-11.md"
planning_repo: 3KLife
target_repo: 3KLife
closure_authority: planning_repo
scopePaths:
  - ".agents/skills/atm-dispatch/SKILL.md"
  - ".agents/skills/task-card-opener/SKILL.md"
  - "tools_node/validate-skill-encoding.js"
  - "docs/tasks/tasks-team.json"
  - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0077-node-utf8-skill-repair-and-captain-guidance.task.md"
deliverables:
  - ".agents/skills/atm-dispatch/SKILL.md"
  - ".agents/skills/task-card-opener/SKILL.md"
  - "tools_node/validate-skill-encoding.js"
  - "docs/tasks/tasks-team.json"
  - "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0077-node-utf8-skill-repair-and-captain-guidance.task.md"
validators:
  - "node tools_node/validate-skill-encoding.js --files .agents/skills/atm-dispatch/SKILL.md .agents/skills/task-card-opener/SKILL.md docs/keep.summary.md"
  - "npm run check:encoding:touched -- --files .agents/skills/atm-dispatch/SKILL.md .agents/skills/task-card-opener/SKILL.md tools_node/validate-skill-encoding.js"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert the encoding guidance and validator together; do not use PowerShell text pipelines to rewrite multilingual governance files."
atomizationImpact:
  ownerAtomOrMap: "3klife.captain-operability"
  mapUpdates: []
outOfScope:
  - "Changing ATM target-repository governance semantics"
  - "Repairing unrelated game or UI documents"
---

# TASK-TEAM-0077 Node UTF-8 verification and Captain encoding guidance

## Goal

Make Node.js the required verification and write path for multilingual
governance text. Captain workflows must distinguish a PowerShell display
problem from actual file corruption before attempting any repair.

## Acceptance Criteria

- `atm-dispatch` explicitly states that Team/AAO Phase 0 cards are opened in
  3KLife, with card plus planning ledger plus one planning commit, before a
  target-repository agent claims implementation.
- `atm-dispatch` and `task-card-opener` instruct agents to use Node Buffer I/O
  with explicit UTF-8 for multilingual Markdown/JSON; PowerShell text
  pipelines are prohibited for rewriting these files.
- Before declaring a file corrupt, Captains run the Node validator against raw
  bytes. A PowerShell rendering symptom alone is not evidence of corruption.
- `validate-skill-encoding.js` detects UTF-8 BOM, replacement characters,
  common mojibake signatures, and invalid UTF-8 input for the specified files.
- The validator is run against both repaired skills and `docs/keep.summary.md`.

## Delivery Sequence

1. Add the Node encoding validator.
2. Add the Node verification and write guidance to the two Captain-facing
   skills without rewriting valid multilingual content.
3. Run the encoding validator against the immediate Captain orientation
   summary without modifying it unless raw-byte validation fails.
4. Run the encoding validator and touched-file guard, then close through the
   planning-repository lane.
