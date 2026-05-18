<!-- doc_id: doc_other_0260 -->
# APF-0005 — Quality Police Design

## 1. 模組對應

| 構件 | 上游現況 | 對應策略 |
|---|---|---|
| `regression-compare.ts` | 既有，含 `mapImpactScope` / `propagationStatus` | 包 facade，不改語意 |
| `quality-comparison.schema.json` | 既有 | 作為 evidence type |
| automated gates | `nonRegression / qualityImprovement / newCapability` | 既有 promotion gate |
| Markdown renderer | quality markdown report | **projection**，非 source of truth |

## 2. finding shape

```ts
{
  policeFamily: 'quality',
  behaviorId: 'behavior.evolve' | 'behavior.polymorphize',
  trigger: 'quality-regression' | 'map-propagation-failed' | 'new-capability-detected',
  scope: 'quality-comparison',
  severity: 'block' | 'advisory',
  action: 'needs-review' | 'propose',
  routeHint: 'needs-review',
  readModel: 'quality-comparison-report://<reportId>',
  mode: 'fast',
  evidenceRefs: [{type:'quality-baseline'}, {type:'quality-comparison'}]
}
```

## 3. Trigger 表

| trigger | severity | 對應 gate |
|---|---|---|
| quality-regression | block | `nonRegression` fail |
| map-propagation-failed | block | `mapImpactScope.integrationTestPassed=false` |
| new-capability-detected | advisory | `newCapability` gate |

## 4. alphaGate

`validate:regression-compare` + `validate:upgrade-proposal` + `validate:police`。

## 5. 不變項

- promotion gate 語意不改；本 police 只做 finding 包裝。
- Markdown renderer 只是 projection，所有 routing 必須走 JSON evidence。
- metric-driven proposal 與 evidence-driven proposal **共用後段 gate**。
## EvidenceRef 分層修訂

本 spec 內的 `evidenceRefs` 需分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref。`usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision` 才是 official evidence type；`fingerprint-snapshot / map-propagation-log / neutrality-scan / dep-graph-snapshot / caller-graph-snapshot / dry-run-patch` 先視為 police-local artifact ref，不宣稱為 upstream evidence type。
