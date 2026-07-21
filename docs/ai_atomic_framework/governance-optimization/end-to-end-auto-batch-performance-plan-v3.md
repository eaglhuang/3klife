---
doc_id: doc_atm_gov_auto_batch_perf_plan_v3
title: ATM 3.0 真平行治理一致性與收官計畫
status: active
family_dir: governance-optimization
owner: atm-core
predecessor: doc_atm_gov_auto_batch_perf_plan_v2
supersedes_open_acceptance_from: doc_atm_gov_auto_batch_perf_plan_v2
planning_repo: C:/Users/User/3KLife
target_repo: C:/Users/User/AI-Atomic-Framework
closure_authority: target_repo
created_at: 2026-07-21T09:19:26+08:00
updated_at: 2026-07-21T09:19:26+08:00
createdByCommand: atm plan doc create
---

# ATM 3.0 真平行治理一致性與收官計畫

## 定位與決策

Plan 2.2 保留為歷史基線，停止新增工作。Plan 3.0 是唯一 active successor，只接管 2.2 未被真實證據滿足的驗收，以及 TASK-SKL-0014／0015 並行 dogfood 揭露的產品缺口。已驗證完成的 2.2 能力不重做；已關閉任務卡若與現場狀態矛盾，必須由 3.0 對帳、修復及重新驗證，不能引用舊 `done` 狀態跳過。

固定決策：

- 唯一正式票券模型仍為 `atm.brokerTicket.v1`，不得建立第二套 queue、BCR authorization 或平行任務模型。
- BCR、freeze、direction lock、queue view 都只能是 canonical ticket state 的可重建 projection 或不可變 receipt，不得各自持有可寫授權。
- helper、normalizer、scope inference 與 matcher 必須資料驅動；不得對 TASK-SKL-0014、TASK-SKL-0015、特定 actor、日期或三個歷史路徑寫控制流程特例。
- circuit breaker 預設開啟；安全、正確性或觀測門檻失敗即退回 `queue-only`。
- 歷史 0014／0015 可作 replay scenario 與證據標籤，但驗收引擎必須能接受任意兩張卡、任意 linked-surface graph 與任意共享資源集合。
- 不直接刪改 `.atm` runtime/history；舊 BCR 與 residue 僅能由正式 migrate/reconcile/cancel CLI 處理。

## 問題陳述

0014／0015 的並行施工提供了高價值負向證據：broker 能找出三個 shared paths、建立三張 BCR、排定 serial release 並阻止未授權寫入；但整體仍不具線性一致性。

1. 三張 BCR 指定 0015 先發布，實際卻由 0014 先 delivery；兩卡關閉後 BCR 仍保留 `currentAllowedTaskId`，形成 stale authorization。
2. canonical ticket、queue、BCR、freeze 與 direction lock 是分離狀態來源，沒有同一個 CAS generation、transaction commit 或一致 reconcile。
3. 0015 的 scope amendment 不是因「範圍過大」，而是 linked/generated surface 未在 claim 前推導完成，直到 commit gate 才發現 `.agents/skills/atm-next/SKILL.md` 不在 direction lock。
4. runner-sync reservation 綁定過期 SHA 後，若同 task claim 仍 active，cleanup 會誤判健康；release 又要求不可能存在的 receipt，造成 queue-head deadlock。
5. runner-sync required command 使用不同 task-id normalizer，且缺少 temp claim 與 `--files` prerequisite，無法直接執行。
6. task import 的 fenced shell `#` 診斷曾錯誤；現有測試與 projection 已出現修復跡象，但 backlog 仍 Open，顯示 closeback reconciliation 也必須納入驗收。
7. `tasks import --reconcile-mirror` 曾回報成功但未修改 planning source；後續 `taskflow close` 要求 active claim，而終態任務又不可 claim，形成無合法 recovery 的循環。
8. 既有 evidence 缺少可比較的 `waitedMs`、實際 overlap window、wakeup 次數、starvation 與 paired baseline，不能把負向 correctness 樣本誤稱為效能證明。

## 目標

- 讓一張 canonical ticket 成為 shared-write arbitration 的唯一 authority，並使所有 projection 可驗證、可重建、可撤銷。
- 在 claim/admission 前推導 linked surfaces，若施工中 scope graph 改變則自動 re-arbitrate，而非到 commit 才要求人工補 scope。
- 讓 stale SHA reservation 可在不偽造 receipt、不先釋放合法 task claim 的情況下 cancel、expire、coalesce 或 revalidate。
- 所有 recovery 以 `atm.commandManifest.v1` 的 `executable`、`argv[]`、`cwd`、allowlisted env、timeout 與 digest 表達，預設 `shell=false`。
- 以真多行程、獨立 actor、isolated proposal、共享 publish 重演 0014／0015 的故障形狀，證明零 stale authorization、零 silent overwrite、零 duplicate side effect、零 unresolved starvation。
- 產出完整 window/watermark/sealed digest 與 paired queue-only 對照，才能關閉 3.0 及 2.2 的未完成驗收。

