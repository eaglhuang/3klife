<!-- doc_id: doc_other_0262 -->
# APF-0007 — Atomization Police Design

## 1. 模組對應

| 構件 | 上游現況 | 對應策略 |
|---|---|---|
| `neutrality-scanner.ts` | 既有 | **前置 gate**，不重寫 |
| `decomposition-decision.ts` | `atomize / infect / extract-shared` 既有 decision | finding action 對應 |
| `legacy-route-plan` | 既有 | 提供 legacy URI 與 no-touch zone |
| dry-run patch envelope | behavior-pack 既有 | atomize / infect 不可直接 apply |

## 2. Scanner pipeline

```
legacy section L
    │
    ▼
neutrality-scanner(L)
    │ has-adopter-private? ──Y──► finding(block, action=hard-fail-route-to-redaction)
    │ has-host-mutation? ──Y──► finding(block, action=hard-fail-route-to-dry-run)
    └──► next
        │
        ▼
decomposition-decision.derive(L)
    │ decision=='atomize' ──► finding(behavior.atomize, propose, severity=advisory)
    │ decision=='infect'  ──► finding(behavior.infect, propose, severity=advisory)
    │ decision=='extract-shared' ──► finding(severity=info)
```

## 3. finding shape

```ts
{
  policeFamily: 'atomization',
  behaviorId: 'behavior.atomize' | 'behavior.infect',
  trigger: 'legacy-decomposition-detected' | 'neutrality-violation' | 'host-mutation-detected',
  scope: 'legacy-route-plan',
  severity: 'block' | 'advisory' | 'info',
  action: 'hard-fail' | 'propose' | 'report-only',
  routeHint: 'needs-review' | 'follow-up-task',
  readModel: 'legacy-route-plan://<segmentId>',
  mode: 'slow',
  evidenceRefs: [{type:'neutrality-scan'}, {type:'rollback-proof'}, {type:'dry-run-patch'}]
}
```

## 4. 不變項

- `atomize` / `infect` **不可** 直接 apply host patch；一律走 dry-run proposal。
- adopter-private 欄位（例如 3KLife 私有命名）若洩漏到 dry-run patch 外層 → hard-fail。
- neutrality scan 是前置 gate，未通過則 pipeline 中止。

## 5. alphaGate

`validate:neutrality-scanner` + `validate:behavior-pack` + `validate:police`。
## EvidenceRef 分層修訂

本 spec 內的 `evidenceRefs` 需分成 upstream official `EvidenceRecord.evidenceType` 與 police-local artifact/readModel ref。`usage-feedback / quality-baseline / quality-comparison / rollback-proof / human-review-decision` 才是 official evidence type；`fingerprint-snapshot / map-propagation-log / neutrality-scan / dep-graph-snapshot / caller-graph-snapshot / dry-run-patch` 先視為 police-local artifact ref，不宣稱為 upstream evidence type。
