<!-- doc_id: doc_other_0093 -->
# ATM 框架穩定化與演化閉環里程碑

> 本文件是 `ATM框架演進執行規劃書.md` 的執行補強 shard，只整理治理校正、固定路線與 follow-up 候選；不取代既有 canonical 規劃書、manifest、role map 或 task shard。

## 1. 校正後基線

- `docs/tasks/tasks-atm.json` 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json` 已對齊為 `done=74 / in_progress=1 / open=40 / total=115`。
- `ATM-2-0015`、`ATM-2-0016`、`ATM-2-0017` 原本 brief 已完成、shard 仍是 `open`；本輪已同步回 `done`。
- `ATM-2-0019` 與 `ATM-2-0022` 已完成，附錄 C 補丁已落卡；後續風險不再是「是否有做」，而是與 `ATM-2-0027` 落地後的相容性回歸。
- `ATM-3-0015` 已完成，task lifecycle atomic map 與 adapter 邊界已入規劃與 brief。
- `ATM-2-0050` 已完成 coverage gate 主體、task-store 真相收斂與 follow-up extraction；剩餘治理缺口已交由 `ATM-2-0051` 承接。
- 真正仍未收斂的主鏈，現在只剩：`ATM-2-0027 / ATM-3-0014 / ATM-4-0007`；coverage gate sidecar 則是 `ATM-2-0051`。

## 2. 必要修改摘要

- `M0` 保留為「機讀真相校正」，但用途改成防 drift，不再宣稱目前 thin index 失真。
- `ATM-2-0050` 保留為 framework-wide coverage gate 主卡，但 blocker promotion、自指 coverage、finding route 已正式抽成 `ATM-2-0051`。
- 所有已 `done` 的卡若仍有治理缺口，一律開 follow-up，不回改為 open，也不重複開既有功能卡。
- `ATM-2-0015 / 0016 / 0017` 不再是待做主鏈；真正要防的是 task-store 真相再次分裂。
- `ATM-2-0027` 仍是 registry status state machine 的最後缺口；`ATM-3-0014` 與 `ATM-4-0007` 仍是 evidence 與 pilot 收尾缺口。

## 3. 固定主路線

```text
ATM-2-0027 -> ATM-3-0014 -> ATM-4-0007 dry-run
```

- `ATM-2-0015 / 0016 / 0017` 已完成，不再列為固定待做步驟。
- `ATM-2-0027` 若實作過大，可拆 follow-up，但文件不得先假設新卡已存在。
- `ATM-4-0007` 在 status state machine 與 usage evidence 收斂前，維持 dry-run / pilot，不升級為強 blocker。
- validator 並行化、AJV cache、registry sharding、retention、HarnessCard-lite、adapter parity harness 等，列為 alpha1-prep，不回頭阻塞主鏈。

## 4. 里程碑與 Checklist

### M0. 機讀真相校正

- [x] thin index 與 shard recount 已對齊為 `73 / 2 / 39 / 114`。
- [x] `ATM-2-0015 / 0016 / 0017` 的 brief / shard 真相已同步。
- [ ] 後續治理前先比對一致性，再決定是否接手 rebuild。
- [ ] commit 前確認工作樹乾淨，不混入 unrelated rebuild。

### M1. 一致性補洞

- [x] 已開 `ATM-2-0051` 承接 `ATM-2-0050` 的 blocker promotion / self-coverage / finding route。
- [ ] 規劃 `ATM-2-0022 x ATM-2-0027` 的 rollback compatibility regression。
- [ ] 補 `versions[]` / semantic fingerprint backfill sweep follow-up。
- [ ] 把 `RuleGuardAdapter` read-only 邊界升成可驗證規則。

### M2. 演化閉環證據鏈

- [x] `ATM-2-0015 / 0016 / 0017` 功能與 task-store 真相已完成。
- [ ] `ATM-2-0027` 收斂 status state machine。
- [ ] `ATM-3-0014` 以 shadow adapter 補 usage-feedback evidence。
- [ ] `ATM-4-0007` 完成 evolution pilot dry-run。

### M3. 效能與開發體驗

- [ ] 先量 baseline，再決定 validator orchestrator / AJV cache 優先序。
- [ ] 所有效能優化都必須保持 deterministic。

### M4. 規模與記憶體

- [ ] 先定 evidence retention contract，再做 rotation。
- [ ] registry sharding 與 `versions[]` sidecar 化需明講對 resolver / rollback / catalog 的影響面。

### M5. 3KLife Host 穩定協作

- [ ] HarnessCard-lite 要區分 control / agency / runtime。
- [ ] adapter parity harness 要能證明舊工具與 ATM adapter 觀測面等價。
- [ ] injection + rollback e2e 要用現成 pilot atom 跑完整閉環。

## 5. 後續開卡候選

| 候選題目 | 目的 |
|---|---|
| Rollback Proof x Status Enum Compatibility Sweep | 在 `ATM-2-0027` 落地後重跑 rollback 對稱性 regression |
| Registry Version / Fingerprint Backfill Sweep | 補齊 `versions[]` 與 semantic fingerprint 歷史缺口 |
| RuleGuardAdapter Read-Only Validator | 把 RuleGuardAdapter 不碰 lifecycle mutation 變成 deterministic gate |

## 6. 驗證指令

```bash
node tools_node/check-doc-shard-health.js
node tools_node/validate-framework-atomization-coverage.js --manifest docs/ai_atomic_framework/framework-function-atomization-manifest.md --fixture tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json --strict
node tools_node/validate-atm-doc-governance.js --root docs/ai_atomic_framework --strict
npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md
```

## 7. 決策原則

- milestone 只整理治理路線，不直接取代 task shard、manifest、role map 或 canonical 規劃書。
- 若已存在同功能卡，不重複開卡；只補 follow-up 或把缺口路由回既有主線。
- 若任務卡已 `done` 但有新治理缺口，一律在同里程碑開 follow-up 承接。
