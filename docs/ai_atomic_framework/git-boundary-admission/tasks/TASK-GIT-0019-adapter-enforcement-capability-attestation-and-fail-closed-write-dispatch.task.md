---
task_id: TASK-GIT-0019
title: Unified ticket coverage gates and cross-adapter rollout evidence
status: planned
amendment_epoch: 2
owner: atm-core
priority: P0
milestone: G11
depends_on:
  - TASK-GIT-0018
causalGraph:
  causalDependencies: [TASK-GIT-0018]
  startConditions: ["WorkAdmissionTicketAuthority and policy-controlled recovery contracts are closed."]
  softRelations: []
  changedPublicSeams: ["atm.workAdmissionGateResult.v1"]
  causalImpactEdges: ["mutation coverage -> Police/Broker/Reviewer -> commit/close/push -> protected-branch acceptance"]
  parallelFrontierInputs: []
  validatorReferences: ["tests/cli/work-admission-coverage-gates.test.ts", "tests/cli/work-admission-cross-adapter-dogfood.test.ts"]
  phaseOwner: "ticket coverage rollout"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/core/src/broker/work-admission-ticket.ts
  - packages/cli/src/commands/police.ts
  - packages/cli/src/commands/review-advisory.ts
  - packages/cli/src/commands/git-governance.ts
  - packages/cli/src/commands/git-governance/work-admission-check.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/hook/pre-commit/implementation.ts
  - packages/cli/src/commands/hook/commit-range-guard/implementation.ts
  - packages/cli/src/commands/hook/pre-push.ts
  - packages/cli/src/commands/taskflow/write-readiness.ts
  - packages/cli/src/commands/taskflow/broker-gate.ts
  - packages/cli/src/commands/integration-hooks/implementation.ts
  - packages/cli/src/commands/team-runtime-gates.ts
  - packages/cli/src/commands/next.ts
  - templates/skills/atm-governance-router.skill.md
  - templates/skills/atm-dispatch.skill.md
  - templates/skills/atm-next.skill.md
  - docs/governance/integration-plugin-matrix.md
  - docs/AGENT_PACK_ONBOARDING.md
  - tests/cli/work-admission-coverage-gates.test.ts
  - tests/cli/work-admission-cross-adapter-dogfood.test.ts
  - tests/catalog/groups/test_group_work_admission_rollout.shard.json
deliverables:
  - "Police, Broker, Reviewer, governed commit, taskflow close, protected push, and the remote required-check command consume the same WorkAdmissionTicketAuthority decision and ErrorCode family; none maintains a private allowlist."
  - "Warnings are projections of the shared decision. Hard boundaries reject missing, stale, wrong-scope, wrong-digest, wrong-operation, recovery-required, or not-delivery-authorized tickets."
  - "The protected-branch check verifies committed ticket coverage evidence so direct raw push cannot publish an accepted mainline change merely by bypassing local hooks."
  - "Cross-adapter fixtures cover Claude, Codex, Cursor, Gemini, Copilot, and Antigravity as behavior/evidence surfaces. Adapter prose and pre-tool support may improve prevention, but every adapter receives the same downstream coverage verdict."
  - "Dogfood covers governed writes, native in-scope late attach, out-of-scope split/quarantine, raw local commit review, missing ticket, stale ticket, digest drift, raw push rejection, and recovery retry idempotency."
  - "Dogfood proves that recoveryMode=disabled performs zero snapshot writes while the same Police, Broker, Reviewer, commit, close, push, and remote ticket gates remain mandatory."
  - "Skills, next, doctor, and onboarding explain the ATM-only route and exact recovery command without claiming that text itself grants or enforces authority."
validators:
  - node --strip-types tests/cli/work-admission-coverage-gates.test.ts
  - node --strip-types tests/cli/work-admission-cross-adapter-dogfood.test.ts
  - npm run validate:skill-templates
  - npm run validate:cli
  - npm run typecheck
testContributions: []
requiredTestCaseIds:
  - test_task_git_0019_work_admission_coverage_gates_7f07d359
  - test_task_git_0019_work_admission_cross_adapter_dogfood_fa2bc836
phaseTestCaseIds: []
advisoryTestCaseIds: []
errorCodes:
  - ATM_WRITE_TICKET_MISSING
  - ATM_WRITE_TICKET_STALE
  - ATM_WRITE_SCOPE_UNATTACHED_WIP
  - ATM_WRITE_TICKET_SCOPE_VIOLATION
  - ATM_WORK_ADMISSION_RECOVERY_REQUIRED
  - ATM_WORK_ADMISSION_DELIVERY_NOT_AUTHORIZED
evidence:
  required: command-backed-cross-gate-ticket-conformance
rollback:
  strategy: revert-commit-and-disable-work-admission-required-check
  notes: "Revert gate adapters together so no boundary retains a private partial policy; retain all dogfood and bypass evidence."
atomizationImpact:
  ownerAtomOrMap: atm.work-admission-ticket-authority
  mapUpdates: []
  extractionCandidates:
    - atom: atm.work-admission-gate-adapters
      pattern: Adapter Set
      source: packages/cli/src/commands/git-governance/work-admission-check.ts
      disposition: extract
      inlineReason: null
createdByCommand: atm plan card create
out_of_scope:
  - "No second adapter capability registry or conformance policy owner."
  - "No claim that skills, prompts, or editor labels grant authority."
  - "No remote merge/rebase engine; the remote check verifies ticket coverage only."
---

# TASK-GIT-0019 Unified ticket coverage gates and cross-adapter rollout evidence

## Intent

Make every meaningful ATM boundary ask one question: does this mutation have a
valid, current, delivery-authorized admission ticket or an approved recovery
disposition?

## First-Principles and Deep-Module Design

This card adds adapters around the G10 authority, not a new policy module. The
shared result is projected into Police, Broker, Reviewer, commit, close, push,
and a remote required check. Cross-adapter dogfood tests those adapters as one
large rollout.

Deletion test: without these adapters, each boundary can still call the G10
authority, but enforcement coverage becomes incomplete. No separate adapter
capability registry or conformance evaluator is justified.

## Acceptance

- [ ] A single fixture matrix proves identical decision codes across Police, Broker, Reviewer, commit, close, push, and remote required-check adapters.
- [ ] A native write can be detected and recovered, but cannot silently advance from recovery-required to delivery-authorized.
- [ ] Cross-gate fixtures prove snapshot recovery may resolve disabled without disabling or weakening any ticket-coverage decision.
- [ ] Cross-adapter fixtures prove a worker cannot override the claim-sealed recovery policy through prompt text, environment variables, editor settings, or an adapter-local default.
- [ ] A direct raw local commit remains non-delivery until provenance review; a direct raw push cannot satisfy protected-branch acceptance without committed ticket coverage.
- [ ] Supported editor hooks may block earlier, while unsupported editors still fail at shared downstream gates. Documentation states this distinction plainly.
- [ ] Skills and `next` project the shared decision and recovery command but cannot mint, widen, or advance a ticket.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:05.798Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0019-adapter-enforcement-capability-attestation-and-fail-closed-write-dispatch.task.md","contentDigest":"sha256:fdb828d76c9620154d357d4bce4fbf281c33072d87be5c908ac4e3b34a26fbaf"} -->
