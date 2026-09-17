---
task_id: TASK-PRF-0112
title: Integrate deferred next readiness probes and bounded Git scans
status: planned
owner: unassigned
priority: P1
depends_on: [TASK-PRF-0109]
causalGraph:
  causalDependencies: [TASK-PRF-0109]
  startConditions: ["Only the canonical AI-Atomic-Framework worktree; no candidate clone, alternate worktree, or -vN candidate", "Parked patches A and C apply cleanly to HEAD"]
  softRelations: [TASK-PRF-0110, TASK-PRF-0111]
  changedPublicSeams: [next-readiness, git-scan-startup]
  causalImpactEdges: [lower-fixed-command-cost]
  parallelFrontierInputs: ["atm-benchmark-sink/ATM-PRODUCT-PROOF-20260917/parked-wip-20260917T2210/A-next-preclaim-defer.patch", "atm-benchmark-sink/ATM-PRODUCT-PROOF-20260917/parked-wip-20260917T2210/C-git-scan-reduction.patch"]
  validatorReferences: ["tests/cli/next-governance-readiness-latency.test.ts", "packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts", "tests/cli/root-drop-release-source-list.test.ts"]
  phaseOwner: product-proof
related_plan: atm-product-proof/atm-convergence-plan.md
planning_repo: docs
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: adopter
scopePaths:
  - packages/cli/src/commands/next/governance-readiness.ts
  - packages/cli/src/commands/next/next-action-assembly.ts
  - packages/cli/src/commands/next/prompt-guidance-result.ts
  - packages/cli/src/commands/next/playbook-projection/governance-readiness.ts
  - tests/cli/next-governance-readiness-latency.test.ts
  - packages/cli/src/commands/framework-development/closure-packet-schema/implementation.ts
  - packages/cli/src/commands/git-governance/implementation/task-ignored-deliverable-discovery.ts
  - packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts
  - tests/cli/root-drop-release-source-list.test.ts
deliverables:
  - packages/cli/src/commands/next/prompt-guidance-result.ts
  - packages/cli/src/commands/git-governance/implementation/task-ignored-deliverable-discovery.ts
validators:
  - "node --strip-types tests/cli/next-governance-readiness-latency.test.ts"
  - "node --strip-types tests/cli/next-playbook-projection-contracts.test.ts"
  - "node --strip-types packages/cli/src/commands/git-governance/implementation/commit-bundle-resolution.test.ts"
  - "node --strip-types tests/cli/root-drop-release-source-list.test.ts"
  - "npm run typecheck -- --pretty false"
  - "git diff --check"
errorCodes: []
createdByCommand: atm plan card create
---

# TASK-PRF-0112 Integrate deferred next readiness probes and bounded Git scans

Series choice: PRF, continuing the next/readiness latency line (PRF-0105, PRF-0106,
PRF-0109). TASK-PRF-0109 is closed, so its follow-up needs its own card.

## Intent

Two already-written latency changes were left unintegrated on 2026-09-15 and are
parked outside the repository:

- A: pre-claim `next` guidance uses a cheap repository identity probe and defers the
  upstream ahead count and active-work enumeration to the claim/guard boundary.
- C: the runner source seal reads blob ids from one `git ls-tree` per repository
  (with a WSL `/mnt` Git environment), and ignored-deliverable discovery passes the
  declared scope as a pathspec instead of walking the whole ignored worktree.

Land each group in the canonical worktree as its own commit, with a measured
before/after sample. Inventory and residue handling belong to TASK-TMP-0028, not here.

## Acceptance

- [ ] A and C land as two separate commits; a failure in one does not block the other.
- [ ] A keeps behavior at admission boundaries: with a channel or a required framework
  claim, `aheadCount` and the active-work summary are still computed; `null` appears
  only on pre-claim guidance and means "not measured", never zero.
- [ ] C keeps discovery correctness: declared ignored deliverables are still found,
  undeclared siblings are not, and a pathspec over 8,000 bytes falls back to the full
  scan. Runner drift results are unchanged.
- [ ] Measurement: same machine and fixture, interleaved ABAB with at least 10 runs per
  arm for `node atm.mjs next --prompt "<task prompt>" --json`, HEAD dist versus the
  rebuilt dist; record p50/p95 and keep failed samples. The receipt stays in the
  external evidence sink, not in the repository.
- [ ] Generated dist and release artifacts are rebuilt once through the coalesced
  runner-sync window after the source commits, not per commit.
- [ ] No new governance command, dashboard, evidence family, or reviewer round.
- [ ] Stop rule: two hours without a commit, or a third rework of the same group,
  keeps that group parked and records the reason.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-16T23:00:42.632Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-product-proof/tasks/TASK-PRF-0112-next-readiness-git.task.md","contentDigest":"sha256:66011adf87be6894f20b35350f35c5d7950653134542eef06b088361040416aa"} -->
