---
doc_id: doc_other_0801
owner: atm-core
status: active
related_cards_root: docs/ai_atomic_framework/gov-series-governance/tasks
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
last_updated: 2026-05-19T00:00:00+08:00
---

# ATM GOV Governance Program Plan

## 0. Summary

This plan formalizes ATM-GOV-0101 through ATM-GOV-0121 as one upstream governance program.
The program keeps ATM core host-neutral and moves editor-specific automation into integration plugins.
The core contract covers identity, claim/lease, evidence, git governance, and language-adapter capability routing.

## 1. Objectives

1. Provide deterministic non-editor-specific governance in ATM core.
2. Prevent task-claim collisions across AI agents, humans, and automation.
3. Keep hook logic optional, thin, and replaceable.
4. Define language-adapter capability resolution and fallback behavior with explicit evidence.
5. Provide reference JavaScript/Python implementations and validation matrix coverage.

## 2. In Scope

- Actor identity model and git identity contract.
- Task reservation/claim lifecycle and lease semantics.
- Evidence-bound close/commit/PR governance gates.
- Thin guard execution for mutation and git checks.
- Integration adapter guidance for Claude Code, Codex, Cursor, Gemini, Antigravity.
- LanguageAdapter governance capability contract and resolution fallback semantics.
- LegacyRoutePlan, source inventory, ranking, and dry-run planning via LanguageAdapter.
- Reference JS/Python governance adapter implementations.
- Unsupported-language advisory and deferred apply contract.
- Multi-language onefile validation matrix and authoring guide.

## 3. Out of Scope

- Hard-coding one editor hook mechanism into ATM core.
- Managing remote git credentials or secrets.
- Enforcing host-specific policy in protected framework-neutral surfaces.

## 4. Milestones

## M1 Core Governance Foundations
- ATM-GOV-0101
- ATM-GOV-0102
- ATM-GOV-0103
- ATM-GOV-0104
- ATM-GOV-0105
- ATM-GOV-0106

## M2 Collaboration and Integration Safety
- ATM-GOV-0107
- ATM-GOV-0108
- ATM-GOV-0109
- ATM-GOV-0110
- ATM-GOV-0111

## M3 LanguageAdapter Governance Contracts
- ATM-GOV-0112
- ATM-GOV-0113
- ATM-GOV-0114
- ATM-GOV-0115
- ATM-GOV-0116

## M4 Reference Implementations and Readiness
- ATM-GOV-0117
- ATM-GOV-0118
- ATM-GOV-0119
- ATM-GOV-0120
- ATM-GOV-0121

## 5. Task Inventory

| Task ID | Title | Milestone | Status | Blocked By |
| --- | --- | --- | --- | --- |
| ATM-GOV-0101 | Actor Identity Registry and Git Identity Contract | M1 | open | - |
| ATM-GOV-0102 | Atomic Task Claim, Lease, Renew, Release, Handoff, Takeover | M1 | open | ATM-GOV-0101 |
| ATM-GOV-0103 | Task Opening and Reservation Lifecycle | M1 | open | ATM-GOV-0101 |
| ATM-GOV-0104 | Evidence-Bound Close and Commit/PR Gate | M1 | open | ATM-GOV-0102 |
| ATM-GOV-0105 | Git Governance and Commit Trailer Validation | M1 | open | ATM-GOV-0101, ATM-GOV-0102 |
| ATM-GOV-0106 | Thin Guard Engine for Mutation and Git Checks | M1 | open | ATM-GOV-0102, ATM-GOV-0105 |
| ATM-GOV-0107 | Integration Plugins for Claude Code, Codex, Gemini, Cursor | M2 | open | ATM-GOV-0106 |
| ATM-GOV-0108 | No-Hook and Human Collaboration Fallback Profile | M2 | open | ATM-GOV-0106 |
| ATM-GOV-0109 | Claim Collision Proofing and Conflict Evidence Flow | M2 | open | ATM-GOV-0102, ATM-GOV-0108 |
| ATM-GOV-0110 | Adapter Neutrality Boundary and Governance Externalization | M2 | open | ATM-GOV-0107 |
| ATM-GOV-0111 | Antigravity Integration Adapter | M2 | done | ATM-GOV-0109, ATM-GOV-0110 |
| ATM-GOV-0112 | LanguageAdapter Governance Capability Contract | M3 | open | ATM-GOV-0110 |
| ATM-GOV-0113 | LanguageAdapter Capability Resolution and Fallback Semantics | M3 | open | ATM-GOV-0112 |
| ATM-GOV-0114 | LegacyRoutePlan via LanguageAdapter | M3 | open | ATM-GOV-0113 |
| ATM-GOV-0115 | Source Inventory and Candidate Ranking Signals via LanguageAdapter | M3 | open | ATM-GOV-0113 |
| ATM-GOV-0116 | Atomize and Infect Dry-Run Planning via LanguageAdapter | M3 | open | ATM-GOV-0114, ATM-GOV-0115 |
| ATM-GOV-0117 | Reference JavaScript LanguageAdapter Governance Implementation | M4 | open | ATM-GOV-0112, ATM-GOV-0116 |
| ATM-GOV-0118 | Reference Python LanguageAdapter Governance Implementation | M4 | open | ATM-GOV-0112, ATM-GOV-0116 |
| ATM-GOV-0119 | Unsupported Language Advisory and Deferred Apply Contract | M4 | open | ATM-GOV-0113, ATM-GOV-0118 |
| ATM-GOV-0120 | Multi-language Onefile Validation Matrix for Governance Analysis | M4 | open | ATM-GOV-0117, ATM-GOV-0118, ATM-GOV-0119 |
| ATM-GOV-0121 | LanguageAdapter Governance Authoring Guide | M4 | open | ATM-GOV-0112, ATM-GOV-0120 |

## 6. Validation Baseline

- `npm run typecheck`
- `node atm.mjs tasks verify --json`
- `node atm.mjs guard mutation --task <task-id> --actor <actor-id> --files <csv> --json`
- `node atm.mjs guard git --task <task-id> --actor <actor-id> --json`
- `node atm.mjs evidence verify --task <task-id> --gate close --json`
- `node --experimental-strip-types scripts/validate-guidance.ts --mode validate`

## 7. Notes

- Hook mechanisms remain optional and thin. Governance invariants live in ATM core.
- Editors without hooks rely on claim/lease, workspace isolation, pre-commit/CI, and evidence gates.
- ATM-GOV-0111 has already landed as an implementation baseline for adapter expansion.