## 任務圖與執行順序

| 波次 | 任務卡 | 依賴 | 交付與驗收 |
|---|---|---|---|
| A0 | `TASK-ERR-0003` | 無 | 註冊 Plan 3.0 使用的 exact ErrorCode 與 executable recovery contracts；GOV 卡不得自行發明 code。 |
| A | `ATM-GOV-0226` | ERR-0003 | 建立 divergence census、歷史證據封存、通用 replay scenario schema、backlog/closed-card 對帳矩陣，並依卡片 metadata 預配置 atom-map ownership。 |
| B | `ATM-GOV-0227` | 0226 | 定義 canonical arbitration authority；BCR 降為 receipt/projection。 |
| B | `ATM-GOV-0229` | 0226 | 建立資料驅動 linked-surface closure graph 與 claim 前 scope preflight。 |
| B | `ATM-GOV-0230` | 0226 | 修復 runner-sync stale SHA reservation 的 cancel/expire/coalesce/revalidate。 |
| B | `ATM-GOV-0231` | 0226 | 統一 actor/task ID normalizer 與 command manifest recovery chain。 |
| B | `ATM-GOV-0232` | 0226 | 驗證及修復 task-import fence/診斷邊界，並對帳已完成但 backlog 未關項。 |
| C | `ATM-GOV-0228` | 0227 | 將 ticket 到 queue/freeze/direction lock/BCR view 的投影改為 CAS generation 與 crash-safe reconcile。可與 0229–0232 繼續平行。 |
| D | `ATM-GOV-0233` | 0228、0229、0230、0231 | 整合完成/取消/失主/喚醒 exactly-once lifecycle，提供舊 BCR 正式 migration；禁止直接刪 runtime。0232 可繼續平行。 |
| E | `ATM-GOV-0234` | 0233 | 真多行程 replay、故障注入、paired queue-only 對照與 canonical telemetry seal。 |
| F | `ATM-GOV-0235` | 0234、0232 | 重跑 census、驗收 circuit breaker、對帳 parser/backlog 與 2.2 遺留並做最終 verdict。 |

波次 B 的五張卡必須使用 isolated proposal 真平行施工；如 scope 交集，必須由當時部署的 canonical ticket 仲裁，不得以人工等待替代 dogfood。`ATM-GOV-0228` 在 0227 完成後即可啟動，不必等待其餘波次 B 卡片。

## 公開介面

- 延用並收斂 `atm.brokerTicket.v1`：新增或明確化 `generation`、`authorityDigest`、`projectionDigests`、`releaseCondition`、`wakeupKey`、`waitedMs`、`ownerHealth`、`cancelReason`、`reconciledAt`。
- 新增 `atm.brokerProjection.v1`：每份 queue/BCR/freeze/direction-lock view 都包含 ticket id、generation、authority digest、projection digest、watermark 與 terminal state；projection 不具有獨立授權語意。
- 新增 `atm.linkedSurfaceClosure.v1`：以 producer/consumer、template/projection/compiler/manifest/validator/build output 關係推導閉包，回 provenance、confidence、owner atom/map 與 re-arbitration requirement。
- 沿用 `atm.commandManifest.v1`：禁止 default-on 路徑輸出 shell command string；舊 `requiredCommand` 僅作一版 deprecated display，canonical action 為 argv manifest 或 ordered manifests。
- 新增 `atm.parallelReplayScenario.v1`：scenario 使用角色、capability、resource graph、fault schedule 與 assertions，不以固定 task id/path 驅動。
- 所有 producer 使用 `atm.telemetryObservation.v1`，summary 必須有 window、watermark、sample count、unavailable receipts 與 sealed digest。

## 正確性不變量

- `INV-ATM-008`：不同任務的 overlap 產生 execute/queue/batch ticket，不以 terminal refusal 代替 broker 仲裁。
- `INV-ATM-009`：控制流程不得硬編碼 actor、task、path、日期或單次 incident；資料 fixture 可以保存歷史標籤。
- 同一 ticket generation 最多一位有效 publisher；terminal ticket 不得再授權 write。
- BCR release order 與實際 publish order 必須來自同一 authority generation；若 generation 改變，所有舊 projection 立即失效。
- scope amendment 若新增 shared surface，必須在寫入前 re-arbitrate；禁止只補 direction lock 而不更新 ticket read/write set。
- cancel、adopt、close、publish、release、wakeup 與 migration 都必須可重試且 side effect exactly-once。
- `queue-only` fallback 不得遺失現有 ticket、proposal 或 evidence；reset 必須引用新的 passing evidence digest。

