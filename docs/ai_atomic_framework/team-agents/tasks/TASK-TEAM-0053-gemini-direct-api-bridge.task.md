---
doc_id: doc_team_0053
task_id: TASK-TEAM-0053
title: "Gemini direct API bridge for Team provider matrix"
status: done
owner: atm-core
priority: P1
milestone: M10X
depends_on:
  - "TASK-TEAM-0050"
  - "TASK-TEAM-0051"
  - "TASK-TEAM-0052"
related_plan: "docs/ai_atomic_framework/team-agents/TEAM-BROKER-ENFORCEMENT-INTEGRATION-PLAN-2026-07-10.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "agent-integrations/vendors/team-secrets.example.json"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "agent-integrations/vendors/team-secrets.example.json"
  - "docs/governance/team-agents/team-vendor-runtime.md"
  - "packages/core/src/team-runtime/provider-contract.ts"
  - "packages/core/src/team-runtime/provider-selection.ts"
  - "packages/core/src/team-runtime/providers/gemini-direct.ts"
  - "packages/cli/src/commands/integration.ts"
  - "packages/cli/src/commands/team.ts"
  - "scripts/validate-team-agents.ts"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-team-agents.ts --case gemini-direct-api-bridge"
  - "node --strip-types scripts/validate-team-agents.ts --case team-vendor-local-secrets"
  - "node --strip-types scripts/validate-team-agents.ts --case heterogeneous-multi-bot-team-run"
  - "npm run validate:team-agents"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert Gemini direct provider, provider registry/selection wiring, validator case, docs, and example secret reference together."
atomizationImpact:
  ownerAtomOrMap: "atm.team-agents-runtime"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Changing the existing gemini CLI/editor-subagent bridge semantics from TASK-TEAM-0043"
  - "Committing local GEMINI_API_KEY or any raw provider secret"
  - "Live paid API calls in CI"
  - "Azure OpenAI or Microsoft Foundry credential work"
nonGoals:
  - "Do not make Gemini direct API the default provider for all roles"
  - "Do not grant spawned Gemini workers git.write, task.lifecycle, final evidence.write, or self-close authority"
completed_at: "2026-07-11T02:43:30.382Z"
completed_by_agent: "coordinator"
closedAt: "2026-07-11T02:43:30.382Z"
closedByActor: "coordinator"
closedByCommand: atm tasks close
lastTransitionId: "2026-07-11T02-43-30-382Z-close-ff071ea49066"
lastTransitionAt: "2026-07-11T02:43:30.382Z"
ledgerContractVersion: task-ledger/v1
delivery_commit: "38fdb423"
---
# TASK-TEAM-0053 Gemini direct API bridge for Team provider matrix

## Trigger

Operator dogfood exposed that `GEMINI_API_KEY` can be placed in the local
`team-secrets.local.json` file, but the current `gemini` Team bridge is a CLI /
editor-subagent bridge with `secretRefFields: []`. That is correct for
TASK-TEAM-0043, but it leaves the provider matrix asymmetric: OpenAI and
Anthropic can be tested as direct API bots, while Gemini can only be tested
through the Gemini CLI surface.

## Goal

Add a governed Gemini direct API bridge so Team Agent provider tests can run a
clean matrix:

- all roles on OpenAI direct API;
- all roles on Anthropic direct API;
- all roles on Gemini direct API;
- mixed OpenAI + Anthropic + Gemini direct API roles in one Team run.

The new bridge must coexist with the existing Gemini CLI bridge rather than
replacing it.

## Required Design

- Add a new provider identity or runtime surface that keeps the existing
  `gemini` CLI bridge unambiguous. Acceptable implementations:
  - `gemini-direct` as a distinct provider id; or
  - `gemini` with explicit `sdkId` / runtime-surface disambiguation, only if
    discovery, config, and observability remain unambiguous.
- Add a direct API config schema such as
  `atm.geminiDirectTeamProviderConfig.v1` with:
  - `providerId`;
  - `sdkId`;
  - `modelId`;
  - `apiKeyEnvVar`, default reference `GEMINI_API_KEY`;
  - optional base URL env var if the Google API surface supports override.
- The local secrets example must include an empty Gemini direct API reference,
  but raw local secrets remain ignored by git:

```json
"gemini-direct": {
  "GEMINI_API_KEY": ""
}
```

- Bridge execution must call the Gemini API through an injected HTTP executor in
  tests and the runtime HTTP executor in production.
- Artifacts and observability must remain provider-neutral:
  `atm.teamProviderRunArtifact.v1`, `atm.teamAgentObservabilityEvent.v1`,
  `decisionClass`, `decisionReason`, `violationStatus`, and
  `broker-conflict-blocked`.
- Raw secrets must never appear in artifacts, observability logs, CLI JSON,
  validator output, docs, or committed files.

## Acceptance Criteria

- `TEAM_PROVIDER_IDS`, provider metadata, selection config, Team runtime
  summaries, and integration capability discovery can distinguish the Gemini
  direct API bridge from the existing Gemini CLI bridge.
- `agent-integrations/vendors/team-secrets.example.json` documents the
  `GEMINI_API_KEY` slot for the direct bridge while keeping placeholder values
  empty.
- `team-vendor-runtime.md` documents both Gemini surfaces:
  - Gemini CLI / editor-subagent bridge from TASK-TEAM-0043;
  - Gemini direct API bridge from this task.
- `validateGeminiDirectTeamProviderConfig` rejects missing `modelId` or
  `apiKeyEnvVar`.
- `launchGeminiDirectTeamProviderRun` produces the shared provider artifact,
  permission decision, observability events, and redaction summary with
  `rawSecretsLogged: false`.
- The validator case `gemini-direct-api-bridge` uses a deterministic fake HTTP
  executor and proves request shape, secret reference usage, artifact output,
  and redaction without calling a live paid API.
- The heterogeneous multi-bot proof can include OpenAI direct API, Anthropic
  direct API, and Gemini direct API in the same matrix without relying on the
  Gemini CLI bridge.
- `atm doctor` / integration verification can list the Gemini direct backend or
  capability surface when provider discovery is requested.

## Suggested Test Matrix

Run these after implementation, using fake executors in CI:

1. OpenAI-only direct API roles.
2. Anthropic-only direct API roles.
3. Gemini-direct-only direct API roles.
4. Mixed direct API roles: OpenAI implementer, Anthropic reviewer, Gemini
   validator.
5. Mixed governance failure: one Gemini-direct role receives
   `broker-conflict-blocked`, while other direct API roles proceed.

Manual live testing may use the operator's local
`agent-integrations/vendors/team-secrets.local.json`, but evidence must record
only env var names and redacted summaries.
