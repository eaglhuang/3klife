---
task_id: ATM-GOV-0247
title: Single canonical worktree compose-first invariant and Git topology boundary
status: planned
owner: atm-governance
priority: P0
milestone: ATM-3.1-R0
severity: P0
depends_on: []
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns the execution-substrate invariant required by Plan 3.1; this extends INV-ATM-008 without changing its ticket semantics."
scopePaths:
  - .atm/charter/atomic-charter.md
  - .atm/charter/charter-invariants.json
  - .atm/charter/atm-first-principles.md
  - docs/governance/parallel-governance-charter.md
  - packages/core/src/broker/workspace-topology-policy.ts
  - templates/skills/atm-dispatch.skill.md
  - fixtures/charter/default-charter.json
  - integrations/**/atm-dispatch/**
  - .agents/skills/atm-dispatch/SKILL.md
  - .claude/skills/atm-dispatch/SKILL.md
  - .cursor/rules/skills/atm-dispatch/SKILL.md
  - .gemini/commands/atm-dispatch.toml
  - .github/instructions/atm-dispatch.instructions.md
  - tests/core/workspace-topology-policy.test.ts
deliverables:
  - .atm/charter/atomic-charter.md
  - .atm/charter/charter-invariants.json
  - .atm/charter/atm-first-principles.md
  - docs/governance/parallel-governance-charter.md
  - packages/core/src/broker/workspace-topology-policy.ts
  - templates/skills/atm-dispatch.skill.md
  - tests/core/workspace-topology-policy.test.ts
validators:
  - node --strip-types tests/core/workspace-topology-policy.test.ts
  - node atm.mjs integration verify codex --json
  - node atm.mjs integration verify claude-code --json
  - node atm.mjs integration verify cursor --json
  - node atm.mjs integration verify copilot --json
  - node atm.mjs integration verify gemini --json
  - node atm.mjs integration verify antigravity --json
  - node atm.mjs atm-chart verify
  - node atm.mjs doctor --json
errorCodes: []
createdByCommand: atm plan card create
evidence:
  required: charter-topology-policy-and-adapter-parity
rollback:
  strategy: revert-commit-and-trip-queue-only
  notes: "Revert charter, policy, template, and generated adapters as one unit; keep queue-only until parity is restored."
atomizationImpact:
  ownerAtomOrMap: atm.broker.workspace-topology-policy
  mapUpdates: []
  extractionCandidates:
    - atom: atm.broker.workspace-topology-policy
      pattern: Policy Object
      source: packages/core/src/broker/workspace-topology-policy.ts
      disposition: extract
---

# ATM-GOV-0247 Single canonical worktree compose-first invariant and Git topology boundary

## Intent

Add `INV-ATM-010` as the execution-substrate prerequisite for
`INV-ATM-008`. Normal governed parallel development uses one canonical
worktree/base/HEAD. Workers are isolated by bounded logical intents and
proposals, not Git branches, worktrees, or task-local indexes. A shared physical
file remains compose-eligible; it is not converted into a file lock.

Keep Git at the outer delivery boundary: after the neutral steward has applied
a valid compose batch, the shared-delivery adapter may create one commit and
verify HEAD/CAS. The policy must be a small data-driven module consumed by
dispatch/admission surfaces, not repeated path-specific conditionals.

## Acceptance

- [ ] `INV-ATM-008` remains the ticket-not-refusal rule and is not overloaded. New `INV-ATM-010` separately defines the single-canonical-worktree and logical-intent execution substrate.
- [ ] The invariant states that same physical-file overlap is compose-eligible. Atom/CID/content-anchor/source-range intent, format adapters, transactional composer, and neutral steward decide compose, revalidation, escalation, or queue.
- [ ] Normal AI development cannot use a Git branch, detached worktree, alternate index, merge, or rebase as an ATM concurrency/isolation mechanism. Git remains allowed only through the outer shared-delivery adapter after steward apply.
- [ ] The exception enum is closed and receipt-backed: emergency/anomaly recovery, historical read-only discrimination, and non-development sealed packaging. Unknown reasons fail closed; no caller-provided free-form waiver is accepted.
- [ ] `workspace-topology-policy.ts` is pure and receives normalized canonical/execution roots, purpose, writer role, and exception receipt as data. It does not invoke Git, inspect provider names, or hardcode repository paths/tasks/dates.
- [ ] The shared-file writer role is `neutral-steward`; workers may create bounded proposals but cannot directly apply to the canonical shared file.
- [ ] A short English comment at the pure policy decision boundary explains why physical path equality is not a conflict decision and why Git topology is outside broker arbitration.
- [ ] The source dispatch template is updated and all installed adapters are regenerated/verified so later captains receive the rule without copying policy logic into each adapter.
- [ ] Focused tests cover same-root safe compose, different-root normal development rejection, every closed exception, unknown exception rejection, worker direct-write rejection, and steward/shared-delivery acceptance.

## Evidence and rollback

Seal charter and adapter digests, policy truth-table results, and integration
verify receipts. Roll back charter, policy, template, and projections together;
the safe fallback is queue-only, never detached-worktree development.

## Atomization impact

- owner atom/map: `atm.broker.workspace-topology-policy`
- extraction candidate: a pure policy object is the only topology authority; CLI and skills are adapters/projections.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T02:25:45.484Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0247-single-canonical-worktree-compose-first-invariant-and-git-topology-boundary.task.md","contentDigest":"sha256:6794838c8cac813a5dad102fa5aabf675e03f8ef2b36b033accdc4de078ade9e"} -->
