---
task_id: ATM-GOV-0247
title: Single canonical worktree compose-first invariant and Git topology boundary
status: done
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
  - .atm/memory/atm-chart.md
  - docs/governance/parallel-governance-charter.md
  - packages/core/src/broker/workspace-topology-policy.ts
  - packages/core/src/broker/index.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-package-dist.ts
  - templates/skills/atm-dispatch.skill.md
  - templates/root-drop/.atm/charter/atomic-charter.template.md
  - templates/root-drop/.atm/charter/atm-first-principles.template.md
  - templates/root-drop/.atm/charter/charter-invariants.template.json
  - fixtures/charter/default-charter.json
  - .atm/integrations/**
  - .agents/skills/**
  - .claude/skills/**
  - .cursor/rules/skills/**
  - .gemini/commands/**
  - .github/instructions/**
  - .github/prompts/**
  - integrations/codex-skills/**
  - GEMINI.md
  - tests/core/workspace-topology-policy.test.ts
  - tests/cli/root-drop-release-source-list.test.ts
  - tests/schema-fixtures/positive/integration-install-manifest.json
deliverables:
  - .atm/charter/atomic-charter.md
  - .atm/charter/charter-invariants.json
  - .atm/charter/atm-first-principles.md
  - .atm/memory/atm-chart.md
  - docs/governance/parallel-governance-charter.md
  - packages/core/src/broker/workspace-topology-policy.ts
  - packages/core/src/broker/index.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - scripts/build-root-drop-release.ts
  - scripts/build-package-dist.ts
  - templates/skills/atm-dispatch.skill.md
  - templates/root-drop/.atm/charter/atomic-charter.template.md
  - templates/root-drop/.atm/charter/atm-first-principles.template.md
  - templates/root-drop/.atm/charter/charter-invariants.template.json
  - fixtures/charter/default-charter.json
  - .atm/integrations/**
  - .agents/skills/**
  - .claude/skills/**
  - .cursor/rules/skills/**
  - .gemini/commands/**
  - .github/instructions/**
  - .github/prompts/**
  - integrations/codex-skills/**
  - GEMINI.md
  - tests/core/workspace-topology-policy.test.ts
  - tests/cli/root-drop-release-source-list.test.ts
  - tests/schema-fixtures/positive/integration-install-manifest.json
validators:
  - node --strip-types tests/core/workspace-topology-policy.test.ts
  - npm run validate:integration-adapter
  - npm run validate:root-drop-release
  - npm run validate:onefile-release
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
completed_at: "2026-07-22T08:27:41.536Z"
completed_by_agent: "codex-plan31-captain-2"
closedAt: "2026-07-22T08:27:41.536Z"
closedByActor: "codex-plan31-captain-2"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-22T08-27-41-456Z-close-410e94aaa294"
lastTransitionAt: "2026-07-22T08:27:41.536Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "a4bd7602316b7583464b6eb78ea3e4ff0f5d4665"
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
- [ ] The charter cross-references the dependency without merging authorities: `INV-ATM-010` supplies the canonical execution substrate on which `INV-ATM-008` shared-write arbitration operates; weakening either invariant requires reviewers to evaluate the paired consequence.
- [ ] The invariant states that same physical-file overlap is compose-eligible. Atom/CID/content-anchor/source-range intent, format adapters, transactional composer, and neutral steward decide compose, revalidation, escalation, or queue.
- [ ] Normal AI development cannot use a Git branch, detached worktree, alternate index, merge, or rebase as an ATM concurrency/isolation mechanism. Git remains allowed only through the outer shared-delivery adapter after steward apply.
- [ ] The exception enum is closed and receipt-backed: emergency/anomaly recovery, historical read-only discrimination, and non-development sealed packaging. Unknown reasons fail closed; no caller-provided free-form waiver is accepted.
- [ ] `workspace-topology-policy.ts` is pure and receives normalized canonical/execution roots, purpose, writer role, and exception receipt as data. It does not invoke Git, inspect provider names, or hardcode repository paths/tasks/dates.
- [ ] The shared-file writer role is `neutral-steward`; workers may create bounded proposals but cannot directly apply to the canonical shared file.
- [ ] A short English comment at the pure policy decision boundary explains why physical path equality is not a conflict decision and why Git topology is outside broker arbitration.
- [ ] The source dispatch template is updated and all installed adapters are regenerated/verified so later captains receive the rule without copying policy logic into each adapter.
- [ ] The canonical Codex integration golden manifest is refreshed from the regenerated skill bytes; adapter parity cannot pass against a stale pre-INV-010 digest.
- [ ] Focused tests cover same-root safe compose, different-root normal development rejection, every closed exception, unknown exception rejection, worker direct-write rejection, and steward/shared-delivery acceptance.
- [ ] Root-drop runner parity is content-sealed in the release manifest. Copy/extraction timestamp order cannot create false stale-runner failures, while any sealed runner-affecting source mutation still fails closed.
- [ ] Sealed incremental builds guarantee every package declaration entrypoint after dist assembly; a cache hit without hydrated `.types` output cannot create a root-drop package-dist false failure.

## Evidence and rollback

Seal charter and adapter digests, policy truth-table results, and integration
verify receipts. Roll back charter, policy, template, and projections together;
the safe fallback is queue-only, never detached-worktree development.

## Atomization impact

- owner atom/map: `atm.broker.workspace-topology-policy`
- extraction candidate: a pure policy object is the only topology authority; CLI and skills are adapters/projections.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T02:25:45.484Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0247-single-canonical-worktree-compose-first-invariant-and-git-topology-boundary.task.md","contentDigest":"sha256:6794838c8cac813a5dad102fa5aabf675e03f8ef2b36b033accdc4de078ade9e"} -->
