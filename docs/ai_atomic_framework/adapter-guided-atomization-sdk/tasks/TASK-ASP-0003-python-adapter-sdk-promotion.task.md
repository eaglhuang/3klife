---
doc_id: doc_other_asp_0003
task_id: TASK-ASP-0003
title: Python Adapter SDK Promotion (planPythonAtomize → AtomizationPlanningAdapter)
milestone: ASP-M1
status: open
blocked_by: [TASK-ASP-0001]
owner: atm-core
related_plan: docs/ai_atomic_framework/atomic-cost-reduction-plan.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:python-adapter
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/language-python/src/**
  - packages/language-python/test/**
  - packages/plugin-sdk/src/**
forbidden_files:
  - packages/core/src/broker/**
  - packages/language-js/**
  - assets/**
  - library/**
non_goals:
  - Do not require AST or import Python interpreter at runtime.
  - Do not regress existing `planPythonAtomize()` behavior — preserve as internal helper.
  - Do not break existing Python adapter test suite.
  - Do not introduce coupling to broker code.
created_at: 2026-06-10T00:00:00+08:00
created_by_agent: ClaudeCode_haiku-4-5
---

# TASK-ASP-0003 Python Adapter SDK Promotion

## Background

Python adapter (`packages/language-python/`) already has `planPythonAtomize()` as a private function with three-step atomize plan (extract-unit, wire-host-shim, evidence-required). This task promotes the capability to the new SDK contract (TASK-ASP-0001) and adds `discoverAtomCandidates()` using existing regex / line-scan patterns.

## Dependencies

- TASK-ASP-0001 (SDK contract)

## Inputs

- Existing Python adapter: `packages/language-python/src/language-python-adapter.ts`
- Existing `planPythonAtomize()` private function
- Test fixtures of Python source files

## Outputs

1. Python adapter implements `AtomizationPlanningAdapter` from SDK
2. `discoverAtomCandidates()` returns candidates for:
   - Top-level `def <name>(...)` → kind=`function`, confidence=`high`
   - Top-level `class <name>` → kind=`class`, confidence=`high`
   - `if __name__ == "__main__":` → kind=`command`, confidence=`high`
   - Module-level (Python file as a whole) → kind=`module`, confidence=`medium`
3. `planAtomize()` wraps existing `planPythonAtomize()` and conforms to SDK schema
4. Steps emitted include the existing three: extract-unit, wire-host-shim, evidence-required
5. Unit tests covering candidate discovery + plan generation

## Acceptance Criteria

- [ ] `language-python-adapter.ts` exports an `AtomizationPlanningAdapter` implementation
- [ ] `discoverAtomCandidates()` returns function/class/command candidates from fixtures
- [ ] `planAtomize()` returns a dry-run plan with: `dryRun: true`, patch files, steps, evidence required
- [ ] No new external dependencies
- [ ] Backwards compatible: existing `planPythonAtomize()` callers still work
- [ ] Tests cover at least 5 Python fixture files

## Validation

```bash
cd AI-Atomic-Framework
pnpm --filter @ai-atomic-framework/language-python build
pnpm --filter @ai-atomic-framework/language-python test
node atm.mjs candidates discover --include "packages/language-python/test/fixtures/**/*.py" --json
```

## Non-goals

- Not implementing async / decorator / metaclass detection in this task
- Not running Python at detection time
- Not modifying broker

## Notes / Decision Log

- 變更: 待開工
- 驗證: 待補
- 阻塞: TASK-ASP-0001 未完成
