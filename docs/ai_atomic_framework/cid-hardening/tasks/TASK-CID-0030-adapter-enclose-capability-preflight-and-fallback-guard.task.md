---
doc_id: doc_cid_0030
task_id: TASK-CID-0030
title: "Adapter enclose capability preflight and fallback guard"
status: done
owner: atm-core
priority: P1
milestone: M1
depends_on:
  - "TASK-CID-0028"
  - "TASK-CID-0029"
related_plan: docs/ai_atomic_framework/cid-hardening/CID硬化計畫書2.md
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
scopePaths:
  - "packages/language-js/src/language-js-adapter.ts"
  - "packages/language-python/src/language-python-adapter.ts"
  - "docs/BROKER_GUIDE.md"
deliverables:
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
  notes: "Revert adapter capability wiring if unsupported states are not represented cleanly."
atomizationImpact:
  ownerAtomOrMap: "atm.cid-agr-layer1-map"
  mapUpdates: []
outOfScope:
  - "Implementing Layer 2 decomposition"
  - "Changing broker closeout behavior"
nonGoals:
  - "Do not silently upgrade unsupported adapters into optimistic AGR verdicts"
started_at: 2026-06-11T18:49:58+08:00
started_by_agent: codex-gpt-5.4-mini
completed_at: 2026-06-11T18:51:19+08:00
completed_by_agent: codex-gpt-5.4-mini
---

# TASK-CID-0030 - Adapter enclose capability preflight and fallback guard

## Goal

Make adapter support for `enclose()` explicit and wire broker fallback behavior so unsupported languages remain safe.

## Acceptance Criteria

- JS and Python adapters can report support, non-support, or partial support states.
- Broker documentation explains the fallback contract.
- Unsupported states fail closed rather than producing optimistic parallel verdicts.
