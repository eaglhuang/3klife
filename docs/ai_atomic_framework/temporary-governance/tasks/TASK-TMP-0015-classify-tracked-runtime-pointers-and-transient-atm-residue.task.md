---
task_id: TASK-TMP-0015
title: Classify tracked runtime pointers and transient ATM residue
status: done
owner: codex-gpt-5.6
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions:
    - "TASK-TMP-0014 is released and its disposition receipt is committed."
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: codex-gpt-5.6
related_plan: temporary-governance/temporary-governance-plan.md
planning_repo: docs
target_repo: 3KLife
closure_authority: 3KLife
scopePaths:
  - .atm/runtime/guidance/active-session.json
  - .atm/runtime/identity/default.json
  - .atm/runtime/lane-sessions/**
  - .atm/runtime/telemetry/**
  - .atm/history/session-events/**
  - .atm/history/evidence/TASK-TMP-0014.live-index-reconciliation.json
  - .atm/history/task-events/TASK-TMP-0014/**
  - .atm/history/tasks/TASK-TMP-0014.json
  - .atm/history/evidence/git-head.jsonl
  - docs/ai_atomic_framework/temporary-governance/tasks/TASK-TMP-0015-classify-tracked-runtime-pointers-and-transient-atm-residue.task.md
  - docs/reports/residue-disposition/TASK-TMP-0015-runtime-artifact-disposition.json
  - .gitignore
deliverables:
  - docs/reports/residue-disposition/TASK-TMP-0015-runtime-artifact-disposition.json
validators:
  - git diff --check
  - node atm.mjs status --json
  - git status --porcelain=v1
errorCodes:
  - ATM_RUNTIME_ARTIFACT_DISPOSITION_REQUIRED
createdByCommand: atm plan card create
completed_at: "2026-09-01T17:45:15.894Z"
completed_by_agent: "codex-gpt-5.6"
closedAt: "2026-09-01T17:45:15.894Z"
closedByActor: "codex-gpt-5.6"
closedByCommand: atm tasks close
lastTransitionId: "2026-09-01T17-45-15-894Z-close-e6905ff1aff8"
lastTransitionAt: "2026-09-01T17:45:15.894Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "2fca9e447ae32e7ca65bb17de0cf2f0b8aee72a0"
---

# TASK-TMP-0015 Classify tracked runtime pointers and transient ATM residue

## Intent

Determine the durable lifecycle of the dirty ATM runtime state left after
TASK-TMP-0014. Each path must receive exactly one disposition: commit durable
evidence (A), delete through the owning ATM operation with reproducible expiry
proof (B), or untrack and narrow-ignore regenerated host-local state (C).
Never hide authored planning, task evidence, or MBX-owned work.

## Acceptance

- [ ] The receipt names every selected path and records its authority,
      pre-action SHA-256 or tracked identity, and exactly one A/B/C decision.
- [ ] B actions use an owning ATM lifecycle command or independently verifiable
      expiry proof; no raw deletion of active-task evidence.
- [ ] C actions untrack only regenerated host-local runtime state and add a
      narrow rule that does not hide authored source or immutable evidence.
- [ ] The active-session and default-identity pointers are not committed as
      durable source merely to make the worktree appear clean.
- [ ] TASK-MBX-0001 and its owner-controlled paths remain untouched.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-09-01T17:39:48.611Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"temporary-governance/tasks/TASK-TMP-0015-classify-tracked-runtime-pointers-and-transient-atm-residue.task.md","contentDigest":"sha256:1d18e8688a2d277ed0e6f7e596e6684a6de5d033484a1e2b2cd6aed5b094556f"} -->
