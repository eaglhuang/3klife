<!-- doc_id: doc_other_0259 -->
# APF-0004 — Demand Police Design

## 1. 模組對應

| 構件 | 上游現況 | 對應策略 |
|---|---|---|
| `callerDemand` | `legacy-route-plan.ts` 既有欄位 | 直接讀 |
| `demandThreshold` | **不存在於 upstream** | APF-0010 backwrite 補入；本卡只規格化 |
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

`demandThreshold` 預設 `2`（外部 atom 引用數），可在 governance bundle 覆寫。

## 3. finding payload

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
