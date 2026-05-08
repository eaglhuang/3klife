<!-- doc_id: doc_other_0093 -->
# ATM 框架穩定化與演化閉環里程碑

> 本文件是 `ATM框架演進執行規劃書.md` 的執行補強 shard，用來整理 2026-05-08 時點的治理校正、優先順序、里程碑與 follow-up 候選。
> 本文件不是新的 canonical roadmap，不取代既有規劃書、manifest、role map 或 task shard。

## 1. 校正後的現況基線

截至 2026-05-08，以下基線已重新核對：

- `docs/tasks/tasks-atm.json` thin index summary 與 `docs/tasks/tasks-atm/tasks-atm-part-*.json` shard recount 目前一致，皆為 `done=70 / in_progress=2 / open=42 / total=114`。
- task shard 目前共有 `65` 個 part；`tasks-atm.json` 的 `_sourceOfTruth` 指向 `docs/tasks/tasks-atm/`，現況不是 drift 中，而是已回到對齊狀態。
- `ATM-2-0019` 已 `done`，其附錄 C 補丁已落卡：`lifecycleMode=evolution` 需走兩次獨立 TestRunner 呼叫，且 effect node 不可直接呼叫 `propose-atomic-upgrade`。
- `ATM-2-0022` 已 `done`，其附錄 C 補丁已落卡：`rollback-proof` 需驗證 `statusReverted` 與 `semanticFingerprintReverted`。
- `ATM-3-0015` 已 `done`，`TaskAdapter / LockAdapter / ShardAdapter / RuleGuardAdapter` 的 orchestrator 邊界已被正式寫入規劃與 brief。
- 真正仍未收斂的主鏈，仍是 `ATM-2-0015 / 0016 / 0017 / 0027 / ATM-3-0014 / ATM-4-0007`。

這代表先前「thin index 與 shard 已偏移」的警報，在 2026-05-08 這一輪重查後應降級為「歷史風險與前置檢查項」，不應再被寫成當前 blocker。

## 2. 必要修正摘要

### 2.1 應保留，且要改成正式治理語氣的項目

- `M0` 仍要保留「機讀真相校正」步驟，但它的目的是避免未來再 drift，不是宣稱目前已 drift。
- `ATM-2-0050` 仍是 framework-wide atomization coverage gate 的核心收斂卡，後續要補的是 blocker promotion 條件、自指 coverage 與 finding route，不是從零重做。
- 所有已 `done` 的卡如果仍有治理缺口，一律以 follow-up 卡承接，不回改為 open，也不重複開已存在功能卡。

### 2.2 需要重新敘述或降級的舊說法

- 「`ATM-2-0022` 仍需確認是否含 `statusReverted` / `semanticFingerprintReverted`」應改寫為：`ATM-2-0022` 已含對稱回退欄位與 proof validator；後續風險改為 `ATM-2-0027` state machine 落地後，要再跑一次 rollback compatibility regression。
- 「`ATM-2-0019` 仍需確認兩次獨立 TestRunner」應改寫為：`ATM-2-0019` 的 acceptance 已收斂，後續風險改為演化證據鏈上游仍缺 `0015 / 0016 / 0017`，因此 `0020 / 0021 / 0022` 雖已完成，證據生產鏈尚未全綠。
- 「thin index drift 必須先重建」應改寫為：目前 summary 已對齊；未來若要重跑全域 rebuild，必須先確認工作樹邊界與接手範圍，不得在 unrelated commit 中偷帶重建結果。

### 2.3 仍然成立的關鍵缺口

- `ATM-2-0015 / 0016 / 0017` 仍是演化證據生產者缺口，必須優先於 `ATM-4-0007` 真正收斂。
- `ATM-2-0027` 仍 open，表示 registry 的 status state machine 尚未完全落地；這會影響 rollback 與 lifecycle 的最後對稱性驗證。
- `ATM-3-0014` 仍 open，代表 legacy host 的 `usage-feedback` shadow adapter 還沒有把 evidence 鏈補齊。
- `ATM-2-0050` 雖已有 manifest + fixture + validator 基礎，但其 task brief notes 仍殘留舊 blocker 敘事，後續要整理成和現況一致的正式說法。

## 3. 合理優化摘要

### 3.1 先收斂 correctness，再擴大優化面

建議固定主路線為：

`ATM-2-0015 -> ATM-2-0016a -> ATM-2-0016b -> ATM-2-0017 -> ATM-2-0027a -> ATM-3-0014 -> ATM-4-0007 dry-run`

其中：

- `ATM-2-0016` 建議拆成 `schema-only` 與 `runner integration`，讓 metrics contract 可以先被 `0017` 消費。
- `ATM-2-0027` 建議拆成 `enum migration only` 與 `transition logic + lifecycle interaction`，避免一次牽動 rollback、police 與 registry transition。
- `ATM-4-0007` 在上述證據鏈未收斂前，先維持 dry-run / pilot 定位，不升級為強 blocker。

### 3.2 把 coverage gate 從「存在」推進到「可升級」

`ATM-2-0050` 下一步不是再補概念，而是把下列條文正式化：

- 哪些條件滿足後，coverage gate 可以從 advisory 升為 blocker。
- `framework-function-atomization-manifest.md` 自身要如何被 coverage manifest 收編，避免 manifest 自指缺口。
- police finding 如何路由到 `task-router` / `follow-up task card` / `advisory report`，避免停留在人類閱讀報表。

### 3.3 alpha1-prep 效能與規模優化，應與主鏈分層

以下項目合理，但應放在主鏈正確性之後，以 baseline 驗證驅動：

- validator 並行化 / orchestrator
- AJV schema compile cache
- registry lazy index / sharding
- evidence retention / report summarization
- `versions[]` sidecar 化
- HarnessCard-lite / adapter parity harness / injection rollback e2e

