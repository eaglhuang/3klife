<!-- doc_id: doc_other_0708 -->
# APF-0046 — Reversibility Gate shared contract

## 1. 目的

所有會產 proposal draft 的警察都需要共用可逆性 gate，避免高風險變更在沒有 rollback/equivalence/retirement proof 時進入 promotion。

## 2. Upstream 落點

- Rollback Police
- Upgrade proposal gates
- ReviewAdvisory bridge

## 3. Contract / routing

Reversibility Gate 按 proposal risk class 決定需要哪些證據：

- atom evolve：rollback proof 或 reversible patch envelope；
- map replacement active：map equivalence proof；
- legacy-retired：rollback proof 或 retirement proof；
- atomize/infect：dry-run patch + rollback envelope。

## 4. Acceptance

- high-risk proposal 缺可逆性證據時產 blocker finding。
- low-risk advisory 仍可 report-only，但不得 auto approve。
- gate 不直接 rollback 或 apply。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:review-advisory`

## 6. Status

- artifact_status: planned
- runtime_status: shared-gate-planned
- upstream_mutation_status: not-applied
