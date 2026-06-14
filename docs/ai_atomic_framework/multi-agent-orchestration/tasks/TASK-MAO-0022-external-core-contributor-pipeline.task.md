---
task_id: TASK-MAO-0022
title: "external core contributor pipeline"
status: planned
owner: atm-core
priority: P2
milestone: M5
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0017"
  - "TASK-MAO-0018"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/atm-core-runner-broker-design.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - ".github/workflows/"
  - "docs/HOST_GOVERNANCE_INTEGRATION.md"
  - "docs/CONTRIBUTING_CORE.md"
  - "scripts/validate-external-core-pipeline.ts"
  - "tests/fixtures/external-core-pipeline/"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "docs/CONTRIBUTING_CORE.md"
  - "scripts/validate-external-core-pipeline.ts"
  - "tests/fixtures/external-core-pipeline/"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-external-core-pipeline.ts --mode validate"
  - "npm run validate:external-golden"
  - "npm run validate:neutrality"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert external pipeline docs, workflow/validator changes, fixtures, and map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.external-core-contributor-pipeline-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Opening external core writes before Broker hardening is proven"
  - "Bypassing branch protection"
  - "Accepting direct `release/**` edits from external contributors"
---

# TASK-MAO-0022 - external core contributor pipeline

## Goal

Define the future open-source path that converts external ATM core PRs into Broker patch envelopes.

## Implementation Contract

- Keep external core modifications closed by default until Broker hardening is proven.
- Document the protected branch policy for `packages/core/**`, `packages/cli/**`, runner-affecting scripts, schemas, and `release/**`.
- Add a validator or fixture that proves a PR-like patch can be converted into a MAO patch envelope without granting direct write authority.
- Ensure accepted external patches go through the same Broker submit pipeline and runner binding as internal ATM core work.
- Keep framework public docs English-only and repository-neutral.

## Acceptance Criteria

- The docs distinguish docs/examples contributions from core-runner contributions.
- The fixture proves external patch extraction produces the same envelope shape accepted by the Broker.
- Direct external edits to `release/**` are rejected.
- Neutrality validation passes for new public docs.

