<!-- doc_id: doc_other_0258 -->
# APF-0003 — Dedup Police Design

## 1. 模組對應

| 構件 | 既有 upstream | 用途 |
|---|---|---|
| Fingerprint hot-path | `RegistryIndex` prefix lookup | exact / near match 篩選 |
| Dedup candidates section | `regression-compare.ts:dedupCandidates` | quality report 中既有 |
| Merge behavior | `plugin-behavior-pack/src/dedup-merge.ts` | proposal apply |
| Polymorph ignore | `validate:polymorph-template` | 排除多形 spec |

## 2. Scanner pipeline

```
RegistryIndex.fingerprintIndex
    │ prefix-lookup (8-bit bucket)
    ▼
candidate pairs (a, b)
    │ exact-fingerprint? ──Y──► PoliceFinding(severity=warning, action=propose, behaviorId=behavior.dedup-merge)
    │
    │ similarity>=0.9? ──Y──► PoliceFinding(severity=advisory, action=needs-review)
    │
    │ in-polymorph-ignore? ──Y──► PoliceFinding(severity=info, action=report-only)
    │
    └──► skip
```

## 3. finding shape

```ts
{
  policeFamily: 'dedup',
  trigger: 'semantic-fingerprint-overlap',
  scope: 'registry',
  severity: 'warning' | 'advisory' | 'info',
  action: 'propose' | 'needs-review' | 'report-only',
  routeHint: 'follow-up-task' | 'needs-review',
  readModel: 'registry-index://fingerprint-snapshot/<hash>',
  mode: 'fast',
  evidenceRefs: [{type:'fingerprint-snapshot', path:...}, {type:'quality-comparison', path:...}]
}
```

## 4. fixture plan

| Fixture | 預期結果 |
|---|---|
| positive/exact-duplicate | finding action=propose, severity=warning |
| positive/high-similarity | finding action=needs-review, severity=advisory |
| negative/polymorph-template | finding action=report-only, severity=info |
| negative/unrelated-fingerprint | no finding |

## 5. alphaGate

`validate:police` + `validate:regression-compare` + `validate:polymorph-template`。

## 6. 不變項

- finding **不** 直接 mutate registry；merge 一律走 `behavior.dedup-merge` proposal。
- O(n²) 全表比對禁用；hot path 必須走 `RegistryIndex` prefix lookup。
## EvidenceRef 分層修訂

本 spec 內的 `evidenceRefs` 需分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref。`usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision` 才是 official evidence type；`fingerprint-snapshot / map-propagation-log / neutrality-scan / dep-graph-snapshot / caller-graph-snapshot / dry-run-patch` 先視為 police-local artifact ref，不宣稱為 upstream evidence type。
