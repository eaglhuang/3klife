<!-- doc_id: doc_other_0261 -->
# APF-0006 — Map Integration Police Design

## 1. 模組對應

| 構件 | 上游現況 | 對應策略 |
|---|---|---|
| `map-curator.ts` | 既有 4 signal | 包 facade |
| `mapImpactScope` | regression-compare 既有欄位 | 作為 finding shape |
| `propagationStatus[]` | regression-compare 既有 | per-member status |
| `integrationTestPassed` | per-member 既有 boolean | 是否觸發 block |

## 2. Curator signal 對應 finding

| Signal | 來源 | 預設 finding |
|---|---|---|
| `caller-graph` | RegistryIndex caller graph | compose proposal advisory |
| `input-output-overlap` | spec input/output match | merge proposal advisory |
| `recurring-failure-cluster` | evidence cluster | needs-review |
| `zero-caller-sweep` | unused-caller scan | follow-up-task → lifecycle sweep |

## 3. finding shape

```ts
{
  policeFamily: 'map-integration',
  behaviorId: 'behavior.compose' | 'behavior.merge' | 'behavior.sweep',
  trigger: 'map-propagation-failed' | 'curator-signal',
  scope: 'atomic-map',
  severity: 'block' | 'advisory',
  action: 'needs-review' | 'propose' | 'follow-up-task',
  routeHint: 'needs-review' | 'follow-up-task',
  readModel: 'map-propagation-log://<mapId>',
  mode: 'slow',
  evidenceRefs: [{type:'map-propagation-log'}, {type:'quality-comparison'}]
}
```

## 4. 不變項

- `integrationTestPassed=false` 一律走 `ReviewAdvisory.machine-finding` 入 advisory queue，severity=block。
- map-curator 既有 module 邊界不動。
- registry status 不可當作 rollout mode（防止讀模型污染）。

## 5. alphaGate

`validate:map-curator` + `validate:upgrade-proposal` + `validate:police`。

## 6. fixture plan

| Fixture | 預期 |
|---|---|
| positive/caller-graph-cluster | finding(compose, advisory) |
| positive/io-overlap | finding(merge, advisory) |
| positive/recurring-failure | finding(severity=block) |
| positive/zero-caller-member | finding(sweep, follow-up-task) |
| negative/all-tests-pass | no finding |
## EvidenceRef 分層修訂

本 spec 內的 `evidenceRefs` 需分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref。`usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision` 才是 official evidence type；`fingerprint-snapshot / map-propagation-log / neutrality-scan / dep-graph-snapshot / caller-graph-snapshot / dry-run-patch` 先視為 police-local artifact ref，不宣稱為 upstream evidence type。