這些項目可列為 alpha1-prep 或 legacy hardening，不應反過來阻塞 `0015 / 0016 / 0017 / 0027 / 3-0014 / 4-0007`。

## 4. 里程碑與 Checklist

### M0. 機讀真相校正

- [ ] 每次進入 ATM 大範圍治理前，先比對 thin index summary 與 shard recount。
- [ ] 若兩者一致，記錄現況；若不一致，再決定是否接手 rebuild。
- [ ] 檢查工作樹是否乾淨，避免把 unrelated shard rebuild 混入當次 commit。
- [ ] 保留 `rebuild-tasks-atm-auto-parts.js` 作為修復工具，不作為無條件 pre-commit 動作。

### M1. 一致性補洞

- [ ] 以 follow-up 卡方式補 `ATM-2-0050` 的 blocker promotion、自指 coverage、finding route。
- [ ] 規劃 `ATM-2-0022` 對 `ATM-2-0027` 的 rollback compatibility regression，而不是回頭重做 `0022`。
- [ ] 補 registry `versions[]` / semantic fingerprint backfill sweep 的 follow-up。
- [ ] 把 `RuleGuardAdapter` read-only 邊界提升為可驗證規則，而不只停留在規劃文字。

### M2. 演化閉環證據鏈

- [ ] `ATM-2-0015` 產出 drift / version diff contract。
- [ ] `ATM-2-0016a` 先固定 metrics schema。
- [ ] `ATM-2-0016b` 再把 metrics 接回 runner / evidence store。
- [ ] `ATM-2-0017` 以已存在 police substrate 為基底補 compare gate。
- [ ] `ATM-2-0027a` 先完成 enum migration。
- [ ] `ATM-3-0014` 以 read-only shadow adapter 補 usage-feedback evidence。
- [ ] `ATM-4-0007` 最後做 evolution pilot dry-run。

### M3. 效能與開發體驗

- [ ] 先量 `npm.cmd test` 或 validator 鏈 baseline，再決定並行化順序。
- [ ] validator orchestrator 只在 baseline 顯示 cold-start 明顯偏高時優先化。
- [ ] AJV compile cache 與 validator orchestrator 必須保持 deterministic，不引入額外非決定性。

### M4. 規模與記憶體

- [ ] evidence / report 先定 retention contract，再做 rotation。
- [ ] registry sharding 需維持 `ATM-2-0014` 的 schema-additive 邊界。
- [ ] `versions[]` sidecar 化若啟動，需明確說明對 resolver / rollback / catalog 的影響面。

### M5. 3KLife Host 穩定協作

- [ ] HarnessCard-lite 需明確區分 control / agency / runtime 三層 profile。
- [ ] adapter parity harness 要能證明舊工具與 ATM adapter 觀測面等價。
- [ ] injection + rollback e2e 應以現成 pilot atom 跑完整閉環，不只做文件推演。

## 5. 後續開卡候選

以下只列候選題目與目的，不在本文件內直接開卡：

| 候選題目 | 目的 | 依賴 |
|---|---|---|
| Coverage Gate Promotion & Self-Coverage Follow-up | 讓 `ATM-2-0050` 有明確升 blocker 條件與 manifest 自指收編 | `ATM-2-0050` |
| Rollback Proof x Status Enum Compatibility Sweep | 在 `ATM-2-0027` 落地後重跑 rollback 對稱性 regression | `ATM-2-0022`, `ATM-2-0027` |
| Registry Version / Fingerprint Backfill Sweep | 將 `versions[]` 與 semantic fingerprint 的歷史缺口補齊 | `ATM-2-0014`, `ATM-2-0026` |
| RuleGuardAdapter Read-Only Validator | 把 `RuleGuardAdapter` 不碰 lifecycle mutation 變成 deterministic gate | `ATM-3-0015`, `ATM-3-0012` |
| Validator Baseline Benchmark & Orchestrator | 先量測，再決定 validator 並行化與快取優先序 | `ATM-2-0015`, `ATM-2-0016`, `ATM-2-0017` |

## 6. 驗證指令

```bash
node -e "const fs=require('fs'); const data=JSON.parse(fs.readFileSync('docs/tasks/tasks-atm.json','utf8')); console.log(data.summary)"
node -e "const fs=require('fs'),path=require('path'); const root='docs/tasks/tasks-atm'; const files=fs.readdirSync(root).filter(f=>/^tasks-atm-part-\\d+\\.json$/.test(f)); const counts={done:0,'in-progress':0,open:0,total:0}; for (const f of files){ for (const t of JSON.parse(fs.readFileSync(path.join(root,f),'utf8'))){ counts.total++; counts[t.status]=(counts[t.status]||0)+1; } } console.log(counts)"
node tools_node/validate-framework-atomization-coverage.js --manifest docs/ai_atomic_framework/framework-function-atomization-manifest.md --fixture tools_node/atomic-framework/fixtures/framework-function-atomization-coverage.fixture.json --strict
node tools_node/validate-atm-doc-governance.js --root docs/ai_atomic_framework --strict
npm.cmd run check:encoding:touched -- --files docs/ai_atomic_framework/atm-evolution-plan-shards/atm-framework-stabilization-milestones.md
```

## 7. 決策原則

- 本文件只整理治理里程碑，不直接修改 done 卡狀態。
- 若已存在同功能卡，不重複開卡；只補 follow-up 或把缺口路由回既有主線。
- 若任務卡已 done，但有新治理缺口，一律在同里程碑開 follow-up 卡承接。
- milestone 文件本身不取代 task shard、manifest、role map 或 canonical 規劃書。
