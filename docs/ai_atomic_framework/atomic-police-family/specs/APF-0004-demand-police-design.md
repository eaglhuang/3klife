<!-- doc_id: doc_other_0259 -->
# APF-0004 — Demand Police Design

## 1. 模組對應

| 構件 | 上游現況 | 對應策略 |
|---|---|---|
| `callerDemand` | `legacy-route-plan.ts` 既有欄位 | 直接讀 |
| `demandThreshold` | `legacy-route-plan.ts` code-level 既有欄位（目前預設 6） | public config / governance-bundle surface 需 APF-0010 additive proposal |
| `decomposition-decision` | `atom-extract / atom-bump / extract-shared` 既有 | 作為 finding action 路由 |
| guidance route engine | `packages/core/src/guidance/` 既有 | 不重寫 |

## 2. Scanner pipeline

```
legacy-route-plan + RegistryIndex.callerGraph
    │
    ▼
sub-function S with callers C[]
    │ |C| >= demandThreshold? ──Y──► finding(propose split)
    │ |C| >= alertThreshold? ──Y──► finding(advisory, observe)
    └──► skip
```

`demandThreshold` 目前在 `legacy-route-plan.ts` code-level 預設為 `6`；若要提供 governance bundle 覆寫，需另走 APF-0010 的 additive public config proposal。

## 3. finding shape

```ts
{
  policeFamily: 'demand',
  behaviorId: 'behavior.split',
  trigger: 'caller-demand-threshold',
  scope: 'legacy-route-plan',
  severity: 'advisory' | 'warning',
  action: 'propose' | 'needs-review',
  routeHint: 'follow-up-task',
  readModel: 'registry-index://caller-graph/<atomId>',
  mode: 'slow',
  evidenceRefs: [{type:'usage-feedback'}, {type:'caller-graph-snapshot'}]
}
```

## 4. 不變項

- finding 不直接 mutate registry；split 必須走 `behavior.split` proposal。
- trunk / no-touch zone（registry 標記為 `mutabilityPolicy=frozen-after-release`）禁止 split。
- demand scanner **不可** 引用 3KLife / Cocos 特定 caller 名稱。

## 5. fixture plan

| Fixture | 預期 |
|---|---|
| positive/two-external-callers | severity=warning, action=propose |
| positive/multiple-callers | severity=warning, action=needs-review |
| negative/frozen-policy | finding=skipped + reason="mutability-frozen" |
| negative/single-caller | no finding |

## 6. alphaGate

`validate:guidance` + `validate:police`。
## EvidenceRef 分層修訂

本 spec 內的 `evidenceRefs` 需分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref。`usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision` 才是 official evidence type；`fingerprint-snapshot / map-propagation-log / neutrality-scan / dep-graph-snapshot / caller-graph-snapshot / dry-run-patch` 先視為 police-local artifact ref，不宣稱為 upstream evidence type。
