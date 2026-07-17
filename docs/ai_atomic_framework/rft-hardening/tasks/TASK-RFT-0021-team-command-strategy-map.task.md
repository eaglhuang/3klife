---
doc_id: doc_rft_0021
task_id: TASK-RFT-0021
title: "team.ts route and execution strategy map extraction"
status: done
owner: atm-core
priority: P0
milestone: RFT-M7
depends_on: [TASK-RFT-0020]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-13T17:31:17.248Z"
closed_by: "Codex-GPT 5.5"
closedByCommand: atm tasks close
lastTransitionAt: "2026-07-13T17:31:17.248Z"
delivery_commit: "8ddc2f45c9adfd5cf4ca4adb9108e786082fdbad"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team/**"
  - "packages/cli/src/commands/team/__tests__/**"
  - "scripts/validate-team-agents.ts"
  - "docs/reports/team-command-atomic-map.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
deliverables:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team/team-route-map.ts"
  - "packages/cli/src/commands/team/team-execution-lane.ts"
  - "packages/cli/src/commands/team/role-provider-resolution.ts"
  - "packages/cli/src/commands/team/__tests__/team-route-map.spec.ts"
  - "docs/reports/team-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-atom-file-size.ts --max-lines 600 --files packages/cli/src/commands/team/team-route-map.ts packages/cli/src/commands/team/team-execution-lane.ts packages/cli/src/commands/team/role-provider-resolution.ts packages/cli/src/commands/team/__tests__/team-route-map.spec.ts docs/reports/team-command-atomic-map.md"
  - "node --strip-types scripts/validate-team-agents.ts"
  - "node --strip-types packages/cli/src/commands/team/__tests__/team-route-map.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if team start, team start --execute, role-provider routing, or broker-conflict-blocked semantics regress."
atomizationImpact:
  ownerAtomOrMap: "atm.team-command-strategy-map"
  mapUpdates:
    - "docs/reports/team-command-atomic-map.md"
    - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  extractionCandidates:
    - atom: "atm.team.route-map"
      pattern: "Strategy Map"
      source: "packages/cli/src/commands/team.ts"
      disposition: extract
      inlineReason: null
teamAgents:
  recommendedTeamSize: L4
  roles:
    - "Knowledge Scout: identify current Team route branches and validation fixtures; no edits."
    - "Review Agent: verify no role gains lifecycle authority; no edits."
    - "Validator: run focused Team Agents validator and summarize failure deltas."
  efficiencyEvidence: "Implementation report must compare single-agent vs sidecar scouting time and record token savings or overhead."
outOfScope:
  - "Making Team Agents mandatory for ordinary work."
  - "Creating a second scheduler or task lifecycle."
  - "Changing broker authority or permission lease semantics."
acceptance:
  - "Every newly extracted atom/map/script/report source file in this task is <= 600 lines."
---

# TASK-RFT-0021 - team.ts route and execution strategy map extraction

Extract a bounded strategy map from the largest current CLI command file,
preserving the existing Team Agents command behavior while making the route and
execution lanes separately testable.

## Planning Closeback

2026-07-17 planning-side cleanup: target ledger already records this card as
`done`, closed at `2026-07-13T17:31:17.248Z` by `Codex-GPT 5.5`. The planning
source card is reconciled to prevent duplicate implementation dispatch.
