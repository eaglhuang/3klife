<!-- doc_id: doc_other_0711 -->
# APF-0049 — Orchestrator/profile/CLI wiring for Polymorph/Rollback/shared gates

## 1. 目的

將 Polymorph Police、Rollback Police 與 shared gates 接入 police family orchestrator、validator profile 與 CLI report producer。

## 2. Upstream 落點

- `runPoliceFamilyGate`
- `scripts/validate-police-family.ts`
- `packages/cli/src/commands/police.ts`
- validator profiles

## 3. Contract / routing

- `standard` profile：Polymorph/Rollback 先 advisory 或 report-only；shared gates 產 summary。
- `full` profile：執行 full fixtures 與 blocker assertions。
- CLI JSON report 顯示 family reports 與 shared gate summary。

## 4. Acceptance

- `validate:standard` 會執行 shared gates 並記錄 advisory/report-only 結果。
- `validate:full` 會跑 polymorph / rollback positive 與 negative fixtures。
- CLI JSON report 可顯示 family reports 與 shared gate reports。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:standard`
- `node atm.mjs police run --profile standard --json`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
