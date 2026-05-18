<!-- doc_id: doc_other_0266 -->
# APF-0011 — Dependency Graph Police 對齊

## 1. 為何補列

原計畫書 §2 狀態矩陣只列了 10 個 family，但 upstream `PoliceCheckKind` 已包含 `dependency-graph` 一種 kind，且 `runPoliceChecks` 既有 cycle 偵測實作。本卡補入該 family 並對齊 contract。

## 2. 模組對應

| 構件 | 上游現況 |
|---|---|
| `dependency-graph.ts` | implemented, 透過 `runPoliceChecks` 註冊 |
| cycle 偵測 | DFS / Tarjan SCC（依實作） |
| 既有 finding | `PoliceCheckResult.violations[]` |

## 3. finding payload

```ts
{
  policeFamily: 'dependency-graph',
  trigger: 'cycle-detected' | 'broken-edge',
  scope: 'registry-dependency-graph',
  severity: 'error',
  action: 'hard-fail',
  routeHint: 'needs-review',
  readModel: 'registry://dep-graph-snapshot/<hash>',
  mode: 'fast',
  evidenceRefs: [{type:'dep-graph-snapshot'}]
}
```

## 4. 不變項

- cycle = blocker（永遠）；不可降為 advisory。
- 與 Boundary Police **不重疊**：boundary 管 layer 跨越；dep-graph 管 cycle。
- finding 不直接 mutate registry。

## 5. validator profile

- `validate:quick` / `validate:standard` / `validate:full` 全收。
- 屬於 alpha0 必過的 blocker。

## 6. alphaGate

`validate:police`（既有）。

## 7. 與 APF-0008 的 cross-link

APF-0008 已將 Boundary 與 Dep-graph 切分，writer permission table 涵蓋本 family。本卡為其補列任務卡並對齊 PoliceFinding contract。
