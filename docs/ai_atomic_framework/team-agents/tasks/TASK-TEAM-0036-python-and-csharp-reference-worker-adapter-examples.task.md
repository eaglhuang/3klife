---
doc_id: doc_team_0036
task_id: TASK-TEAM-0036
title: "Python and C# reference worker adapter examples"
status: done
owner: atm-core
priority: P1
milestone: M7R
depends_on:
  - "TASK-TEAM-0035"
  - "TASK-TEAM-0019"
related_plan: "docs/ai_atomic_framework/team-agents/ATM多語言WorkerAdaptor方案.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/ai_atomic_framework/**"
  - "examples/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/ai_atomic_framework/**"
  - "examples/**"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case polyglot-worker-examples"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert example adapters, docs, and validation references."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Making Python or C# the default ATM runtime"
  - "Parity claims beyond the documented example surface"
  - "Vendor-specific lock-in"
nonGoals:
  - "Do not replace Node.js as the default runtime"
  - "Do not change closure authority rules"
completed_at: "2026-06-18T18:37:12.866Z"
completed_by_agent: "codex-gpt-5.4-mini"
closed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-18T18-37-12-454Z-close-3fe5dc3d48da"
delivery_commit: "efd75aa8c646783b71c0ce5dab2fdc90953f0dcf"
---
# TASK-TEAM-0036 Python and C# reference worker adapter examples

## Goal

Provide Python and C# reference worker adapter examples that follow the same Team runtime contract as the default Node.js adapter.

## Why

ATM should remain language-neutral at the adaptor surface even if Node.js remains the default runtime. Example adaptors make that extensibility real and teach adopters how to bring their own runtime.

## Implementation Contract

- Ship Python and C# example adapter patterns.
- Keep the examples aligned to the neutral runtime contract from `TASK-TEAM-0031`.
- Show how provider, SDK, artifact, retry, and attestation metadata map back into ATM.

## Acceptance Criteria

- Python and C# examples can express the same runtime metadata contract as the Node.js adapter.
- Docs clearly state that Node.js remains the default runtime.
- Example adaptors do not weaken lease, evidence, or closure requirements.

## Notes

This card exists so multi-language support is demonstrated, not just promised.
