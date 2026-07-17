---
doc_id: doc_rft_0022
task_id: TASK-RFT-0022
title: "next.ts nextAction assembly second-wave extraction"
status: done
owner: atm-core
priority: P0
milestone: RFT-M7
depends_on: [TASK-RFT-0020]
related_plan: docs/ai_atomic_framework/rft-hardening/atm-cli-oversized-module-refactor-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
closed_at: "2026-07-13T17:49:08.712Z"
closed_by: "Codex-GPT 5.5"
target_ledger_status: done
planning_closeback_status: reconciled-from-target-ledger
scopePaths:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/**"
  - "packages/cli/src/commands/next/__tests__/**"
  - "scripts/validate-prompt-scoped-next.ts"
  - "scripts/validate-guidance.ts"
  - "docs/reports/next-command-atomic-map.md"
  - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
deliverables:
  - "packages/cli/src/commands/next.ts"
  - "packages/cli/src/commands/next/next-action-assembly.ts"
  - "packages/cli/src/commands/next/prompt-scope-resolution.ts"
  - "packages/cli/src/commands/next/worktree-hints.ts"
  - "packages/cli/src/commands/next/__tests__/next-action-assembly.spec.ts"
  - "docs/reports/next-command-atomic-map.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-atom-file-size.ts --max-lines 600 --files packages/cli/src/commands/next/next-action-assembly.ts packages/cli/src/commands/next/prompt-scope-resolution.ts packages/cli/src/commands/next/worktree-hints.ts packages/cli/src/commands/next/__tests__/next-action-assembly.spec.ts docs/reports/next-command-atomic-map.md"
  - "node --strip-types scripts/validate-prompt-scoped-next.ts"
  - "node --strip-types scripts/validate-guidance.ts"
  - "node --strip-types packages/cli/src/commands/next/__tests__/next-action-assembly.spec.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert if prompt-scoped task routing, no-work, scope-not-found, or runner-mode diagnostics regress."
atomizationImpact:
  ownerAtomOrMap: "atm.next-command-atomic-map"
  mapUpdates:
    - "docs/reports/next-command-atomic-map.md"
    - ".agents/skills/atm-atom-map-refactor/references/casebook.md"
  extractionCandidates:
    - atom: "atm.next.next-action-assembly"
      pattern: "Result Contract Object"
      source: "packages/cli/src/commands/next.ts"
      disposition: extract
      inlineReason: null
    - atom: "atm.next.route-strategy-map"
      pattern: "Strategy Map"
      source: "packages/cli/src/commands/next.ts"
      disposition: follow-up-card
      inlineReason: null
teamAgents:
  recommendedTeamSize: L3
  roles:
    - "Knowledge Scout: catalog next.ts existing route/status branches and candidate fixtures; no edits."
    - "Review Agent: verify public JSON shape is additive/stable; no edits."
  efficiencyEvidence: "Implementation report must record whether sidecar route cataloging reduced main-thread context."
outOfScope:
  - "Changing task selection authority."
  - "Changing current editor detection semantics."
  - "Rewriting unrelated guidance/create-atom behavior."
acceptance:
  - "Every newly extracted atom/map/script/report source file in this task is <= 600 lines."
---

# TASK-RFT-0022 - next.ts nextAction assembly second-wave extraction

Continue the RFT extraction pressure on `next.ts` by moving nextAction assembly
and prompt-scope result construction into focused atoms while preserving all
current route decisions.

## Planning Closeback

2026-07-17 planning-side cleanup: target ledger already records this card as
`done`, closed at `2026-07-13T17:49:08.712Z` by `Codex-GPT 5.5`. The planning
source card is reconciled to prevent duplicate implementation dispatch.
