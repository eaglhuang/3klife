---
doc_id: doc_cid_0037
task_id: TASK-CID-0037
title: "Validator benchmark scenarios and catch-rate harness"
status: done
owner: atm-core
priority: P1
milestone: M4
depends_on:
  - "TASK-CID-0031"
  - "TASK-CID-0032"
  - "TASK-CID-0035"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-agr-benchmark.ts"
  - "scripts/fixtures/agr-benchmark/"
deliverables:
  - "package.json"
  - "scripts/validators.config.json"
  - "scripts/validate-agr-benchmark.ts"
  - "scripts/fixtures/agr-benchmark/"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "node --strip-types scripts/validate-agr-benchmark.ts"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert benchmark harness if scenarios are not deterministic or do not measure validator outcomes clearly."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-validation-map"
  mapUpdates:
    - "atomic_workbench/atomization-coverage/path-to-atom-map.json"
outOfScope:
  - "Trust Tier promotion work"
  - "Embedding-based semantic validator work"
nonGoals:
  - "Do not ship AGR based on anecdotal examples without harness evidence"
---

# TASK-CID-0037 - Validator benchmark scenarios and catch-rate harness

## Goal

Create the benchmark and validator harness that measures whether AGR improves routing precision without weakening defect detection.

## Acceptance Criteria

- At least 10 benchmark scenarios exist.
- Harness compares AGR-off, Layer 1, and Layer 2 + ADR outcomes where relevant.
- Report flags false-safe regressions as a hard failure.
