---
task_id: TASK-GIT-0018
title: Claim-issued work-admission ticket authority, attribution, and recovery
status: planned
amendment_epoch: 2
owner: atm-core
priority: P0
milestone: G10
depends_on:
  - TASK-GIT-0016
  - TASK-GIT-0017
causalGraph:
  causalDependencies: [TASK-GIT-0016, TASK-GIT-0017]
  startConditions: ["RestrictedExecutionGateway and runner publication inventory are closed."]
  softRelations: []
  changedPublicSeams: ["atm.workAdmissionTicket.v1", "atm.workAdmissionCoverageReceipt.v1", "atm.workAdmissionRecoveryPolicy.v1"]
  causalImpactEdges: ["task card -> atomic claim/ticket -> mutation coverage -> recovery or delivery authorization"]
  parallelFrontierInputs: []
  validatorReferences: ["tests/cli/work-admission-ticket-claim.test.ts", "tests/cli/work-admission-ticket-recovery.test.ts", "tests/cli/write-ticket-scope-guard.test.ts"]
  phaseOwner: "work-admission authority"
related_plan: git-boundary-admission/git-boundary-admission-plan.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
workAdmission:
  recoveryMode: auto
scopePaths:
  - packages/core/src/broker/work-admission-ticket.ts
  - packages/core/src/team-agents/restricted-execution-gateway.ts
  - packages/core/src/broker/write-ticket.ts
  - packages/core/src/broker/write-scope-policy.ts
  - packages/core/src/broker/freeze.ts
  - packages/core/src/broker/patch-envelope.ts
  - packages/cli/src/commands/write-ticket.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/tasks/claim-work-admission.ts
  - packages/cli/src/commands/tasks/import-orchestrator.ts
  - packages/cli/src/commands/tasks/result-contracts.ts
  - packages/cli/src/commands/tasks/task-import-validators.ts
  - packages/cli/src/commands/tasks/task-work-admission-import.ts
  - schemas/validators/work-admission-envelope.schema.json
  - docs/governance/error-code-registry.json
  - packages/core/src/error-code-registry.generated.ts
  - docs/ERROR_CODES.md
  - tests/cli/work-admission-ticket-claim.test.ts
  - tests/cli/work-admission-ticket-recovery.test.ts
  - tests/cli/write-ticket-scope-guard.test.ts
  - tests/cli/restricted-execution-gateway.test.ts
  - tests/catalog/groups/test_group_work_admission_authority.shard.json
deliverables:
  - "One WorkAdmissionTicketAuthority deep module that deepens existing WriteTicket and RestrictedExecutionGateway contracts instead of introducing another launcher or permission registry."
  - "Claim and ticket issuance are one atomic lifecycle transition; write-capable claim success returns and persists the ticket id, ticket digest, scope digest, actor, lane, claim generation, expiry, runner selection, and structured grants."
  - "Ticket grants are derived from existing task data: scopePaths/direction lock for file writes, ATM lifecycle operation classes for Git, and declared validator/generated-write manifests for process execution. Generic node eval, shell text, PowerShell writes, and arbitrary Git argv are never grants."
  - "Content-addressed mutation coverage receipts bind ticket id, path, base digest, observed digest, operation class, and producing ATM command without rewriting file contents to carry metadata."
  - "Recovery snapshot policy is one task-card field: workAdmission.recoveryMode = auto | enabled | disabled, defaulting to auto. Claim seals the requested mode, resolved enabled/disabled result, evidence-based reasons, and policy digest into the ticket."
  - "Task import validates and preserves workAdmission.recoveryMode in the target ledger and dry-run manifest; unknown values fail import instead of being dropped as unknown planning metadata."
  - "Claim and import orchestration call narrow adapters for work-admission authority; the existing oversized lifecycle and validator modules lose rather than gain policy branches."
  - "Auto enables snapshots only for elevated task risk/complexity, destructive capability, sensitive shared surfaces, or untrusted/degraded/unproven worker or adapter evidence; it otherwise resolves disabled. Model brand is never a trust signal."
  - "Only the task author, Captain, or human owner may force enabled/disabled. A worker cannot self-disable after claim; in-flight changes require governed amendment and ticket reseal, never prompt or environment override."
  - "When enabled, the existing WIP snapshot/patch-envelope seam becomes a bounded sparse temp store: clean tracked files reference Git blob ids; only dirty/untracked preimages are compressed into .atm/runtime/work-admission-temp; post-write state stores digests only."
  - "An enabled task has at most two save points: an immutable claim baseline and one replaceable pre-risk snapshot. No per-edit or continuous snapshotting is allowed."
  - "When disabled, claim performs no snapshot scan/blob write and creates no task snapshot directory or GC workload; ticket issuance, mutation attribution, validators, review, commit, close, push, and remote gates remain active."
  - "Per-task and repository-wide byte budgets fail closed before snapshot growth. Successful close deletes temp blobs immediately; blocked/handoff tasks may pin them with TTL; a governed GC command removes expired snapshots. No temp snapshot enters Git."
  - "One recoverUnattributedMutation decision returns late-attach, scope-amendment, split, handoff, quarantine, discard-with-proof, historical-delivery-review, corrective-commit, or remote-incident recovery without silently normalizing a bypass."
  - "The minimal ticket state machine is admitted -> covered -> delivery-authorized, with recovery-required as a non-terminal detour. Recovery is idempotent and retains the original violation receipt."
validators:
  - node --strip-types tests/cli/work-admission-ticket-claim.test.ts
  - node --strip-types tests/cli/work-admission-ticket-recovery.test.ts
  - node --strip-types tests/cli/write-ticket-scope-guard.test.ts
  - node --strip-types tests/cli/restricted-execution-gateway.test.ts
  - npm run generate:error-codes
  - npm run typecheck
