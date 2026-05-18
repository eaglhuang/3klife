---
doc_id: doc_other_0707
task_id: TASK-ATD-0007
title: Evidence — CLI 公共型別與 shared command result 收斂
status: done
completed_at: 2026-05-18T15:30:00+08:00
completed_by_agent: ClaudeCode_Sonnet4.6
---

## Summary

Added `MessageLevel`, `CommandMessage`, and `CommandResult` interfaces to
`packages/cli/src/commands/shared.ts` and replaced key `any` usages with typed
signatures. Fixed 4 caller sites that accessed typed sub-properties of `evidence`.

## Changes Made

### `packages/cli/src/commands/shared.ts`
New exported types:
```typescript
export type MessageLevel = 'info' | 'warn' | 'error';

export interface CommandMessage {
  level: MessageLevel | string;
  code: string;
  text: string;
  data: Record<string, unknown>;
}

export interface CommandResult {
  ok: boolean;
  command: string;
  mode: string;
  cwd: string;
  messages: CommandMessage[];
  evidence: Record<string, unknown>;
}
```

Typed signatures (replacing `any`):
- `message(level: MessageLevel | string, code: string, text: string, data: unknown = {}): CommandMessage`
- `makeResult({ ..., evidence?: unknown }): CommandResult`
- `writeResult(result: CommandResult, stream: { write(s: string): void }, ...)`
- `formatPrettyResult(result: CommandResult)`
- `configPathFor(cwd: string)`
- `relativePathFrom(cwd: string, absolutePath: string)`
- `ensureAtmDirectory(cwd: string)`
- `readJsonFile(filePath: string, ...)`
- `writeJsonFile(filePath: string, value: unknown)`

Note: `message()` data and `makeResult()` evidence accept `unknown` (not `Record<string,
unknown>`) in the function signature to allow callers to pass typed interfaces like
`GuidanceNextAction` without an index signature. The cast happens internally; the
output interfaces remain correctly typed.

### Caller fixups (4 sites)
- `packages/cli/src/commands/next.ts`: cast `doctor.evidence.checks` to
  `Array<{ name: string; ok: boolean }>` before `.find()` and `.map()`.
- `packages/cli/src/commands/self-host-alpha.ts`: cast `neutrality.evidence.termViolations`
  and `pathViolations` through `Number()` to allow arithmetic.
- `packages/cli/src/commands/welcome.ts`: cast `nextResult.evidence?.nextAction` to
  `GuidanceNextAction | null`.

## Type Error Baseline

Pre-existing (unchanged):
- `scripts/validate-known-bad-versions.ts:86` — `unknown` type
- `scripts/validate-rollout-metrics.ts:96-103` — `unknown` type (6 errors)

New errors introduced: **0**

## Validator Results

```
[validate:standard] ok (passed=53, failed=0, total=53)
[validate:cli] ok (23 commands, standalone fixture verified)
typecheck: only 6 pre-existing scripts/ errors remain
```

## Invariants Checked

- I1 (public CLI surface stable): `--json` output shape unchanged; no breaking changes.
- I4 (neutrality): no 3KLife/npc-brain references added.
