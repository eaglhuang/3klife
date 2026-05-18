<!-- doc_id: doc_other_0637 -->
# APF-0016 — Embedded Police Advisory Adapters

## 1. 目的

Dedup / Demand / Map Integration / Atomization 目前多數是 embedded capability。M7 要求它們至少在 validation gate 被呼叫並產生 advisory finding/report，因此先做 adapter，不急著改名或重寫成獨立 plugin。

## 2. Adapter inventory

| Family | Adapter 來源 | Finding trigger | Standard gate 動作 |
|---|---|---|---|
| Dedup Police | `RegistryIndex` semantic fingerprint、`quality-comparison-report.dedupCandidates`、`dedup-merge.ts` fixture | `semantic-fingerprint-overlap` | advisory |
| Demand Police | `guidance` route engine、`legacy-route-plan.ts:callerDemand`、caller graph snapshot | `caller-demand-threshold` | advisory |
| Quality Police | `regression-compare.ts`、quality baseline / comparison | `quality-regression-risk` | blocker via APF-0015 |
| Map Integration Police | `map-curator.ts` 4 signal：caller-graph / input-output-overlap / recurring-failure-cluster / zero-caller-sweep | `map-propagation-risk` | advisory |
| Atomization Police | `neutrality-scanner.ts`、`decomposition-decision.ts` (`atomize / infect`)、dry-run proposal guard | `host-mutation-or-neutrality-risk` | advisory |

## 3. Adapter rules

- Adapter 只能呼叫既有 module，不直接 mutate registry。
- Advisory finding 不阻塞 `validate:standard`，但必須出現在 `advisoryFindings[]`。
- Adapter output 必須能 bridge 到 `ReviewAdvisory.machine-finding + metadata.policeFinding`。
- 任何 private routing 只能留在 adopter governance bundle；upstream adapter 必須 adopter-neutral。

## 4. Fixture expectation

每個 advisory adapter 至少要有 positive / negative fixture：

| Fixture | 期待 |
|---|---|
| positive advisory finding | 產生 `severity='advisory'` 或 `warning`，`advisoryOnly=true` |
| negative clean input | report ok，finding count = 0 |
| blocker misuse | adapter 嘗試直接 hard-fail 或 mutate registry 時被測試拒絕 |
