---
doc_id: doc_other_0719
task_id: TASK-APO-0029
title: ATM Task Plan Import and Work Item Opening Flow
milestone: M5
status: open
blocked_by: [TASK-APO-0028]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:cli
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/cli/src/commands/tasks.ts
  - packages/cli/src/commands/command-specs.ts
  - packages/cli/src/atm.ts
  - packages/cli/src/index.ts
  - packages/plugin-governance-local/src/stores.ts
  - packages/plugin-sdk/src/governance/stores.ts
  - packages/core/src/guidance/intent-classifier.ts
  - packages/core/src/guidance/route-engine.ts
  - templates/skills/atm-governance-router.skill.md
  - integrations/*/atm-governance-router/**
  - scripts/validate-task-import.ts
  - scripts/validate-guide.ts
  - scripts/validate-cli.ts
forbidden_files:
  - assets/**
  - library/**
non_goals:
  - Do not redefine `atm create` as task-card creation.
  - Do not require agents to hand-write `.atm/history/tasks/*.json`.
  - Do not acquire runtime locks while only importing a plan.
  - Do not make host-local docs/tasks shards the canonical ATM work item store.
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
---

# TASK-APO-0029 ATM Task Plan Import and Work Item Opening Flow

## Background

A Claude Code black-box test asked an agent to open task cards from a host planning document using the ATM process. The agent correctly read the plan, but could not discover an official ATM task-card opening command. It tried to infer whether `atm create`, `atm start`, or direct writes to `.atm/history/tasks` were the intended path.

This is a product gap in ATM, not an agent failure. ATM already has a governance work item store, but the CLI does not expose a deterministic bulk task import flow for roadmaps and planning documents.

## Dependencies

- TASK-APO-0028

## Inputs

- A host Markdown planning document containing task IDs, titles, milestones, dependencies, acceptance criteria, deliverables, and notes.
- Existing ATM governance layout under `.atm/history/tasks` and `.atm/history/reports`.
- The `TaskStore.createTask()` contract from the local governance plugin.

## Outputs

1. Add `node atm.mjs tasks import --from <plan.md> --dry-run --json`.
2. Add `node atm.mjs tasks import --from <plan.md> --write --json`.
3. Add `node atm.mjs tasks verify --json`.
4. Produce a dry-run manifest that lists every detected work item before writing files.
5. Write canonical work items to `.atm/history/tasks/*.json` only after `--write`.
6. Write import evidence to `.atm/history/reports/task-import/*.json`.
7. Add `task-plan-import` intent routing so `guide --goal` can recommend the import command.
8. Update the governance router skill so agents do not confuse task-card import with atom birth.

## Acceptance Criteria

- [ ] `tasks import --dry-run` parses a fixture Markdown roadmap into a deterministic manifest without writing task files.
- [ ] `tasks import --write` writes task JSON records with stable IDs, titles, status, milestone, dependencies, acceptance, deliverables, and source trace.
- [ ] Importing a plan with duplicate task IDs fails with a typed CLI error and does not partially write.
- [ ] `tasks verify --json` validates the imported task directory and reports duplicate IDs, missing dependencies, invalid statuses, and malformed source traces.
- [ ] `guide --goal "open task cards from this plan" --json` returns `matchedIntent: task-plan-import` and a `tasks import --dry-run` next command.
- [ ] `next --json` can see imported open tasks without requiring agents to edit `.atm/runtime` by hand.
- [ ] No runtime lock files are created by import-only commands.
- [ ] A regression fixture covers the 3KLife/npc-brain low-manual-automation plan shape.

## Target Files

- `packages/cli/src/commands/tasks.ts`
- `packages/cli/src/commands/command-specs.ts`
- `packages/cli/src/atm.ts`
- `packages/cli/src/index.ts`
- `packages/plugin-governance-local/src/stores.ts`
- `packages/core/src/guidance/intent-classifier.ts`
- `packages/core/src/guidance/route-engine.ts`
- `templates/skills/atm-governance-router.skill.md`
- `scripts/validate-task-import.ts`
- `scripts/validate-guide.ts`
- `scripts/validate-cli.ts`

## Validation Commands

```bash
npm run build
node --experimental-strip-types scripts/validate-task-import.ts --mode validate
node --experimental-strip-types scripts/validate-guide.ts --mode validate
node --experimental-strip-types scripts/validate-cli.ts --mode validate
```

## Implementation Notes

- The canonical store for ATM work items is `.atm/history/tasks`.
- Human-readable Markdown projections are optional host views, not the source of truth.
- Plan import should be idempotent: rerunning the same plan should report unchanged tasks unless `--force` or an explicit update mode is provided.
- The parser should preserve source trace information so an agent can explain which section of the source plan produced each card.
- The task was originally proposed as `TASK-APO-0028`, but that ID is already assigned to First-Use User Notice; this card uses the next available APO ID.

## Checklist

- [x] CLI command spec
- [x] Markdown plan parser fixture
- [x] dry-run manifest
- [x] write-mode task store integration
- [x] task import report evidence
- [x] guide intent routing
- [x] router skill instruction
- [x] validator coverage

## Notes

2026-05-19 | status: open | validation: pending | change: opened upstream card for official ATM task plan import and work item opening flow | blocker: TASK-APO-0028

2026-05-19 | status: done | validation: validate-task-import + validate-guide + validate-cli | change: implemented `atm tasks import --dry-run|--write` and `atm tasks verify`, added Markdown plan parser with YAML front matter + section heading detection, wrote canonical work items to `.atm/history/tasks/*.json`, persisted import evidence under `.atm/history/reports/task-import/`, added `task-plan-import` intent + route, updated governance router skill and template, added fixtures (single-card, sample plan, low-automation plan, duplicate plan), and wired the validator into the validators config. No runtime lock is created by import-only commands and re-importing without source changes is idempotent (`ATM_TASKS_IMPORT_UNCHANGED`).