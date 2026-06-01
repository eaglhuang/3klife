---
task_id: TASK-AAO-0110
title: "Goal-aligned legacy route selection for guided atomize"
milestone: M16
status: open
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
executionMode: phase0-guided-atomize-route-gap
allowed_files:
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0110-goal-aligned-legacy-route-selection-for-guided-atomize.task.md
  - C:/Users/User/3KLife/docs/tasks/tasks-aao.json
forbidden_files:
  - C:/Users/User/AI-Atomic-Framework/pipelines/sanguo-rag/relationship_type_refinement.py
  - C:/Users/User/AI-Atomic-Framework/.atm/integrations/copilot.manifest.json
  - C:/Users/User/AI-Atomic-Framework/.atm/runtime/**
  - C:/Users/User/AI-Atomic-Framework/release/**
  - C:/Users/User/AI-Atomic-Framework/packages/**
  - C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0109-*.task.md
  - C:/Users/User/AI-Atomic-Framework/examples/**
non_goals:
  - "Do not repair the Three Kingdoms RAG business code in this card."
  - "Do not apply any proposal or mutate AAF source files."
  - "Do not change runtime artifacts."
  - "Do not modify non-routing / non-ranker framework trunks."
  - "Do not expand scope to .atm/integrations/copilot.manifest.json."
notes: "2026-06-02 | status: open | validation: pending | change: Phase 0 create card for AAF routing gap in ATM next leaf selection | blocker: none | risk: helper-leaf preference can hide goal-aligned proposal"
---

# TASK-AAO-0110 Goal-aligned legacy route selection for guided atomize

## Goal
Fix the ATM next route selection gap so guided atomize prefers the goal-aligned or touched semantic leaf for an explicit symbol over a generic safe helper leaf.

## Background
Current routing behavior can still pick a helper leaf such as `_required_rule_value` when the guidance goal clearly names a symbol that already has a more specific semantic leaf. That makes the route feel safe but misaligned with the user's actual target. This card only defines the routing contract; it does not change Three Kingdoms RAG business code.

## Acceptance Case
- guidanceSession: `guidance-20260601161117-4d1414b3ca`
- wrong legacyTarget: `pipelines/sanguo-rag/relationship_type_refinement.py#_required_rule_value`
- correct legacyTarget: `pipelines/sanguo-rag/relationship_type_refinement.py#spouse_supports_pair_binding`
- `spouse_supports_pair_binding` dry-run `automatedGates.allPassed=true`

## Acceptance Criteria
- next ranking can distinguish safest leaf, goal-aligned leaf, and touched semantic leaf.
- if a guidance goal explicitly mentions a symbol, that symbol's leaf proposal ranks ahead of a generic helper.
- review / proposal evidence exposes `goalAlignment` or `overrideReason`.
- blocked trunks such as `kinship_pair_binding_supported` are not atomized by mistake.
- the router can explain why it picked a leaf that matches the touched symbol when that leaf exists.
- helper leaves remain available as fallback, but not as a default override for explicit symbol goals.

## Out of Scope
- Do not repair Three Kingdoms RAG business code.
- Do not apply any proposal.
- Do not change runtime artifacts.
- Do not modify non-routing / non-ranker framework trunks.
- Do not expand scope to `.atm/integrations/copilot.manifest.json`.

## Allowed Files
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0110-goal-aligned-legacy-route-selection-for-guided-atomize.task.md`
- `C:/Users/User/3KLife/docs/tasks/tasks-aao.json`

## Forbidden
- `C:/Users/User/AI-Atomic-Framework/pipelines/sanguo-rag/relationship_type_refinement.py`
- `C:/Users/User/AI-Atomic-Framework/.atm/integrations/copilot.manifest.json`
- `C:/Users/User/AI-Atomic-Framework/.atm/runtime/**`
- `C:/Users/User/AI-Atomic-Framework/release/**`
- `C:/Users/User/AI-Atomic-Framework/packages/**`
- `C:/Users/User/3KLife/docs/ai_atomic_framework/atm-agent-first-operability/tasks/TASK-AAO-0109-*.task.md`
- `C:/Users/User/AI-Atomic-Framework/examples/**`

## Validators
- `node atm.mjs next --prompt "guided atomize route selection" --json`
- `node atm.mjs hook pre-push --json`

## Plain-language Anchor
這張卡只修「ATM next 要先選對葉子」這個路由缺口，不碰三國 RAG 業務實作本體。