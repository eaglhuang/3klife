---
doc_id: doc_team_0066
task_id: TASK-TEAM-0066
title: "Paid OpenAI and Anthropic Team Agents live dogfood"
status: done
owner: atm-core
priority: P1
milestone: M10X
depends_on:
  - "TASK-TEAM-0053"
related_plan: "docs/ai_atomic_framework/team-agents/tasks/TASK-TEAM-0053-gemini-direct-api-bridge.task.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "docs/governance/team-agents/paid-multi-vendor-live-dogfood.md"
deliverables:
  - "docs/governance/team-agents/paid-multi-vendor-live-dogfood.md"
validators:
  - "npm run typecheck"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert only the redacted live dogfood report and ATM closure evidence."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates: []
outOfScope:
  - "Any provider implementation change"
  - "Committing or printing raw provider secrets"
  - "Live paid API calls in CI"
nonGoals:
  - "Do not reopen TASK-TEAM-0053"
  - "Do not grant worker roles task.lifecycle, git.write, evidence.write, or self-close authority"
---
# TASK-TEAM-0066 Paid OpenAI and Anthropic Team Agents live dogfood

## Trigger

TASK-TEAM-0053 was implemented and closed with deterministic provider tests,
but the operator explicitly authorized a real paid vendor run to prove that
independent OpenAI and Anthropic bots cooperate through the governed Team
Agents execution lane.

## Goal

Run an L5 `team start --execute` dogfood with OpenAI as Coordinator and Review
Agent and Anthropic as Implementer. Record provider/model identities, role
outcomes, governance decisions, redaction status, and command-backed results
without recording raw credentials or full vendor responses.

## Acceptance Criteria

- The L5 plan is admitted without `broker-conflict-blocked`.
- A real paid run invokes both OpenAI and Anthropic provider backends.
- OpenAI owns Coordinator and Review Agent roles; Anthropic owns Implementer.
- The report records the Team run id, provider/model assignments, per-role
  success or failure, governance fields, and `rawSecretsLogged: false`.
- No raw secret appears in CLI output, artifacts, the report, or tracked files.
- Any live defect is reported as a separate follow-up task instead of widening
  this evidence-only task.

## Operator Boundary

The human operator authorized paid OpenAI and Anthropic API calls on
2026-07-11. Local secret files and environment variables are runtime inputs
only and must remain ignored by git.
