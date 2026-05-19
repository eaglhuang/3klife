<!-- doc_id: doc_other_0710 -->
# APF-0048 — Contract Drift Check inside Registry Consistency Police

## 1. 目的

Contract Drift Check 先併入 Registry Consistency Police，不獨立成新警察。它負責檢查 atom spec、implementation、test、registry metadata、map member contract 是否漂移。

## 2. Upstream 落點

- Registry Consistency Police
- atom spec / implementation / tests
- map member contract

## 3. Contract / routing

Contract drift finding 由 Registry Consistency Police family report 承載，並可被 Quality / Map Integration / Polymorph Police 消費。

Trigger：

- `spec-implementation-drift`
- `spec-test-drift`
- `registry-metadata-drift`
- `map-member-contract-drift`

## 4. Acceptance

- spec 宣告的 entrypoint 與 implementation/test 不一致時產 finding。
- registry metadata stale 時產 finding。
- map member contract drift 時可被 Map Integration / Polymorph Police 消費。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:registry-consistency`

## 6. Status

- artifact_status: planned
- runtime_status: not-started
- upstream_mutation_status: not-applied
