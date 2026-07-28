---
doc_id: doc_rft_0023
task_id: TASK-RFT-0023
title: "validate-team-agents.ts validator suite map extraction"
status: done
owner: atm-core
priority: P1
milestone: RFT-M7
depends_on: [TASK-RFT-0021]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-13T17:59:25.822Z"
closed_by: "Codex-GPT 5.5"
closedByCommand: atm tasks close
lastTransitionAt: "2026-07-13T17:59:25.822Z"
lastTransitionId: "2026-07-13T18-33-35-479Z-repair-closure-5fc15e8629d6"
delivery_commit: "3c17dd452f5f17a80cc9aa38c8255ec726c6c300"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "scripts/validate-team-agents.ts"
  - "scripts/validators/team-agents/**"
  - "docs/reports/team-agents-validator-map.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
deliverables:
  - "scripts/validate-team-agents.ts"
  - "scripts/validators/team-agents/scenario-matrix.ts"
  - "scripts/validators/team-agents/assertions.ts"
  - "scripts/validators/team-agents/artifact-fixtures.ts"
  - "scripts/validators/team-agents/reporter.ts"
  - "docs/reports/team-agents-validator-map.md"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-atom-file-size.ts --max-lines 600 --files scripts/validators/team-agents/scenario-matrix.ts scripts/validators/team-agents/assertions.ts scripts/validators/team-agents/artifact-fixtures.ts scripts/validators/team-agents/reporter.ts docs/reports/team-agents-validator-map.md"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if validate-team-agents output coverage or failure diagnostics lose scenario detail."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-validator-suite-map"
  mapUpdates:
    - "docs/reports/team-agents-validator-map.md"
    - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  extractionCandidates:
    - atom: "atm.team-agents-validator.scenario-map"
      pattern: "Strategy Map"
      source: "scripts/validate-team-agents.ts"
      disposition: extract
      inlineReason: null
teamAgents:
  recommendedTeamSize: L3
  roles:
    - "Validator: run baseline and post-extraction validator, compare scenario count and output."
    - "Review Agent: inspect fixture movement for lost coverage; no edits."
  efficiencyEvidence: "Implementation report must state whether parallel validation saved time or only added coordination overhead."
outOfScope:
  - "Changing Team Agents product behavior."
  - "Deleting validator scenarios."
  - "Relaxing assertions to make the split pass."
acceptance:
  - "Every newly extracted atom/map/script/report source file in this task is <= 600 lines."
---

# TASK-RFT-0023 - validate-team-agents.ts validator suite map extraction

Split the Team Agents mega-validator into scenario, fixture, assertion, and
reporting atoms so failures are cheaper to localize and future Team Agent
experiments can measure real validator coverage.

## Planning Closeback

2026-07-17 planning-side cleanup: target ledger already records this card as
`done`, closed at `2026-07-13T17:59:25.822Z` by `Codex-GPT 5.5`. The planning
source card is reconciled to prevent duplicate implementation dispatch.
