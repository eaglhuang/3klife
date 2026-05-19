---
doc_id: doc_other_0720
task_id: TASK-APO-0030
title: Python Language Adapter / Plugin
milestone: M5
status: open
blocked_by: [TASK-APO-0028]
owner: atm-core
related_plan: docs/ai_atomic_framework/agent-pack-onboarding/ATM引導工程計畫書.md
upstream_repo: AI-Atomic-Framework
targetRepo: AI-Atomic-Framework
hostKind: upstream-framework
alphaGate: validate:python-adapter
public_tracking: false
executionMode: planned-upstream-change
allowed_files:
  - packages/language-python/**
  - packages/plugin-sdk/src/**
  - packages/core/src/guidance/project-probe.ts
  - packages/core/src/guidance/route-engine.ts
  - packages/cli/src/commands/runtime-adapter-readiness.ts
  - packages/cli/src/commands/candidates.ts
  - docs/ADAPTER_GUIDE.md
  - docs/SELF_HOSTING_ALPHA.md
  - scripts/validate-python-adapter.ts
  - scripts/validate-guidance.ts
  - tests/**
forbidden_files:
  - assets/**
  - library/**
non_goals:
  - Do not require Python adopters to add `package.json`.
  - Do not run pip installs or execute host Python code during detection.
  - Do not mutate host legacy Python files outside explicit dry-run/apply contracts.
  - Do not claim full atom birth/apply support before adapter boundaries and fixtures pass.
created_at: 2026-05-19T00:00:00+08:00
created_by_agent: codex-gpt-5
---

# TASK-APO-0030 Python Language Adapter / Plugin

## Background

Python-only adopters such as `3klife-npc-brain` can already use ATM for candidate ranking, source inventory, and docs-first governance analysis. However, the framework currently has no official Python language adapter/plugin for full Python atom birth, atomize, infect, or apply workflows.

ATM now warns that Python atom birth/apply is deferred until a Python adapter/plugin is selected or implemented. This task turns that warning into a real upstream capability.

## Dependencies

- TASK-APO-0028

## Inputs

- Python-only host repositories with `requirements.txt`, `pyproject.toml`, `pipelines/**/*.py`, or similar source layouts.
- Existing `LanguageAdapter` and adapter SDK contracts.
- Candidate ranking and source inventory reports from Python pipeline repositories.

## Outputs

1. Add `@ai-atomic-framework/language-python` or equivalent bundled Python adapter package.
2. Detect Python project profiles without requiring `package.json`.
3. Expose Python entrypoint discovery for scripts, pipelines, modules, and CLI-style files.
4. Support Python source inventory, candidate ranking enrichment, and legacy route planning metadata.
5. Define the dry-run atomize/infect contract for Python files.
6. Update runtime adapter readiness so Python-only repos report `pythonLanguageAdapterAvailable: true` once the adapter is bundled.
7. Add Python-only synthetic adopter fixtures.
8. Document the boundary between advisory ranking and real Python atom birth/apply.

## Acceptance Criteria

- [ ] `orient --json` identifies Python-only repos as supported Python adopters without `package.json`.
- [ ] `doctor --json`, `welcome --json`, and `next --json` no longer report missing Python language adapter when the bundled adapter is present.
- [ ] `candidates rank --include "pipelines/**/*.py" --json` includes Python adapter metadata in the report.
- [ ] The adapter detects Python entrypoints from scripts, `if __name__ == "__main__"`, common pipeline folders, and importable modules.
- [ ] The adapter exposes a dry-run Python atomize/infect plan without mutating host files.
- [ ] Python-only fixtures prove `package-json-missing` remains advisory and does not block candidate ranking.
- [ ] Docs explain what is supported now, what remains dry-run only, and what evidence is required before apply.
- [ ] Validation passes with a synthetic Python-only adopter and at least one legacy pipeline fixture.

## Target Files

- `packages/language-python/**`
- `packages/plugin-sdk/src/**`
- `packages/core/src/guidance/project-probe.ts`
- `packages/core/src/guidance/route-engine.ts`
- `packages/cli/src/commands/runtime-adapter-readiness.ts`
- `packages/cli/src/commands/candidates.ts`
- `docs/ADAPTER_GUIDE.md`
- `docs/SELF_HOSTING_ALPHA.md`
- `scripts/validate-python-adapter.ts`
- `scripts/validate-guidance.ts`
- `tests/**`

## Validation Commands

```bash
npm run build
node --experimental-strip-types scripts/validate-python-adapter.ts --mode validate
node --experimental-strip-types scripts/validate-guidance.ts --mode validate
node --experimental-strip-types scripts/validate-cli.ts --mode validate
```

## Implementation Notes

- The first version should prefer deterministic static analysis over executing Python code.
- Adapter detection must stay adopter-neutral and should not assume 3KLife-specific paths.
- Full apply should remain gated by explicit evidence, reversible patch plans, and police reports.
- The adapter should improve user trust by saying exactly which Python operations are supported instead of silently falling back to generic guidance.

## Checklist

- [x] adapter package skeleton
- [x] Python project detection
- [x] entrypoint scanner
- [x] source inventory enrichment
- [x] dry-run atomize/infect contract
- [x] runtime readiness integration
- [x] synthetic adopter fixtures
- [x] docs and validator coverage

## Notes

2026-05-19 | status: open | validation: pending | change: opened upstream card for official Python language adapter/plugin capability | blocker: TASK-APO-0028

2026-05-19 | status: done | validation: validate-python-adapter + validate-guidance + validate-guide | change: added `@ai-atomic-framework/language-python` package with `detectPythonProjectProfile`, `scanPythonEntrypoints`, `scanPythonImports`, `planPythonAtomize`, and `createPythonLanguageAdapter`; updated `runtime-adapter-readiness.ts` so Python-only repos report `pythonLanguageAdapterAvailable: true` and clear `needsRuntimeAdapterHint`; surfaced `availableAdapters` for language-js / language-python in `project-probe.ts`; enriched `atm candidates rank --json` with a `languagePythonAdapter` metadata block; added synthetic adopter and legacy pipeline fixtures under `fixtures/python-adapter/`; refreshed `docs/ADAPTER_GUIDE.md` and `docs/SELF_HOSTING_ALPHA.md`; package-skeleton fixture, tsconfig paths, and validator config updated. Apply-phase remains dry-run only and never executes Python code.