## 驗證矩陣

### 單元與 schema

- ticket state machine、generation/CAS、terminal authorization、projection digest。
- linked-surface graph closure、cycle handling、unsupported/unavailable provenance。
- actor/task normalizer、command manifest prerequisite chain、Windows argv rendering。
- Markdown fence state、source-line diagnostics、backlog reconciliation。

### 多行程破壞測試

- 同時 enqueue/publish/close、publisher 中止、失主 adopt、stale base、重複 wakeup。
- HEAD 連續移動、同 task 保持 active、舊 SHA 不可達、receipt 不存在。
- projection 寫到一半中止、CAS 衝突、Windows rename sharing violation、重複 migration。
- scope graph 在施工中新增 linked/generated surface，確認寫入前重新仲裁。

### 真實 replay

至少兩個獨立 actor 同時修改三個以上 shared/linked surfaces，並另有 disjoint private work；注入 HEAD movement 與一個 publisher crash。要求：

- `maxConcurrentWorkers >= 2`，且 observed overlap window `> 0`。
- `parallelAdmissions > 0`，shared surfaces 全數有 canonical ticket。
- BCR/projection release order 等於 observed publish order，兩卡 terminal 後 active authorization 為 0。
- scope amendment 不得首次出現在 commit gate；若 runtime graph 新增 surface，必須留下 pre-write re-arbitration receipt。
- stale reservation 可處置且 queue 繼續前進，不需偽造 receipt或釋放無關 claim。
- escaped conflict、silent overwrite、duplicate side effect、unresolved starvation、stale authorization 均為 0。

### 效能與觀測

- 與相同 sealed base/config 的 queue-only 進行 AB/BA paired runs，至少 3 repeats；不足樣本只能 `inconclusive`，不得宣稱 improved。
- median makespan 與 active throughput 沿用 2.2 門檻：各改善至少 25%；production cost ratio 不高於 1.10。
- 所有 shared-write producer observed coverage 100%；每份 task summary 有 window/watermark/sealed digest。
- 必填數據：enqueue/dequeue/publish timestamps、`waitedMs`、overlap duration、wakeup count、revalidation count、scope amendment phase、terminal authorization count。

## 0014／0015 Replay Preflight

| 歷史失敗 | Primary closure owner | Supporting cards | 修復後預期 |
|---|---|---|---|
| 三張 BCR 與 publish order 不一致 | 0233 | 0227、0228 | BCR 只投影同一 ticket generation；不可能保留不同 release authority。 |
| 兩卡 done 後仍有 `currentAllowedTaskId` | 0233 | 0228 | terminal transition 原子撤銷所有 projection；reconcile 將 stale view fail closed 並遷移。 |
| linked skill projection 到 commit 才要求 scope amendment | 0229 | 0226 | claim 前 closure graph 列出 template/compiler/validator/projection/manifest；新增 surface 在 write 前 re-arbitrate。 |
| stale SHA queue-head 無 receipt 可釋放 | 0230 | 0233 | 以 reachability、generation 與 owner health判定 cancel/expire/revalidate，不要求完成 build receipt。 |
| required command task id 不一致且缺 prerequisite | 0231 | ERR-0003 | 單一 normalizer；ordered command manifests 包含 temp claim、files、enqueue/build/release。 |
| fenced `#` parser 與 backlog 狀態分歧 | 0232 | 0226 | fixture 驗證真實 parser；功能已修則以 evidence 關 backlog，未修才改 code。 |
| mirror reconcile 成功但未寫入，終態 repair 又要求不可取得的 claim | 0232 | ERR-0003 | reconcile 驗證宣告 mirror 的實際 mutation；終態 closeback 使用專責 repair authority，不依賴 active work claim。 |
| 無 waitedMs/overlap/wakeup paired data | 0234 | 0235 | 真多行程 sealed telemetry 與 queue-only paired verdict。 |

結構 preflight 的判定是「所有已知故障都有唯一 owner 與可執行 acceptance，依賴圖無循環」；它不代表現行 ATM 已通過 replay。只有 0226–0234 的產品交付與真實證據完成後，0235 才能判定 solved。

## 2026-07-21 Authoring Preflight 結果

### 計畫與任務卡

- `TASK-ERR-0003` 與 `ATM-GOV-0226` 至 `ATM-GOV-0235` 共 11 張卡全部通過 `node atm.mjs tasks import --from <card> --dry-run --json`，0 warnings、0 errors。
- 依賴圖無循環、沒有 missing dependency。可執行序為 ERR-0003、0226；接著 0227/0229/0230/0231/0232 平行；0227 完成後 0228 可先啟動；核心由 0233、0234 收斂，0232 只在 0235 最終 closeback 前必須完成。
- 預定平行波次 0227/0229/0230/0231/0232 的 declared scopes 經 exact 與 glob-containment preflight 後交集為 0。runner-sync state lifecycle 與 command emitter 已拆給 0230/0231，不共寫 `runner-sync-admission.ts`。
- 0226 先依所有卡片 metadata 預配置 atom-map ownership；後續平行卡的 `mapUpdates` 為空，避免共享 map shard 變成未宣告寫入面。
- UTF-8 touched guard 通過，沒有 BOM、U+FFFD 或 mojibake。

