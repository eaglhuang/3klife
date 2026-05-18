<!-- doc_id: doc_other_0257 -->
# APF-0002 — PoliceFinding Contract

## 1. 共存原則：不另立第三套

| 既有 finding type | 用途 | APF PoliceFinding 對應策略 |
|---|---|---|
| `LifecyclePoliceFinding` | lifecycle quarantine writer 專用 | **保留不動**；APF contract 為 lifecycle 的 superset 唯讀視圖 |
| `ReviewAdvisoryFinding` (trigger=`machine-finding`) | 進 advisory queue | **所有非 lifecycle police finding 走這個入口** |
| 新 `PoliceFinding` | 收斂共用欄位 | 作為 ReviewAdvisoryFinding 內部 payload 的 schema |

## 2. Contract 欄位（與主計畫書 §5 對齊）

```ts
interface PoliceFinding {
  findingId: string;                     // sha256:<hash> 可重跑
  policeFamily: PoliceFamilyName;        // 11 種家族之一
  behaviorId?: string;                   // behavior.* 建議
  trigger: string;                       // 觸發事件
  scope: string;                         // 掃描範圍
  severity: 'info'|'advisory'|'warning'|'block'|'error';
  action: 'report-only'|'propose'|'follow-up-task'|'needs-review'|'quarantine'|'hard-fail';
  routeHint: RouteHint;                  // 見 §3
  readModel: string;                     // upstream artifact path / URI
  mode: 'fast'|'slow';
  evidenceRefs: EvidenceRef[];           // 見 APF-0012
}

type PoliceFamilyName =
  | 'dedup' | 'demand' | 'quality' | 'map-integration'
  | 'atomization' | 'lifecycle' | 'boundary' | 'dependency-graph'
  | 'registry-consistency' | 'schema' | 'orchestrator';
```

## 3. Route pipeline（無 task-router）

```
PoliceFinding
   │
   ├── policeFamily=='lifecycle'  ──►  LifecyclePoliceFinding（既有路徑，含 quarantine writer）
   │
   └── (其他 10 family)
         │
         ▼
   ReviewAdvisoryFinding { trigger='machine-finding', payload=PoliceFinding }
         │
         ▼ routeHint=='needs-review'    ──►  HumanReviewQueue
         │ routeHint=='follow-up-task'  ──►  follow-up-task 卡 (existing task-card flow)
         │ routeHint=='report-only'     ──►  report artifact only
         │ routeHint=='quarantine'      ──►  只有 lifecycle 可用，其他 family 拒絕
```

**禁用詞**：`task-router`（upstream 不存在）。原計畫書 §5 凡有此詞，皆改寫為「ReviewAdvisory.machine-finding + HumanReviewQueue + follow-up-task 三接點」。

## 4. severity → action 映射

| severity | 建議 action |
|---|---|
| info | report-only |
| advisory | report-only / propose |
| warning | propose / follow-up-task |
| block | needs-review |
| error | hard-fail（僅 lifecycle / schema / dep-graph 可用） |

## 5. mode → validator profile

| mode | 進 profile | 預設行為 |
|---|---|---|
| fast | validate:quick / standard | deterministic，CI 即刻決定 |
| slow | validate:full + scheduled | advisory queue，後台跑 |

## 6. Migration notes

- 既有 `runPoliceChecks` 既有 violations[]：在 wrapper 層轉為 PoliceFinding，policeFamily 由 check.kind 推導。
- 既有 `LifecyclePoliceFinding`：不轉，但 PoliceFinding 視圖可從中讀。
