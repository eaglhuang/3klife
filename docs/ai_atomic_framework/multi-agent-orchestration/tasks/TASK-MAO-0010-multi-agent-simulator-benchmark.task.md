---
task_id: TASK-MAO-0010
title: "multi-agent simulator benchmark"
status: done
owner: atm-core
priority: P1
milestone: M4
closure_authority: target_repo
depends_on:
  - "TASK-MAO-0003"
  - "TASK-MAO-0006"
  - "TASK-MAO-0009"
related_plan: "docs/ai_atomic_framework/multi-agent-orchestration/MAO多AI並行治理計畫書.md"
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
scopePaths:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/lib/mao-parallel-routing-benchmark-runner.ts"
  - "scripts/fixtures/mao-parallel-routing/manifest.json"
  - "scripts/fixtures/mao-parallel-routing/01-parallel-safe-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/02-same-file-different-atom-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/03-same-atom-write-write.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/04-read-write-overlap-watch.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/05-unknown-scope-malformed.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/06-generated-artifact-drift.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/07-route-freeze-on-pause.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/08-route-resume-after-freeze.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/09-steward-apply-safe.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/10-steward-blocked-out-of-scope.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/11-shared-surface-blocked.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/12-runner-derived-artifact-collision.scenario.json"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
deliverables:
  - "scripts/validate-mao-parallel-routing.ts"
  - "scripts/lib/mao-parallel-routing-benchmark-runner.ts"
  - "scripts/fixtures/mao-parallel-routing/manifest.json"
  - "scripts/fixtures/mao-parallel-routing/01-parallel-safe-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/02-same-file-different-atom-disjoint.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/03-same-atom-write-write.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/04-read-write-overlap-watch.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/05-unknown-scope-malformed.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/06-generated-artifact-drift.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/07-route-freeze-on-pause.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/08-route-resume-after-freeze.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/09-steward-apply-safe.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/10-steward-blocked-out-of-scope.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/11-shared-surface-blocked.scenario.json"
  - "scripts/fixtures/mao-parallel-routing/12-runner-derived-artifact-collision.scenario.json"
  - "docs/reports/mao-parallel-routing-benchmark.md"
  - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
validators:
  - "npm run typecheck"
  - "node --strip-types scripts/validate-mao-parallel-routing.ts"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Remove simulator, fixtures, report, and atomization map entries."
atomizationImpact:
  ownerAtomOrMap: "atm.mao-parallel-routing-benchmark-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Real multi-process load testing"
  - "Distributed broker consensus"
completed_at: "2026-06-16T16:08:51.426Z"
completed_by_agent: "cursor-composer-2.5"
lastTransitionId: "2026-06-16T16-08-51-330Z-close-35be7991d042"
delivery_commit: "8fe0d140f"
---

# TASK-MAO-0010 - multi-agent simulator benchmark

## Goal

Prove MAO v1 behavior with deterministic multi-agent scenarios before relying on it in real parallel development.

## Implementation Contract

- Add fixtures for same-file different atom, same atom write/write, write/read overlap, unknown scope, generated artifact drift, freeze/resume, steward apply, and blocked cases.
- Include at least one generated-artifact fixture that can later be extended by M5 runner Broker tests.
- Add a validator script that runs all scenarios and emits a concise report.
- Add a human-readable benchmark report summarizing pass/fail and remaining risks.
- Include lessons learned from the CID/AGR parallel development incident.

## Acceptance Criteria

- At least ten scenarios are covered.
- The simulator fails hard when a known unsafe case is allowed.
- The report identifies which MAO task introduced each capability.
- The report names which scenarios are generic MAO coverage and which are expected to be extended by M5 runner Broker cards.
- The benchmark can run without network access or external services.