testContributions: []
requiredTestCaseIds:
  - test_task_git_0018_work_admission_ticket_claim_atomicity_463f76de
  - test_task_git_0018_work_admission_ticket_recovery_8d9f886c
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
  required: command-backed-ticket-coverage-and-recovery
rollback:
  strategy: revert-commit-and-disable-claim-ticket-admission
  notes: "Revert the authority wiring while retaining violation evidence and any snapshots created under enabled policy for audit; never delete recovery evidence as rollback."
atomizationImpact:
  ownerAtomOrMap: atm.work-admission-ticket-authority
  mapUpdates: []
  extractionCandidates:
    - atom: atm.work-admission-ticket-authority
      pattern: Deep Module
      source: packages/cli/src/commands/tasks/claim-orchestrator.ts
      disposition: extract
      inlineReason: null
    - atom: atm.claim-work-admission-adapter
      pattern: Orchestration Adapter
      source: packages/cli/src/commands/tasks/claim-work-admission.ts
      disposition: extract
      inlineReason: "Keeps atomic claim/ticket assembly out of the already oversized claim orchestrator."
    - atom: atm.task-work-admission-import-adapter
      pattern: Import Adapter
      source: packages/cli/src/commands/tasks/task-work-admission-import.ts
      disposition: extract
      inlineReason: "Keeps workAdmission parsing separate from the already oversized generic task-import validator."
    - atom: atm.error-code-registry-projection
      pattern: Generated Registry
      source: docs/governance/error-code-registry.json
      disposition: inline
      inlineReason: "The task adds canonical ErrorCode entries through the existing generator; it does not add decision logic to the registry document."
    - atom: atm.error-code-documentation-projection
      pattern: Generated Documentation
      source: docs/ERROR_CODES.md
      disposition: inline
      inlineReason: "Generated projection only; authority remains in the registry and WorkAdmissionTicketAuthority."
createdByCommand: atm plan card create
out_of_scope:
  - "No OS sandbox, background filesystem watcher, or generic external-worker launcher."
  - "No continuous backup, per-edit snapshot stream, recovery blob in Git, or unbounded disk retention."
  - "No arbitrary shell, Node eval, PowerShell write, or raw Git argv capability."
  - "No automatic history rewrite or silent cleanup of unattributed WIP."
---

# TASK-GIT-0018 Claim-issued work-admission ticket authority, attribution, and recovery

## Intent

Make a valid ticket inseparable from a write-capable claim. ATM does not need
to own every host process; it needs to own the transition from local bytes to
accepted task delivery.

## First-Principles and Deep-Module Design

`WorkAdmissionTicketAuthority` owns issue, observe, recover, and authorize. It
hides task-card grant derivation, claim binding, ticket expiry, content digest
attribution, violation classification, and recovery planning. Claim issuance
and mutation observation are its two primary adapters. `WriteTicket` and
`RestrictedExecutionGateway` become internal compatibility/policy components,
not competing authorities.

Deletion test: without this authority, claim, write-ticket, and restricted
execution must each reconstruct task scope, actor/lane identity, command
authority, and bypass recovery.

## Acceptance

- [ ] A sealed deep-module review compares launcher-centric and ticket-centric designs and selects the smaller ticket authority with an explicit deletion test.
- [ ] A write-capable claim cannot succeed without atomically persisted ticket evidence; read-only claims receive no mutation grants.
- [ ] `recoveryMode` accepts only `auto | enabled | disabled`; absent mode resolves as `auto`, and the ticket seals the requested mode, resolved mode, reasons, and policy digest.
- [ ] Import dry-run and write both preserve normalized `workAdmission.recoveryMode`; an unknown mode fails with a canonical diagnostic before claim.
- [ ] Trusted low-risk/simple fixtures resolve `auto` to disabled with zero snapshot filesystem writes; elevated-risk or untrusted/degraded/unproven fixtures resolve `auto` to enabled without using model-brand allowlists.
- [ ] Explicit disabled mode can only come from governed task/Captain/owner authority and never weakens ticket or delivery gates; a worker prompt, environment variable, or post-claim mutation cannot self-disable recovery.
- [ ] Wrong task, actor, lane, claim generation, expiry, runner selection, scope digest, operation class, or command manifest fails closed.
- [ ] Native in-scope WIP can be late-attached only with a violation receipt, fresh validators, and required review; no path can mint clean provenance retroactively from prose.
- [ ] Out-of-scope, native-commit, and already-published cases produce deterministic reversible recovery plans and preserve original evidence.
- [ ] Enabled-mode tests prove byte-identical recovery of dirty tracked and untracked claim baselines, zero-copy clean Git-blob references, maximum-two snapshot rotation, hard byte-budget denial, handoff TTL pinning, immediate close cleanup, and idempotent GC.
- [ ] Without an OS watcher, the enabled contract promises recovery to the claim baseline and optional pre-risk save point only, never every unmanaged intermediate write; disabled mode reports that preimage recovery is unavailable.
- [ ] No OS sandbox or arbitrary-process-prevention claim is made. The guarantee is that unattributed state cannot become ATM-authorized delivery.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-28T16:28:03.036Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"git-boundary-admission/tasks/TASK-GIT-0018-brokered-external-worker-launcher-and-capability-bound-process-execution.task.md","contentDigest":"sha256:1a2fc958048811d038fd30c174d8c93ffa26c18a33baaeaf9cf2813b706aa1a2"} -->
