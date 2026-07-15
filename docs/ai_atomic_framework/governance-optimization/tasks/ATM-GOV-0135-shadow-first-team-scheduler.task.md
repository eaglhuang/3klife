---
doc_id: doc_atm_gov_0135
task_id: ATM-GOV-0135
title: "Run Team workers in shadow-first contribution workspaces"
status: done
owner: atm-core
priority: P1
milestone: GOVOPT-Team
depends_on: [ATM-GOV-0126, ATM-GOV-0129, ATM-GOV-0130, ATM-GOV-0131, ATM-GOV-0134]
related_plan: docs/ai_atomic_framework/governance-optimization/ATM治理流程與Team-Agents加速優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/cli/src/commands/team.ts"
  - "packages/cli/src/commands/team/scheduler.ts"
  - "packages/core/src/team-runtime/context-manifest.ts"
  - "packages/core/src/team-runtime/contribution-manifest.ts"
  - "tests/cli/team-shadow-first-scheduler.test.ts"
deliverables:
  - "packages/cli/src/commands/team/scheduler.ts"
  - "packages/core/src/team-runtime/context-manifest.ts"
  - "packages/core/src/team-runtime/contribution-manifest.ts"
  - "tests/cli/team-shadow-first-scheduler.test.ts"
validators:
  - "node --strip-types tests/cli/team-shadow-first-scheduler.test.ts"
  - "npm run typecheck"
evidence:
  required: command-backed
rollback:
  strategy: feature-flag
  notes: "Disable the new lane and keep the previous canonical behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.team-shadow-workspace-map"
  mapUpdates: []
  extractionCandidates:
    - atom: "atm.team-shadow-scheduler"
      pattern: "Scheduler"
      source: "packages/cli/src/commands/team.ts"
      disposition: extract
outOfScope:
  - "Shared live worktree write workers."
---

# ATM-GOV-0135 - Run Team workers in shadow-first contribution workspaces

## Acceptance

- Workers write in isolated shadow workspaces and submit ContributionManifest files instead of mutating the live worktree.
- Live worktree file leases become scheduling hints; final conflict detection happens at barrier assembly.
- Worker receipts bind base commit plus contribution overlay digest.
- Roles that do not require independence are collapsed into one executor; new Agents open only for genuine parallelism or independent review.
- Each work group receives a minimal ContextManifest and prefers the cheapest capability-qualified model; stable prompt prefixes use provider cache when available.
- Scheduler binds provider/model/plan, catalog version and spending ceilings, then streams actual usage into stop-loss decisions.
- Scheduler emits a TeamRosterFingerprint for every run, covering role graph, executor collapse, provider/model/plan, catalog version, ContextManifest hashes, prompt-cache policy, fan-out cap and quota probe digest.
- Scheduler supports DAG streaming: it creates a reversible reservation graph and may activate dependency-free work groups as soon as their base SHA, scope epoch, ContextManifest hash and spending ceiling are sealed.
- Clean-context reviewer is a first-class optional lane: the reviewer reads only base, ContributionManifest, diff, required dependencies, acceptance criteria and reviewer ContextManifest, never the worker conversation history.
- Reviewer receipts are separate from validator receipts and must reach the composer barrier before the contribution can be accepted when the lane is enabled.
- Provider/model cost optimization may not weaken file ownership, evidence, quality or single-closer gates.
