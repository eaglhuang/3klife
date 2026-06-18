---
task_id: TASK-CID-0095
doc_id: doc_cid_0095
title: "Text range adapter with conservative merge rules"
status: done
owner: atm-core
priority: P1
milestone: M19
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
depends_on:
  - "TASK-CID-0092"
scopePaths:
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/text-range.ts"
  - "packages/core/src/broker/__tests__/text-range-adapter.test.ts"
deliverables:
  - "packages/core/src/broker/adapters/index.ts"
  - "packages/core/src/broker/adapters/text-range.ts"
  - "packages/core/src/broker/__tests__/text-range-adapter.test.ts"
validators:
  - "npm run typecheck"
  - "npm test"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert text adapter and tests."
atomizationImpact:
  ownerAtomOrMap: "atm.text-range-adapter"
outOfScope:
  - "Semantic Markdown parser"
  - "Rich document formats such as DOCX"
nonGoals:
  - "Do not auto-merge overlapping text ranges."
completed_at: "2026-06-18T06:09:29.354Z"
completed_by_agent: "captain"
delivery_commit: "31fd89ff0b359edf8641e0a6c11d4449c11a9ca8"
---

# TASK-CID-0095 - Text range adapter with conservative merge rules

## Goal

Provide a conservative adapter for non-JSON text files.

## Required Behavior

- Support append, insert after stable heading, and replace explicit range.
- Compute line / range conflict keys.
- Treat overlapping ranges as conflict by default.
- Require base hash / anchor verification before write.

## Acceptance Criteria

- Independent appends to different stable anchors can be batched when deterministic order is declared.
- Overlapping range edits are not marked parallel-safe.
- Missing anchor causes failed evidence instead of best-effort mutation.

## Validation

```powershell
npm run typecheck
npm test
git diff --check
```