### 現行產品基線

- `task-import-diagnostic-contract` 與 `task-import-canonical-id-boundary` 測試通過；`validate:skill-templates` 亦通過 17 source templates 與 5 adapters。`ATM-BUG-2026-07-20-216` 與 `ATM-BUG-2026-07-21-217` 很可能是已修功能但未 closeback，須由 0226/0232 以 frozen/source evidence 正式對帳。
- parallel admission 現為 `mode=enforce`、`fallbackMode=queue-only`、circuit breaker enabled；這一層已存在，不需重建。
- runner-sync queue 此刻為 0，只表示現場已清空，不證明 stale SHA lifecycle 已修。CLI help 仍沒有正式 cancel/expire/revalidate action。
- runtime 仍有 29 份 legacy BCR sidecar 帶 `currentAllowedTaskId`；其中 `BCR-jy1h3a`、`BCR-24cp36`、`BCR-8n7w11` 仍記錄 0015 先於 0014。這些欄位是否仍能授權，必須由 0226 census 與 0227/0233 fail-closed migration 處理。
- runner-sync task id 兩個 emitter 對目前 dotted actor 已產生相同結果，但仍各自維護 regex，對連續非允許字元可能漂移；`buildRunnerSyncEnqueueCommand` 仍只輸出 enqueue，沒有 temp claim 與 `--files` prerequisite chain。因此 `ATM-BUG-2026-07-21-218` 仍是 live generic gap。

### Preflight Verdict

- **Plan coverage: PASS**。已知 0014/0015 故障、相關 bug、stale backlog 與缺失 telemetry 都有唯一 owner、acceptance 與依賴位置，沒有 unmapped known gap。
- **Current product replay: FAIL**。文件與任務卡本身不等於產品修復；在 0227–0233 完成前重演，仍可能遇到 stale BCR authorization、runner-sync stale reservation 無合法終止及不完整 recovery chain。
- **Post-plan expectation: conditionally solvable**。只有 0234 真多行程 replay 產出正確性五個零值與完整 telemetry，且 0235 circuit breaker/closure 通過，才可回答「再次並行 0014/0015 已解決所有已知問題」。

## 完成門檻

`ATM-GOV-0235` 只有在下列條件全部成立時才能關閉：

- 0226 census 的每個 divergence 都有 terminal disposition 與 evidence digest。
- 0227–0233 的 source、frozen runner、release artifacts 與 adopter projection parity 全數通過。
- 0234 真多行程 replay 與 paired A/B 有效，不能以 deterministic fixture 取代。
- correctness 五個零值成立，observed coverage 100%，沒有 active stale BCR/ticket/direction-lock authorization。
- circuit breaker 演練能自動 trip 到 `queue-only`，並只能以新的 passing evidence digest reset。
- 2.2 未完成驗收被逐項映射為 `satisfied`、`superseded-with-evidence` 或仍 `open`；只要有一項 open，3.0 保持 active。

## Out Of Scope

- 不重寫已驗證完成的 2.2 功能，不重新建立 batch/ticket/task 模型。
- 不把 Git branch/worktree merge 變成正式平行 lane。
- 不為單一 skill、actor 或三個歷史 shared paths 增加特例。
- 不以人工刪除 `.atm` 狀態、偽造 receipt、`--no-verify` 或 waiver 取得綠燈。
- 不在本計畫擴張 Python adapter、無關 UI、定價或其他 ATM 全域 backlog。

## Rollback

任何 default-on 變更失敗時，以 policy CLI `trip` 回 `queue-only`，保留 ticket/proposal/evidence 並停止新 compose publish。程式回退使用 revert commit；runtime disposition 使用正式 reconcile/migrate/cancel 命令，不直接改 JSON。Plan 3.0 不回寫或抹除 2.2 歷史證據。

<!-- atmPlanningCreationSeal {"schemaId":"atm.planningCreationSeal.v1","command":"atm plan doc create","createdAt":"2026-07-21T01:19:26.105Z","planningRoot":"C:/Users/User/3KLife/docs/ai_atomic_framework","relativePath":"governance-optimization/end-to-end-auto-batch-performance-plan-v3.md","contentDigest":"sha256:77768264cb2be6c40233560fd4b46d7a5c9fb8bf04dabf1c9d6ae862a002c927"} -->
