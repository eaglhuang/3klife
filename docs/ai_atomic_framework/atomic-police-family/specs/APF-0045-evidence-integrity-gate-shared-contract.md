<!-- doc_id: doc_other_0707 -->
# APF-0045 — Evidence Integrity Gate shared contract

## 1. 目的

所有 police finding 與 proposal draft 都依賴 evidence，因此需要共用 gate 檢查 evidence 是否 stale、missing、duplicate、untrusted 或 schema mismatch。

## 2. Upstream 落點

- evidence detector reports
- `EvidenceRecord.evidenceType`
- police-local artifact/readModel refs

## 3. Contract / routing

Evidence Integrity Gate 不獨立成 police family。它輸出 shared gate report，供 PoliceFamilyGateReport 摘要引用。

Trigger：

- `evidence-missing`
- `evidence-stale`
- `evidence-duplicate`
- `evidence-untrusted`
- `evidence-schema-mismatch`

## 4. Acceptance

- 缺 evidence ref 的 proposal draft 會產 integrity finding。
- stale base evidence 會被標記。
- duplicate evidence 不會造成重複 finding。

## 5. Validation

- `npm run validate:police-family`
- `npm run validate:evidence-detector`

## 6. Status

- artifact_status: planned
- runtime_status: shared-gate-planned
- upstream_mutation_status: not-applied
