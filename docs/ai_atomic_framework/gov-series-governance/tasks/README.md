---
doc_id: doc_index_0031
owner: atm-core
status: active
related_plan: docs/ai_atomic_framework/gov-series-governance/ATM-GOV-Governance-Program-Plan.md
upstream_repo: AI-Atomic-Framework
public_tracking: false
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
last_updated: 2026-05-20T00:00:00+08:00
---

# ATM GOV Task Cards

This directory is the formal task-card set for ATM-GOV-0101 through ATM-GOV-0123.
It mirrors the same "plan + tasks/README + per-task card" layout used in 3KLife.

| Task ID | Title | Milestone | Status |
| --- | --- | --- | --- |
| [ATM-GOV-0101](./ATM-GOV-0101-actor-identity-registry.task.md) | Actor Identity Registry and Git Identity Contract | M1 | open |
| [ATM-GOV-0102](./ATM-GOV-0102-atomic-task-claim-lease.task.md) | Atomic Task Claim, Lease, Renew, Release, Handoff, Takeover | M1 | open |
| [ATM-GOV-0103](./ATM-GOV-0103-task-reservation-lifecycle.task.md) | Task Opening and Reservation Lifecycle | M1 | open |
| [ATM-GOV-0104](./ATM-GOV-0104-evidence-bound-gates.task.md) | Evidence-Bound Close and Commit/PR Gate | M1 | open |
| [ATM-GOV-0105](./ATM-GOV-0105-git-governance-contract.task.md) | Git Governance and Commit Trailer Validation | M1 | open |
| [ATM-GOV-0106](./ATM-GOV-0106-thin-guard-engine.task.md) | Thin Guard Engine for Mutation and Git Checks | M1 | open |
| [ATM-GOV-0107](./ATM-GOV-0107-integration-plugins.task.md) | Integration Plugins for Claude Code, Codex, Gemini, Cursor | M2 | open |
| [ATM-GOV-0108](./ATM-GOV-0108-no-hook-human-fallback.task.md) | No-Hook and Human Collaboration Fallback Profile | M2 | open |
| [ATM-GOV-0109](./ATM-GOV-0109-claim-collision-proofing.task.md) | Claim Collision Proofing and Conflict Evidence Flow | M2 | open |
| [ATM-GOV-0110](./ATM-GOV-0110-adapter-neutrality-boundary.task.md) | Adapter Neutrality Boundary and Governance Externalization | M2 | open |
| [ATM-GOV-0111](./ATM-GOV-0111-antigravity-integration-adapter.task.md) | Antigravity Integration Adapter | M2 | done |
| [ATM-GOV-0112](./ATM-GOV-0112-languageadapter-governance-capability-contract.task.md) | LanguageAdapter Governance Capability Contract | M3 | open |
| [ATM-GOV-0113](./ATM-GOV-0113-languageadapter-capability-resolution-fallback.task.md) | LanguageAdapter Capability Resolution and Fallback Semantics | M3 | open |
| [ATM-GOV-0114](./ATM-GOV-0114-legacyrouteplan-via-languageadapter.task.md) | LegacyRoutePlan via LanguageAdapter | M3 | open |
| [ATM-GOV-0115](./ATM-GOV-0115-source-inventory-candidate-ranking-signals.task.md) | Source Inventory and Candidate Ranking Signals via LanguageAdapter | M3 | open |
| [ATM-GOV-0116](./ATM-GOV-0116-atomize-infect-dryrun-planning.task.md) | Atomize and Infect Dry-Run Planning via LanguageAdapter | M3 | open |
| [ATM-GOV-0117](./ATM-GOV-0117-reference-javascript-languageadapter.task.md) | Reference JavaScript LanguageAdapter Governance Implementation | M4 | open |
| [ATM-GOV-0118](./ATM-GOV-0118-reference-python-languageadapter.task.md) | Reference Python LanguageAdapter Governance Implementation | M4 | open |
| [ATM-GOV-0119](./ATM-GOV-0119-unsupported-language-advisory.task.md) | Unsupported Language Advisory and Deferred Apply Contract | M4 | open |
| [ATM-GOV-0120](./ATM-GOV-0120-multilanguage-onefile-validation-matrix.task.md) | Multi-language Onefile Validation Matrix for Governance Analysis | M4 | open |
| [ATM-GOV-0121](./ATM-GOV-0121-languageadapter-governance-authoring-guide.task.md) | LanguageAdapter Governance Authoring Guide | M4 | open |
| [ATM-GOV-0122](./ATM-GOV-0122-adopter-atom-version-lineage.task.md) | Adopter Atom Version Lineage for Evolve Proof | M5 | open |
| [ATM-GOV-0123](./ATM-GOV-0123-registry-lineage-backfill-command.task.md) | Registry Lineage Backfill Command | M5 | open |

## Notes

- Task cards are planning/governance artifacts in this directory.
- Runtime task store remains managed by ATM CLI (`node atm.mjs tasks ...`), not manual edits.
