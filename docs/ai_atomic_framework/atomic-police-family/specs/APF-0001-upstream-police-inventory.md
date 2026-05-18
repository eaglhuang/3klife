<!-- doc_id: doc_other_0256 -->
# APF-0001 — Upstream Police Inventory

## 1. `PoliceCheckKind` 對應 11 family

上游 `packages/plugin-sdk/src/police.ts` 定義的 `PoliceCheckKind`：

| Upstream kind | 對應 family | 現況 | 主執行入口 |
|---|---|---|---|
| `schema` | Schema Police | implemented | `schema-validator.ts` |
| `dependency-graph` | Dependency Graph Police | implemented | `dependency-graph.ts`（APF-0011 補列） |
| `layer-boundary` | Boundary Police | implemented | `layer-boundary.ts` |
| `forbidden-import` | Boundary Police（子）| implemented | `forbidden-import-scanner.ts` |
| `registry-consistency` | Registry Consistency Police | implemented | `registry-consistency.ts` |
| `atomic-map-integration` | Map Integration Police | embedded | `map-curator.ts` |
| `lifecycle` | Lifecycle Police | implemented | `lifecycle-police.ts`（獨立 entry：`runLifecyclePolice`） |

3KLife 觀察到但 upstream 尚未拆獨立 kind 的 family：

| Family | 現況 | 落點 |
|---|---|---|
| Dedup Police | embedded + fixture-only | `RegistryIndex` + `regression-compare:dedupCandidates` + `plugin-behavior-pack/dedup-merge.ts` |
| Demand Police | embedded + missing scanner | `legacy-route-plan:callerDemand`；`demandThreshold` 為 code-level 既有欄位 |
| Quality Police | embedded | `regression-compare.ts` + `mapImpactScope/propagationStatus` |
| Atomization Police | embedded | `neutrality-scanner.ts` + `decomposition-decision.ts (atomize/infect)` |
| Police Orchestrator | embedded | `runPoliceChecks` + `validate-police.ts` |

## 2. `runPoliceChecks` vs `runLifecyclePolice`

- `runPoliceChecks()` 註冊 4 個 deterministic check：dependency-graph / layer-boundary / forbidden-import / registry-consistency。
- `runLifecyclePolice()` 為獨立 entry，因為它持有 `quarantineWriteGuard` 寫入特權，不可與其他 deterministic check 同 pipeline。
- Schema validation 由 `validate:schemas` 走獨立入口。

## 3. RegistryIndex vs Police 的分工

- `RegistryIndex` 是 **讀模型**（semantic fingerprint prefix lookup、caller graph snapshot）。
- police family 是 **檢查器**，從 RegistryIndex 取輸入；不得反向修改 RegistryIndex。
- Dedup / Demand / Map police 都把 RegistryIndex 當 hot path，但 finding 不入 RegistryIndex，只入 ReviewAdvisory。

## 4. Behavior × Police trigger 矩陣（與主計畫書 §3 對齊）

10 種 behavior × 11 family 的 trigger 對應已在主計畫書 §3 完整列出。本 spec 不重述，只標出**新增條件**：

- `behavior.dedup-merge` 觸發 Dedup Police 同時 polymorphize 走 polymorph ignore advisory（避免雙計）。
- `behavior.atomize` 觸發 Atomization Police 必須通過 Boundary + Dependency Graph 雙閘門。

## 5. evidence path inventory

| Police family | evidence/readModel ref | 分層 | upstream artifact |
|---|---|---|
| Dedup | fingerprint-snapshot | police-local artifact ref | `RegistryIndex` snapshot |
| Demand | usage-feedback | caller distribution log |
| Quality | quality-baseline / quality-comparison | `regression-compare` report |
| Map Integration | map-propagation-log | police-local artifact ref | `map-curator` report |
| Atomization | rollback-proof + neutrality-scan + dry-run-patch | official evidence/readModel ref + police-local artifact refs | `neutrality-scanner` + dry-run patch |
| Lifecycle | TTL / unused-caller scan | `lifecycle-police` finding |
| Boundary / Dep-graph | static scan | `runPoliceChecks` violations[] |
