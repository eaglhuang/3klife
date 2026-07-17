---
doc_id: doc_rft_0020
task_id: TASK-RFT-0020
title: "git-governance.ts commit-scope policy map extraction"
status: done
owner: atm-core
priority: P0
milestone: RFT-M7
depends_on: []
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-13T17:10:14.801Z"
closed_by: "Codex-GPT 5.5"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/git-governance/**"
  - "packages/cli/src/commands/git-governance/__tests__/**"
  - "scripts/validate-governance-commands.ts"
  - "scripts/validate-git-hooks-enforcement.ts"
  - "docs/reports/git-governance-atomic-map.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
deliverables:
  - "packages/cli/src/commands/git-governance.ts"
  - "packages/cli/src/commands/git-governance/commit-scope-policy.ts"
  - "packages/cli/src/commands/git-governance/commit-bundle-filter.ts"
  - "packages/cli/src/commands/git-governance/governance-residue-policy.ts"
  - "packages/cli/src/commands/git-governance/__tests__/commit-scope-policy.spec.ts"
  - "docs/reports/git-governance-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-atom-file-size.ts --max-lines 600 --files packages/cli/src/commands/git-governance/commit-scope-policy.ts packages/cli/src/commands/git-governance/commit-bundle-filter.ts packages/cli/src/commands/git-governance/governance-residue-policy.ts packages/cli/src/commands/git-governance/__tests__/commit-scope-policy.spec.ts docs/reports/git-governance-atomic-map.md"
  - "node --strip-types scripts/validate-governance-commands.ts --mode validate"
  - "node --strip-types scripts/validate-git-hooks-enforcement.ts"
  - "node --strip-types packages/cli/src/commands/git-governance/__tests__/commit-scope-policy.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if governed commit, protected branch, foreign staged, or release mirror residue handling changes outside the task's asserted regression coverage."
atomizationImpact:
  ownerAtomOrMap: "atm.git-governance-commit-scope-map"
  mapUpdates:
    - "docs/reports/git-governance-atomic-map.md"
    - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  extractionCandidates:
    - atom: "atm.git-governance.commit-scope-policy"
      pattern: "Policy Object"
      source: "packages/cli/src/commands/git-governance.ts"
      disposition: extract
      inlineReason: null
    - atom: "atm.git-governance.commit-scope-result"
      pattern: "Result Contract Object"
      source: "packages/cli/src/commands/git-governance.ts"
      disposition: extract
      inlineReason: null
teamAgents:
  recommendedTeamSize: L3
  roles:
    - "Knowledge Scout: grep existing governed commit, residue, and release mirror regressions; no edits."
    - "Review Agent: inspect extracted policy contract and test coverage; no edits."
  efficiencyEvidence: "Implementation report must state whether sidecar review reduced main-agent context and whether parallel scouting saved wall-clock time."
outOfScope:
  - "Changing task lifecycle closure semantics."
  - "Rewriting git command names or public CLI JSON fields except additive diagnostics."
  - "Touching release mirror artifacts as source deliverables."
acceptance:
  - "Every newly extracted atom/map/script/report source file in this task is <= 600 lines."
  - "If any extracted file would exceed 600 lines, split it before checkpoint or open a follow-up card instead of accepting the oversized file."
---

# TASK-RFT-0020 - git-governance.ts commit-scope policy map extraction

Extract commit-scope and residue filtering decisions out of the oversized
`git-governance.ts` command surface. The goal is to prevent future fixes for
foreign staged files, release mirror residue, and governed commit bundle safety
from becoming broad inline edits in a 4k+ line command file.

Completion requires command-backed evidence for the validators above and a short
Team Agents efficiency note in the task report.

## Planning Closeback

2026-07-17 planning-side cleanup: target ledger already records this card as
`done`, closed at `2026-07-13T17:10:14.801Z` by `Codex-GPT 5.5`. The planning
source card is reconciled to prevent duplicate implementation dispatch.
