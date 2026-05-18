<!-- doc_id: doc_other_0263 -->
# APF-0008 — Lifecycle / Boundary Police 對齊

## 1. 模組現況

| 構件 | 上游現況 | 對齊策略 |
|---|---|---|
| `lifecycle-police.ts` | implemented，含 `quarantineWriteGuard` | **不重寫**，作為 PoliceFinding 的 lifecycle 特例 |
| `LifecyclePoliceFinding` | 既有完整 finding type | APF PoliceFinding 為其 superset 唯讀視圖 |
| `layer-boundary.ts` | implemented | 包 finding wrapper |
| `forbidden-import-scanner.ts` | implemented | 包 finding wrapper |
| `dependency-graph.ts` | implemented | 由 APF-0011 處理（boundary / dep-graph 切分） |

## 2. Writer permission table

| Police family | Quarantine writer | Registry writer | Advisory queue writer |
|---|---|---|---|
| Lifecycle | ✅ 唯一 | ❌ | ✅ |
| Boundary | ❌ | ❌ | ✅ |
| Dependency Graph | ❌ | ❌ | ✅ |
| 其他 8 family | ❌ | ❌ | ✅ |

## 3. Boundary vs Dep-graph 分工

- **Boundary Police** 管 layer / adapter 邊界跨越（`layer-boundary.ts` + `forbidden-import-scanner.ts`）。
- **Dependency Graph Police** 管 cycle / DAG 完整性（`dependency-graph.ts`）— 由 APF-0011 補列。
- 兩者**不重疊**；同一個 violation 不會被雙方 finding 化（去重邏輯位於 orchestrator）。

## 4. status-machine 對齊

- `LifecyclePoliceFinding.trigger='illegal-transition'` 與 `status-machine` 既有檢查共用 read model。
- 不另立 status-machine police family；transition violation 一律由 lifecycle-police 產出。

## 5. validator profile 接線

| Profile | 收的 finding |
|---|---|
| `validate:quick` | lifecycle (hard-fail) + boundary (hard-fail) + dep-graph (hard-fail) |
| `validate:standard` | + lifecycle advisory + sweep follow-up |
| `validate:full` | 全 11 family |

## 6. Migration plan

1. 既有 `LifecyclePoliceFinding` 直接保留；APF-0002 contract 提供唯讀視圖。
2. boundary / dep-graph finding 走 wrapper，將 `PoliceCheckResult.violations[]` 轉為 `PoliceFinding[]`。
3. fixture 不重寫；orchestrator 階段補 fixture aggregator。
