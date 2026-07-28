---
task_id: ATM-GOV-0261
title: VCS-neutral commit candidate isolation and Git adapter fallback
status: done
owner: atm-core
priority: P0
milestone: ATM-3.1-R0.13
severity: P0
depends_on:
  - ATM-GOV-0258
  - ATM-GOV-0259
  - ATM-GOV-0260
related_plan: governance-optimization/end-to-end-auto-batch-performance-plan-v3.md
planning_repo: C:/Users/User/3KLife/docs/ai_atomic_framework
target_repo: AI-Atomic-Framework
closure_authority: target_repo
series_selection_reason: "GOV owns Plan 3.1 shared-write governance. This card keeps ATM's commit-candidate isolation VCS-neutral while allowing Git pathspec only inside the Git adapter and emergency repair skill boundary."
scopePaths:
  - packages/core/src/commit-candidate/**
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/core/src/broker/shared-surface-queue.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git-governance/commit-scope-policy.ts
  - packages/cli/src/commands/git.ts
  - packages/cli/src/commands/command-specs/git.spec.ts
  - packages/cli/src/commands/taskflow/commit-bundle-assembly.ts
  - templates/skills/atm-minimal-patch-rebuilder.skill.md
  - .agents/skills/atm-minimal-patch-rebuilder/SKILL.md
  - tests/cli/vcs-neutral-commit-candidate-isolation.test.ts
  - tests/cli/git-adapter-pathspec-fallback.test.ts
  - tests/cli/transactional-commit-queue-isolation.test.ts
deliverables:
  - packages/core/src/commit-candidate/commit-candidate.ts
  - packages/core/src/commit-candidate/commit-candidate-store.ts
  - packages/core/src/broker/shared-delivery-commit.ts
  - packages/cli/src/commands/git-governance/implementation.ts
  - packages/cli/src/commands/git-governance/commit-bundle-filter.ts
  - packages/cli/src/commands/git.ts
  - templates/skills/atm-minimal-patch-rebuilder.skill.md
  - tests/cli/vcs-neutral-commit-candidate-isolation.test.ts
  - tests/cli/git-adapter-pathspec-fallback.test.ts
validators:
  - node --strip-types tests/cli/vcs-neutral-commit-candidate-isolation.test.ts
  - node --strip-types tests/cli/git-adapter-pathspec-fallback.test.ts
  - node --strip-types tests/cli/transactional-commit-queue-isolation.test.ts
  - npm run validate:cli
  - npm run typecheck
errorCodes:
  - ATM_COMMIT_CANDIDATE_CONFLICT
  - ATM_COMMIT_CANDIDATE_STALE_BASE
  - ATM_COMMIT_CANDIDATE_ADAPTER_REQUIRED
  - ATM_GIT_PATHSPEC_FALLBACK_REQUIRES_EMERGENCY
  - ATM_COMMIT_CANDIDATE_INDEX_RESIDUE_BLOCKED
evidence:
  required: vcs-neutral-commit-candidate-isolation-red-green
rollback:
  strategy: revert-commit-and-retain-existing-git-adapter-commit-path
  notes: "Rollback may keep existing Git-specific governed commit behavior and emergency pathspec guidance, but Plan 3.1 final verdict must then remain blocked because ATM has not proven VCS-neutral commit-candidate isolation."
atomizationImpact:
  ownerAtomOrMap: atm.commit-candidate-isolation
  mapUpdates: []
  extractionCandidates:
    - atom: atm.commit-candidate-envelope
      pattern: Data Envelope
      source: packages/core/src/commit-candidate/commit-candidate.ts
      disposition: extract
    - atom: atm.commit-candidate-store
      pattern: Repository Adapter Boundary
      source: packages/core/src/commit-candidate/commit-candidate-store.ts
      disposition: extract
    - atom: atm.git-pathspec-emergency-adapter
      pattern: Adapter Facade
      source: packages/cli/src/commands/git-governance/implementation.ts
      disposition: extract
createdByCommand: atm plan card create
skl_validator_transition:
  schema_id: atm.validatorSelection.transition.v1
  enforcement: advisory-until-TASK-SKL-0029
  causalImpactEdges:
    - candidate-envelope-to-broker-admission
    - admitted-candidate-to-git-adapter-persisted-commit
    - emergency-pathspec-to-anomaly-only-classification
  requiredTestCaseIds:
    - test_task_atm_gov_0261_vcs_neutral_commit_candidate_f826ccc6
  phaseTestCaseIds:
    - test_int_plan3_final_verdict_evidence_aggregation_35563247
  advisoryTestCaseIds: []
  testContributions: []
completed_at: "2026-07-24T13:45:28.796Z"
completed_by_agent: "claude-002-plan31-captain"
closedAt: "2026-07-24T13:45:28.796Z"
closedByActor: "claude-002-plan31-captain"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-24T13-45-28-636Z-close-515d03904f00"
lastTransitionAt: "2026-07-24T13:45:28.796Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "8d8e9533c50f10e25661ee0e6a59913fa36afdd9"
---

# ATM-GOV-0261 VCS-neutral commit candidate isolation and Git adapter fallback

## Intent

Plan 3.1 dogfood showed that Git pathspec / path-bounded commit can preserve one actor's payload without consuming another actor's staged files. That is a useful adapter technique, but it must not become ATM's core concurrency model. ATM should not depend on Git as its product-level isolation primitive.

This card defines the durable split:

1. ATM core owns VCS-neutral commit-candidate isolation: actor, task/lane, base seal, allowed resource keys, candidate file set, content digests, evidence refs, expected trailers, validation plan, and conflict/CAS status.
2. Repository adapters translate an admitted commit candidate to the host's final persistence mechanism. In the local Git adapter, pathspec/--only may be used only as an implementation detail after ATM has already admitted the candidate and owns the queue/steward evidence.
3. Direct pathspec/native commit remains an emergency repair skill path, not a normal governed delivery path. Every emergency use must produce an explicit receipt/trailer and must be replayable as a counterexample until the core candidate lane handles it without emergency authority.

This card is the Plan 3.1 answer to the question: "If pathspec can commit only my files, why not let every task use that trick?" The answer is: ATM must expose a general commit-candidate/steward abstraction first; Git pathspec is merely one adapter's final write operation.

## Architecture decision

- Do not create a Git-only second permission model.
- Do not treat Git index state as ATM's source of truth for ownership.
- Do not require branches, alternate worktrees, alternate indexes, merges, or rebases for normal parallel development.
- Treat commit candidates as ATM-owned durable envelopes that can be validated, queued, composed, superseded, or escalated before any repository adapter writes.
- Treat Git pathspec / `git commit --only` / manual native commit as emergency-only unless invoked by the ATM Git adapter under a broker ticket and a steward receipt.

## Acceptance

- [ ] A VCS-neutral `atm.commitCandidate.v1` envelope exists outside Git-specific control flow. It carries actor id, task id or framework-temp id, lane/session/lease when available, base seal, candidate files/resources, content digests, allowed resource keys, validation plan, evidence refs, expected trailers/metadata, and adapter target.
- [ ] Commit candidates can be submitted without mutating the shared Git index. Two candidates for disjoint files can coexist while the physical index contains unrelated staged or dirty files.
- [ ] Candidate admission reports one of: execute-now, queued, compose-eligible, revalidation-required, stale-base/CAS failure, adapter-required, or blocked with exact recoveryCommand. A bare shared-index refusal is not acceptable.
- [ ] Existing Git-index, branch-commit, protected-bundle, runner-sync publication, and projection writes are projected into the same Broker/steward keyspace; no parallel global mutex or second queue decides commit authority (`ATM-BUG-2026-07-15-202`, `ATM-BUG-2026-07-15-205`).
- [ ] The Git adapter may use pathspec/--only only after a candidate is admitted at queue head; evidence must record that pathspec was an adapter operation, not the authority model.
- [ ] Direct native pathspec commits are documented and implemented only as emergency repair skill flow. They must set actor/task/WIP/delivery/emergency trailers and must never be presented as ordinary Plan3.1 success evidence.
- [ ] The steward validates that the final persisted commit/revision contains exactly the admitted candidate payload plus allowed generated provenance, and does not consume unrelated staged files.
- [ ] The queue/steward path preserves actor attribution for shared delivery commits and emits measurable counters: candidate count, queue residency, compose decisions, adapter fallback count, emergency pathspec count, false block count, and unrelated-index-residue isolation count.
- [ ] A red-green replay covers the Plan3.1 backlog-writing case: unrelated staged WIP exists in the Git index, but a docs/backlog candidate is admitted and persisted without consuming the staged WIP. The green path must use ATM candidate/steward semantics; the pathspec command may appear only inside Git adapter evidence.
- [ ] The same replay covers protected foreign staged provenance and release-order authorization without silent unstage, alternate index, or manual pathspec fallback (`ATM-BUG-2026-07-12-134`, `ATM-BUG-2026-07-22-235`).
- [ ] A negative test proves ATM core tests can run without Git-specific pathspec semantics by using a fake repository adapter or in-memory candidate store.
- [ ] Plan3.1 final verdict is blocked unless emergency pathspec count is either zero for normal delivery scenarios or explicitly classified as emergency/anomaly evidence outside the autonomous-parallel success metric.

## Validators

- `node --strip-types tests/cli/vcs-neutral-commit-candidate-isolation.test.ts`
- `node --strip-types tests/cli/git-adapter-pathspec-fallback.test.ts`
- `node --strip-types tests/cli/transactional-commit-queue-isolation.test.ts`
- `npm run validate:cli`
- `npm run typecheck`

## Final verdict evidence requirement

The final Plan3.1 report must include a table separating:

| category | allowed in success metric | evidence |
| --- | --- | --- |
| ATM commit candidate admitted by broker/steward | yes | candidate envelope + queue/steward receipt |
| Git adapter pathspec after candidate admission | yes, adapter evidence only | adapter receipt tied to candidate id |
| Direct native pathspec / --no-verify emergency | no | emergency receipt/trailer + backlog link |

If the only way to complete overlapping task delivery is still direct native pathspec, Plan3.1 must fail the autonomous high-coupling parallel-development claim and open Plan3.2 follow-up work.


2026-07-23 follow-up: `TASK-SKL-0017` owns the temporary Git pathspec emergency commit repair skill. This task still owns the normal VCS-neutral product path; SKL-0017 usage is anomaly evidence and must not satisfy normal acceptance here.
