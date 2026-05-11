<!-- doc_id: doc_other_0093 -->
# ATM 框架穩定化里程碑
> 這份頁面以 `docs/tasks/tasks-atm.json` 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json` 的薄索引為準，不再沿用舊的 milestone 草稿數字。當前基線是 `done=118 / in_progress=0 / open=3 / total=121`.
## 1. 當前狀態
- `ATM-2-0027`、`ATM-2-0050`、`ATM-2-0051`、`ATM-2-0054` 都已是 `done`，不再當作主缺口。
- M1 的三個收尾面向都已收斂，不再保留未完成主缺口。
  - `ATM-2.5-0004`：`ATM-2-0022 x ATM-2-0027` rollback / status 相容性回歸 （目前：done）
  - `ATM-2-0030`：`versions[] / semanticFingerprint` backfill sweep 與 catalog/index 一致性 （目前：done）
  - `ATM-2-0010`：`RuleGuardAdapter` read-only deterministic gate （目前：done）
- `ATM-4-0005`、`ATM-6-0004`、`ATM-6-0005` 已經收斂，不再列為主 blocker。
- `ATM-2-0024`、`ATM-4-0004`、`ATM-4-0008` 已作為 map evolution 主線證據收斂，不再列為 M4 blocker。
- `ATM-4-0005`、`ATM-4-0006`、`ATM-6-0005` 已作為 3KLife host 主鏈收斂，不再列為 M5 blocker。
- `ATM-2-0032`、`ATM-6-0001`、`ATM-6-0002`、`ATM-6-0003` 屬 follow-on backlog，不列為目前 stabilization blocker。
- 不重開已完成卡，也不另外新開 follow-up 卡；所有殘項直接併入既有 open 卡。
- M2 的主鏈仍是 `ATM-3-0014 -> ATM-4-0007`，但前提是 M1 gate 全綠。

## 2. 里程碑原則
- `M0`：薄索引與 shard 數字一致，文件可被機器驗證，不再漂移。
- `M1`：把已知風險收尾到可驗證狀態，讓 rollback、semantic fingerprint、status machine、RuleGuard read-only 都有 deterministic gate。
- `M2`：只在 M1 已經綠燈後，才往 evidence / pilot / adapter parity 的主鏈前進。
- `M3+`：才討論更大的治理閉環、validator orchestrator 或新一輪結構化演化。

## 3. 收斂路線
```text
ATM-2.5-0004 -> ATM-2-0030 -> ATM-2-0010
```

- `ATM-2.5-0004` 先把 rollback / status compatibility regression 收掉，避免 `ATM-2-0022` 與 `ATM-2-0027` 交叉回歸 （目前：done）.
- `ATM-2-0030` 再做 `versions[] / semanticFingerprint` backfill sweep，確認 catalog / RegistryIndex / registry entry projection 一致 （目前：done）.
- `ATM-2-0010` 最後把 RuleGuardAdapter 的 read-only 邊界變成 deterministic gate，避免工具鏈偷偷走寫入路徑 （目前：done）.
- `ATM-3-0014` 與 `ATM-4-0007` 只有在上述三個 gate 都過了之後，才視為可繼續推進 （目前：done） / （目前：done）.

## 4. Checklist

### M1. 一致性補洞
[x] `ATM-2-0027` 已經完成 status machine 收斂，不再作為未完成主缺口。
[x] `ATM-2-0050` / `ATM-2-0051` 已完成 coverage gate 主體與 follow-up 抽出。
[x] `ATM-2-0054` 已完成 task intake / lock stability backwrite，薄索引與 brief 已對齊。
[x] `ATM-2.5-0004` 完成 `ATM-2-0022 x ATM-2-0027` rollback / status compatibility regression。 （目前：done）
[x] `ATM-2-0030` 完成 `versions[] / semanticFingerprint` backfill sweep 與 catalog/index 一致性檢查。 （目前：done）
[x] `ATM-2-0010` 完成 RuleGuardAdapter read-only deterministic gate。 （目前：done）

### M2. 演化閉環證據鏈
[x] `ATM-3-0014` 補齊 shadow adapter / usage-feedback evidence。 （目前：done）
[x] `ATM-4-0007` 承接 evolution pilot dry-run 與證據鏈收尾。 （目前：done）

### M3. 機器驗證層
[x] `ATM-3-0016` validator orchestrator 與 AJV cache 的統一入口。（目前：done）
- [x] 基礎 deterministic 已由 `ATM-2-0029`(done)、`ATM-2-0031`(done)、`ATM-2-0033`(done) 收斂；若保留 semantic advisory 後續，對映 `ATM-2-0035` （目前：done）。

### M4. 負債清單
[x] `ATM-2-0024`、`ATM-4-0004`、`ATM-4-0008` 的 map evolution 主線已收斂，不再列為 blocker。
- [ ] evidence retention contract 與 rotation policy。
- [ ] registry sharding 與 `versions[]` sidecar 的 resolver / rollback / catalog 收斂。

### M5. 3KLife Host
[x] `ATM-6-0005` 已補齊 HarnessCard-lite / CAR runtime-audit 對齊 （目前：done）.
[x] adapter parity harness 改由 `ATM-4-0006` 承接 （目前：done）。
[x] `ATM-4-0005` 已補齊 injection + rollback dry-run 最小閉環 （目前：done）.
- `ATM-6-0001`、`ATM-6-0002`、`ATM-6-0003` 改歸 ecosystem / follow-on backlog，不列為 host 主鏈 blocker。

## 5. 任務對照

| 任務 | 狀態 | 角色 |
|---|---|---|
| Rollback Proof x Status Enum Compatibility Sweep | done | 收斂 `ATM-2-0022` 與 `ATM-2-0027` 的交叉回歸 |
| Registry Version / Fingerprint Backfill Sweep | done | 補齊 `versions[]` 與 semantic fingerprint 歷史缺口 |
| RuleGuardAdapter Read-Only Validator | done | 把 RuleGuardAdapter 不碰 lifecycle mutation 變成 deterministic gate |

## 6. 驗證命令

```bash
node tools_node/sync-atm-stabilization-milestone.js --check --strict
node tools_node/validate-rule-guard-read-only.js --strict
node tools_node/validate-registry-backfill-sweep.js --strict
node tools_node/check-doc-shard-health.js
node tools_node/validate-framework-atomization-coverage.js --manifest docs/ai_atomic_framework/framework-function-atomization-manifest.md --fixture tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json --strict
npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md docs/tasks/tasks-atm/tasks-atm-part-8.json docs/tasks/tasks-atm/tasks-atm-part-44.json docs/tasks/tasks-atm/tasks-atm-part-53.json docs/tasks/tasks-atm/tasks-atm-part-60.json tools_node/sync-atm-stabilization-milestone.js tools_node/validate-rule-guard-read-only.js tools_node/validate-registry-backfill-sweep.js
```

## 7. 註記
- milestone 只負責把薄索引真相整理成可讀、可驗證的路線圖，不取代 task shard / manifest / role map。
- `ATM-2-0054` 已經 done，這份頁面只把它當成已對齊的治理背景，不再列為未完成 follow-up。
- 若 task-store 數字再變動，請以最新薄索引為準回寫，不要沿用舊 baseline；理想情況下直接執行同步腳本。
- 這份文件由 `docs/tasks/tasks-atm.json` 生成，summary、milestone、task card 共享同一份 task store。
