---
task_id: TASK-AAO-0207
title: Charter upgrade command with sync integration, staged enforcement, and accurate doctor diagnosis
status: planned
owner: claude-code-opus-5
priority: P1
depends_on: []
causalGraph:
  causalDependencies: []
  startConditions: []
  softRelations: []
  changedPublicSeams: []
  causalImpactEdges: []
  parallelFrontierInputs: []
  validatorReferences: []
  phaseOwner: null
related_plan: atm-agent-first-operability/ATM Agent-First 可操作性優化計畫書.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - packages/cli/src/commands/charter/**
  - packages/cli/src/commands/command-specs/charter.spec.ts
  - packages/cli/src/commands/doctor/run-doctor.ts
  - packages/cli/src/commands/doctor/utilities.ts
  - packages/cli/src/commands/internal-release/**
  - packages/cli/src/commands/init.ts
  - templates/root-drop/.atm/charter/**
  - docs/governance/error-code-registry.json
  - docs/ERROR_CODES.md
  - docs/SELF_HOSTING_ALPHA.md
  - scripts/validate-internal-release-sync.ts
  - tests/cli/charter-upgrade.test.ts
  - tests/cli/doctor-charter-diagnosis.test.ts
  - tests/cli/internal-release-sync.test.ts
deliverables:
  - "atm charter upgrade [--dry-run|--write] [--enforce-now]: diffs the adopter charter against the bundled templates and applies only framework-owned changes"
  - "internal-release sync upgrades an outdated target charter in the same target commit as the runner"
  - "Staged enforcement: invariants added by an upgrade are advisory for one release, then enforced; --enforce-now skips the window"
  - "doctor distinguishes charter outdated (warning) from missing or corrupt (error) and prints a repair command that works"
  - "3KLife charter upgraded from 2.0.0 to the current version through the new command; doctor charter-integrity passes"
validators:
  - node --strip-types tests/cli/charter-upgrade.test.ts
  - node --strip-types tests/cli/doctor-charter-diagnosis.test.ts
  - node --strip-types tests/cli/internal-release-sync.test.ts
  - npm run typecheck
  - node atm.mjs verify --neutrality
errorCodes:
  - ATM_DOCTOR_CHARTER_OUTDATED
  - ATM_CHARTER_UPGRADE_OK
  - ATM_CHARTER_UPGRADE_CONFLICT
createdByCommand: atm plan card create
---

# TASK-AAO-0207 Charter upgrade command with sync integration, staged enforcement, and accurate doctor diagnosis

## Intent

An adopter's AtomicCharter is written once at bootstrap and never updated, so
it drifts behind the framework. 3KLife still holds charter 2.0.0 (7
invariants, no first-principles file, no Schedule A) while the framework ships
2.7.0 (13 invariants). doctor reports this as `ATM_DOCTOR_CHARTER_MISSING` and
suggests `init --adopt default --force`, which does not touch the charter.

Goal: upgrading ATM stays one step. Runner and charter move together, adopter
customizations are never overwritten, and new invariants cannot suddenly block
in-flight adopter work.

## Design

1. `atm charter upgrade`
   - Dry-run (default) prints the version delta and the invariants, files, and
     Schedule A fields that would be added or changed.
   - Framework-owned content is identified by invariant id and template
     provenance. Adopter-added invariants, waivers, and project fields are
     preserved byte-for-byte.
   - A conflict (adopter edited a framework-owned invariant) stops with
     `ATM_CHARTER_UPGRADE_CONFLICT` and lists the ids; no partial write.
   - Writes an upgrade receipt under `.atm/history/evidence/` for review.
2. Sync integration: `internal-release sync` runs the upgrade when the target
   charter is behind, includes the charter files in the `--commit` path set,
   and reports the delta in the sync report.
3. Staged enforcement: invariants first introduced by an upgrade are recorded
   with an advisory window (data, not code) and enforced from the next
   release; `--enforce-now` records immediate enforcement.
4. doctor: `ATM_DOCTOR_CHARTER_OUTDATED` (warning, repair
   `node atm.mjs charter upgrade --write`) vs missing or corrupt (error).

## Acceptance

- [ ] `charter upgrade --dry-run` on a 2.0.0 fixture lists the added invariants, first-principles file, and Schedule A, and writes nothing.
- [ ] `--write` brings the fixture to the bundled version; adopter-added invariants and waivers are unchanged.
- [ ] An edited framework-owned invariant yields `ATM_CHARTER_UPGRADE_CONFLICT` with no file changes.
- [ ] Newly added invariants are advisory until the recorded window ends; `--enforce-now` makes them enforced at once.
- [ ] `internal-release sync --commit` on an outdated target commits runner and charter together; other staged work stays staged.
- [ ] doctor reports outdated as a warning with a repair command that works; missing or corrupt stays an error.
- [ ] 3KLife upgraded through the command; `node atm.mjs doctor --json` charter-integrity passes.
- [ ] Error codes registered through the canonical registry; framework source stays host-neutral.

## Non-goals

- Changing the content or meaning of existing invariants.
- Auto-accepting waivers or removing adopter rules.

## Rollback

Revert the framework PR; adopters keep the previous charter files, and the
upgrade receipt records the prior file digests for manual restore.

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan card create","createdAt":"2026-11-15T14:38:01.474Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"atm-agent-first-operability/tasks/TASK-AAO-0207-charter-upgrade-command-with-sync-integration-staged-enforcement-and-accurate-doctor-diagnosis.task.md","contentDigest":"sha256:e642e878faf9836d23cb795566bdf4de4a78a1efde8c3bf9fb7847217a5d9f8e"} -->
