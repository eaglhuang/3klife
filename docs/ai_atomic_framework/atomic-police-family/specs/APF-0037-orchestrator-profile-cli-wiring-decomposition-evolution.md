<!-- doc_id: doc_other_0688 -->
# APF-0037 — Orchestrator, profile, and CLI wiring for Decomposition/Evolution Police

## 1. 目的

將兩支新警察接入 police family orchestrator、validator profile 與 CLI report producer。

## 2. Upstream 落點

- `runPoliceFamilyGate`
- `scripts/validate-police-family.ts`
- `packages/cli/src/commands/police.ts`
- `package.json` validator profiles

## 3. Contract / routing

- `standard` profile：呼叫 Decomposition / Evolution scanner，finding 先 advisory，不 fail CI。
- `full` profile：跑完整 fixtures、suppression、stale base、promotion assertions。
- CLI 支援 threshold config，不把 1000 LOC 寫死成唯一 public contract。

## 4. Acceptance

- `validate:standard` report 包含 decomposition / evolution family。
- `validate:full` 跑 positive / negative fixtures。
- `atm police run --profile standard --json` 可顯示兩個 family 的 report。

## 5. Validation

- `npm run validate:standard`
- `npm run validate:full`
- `node atm.mjs police run --profile standard --json`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
