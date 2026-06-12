---
doc_id: doc_cid_0033
task_id: TASK-CID-0033
title: "Adapter manifest symbol canonicalization contract"
status: done
owner: atm-core
priority: P1
milestone: M2
depends_on:
  - "TASK-CID-0028"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/plugin-sdk/src/language-adapter.ts"
  - "packages/language-js/src/language-js-adapter.ts"
  - "packages/language-python/src/language-python-adapter.ts"
  - "docs/BROKER_GUIDE.md"
deliverables:
  - "packages/plugin-sdk/src/language-adapter.ts"
  - "packages/language-js/src/language-js-adapter.ts"
  - "packages/language-python/src/language-python-adapter.ts"
  - "docs/BROKER_GUIDE.md"
validators:
  - "npm run typecheck"
  - "npm run validate:cli"
  - "git diff --check"
evidence:
  required: command-backed
rollback:
  strategy: revert-commit
  notes: "Revert manifest contract changes if documented canonicalization claims exceed actual adapter behavior."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-symbol-map"
  mapUpdates: []
outOfScope:
  - "Implementing unresolved alias/decorator logic that is not yet supported"
  - "Changing broker runtime state"
nonGoals:
  - "Do not declare unsupported canonicalization behavior as production-ready"
---

# TASK-CID-0033 - Adapter manifest symbol canonicalization contract

## Goal

Make symbol canonicalization policy an explicit adapter contract so CID/AGR logic can reason about symbol identity with declared limits.

## Acceptance Criteria

- Manifest fields cover policy, re-export alias behavior, and decorator resolution stance.
- JS/Python adapters declare current behavior honestly.
- Broker guide explains how canonicalization affects CID/AGR reasoning.
