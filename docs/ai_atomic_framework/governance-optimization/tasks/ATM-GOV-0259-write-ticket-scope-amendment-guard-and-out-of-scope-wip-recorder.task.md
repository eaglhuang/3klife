---
task_id: ATM-GOV-0259
title: Write-ticket scope amendment guard and out-of-scope WIP recorder
status: done
owner: atm-governance
priority: P0
milestone: ATM-3.1-R0.11
severity: P0
depends_on:
  - ATM-GOV-0247
  - ATM-GOV-0250
  - ATM-GOV-0258
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 shared-write governance and editor/agent safety. This card extends the existing task scope, broker ticket, integration adapter, and dirty-WIP admission model instead of creating a parallel permission system."
scopePaths:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/write-ticket.ts
  - packages/cli/src/commands/command-specs/write-ticket.spec.ts
  - packages/cli/src/commands/tasks/scope-amendment.ts
  - packages/cli/src/commands/tasks/claim-orchestrator.ts
  - packages/cli/src/commands/next/foreign-dirty-wip-admission.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-index-ownership.ts
  - packages/core/src/broker/write-ticket.ts
  - packages/core/src/broker/write-scope-policy.ts
  - docs/governance/error-code-registry.json
  - templates/skills/atm-governance-router.skill.md
  - packages/cli/src/commands/integration/bootstrap.ts
  - integrations/codex-skills/atm-governance-router/SKILL.md
  - .claude/skills/atm-governance-router/SKILL.md
  - .cursor/rules/skills/atm-governance-router/SKILL.md
  - .gemini/commands/atm-governance-router.toml
  - GEMINI.md
  - tests/cli/write-ticket-scope-guard.test.ts
  - tests/cli/write-ticket-scope-amendment.test.ts
  - tests/cli/out-of-scope-write-recorder.test.ts
  - tests/cli/write-ticket-command-registration.test.ts
  - tests/cli/write-ticket-error-code-registry.test.ts
deliverables:
  - packages/cli/src/atm.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/commands/write-ticket.ts
  - packages/core/src/broker/write-ticket.ts
  - packages/core/src/broker/write-scope-policy.ts
  - docs/governance/error-code-registry.json
  - templates/skills/atm-governance-router.skill.md
  - tests/cli/write-ticket-scope-guard.test.ts
  - tests/cli/write-ticket-scope-amendment.test.ts
  - tests/cli/out-of-scope-write-recorder.test.ts
  - tests/cli/write-ticket-command-registration.test.ts
  - tests/cli/write-ticket-error-code-registry.test.ts
validators:
  - node --strip-types tests/cli/write-ticket-scope-guard.test.ts
  - node --strip-types tests/cli/write-ticket-scope-amendment.test.ts
  - node --strip-types tests/cli/out-of-scope-write-recorder.test.ts
  - node --strip-types tests/cli/write-ticket-command-registration.test.ts
  - node --strip-types tests/cli/write-ticket-error-code-registry.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes:
  - ATM_WRITE_SCOPE_AMENDMENT_REQUIRED
  - ATM_WRITE_SCOPE_UNATTACHED_WIP
  - ATM_WRITE_TICKET_SCOPE_VIOLATION
  - ATM_WRITE_TICKET_MISSING
  - ATM_WRITE_TICKET_STALE
evidence:
  required: write-ticket-scope-guard-red-green
rollback:
  strategy: revert-commit-and-retain-existing-commit-close-gates
  notes: "Rollback may keep commit/close gates as last-line defenses, but must not claim editor-time or pre-write scope safety."
atomizationImpact:
  ownerAtomOrMap: atm.write-ticket-scope-guard
  mapUpdates: []
  extractionCandidates:
    - atom: atm.write-ticket
      pattern: Authority Token
      source: packages/core/src/broker/write-ticket.ts
      disposition: extract
    - atom: atm.write-scope-policy
      pattern: Policy Object
      source: packages/core/src/broker/write-scope-policy.ts
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: advisory-until-TASK-SKL-0029
  causalImpactEdges:
    - write-intent-to-scope-ticket-admission
    - out-of-scope-wip-to-amendment-or-recovery
    - editor-adapter-to-pre-write-warning
  requiredTestCaseIds:
    - test_int_write_ticket_scope_amendment_recovery_04a0385b
  phaseTestCaseIds:
    - test_int_plan3_final_verdict_evidence_aggregation_35563247
  advisoryTestCaseIds: []
  testContributions:
    - caseId: test_int_write_ticket_scope_amendment_recovery_04a0385b
      targetGroupId: test_group_write_ticket
      semanticKey: scope-amendment-recovery
      coversImpactEdges:
        - write-intent-to-scope-ticket-admission
        - out-of-scope-wip-to-amendment-or-recovery
completed_at: "2026-07-24T05:56:46.792Z"
completed_by_agent: "codex-002-plan31-captain"
closedAt: "2026-07-24T05:56:46.792Z"
closedByActor: "codex-002-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T05-56-46-792Z-close-deedbe22a512"
lastTransitionAt: "2026-07-24T05:56:46.792Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "366c359688f47e8c1b15b8f530e1a8bcfb7ce43b"
---

# ATM-GOV-0259 Write-ticket scope amendment guard and out-of-scope WIP recorder

## Intent

Add a first-class write-ticket and scope-amendment guard so external AI workers
cannot silently dirty files outside the task authority and only discover the
problem at commit or close. ATM should encourage legitimate scope expansion
instead of treating every out-of-scope intent as misconduct, but it must also
record and escalate unsafe writes that bypass the amendment path.

