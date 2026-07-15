---
id: TASK-RFT-0044
title: Extract team legacy runtime governance surfaces
status: planned
priority: high
target_repo: AI-Atomic-Framework
planning_repo: 3KLife
depends_on:
  - TASK-RFT-0043
created_at: 2026-07-15T23:44:00+08:00
owner: codex-captain
---

# TASK-RFT-0044 - Extract team legacy runtime governance surfaces

## Intent

Split the next large team legacy atom map so `packages/cli/src/commands/team-legacy.ts` drops below 2000 lines without creating any physical extracted file above 600 lines.

## Scope

- Move team broker / observability CLI projection helpers into `packages/cli/src/commands/team/legacy/broker-observability.ts`.
- Move team runtime contract / closure attestation policy into `packages/cli/src/commands/team/legacy/runtime-governance.ts`.
- Keep public exports and behavior stable for existing `team.ts` consumers.
- Update atom-map coverage for both extracted physical files.

## Deliverables

- `packages/cli/src/commands/team-legacy.ts`
- `packages/cli/src/commands/team/legacy/broker-observability.ts`
- `packages/cli/src/commands/team/legacy/runtime-governance.ts`
- `tests/cli/team-legacy-runtime-governance-extraction.test.ts`
- `atomic_workbench/atomization-coverage/path-to-atom-map-shards/owner-shard-cli.json`

## Acceptance

- `team-legacy.ts` is below 2000 physical lines after extraction.
- Every new/extracted physical file in this card is <=600 physical lines.
- Public exports used by existing Team Agents validators remain stable.
- Atom-map shard has explicit coverage for every new extracted file.
- No out-of-scope release/generated or foreign staged work is committed by this card.

## Validators

- `node --strip-types tests/cli/team-legacy-runtime-governance-extraction.test.ts`
- `node --strip-types tests/cli/team-legacy-plan-orchestration-extraction.test.ts`
- `node --strip-types tests/cli/team-agents-dogfood.test.ts`
- `npm run typecheck`

## Evidence Notes

- Record line counts for `team-legacy.ts`, `broker-observability.ts`, and `runtime-governance.ts`.
- If ATM close encounters foreign staged work from another captain/editor, use governed index isolation and do not unstage or revert it manually.
