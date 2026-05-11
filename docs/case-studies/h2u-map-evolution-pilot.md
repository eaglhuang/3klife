<!-- doc_id: doc_task_0366 -->

# H2U Map Evolution Pilot

## 目標

`ATM-4-0008` 以 H2U map 驗證三種 map evolution 路徑 dry-run：
`atom-bump -> atom-extract -> map-bump`

## Pilot 基線

- mapId: `ATM-MAP-0003`
- mapHash: `sha256:8ce344177a19451fc354776028dc49c1173b9ebb3a3a1181ddc27db81c95faa5`
- memberSnapshot:
  - `ATM-CORE-0005@0.1.0`
  - `ATM-CORE-0006@0.1.0`
  - `ATM-CORE-0007@0.1.0`

## Canonical Workbench 三件套

1. `atomic_workbench/maps/ATM-MAP-0003/map.spec.json`
2. `atomic_workbench/maps/ATM-MAP-0003/map.integration.test.mjs`
3. `atomic_workbench/maps/ATM-MAP-0003/map.test.report.json`

## 三條路徑結果

1. 路徑 1（atom-bump）:
- proposal: `fixtures/case-studies/h2u-map/atom-bump.proposal.json`
- `normalizeCssColor` v0.1.0 -> v0.2.0
- propagation: green（`ATM-MAP-0003`）

2. 路徑 2（atom-extract）:
- proposal: `fixtures/case-studies/h2u-map/atom-extract.proposal.json`
- `parseFragmentList` 拆出新 atom `ATM-CORE-0011`
- 保留 source atom + 新 atom spec stub + map member replacement

3. 路徑 3（map-bump）:
- proposal: `fixtures/case-studies/h2u-map/map-bump.proposal.json`
- h2u-map v0.1.0 -> v0.2.0
- members[] 含舊->新 atom@version 對照

## Neutrality / Decision Log

- route-1 neutrality: pass
- route-2 neutrality: pass
- route-3 neutrality: pass
- decision log policy: all routes remain `humanReview: pending` in pilot dry-run fixtures; no direct apply to production registry currentVersion.

## 驗證摘要

- map workbench 為 canonical `ATM-MAP-{NNNN}` 路徑，且 mapId 由 create-map allocator 分配。
- 三條 proposal 皆具備 map propagation 綠燈證據欄位。
- pilot fixtures 已保留 `mapId`、`mapHash`、`memberSnapshot`、`generatorProvenance` 供 replay 使用。
