<!-- doc_id: doc_other_0690 -->
# APF-0039 — Roadmap backwrite and M10/M11 closure

## 1. 目的

在兩支新警察 runtime 產品化後，回寫 APF 計畫書、狀態矩陣與風險表。

## 2. Upstream / docs 落點

- `docs/ai_atomic_framework/atomic-police-family/原子警察家族計畫書.md`
- `docs/ai_atomic_framework/atomic-police-family/tasks/README.md`
- `docs/ai_atomic_framework/atomic-police-family/specs/README.md`
- `packages/core/src/police/family.ts`
- `scripts/validate-police-family.ts`

## 3. Closure rule

Decomposition/Evolution Police 只有在同時具備 named scanner、validator profile、positive/negative fixtures、ReviewAdvisory bridge、CLI report producer 後，才能從 `planned / missing runtime scanner` 改為 `productized-gate-active`。

## 4. Acceptance

- 主計畫書狀態矩陣更新。
- risk matrix 將新風險從 planned 改為 closed。
- touched Markdown 通過 encoding guard。

## 5. Validation

- `npm run validate:police-family`
- `npm run check:encoding:touched`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