This card closes the Plan 3.1 dogfood gap exposed by the Antigravity/Gemini 3.6
dispatch attempt on `ATM-GOV-0258`: the worker used the wrong actor id
(`antigravity-gemini35-plan31-captain` after the human had corrected the lane to
Gemini 3.6), directly edited `.atm/history/tasks/ATM-GOV-0258.json` with Node,
and modified source files outside the original `ATM-GOV-0258` scope before any
commit or close gate could stop the dirty worktree. ATM later surfaced the
dirty files and active ledger state, but the warning was too late: the shared
worktree was already polluted and required captain arbitration.

The fix is not a full OS/filesystem sandbox. The MVP is an ATM authority layer:
workers acquire a write ticket for the task/actor/lane/scope, editor adapters
check that ticket before writes when they can, and ATM still detects and records
post-write unattached WIP when an adapter cannot enforce the pre-write hook.

## Acceptance

- [ ] `node atm.mjs write-ticket acquire --task <task> --actor <actor> --files <paths> --intent <intent> --json` or an equivalent command returns a ticket carrying actor id, task id, lane/session/lease when available, allowed files, scope digest, expiry, operation class, and recovery policy.
- [ ] `write-ticket` is registered in the frozen CLI command runner, command spec registry, and help/manifest surfaces; command discovery proves the command is reachable.
- [ ] The exact codes `ATM_WRITE_SCOPE_AMENDMENT_REQUIRED`, `ATM_WRITE_SCOPE_UNATTACHED_WIP`, `ATM_WRITE_TICKET_SCOPE_VIOLATION`, `ATM_WRITE_TICKET_MISSING`, and `ATM_WRITE_TICKET_STALE` are registered in `docs/governance/error-code-registry.json` with retryability, approval requirements, recovery command shape, source owner, and focused tests.
- [ ] `write-ticket check` or equivalent accepts in-scope writes and rejects out-of-scope writes with `ATM_WRITE_SCOPE_AMENDMENT_REQUIRED` before the file is modified when an editor adapter can call the guard.
- [ ] The required scope-amendment response includes a copyable `tasks scope add ... --reason ...` command and classifies the request as amendment-required rather than a violation when the worker asked before writing.
- [ ] Scope-amendment path parsing rejects or normalizes shell quote artifacts before audit persistence; the Gemini 0258 malformed paths are replayed and cannot persist as `"path` or `path"` entries.
- [ ] Import/claim/close and taskflow bundle expansion share recursive-glob semantics; a declared `**/*.ts` scope covers new children consistently, while `scope narrow` or equivalent can reduce over-broad overlap without hand-editing history (`ATM-BUG-2026-07-16-005`, `ATM-BUG-2026-07-16-007`, `ATM-BUG-2026-07-16-012`).
- [ ] A discoverable scope audit/status surface shows normalized allowed files and immutable amendment history, repairs/rejects CSV/quote-fragment contamination, and preserves parity after closeback (`ATM-BUG-2026-07-19-005`, `ATM-BUG-2026-07-19-038`, `ATM-BUG-2026-07-22-231`).
- [ ] If a worker already produced out-of-scope dirty WIP, ATM classifies it as `ATM_WRITE_SCOPE_UNATTACHED_WIP`, records actor/task/lane/path/timestamp/digest evidence, blocks commit/close, and offers governed recovery choices: scope-amend-and-attach, non-delivery WIP commit, discard receipt, or split-to-new-task.
- [ ] A true `ATM_WRITE_TICKET_SCOPE_VIOLATION` is emitted only when the worker writes or attempts to commit/close/push outside ticket scope while refusing or bypassing the amendment/unattached-WIP recovery path.
- [ ] Direct `.atm/history/**` mutation outside governed ATM lifecycle commands is detected as protected-ledger write intent before write when possible, or as protected unattached WIP immediately after detection.
- [ ] Write-ticket acquire/check compares requested actor/lane/session with active task claim and ambient identity evidence; mismatches produce deterministic warning/block and recovery guidance.
- [ ] Adapter guidance is updated at the source template/installer layer and regenerated for Codex, Claude, Cursor, Gemini, and Antigravity; installed copies alone do not satisfy acceptance.
- [ ] Editor pre-write checks and post-write recorders share the same write-scope policy, so missing editor hooks degrade to `ATM_WRITE_SCOPE_UNATTACHED_WIP`, not silent pollution.
- [ ] Commit, close, and pre-push gates consume write-ticket/touched-path evidence as a last-line defense and block delivery when unattached WIP remains unresolved.
- [ ] The Antigravity/Gemini 3.6 counterexample is replayed as a red/green test: wrong actor id, malformed scope amendment path, direct `.atm/history/**` edit attempt, and out-of-scope source writes must produce early warnings/events before commit, plus deterministic recovery commands.
- [ ] The system preserves flexibility for real task-card omissions: scope expansion is a normal governed path, not a punishment, and final reports distinguish amendment-required, unattached-WIP, and violation cases.
- [ ] Final evidence reports counts for write-ticket acquisitions, pre-write blocks, post-write detections, scope amendments, unattached-WIP records, true violations, adapter-enforced blocks, manual captain interventions, false blocks, and chosen recovery paths.
- [ ] 0259 must not create a second permission model; write-ticket is broker/task-scope authority evidence consumed by 0258 transactional commit queue, not a replacement for it.
- [ ] Delivery evidence links `ATM-BUG-2026-07-22-232`; zero out-of-scope spillover is insufficient unless the Gemini 0258 negative replay proves early warning, recorded violation/recovery, and no manual captain reconstruction.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-07-22T14:47:07.432Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/tasks/ATM-GOV-0259-write-ticket-scope-amendment-guard-and-out-of-scope-wip-recorder.task.md","contentDigest":"sha256:778e95e82f04bba966b823df793face06eef6b2d8a90a07472cd686bc88d1067"} -->
