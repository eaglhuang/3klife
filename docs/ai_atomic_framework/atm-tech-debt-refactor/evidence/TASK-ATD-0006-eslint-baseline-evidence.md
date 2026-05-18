---
doc_id: doc_other_0706
task_id: TASK-ATD-0006
title: Evidence — ESLint baseline / warning budget
status: done
completed_at: 2026-05-18T15:00:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
---

## Summary

Fixed all duplicate-import ESLint errors in the codebase and added the `.atm-temp/`
directory to the ESLint ignore list to prevent false positives from temp workspaces.

## Changes Made

### `eslint.config.mjs`
- Added `.atm-temp/**` to the `ignores` array.
- The `self-host-alpha --verify` smoke test creates a temp workspace under `.atm-temp/`
  that was triggering `no-duplicate-imports` errors unrelated to source code.

### `packages/cli/src/commands/agent-pack.ts`
- Merged two separate imports from `'../../../agent-pack-sdk/src/index.ts'` into one:
  ```ts
  // Before (2 separate imports)
  import { hashFiles, renderManifest } from '...';
  import type { AgentPack, RenderContext } from '...';
  // After (single import)
  import { hashFiles, renderManifest, type AgentPack, type RenderContext } from '...';
  ```

### `tests/agent-pack/install-uninstall-roundtrip.test.ts`
- Merged two separate imports from `'../../packages/agent-pack-sdk/src/index.ts'` into one.

## ESLint Result

```
eslint . --max-warnings 0  → 0 errors, 0 warnings
```

## Validator Results

```
[validate:standard] ok (passed=53, failed=0, total=53)
[validate:cli] ok (23 commands, standalone fixture verified)
```
