---
task_id: TASK-AAO-0110
title: "Goal-aligned legacy route selection for guided atomize"
milestone: M16
status: done
artifact_status: draft
runtime_status: n/a
upstream_mutation_status: not-applied
started_at: ""
started_by_agent: ""
blocked_by: []
owner: atm-core
priority: P1
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-roadmap
alphaGate: validate:task-ledger-governance
public_tracking: false
executionMode: target-repo-guidance-route-fix
planningRepo: 3KLife
closureAuthority: target_repo
scopePaths:
  - packages/core/src/guidance/route-engine.ts
  - packages/core/src/guidance/guidance-packet.ts
  - packages/core/src/guidance/legacy-route-plan.ts
  - packages/core/src/guidance/**/*.test.ts
  - scripts/validate-guidance.ts
deliverables:
  - packages/core/src/guidance/route-engine.ts
  - packages/core/src/guidance/guidance-packet.ts
  - scripts/validate-guidance.ts
planningReadOnlyPaths:
  - ../3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0110-goal-aligned-legacy-route-selection-for-guided-atomize.task.md
  - ../3KLife/docs/tasks/tasks-aao.json
planningMirrorPaths:
  - docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0110-goal-aligned-legacy-route-selection-for-guided-atomize.task.md
  - docs/tasks/tasks-aao.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/pipelines/sanguo-rag/relationship_type_refinement.py
  - C:/Users/User/AI-Atomic-Framework/.atm/integrations/copilot.manifest.json
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/packages/cli/**
  - C:/Users/User/AI-Atomic-Framework/packages/plugin-*/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0109-*.task.md
  - C:/Users/User/AI-Atomic-Framework/examples/**
non_goals:
  - "Do not repair the Three Kingdoms RAG business code in this card."
  - "Do not apply any proposal or mutate adopter business files."
  - "Do not change runtime artifacts."
  - "Do not modify CLI taskflow, hook, release, or other broker-locked surfaces."
  - "Do not expand scope to .atm/integrations/copilot.manifest.json."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 create card for ATM routing gap in ATM next leaf selection | blocker: none | risk: helper-leaf preference can hide goal-aligned proposal. 2026-06-19 | required-adjustment: scope repaired because the card requested framework route-engine behavior but only allowed planning files and globally forbade packages/**; narrowed source scope now permits packages/core/src/guidance only and still forbids CLI/release/runtime surfaces, including the active TASK-AAO-0135 broker lane. 2026-06-19 | metadata repair: scopePaths/deliverables are target-repo only; 3KLife files are planningReadOnlyPaths/planningMirrorPaths so taskflow close can compute the dual-repo bundle."
completed_at: "2026-06-19T01:18:45.068Z"
completed_by_agent: "codex-gpt-5.4-mini"
lastTransitionId: "2026-06-19T01-18-44-435Z-close-b7dc479d9eb6"
delivery_commit: "fc318d992d17353dd6c714790167f761561a5297"
---

# TASK-AAO-0110 Goal-aligned legacy route selection for guided atomize

## Goal
Fix the ATM next route selection gap so guided atomize prefers the goal-aligned or touched semantic leaf for an explicit symbol over a generic safe helper leaf.

## Background
Current routing behavior can still pick a helper leaf such as `_required_rule_value` when the guidance goal clearly names a symbol that already has a more specific semantic leaf. That makes the route feel safe but misaligned with the user's actual target.

This card owns the ATM route-engine/ranking contract only. It does not change Three Kingdoms RAG business code, runtime state, CLI taskflow, git hook behavior, release artifacts, or the active `TASK-AAO-0135` broker lane.

## INPUT_CONTRACT
- Use the existing `LegacyRoutePlan` evidence model as the ranking input.
- Treat the guidance goal text and any touched or explicit symbol evidence as first-class ranking signals.
- Preserve helper leaves as valid fallback candidates when no goal-aligned or touched semantic leaf exists.
- Keep blocked trunks, including `kinship_pair_binding_supported`, ineligible for direct atomize selection.
- Do not edit the referenced RAG file; it is an acceptance fixture target only.

## Acceptance Case
- guidanceSession: `guidance-20260601161117-4d1414b3ca`
- wrong legacyTarget: `pipelines/sanguo-rag/relationship_type_refinement.py#_required_rule_value`
- correct legacyTarget: `pipelines/sanguo-rag/relationship_type_refinement.py#spouse_supports_pair_binding`
- `spouse_supports_pair_binding` dry-run `automatedGates.allPassed=true`

## OUTPUT_CONTRACT
- `next` ranking can distinguish safest leaf, goal-aligned leaf, and touched semantic leaf.
- If a guidance goal explicitly mentions a symbol, that symbol's leaf proposal ranks ahead of a generic helper.
- Review or proposal evidence exposes `goalAlignment` or an equivalent `overrideReason`.
- Blocked trunks such as `kinship_pair_binding_supported` are not atomized by mistake.
- The router can explain why it picked a leaf that matches the touched symbol when that leaf exists.
- Helper leaves remain available as fallback, but not as a default override for explicit symbol goals.

## Acceptance Criteria
- The acceptance case above selects `spouse_supports_pair_binding` ahead of `_required_rule_value`.
- Route decision evidence exposes why the selected leaf won, using `goalAlignment` or an equivalent `overrideReason`.
- A focused guidance validator or unit test covers helper fallback, explicit-symbol preference, touched-symbol preference, and blocked-trunk protection.
- Existing generic helper behavior remains available when the goal contains no stronger semantic signal.

## Implementation Surface
- `packages/core/src/guidance/route-engine.ts`
- `packages/core/src/guidance/guidance-packet.ts`
- `packages/core/src/guidance/legacy-route-plan.ts`
- `packages/core/src/guidance/**/*.test.ts`
- `scripts/validate-guidance.ts`

## Out of Scope
- Do not repair Three Kingdoms RAG business code.
- Do not apply any proposal.
- Do not change runtime artifacts.
- Do not modify non-routing / non-ranker framework trunks.
- Do not expand scope to `.atm/integrations/copilot.manifest.json`.
- Do not edit `packages/cli/**`, `release/**`, or any `TASK-AAO-0135` broker-locked file.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0110-goal-aligned-legacy-route-selection-for-guided-atomize.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-aao.json`
- `C:/Users/User/AI-Atomic-Framework/packages/core/src/guidance/route-engine.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/core/src/guidance/guidance-packet.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/core/src/guidance/legacy-route-plan.ts`
- `C:/Users/User/AI-Atomic-Framework/packages/core/src/guidance/**/*.test.ts`
- `C:/Users/User/AI-Atomic-Framework/scripts/validate-guidance.ts`

## Forbidden
- `C:/Users/User/AI-Atomic-Framework/pipelines/sanguo-rag/relationship_type_refinement.py`
- `C:/Users/User/AI-Atomic-Framework/.atm/integrations/copilot.manifest.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/packages/cli/**`
- `C:/Users/User/AI-Atomic-Framework/packages/plugin-*/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0109-*.task.md`
- `C:/Users/User/AI-Atomic-Framework/examples/**`

## Validators
- `node atm.mjs next --prompt "guided atomize route selection" --json`
- `npm.cmd run validate:guidance`
- `npm.cmd run typecheck`
- `node atm.mjs hook pre-push --json`

## ROLLBACK_HINT
- Revert only this task card and `tasks-aao.json` scope repair if the next implementer needs a different target surface.
- Revert any future source implementation in `packages/core/src/guidance/**` independently from planning metadata.
- Do not revert unrelated AAO/CID/TEAM dirty worktree changes.

## Execution Steps
1. Claim `TASK-AAO-0110` through the ATM batch queue.
2. Confirm broker status has no active write intent overlapping `packages/core/src/guidance/**`.
3. Add or update route-engine ranking logic so explicit or touched semantic symbols outrank generic helper leaves.
4. Add focused validation for the acceptance case and fallback behavior.
5. Run the validators above and add command-backed evidence.
6. Run batch checkpoint and commit the source deliverable, evidence, and governance state together.

## Plain-language Anchor
ATM next should choose the semantic leaf the user actually named before falling back to a generic helper leaf.
