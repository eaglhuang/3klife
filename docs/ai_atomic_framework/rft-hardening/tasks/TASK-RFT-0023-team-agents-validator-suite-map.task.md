---
doc_id: doc_rft_0023
task_id: TASK-RFT-0023
title: "validate-team-agents.ts validator suite map extraction"
status: planned
owner: atm-core
priority: P1
milestone: RFT-M7
depends_on: [TASK-RFT-0021]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
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
