---
doc_id: doc_other_0705
task_id: TASK-ATD-0005
title: Evidence — validate-module-boundaries deny rule + negative fixture
status: done
completed_at: 2026-05-18T15:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
---

## Summary

Added a runtime-to-scripts import deny rule to `scripts/validate-module-boundaries.ts`
and created the matching negative fixture file.

## Changes Made

### `scripts/validate-module-boundaries.ts`
- Added `resolvesIntoScripts(fileAbsPath, specifier)` helper that resolves a relative
  import path and checks if it lands inside `scripts/`.
- Added deny loop: for every `packages/*/src/**/*.ts` file, assert that no relative
  import resolves into `scripts/`.
- Added fixture existence check and content verification (the fixture must contain a
  `scripts/` import to prove the deny rule would catch it).

### `fixtures/module-boundaries/deny-runtime-scripts.fixture.ts` (new)
- Negative fixture demonstrating the banned pattern:
  `import { runHashPlaceholderAudit } from '../../../../scripts/audit-hash-placeholders.ts'`
- Not scanned by the deny rule (lives in `fixtures/`, not `packages/src/`), but read
  explicitly by the validator to verify detection capability.

## Validator Results

```
[validate:standard] ok (passed=53, failed=0, total=53)
[validate:module-boundaries] verified 320 TypeScript source files
```

## Invariants Checked

- I1 (public CLI surface stable): no CLI changes.
- I4 (neutrality): no 3KLife/npc-brain references added to ATM public files.
- Module boundary direction enforced: packages/src cannot import from scripts/.
