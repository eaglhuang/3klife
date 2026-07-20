# ATM GOV 2.0 / 2.1 隊長交接文件

產出時間：2026-07-20  
交接目的：更換對話群後，讓下一位 ATM 併行開發隊長可以接手完成最新 2.0 / 2.1 計畫與全部剩餘任務卡。

## 0. 一句話結論

目前 2.0 / 2.1 已從「單純觀測與效能證明」擴張成「compose-first parallel governance」主線。下一位隊長不要從 0197 直線往下做；合理順序是先收現場與 planning amendment，再優先做 0205 canonical telemetry interface，接著做 0207–0214 的 broker / boundary / compose / saga 基礎，最後回來完成 0197–0203 的觀測、executor、runner、A/B 與 UX 收官。

## 1. 權威邊界

- Planning repo：`C:/Users/User/3KLife`
- Planning plan directory：`C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/`
- Target repo：`C:/Users/User/AI-Atomic-Framework`
- Target import method：從 planning repo 的 `.task.md` 用 `node atm.mjs tasks import --from "<task-card>" --write --json` 匯入 target ledger。
- Target closure authority：target repo `.atm/history/**` + ATM CLI transition / evidence / taskflow close。
- Public framework docs rule：target repo public docs 必須 English-only；中文 planning、隊長交接、治理討論留在 3KLife planning repo。

下一位隊長必須先讀：

1. `C:/Users/User/AI-Atomic-Framework/README.md`
2. `C:/Users/User/AI-Atomic-Framework/AGENTS.md`
3. `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md`
4. `C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md`
5. 本交接文件

## 2. 必守治理入口

在 target repo 每次 concrete work 開始前：

```powershell
node atm.mjs next --prompt "<目前使用者要求>" --json
```

若回傳 `evidence.nextAction.playbook`，必須先讀 playbook 再 claim / edit / commit / close。不要自己建立第二套任務模型。

如果要 claim：

```powershell
node atm.mjs identity clear --json
node atm.mjs identity set --actor "<new-actor-id>" --editor codex --git-name "<git user.name>" --git-email "<git user.email>" --json
node atm.mjs next --claim --actor "<new-actor-id>" --prompt "<目前使用者要求>" --auto-intent --json
```

注意：handoff 不轉移 actor authority。新對話群必須用自己的 actor id，不要沿用 `codex-gpt-5.4-mini`。

## 3. 目前已完成與現場狀態

已完成：

- ATM-GOV-0196：`done`
- ATM-GOV-0204：`done`

0204 已修掉 whole-plan import 誤產生 `TASK-ID-0000`：

- root cause：legacy plan import parser 把 fenced code block 裡的 `taskId: TASK-ID-0000` 範例當成 live task declaration。
- fix：`packages/cli/src/commands/tasks/plan-import-boundary.ts` 會排除 fenced code 內的 task-like declarations，並輸出 reference-only warning。
- test：`tests/cli/task-import-canonical-id-boundary.test.ts`
- delivery commit：`0f936232b852a894dbe2963dc4eaf7154917f29e`
- target close commit：`6914bdb81aa2d9ecb3d24395916f6662699a1c76`
- planning closeback commit：`c80d2336d890e94c0a068e7c868cb0cbf7dc99a7`
- 已 push target `main` 與 planning `master`。

仍存在的工作樹現場：

- Target repo 有 build / runner-sync 產生的 dirty release artifacts：
  - `.atm/history/evidence/ATM-GOV-0204.runner-sync-receipt.json`
  - `release/atm-onefile/**`
  - `release/atm-root-drop/**`
- 0204 close 判定這些是 0204 scope 外 residue，不可偷塞進 0204。
- 下一位隊長應先用 governance route 判斷是否需要開 TMP / runner-sync / release-artifact 專門卡處理，或由後續 0201 / runner-sync 相關卡承接。

Planning repo 目前有尚未提交的 v2.1 amendment 草案與任務卡：

- modified：v2 plan、0197–0203、0205、0206
- untracked：0207–0214

這些是 2.1 計畫擴張草案，不是 0204 closeback residue。新隊長要先審核並正式提交 planning amendment，或按 owner 裁示修訂後提交。

## 4. 最新任務狀態

| Task | Status | 角色 |
| --- | --- | --- |
| 0196 | done | observed/sealed/consumed coverage 與逐卡 seal/readback enforcement |
| 0197 | planned | runtime telemetry boundary、compact receipts、session lifecycle |
| 0198 | planned | true resumable plan executor orchestration loop |
| 0199 | planned | broker decision/outcome telemetry 與 correctness adjudication |
| 0200 | planned | validator observed lifecycle 與 evidence-driven tiering |
| 0201 | planned | runner incremental dogfood 與 dominant phase optimization |
| 0202 | planned | real paired A/B v4 與 rollout verdict |
| 0203 | planned | first-layer routing / orientation / Windows-safe UX |
| 0204 | done | task import parser canonical id boundary repair |
| 0205 | planned | canonical telemetry observation interface foundation |
| 0206 | planned | broker resource overlap matcher shadow repair |
| 0207 | planned draft | canonical broker transaction authority / linearizable state |
| 0208 | planned draft | content-anchored code boundary / resolver substrate |
| 0209 | planned draft | versioned read/write sets / structured overlap evidence |
| 0210 | planned draft | parallel task start / isolated proposal lanes |
| 0211 | planned draft | compose-first broker ticket state machine / fair scheduling |
| 0212 | planned draft | transactional bounded composer / serializable publish |
| 0213 | planned draft | CID and read-set semantic revalidation adjudicator |
| 0214 | planned draft | shared delivery saga / crash-safe exactly-once lifecycle |

## 5. 計畫 2.0 / 2.1 的真正目標

Owner 的核心目的不是「比較幾個批次快不快」，而是讓 ATM 治理可以全面平行化：

- 不同隊長可以同時開不同任務卡。
- 同一張任務卡仍只能一個隊長開工。
- 不同任務卡即使物理檔案範圍重疊，也不應在 claim 或 write gate 被 bare refusal 卡死。
- shared-write gate 應由 broker 回 ticket：execute now、compose/batch into shared write window、enqueue with position。
- compose-first 是主線；queue 只是 fallback。

這直接對應憲法：

- INV-ATM-008：Broker tickets, not refusals。
- INV-ATM-009：Generalized repair and data-driven policy。

### INV-ATM-008 持續方向檢查

下一位隊長在每一次 claim、write intent、broker decision、runner-sync、build、release mirror、git commit、taskflow close、batch checkpoint 與 shared artifact 更新時，都要順手問一句：

> 這個流程是否把可協調的 shared-write 變成 bare refusal / terminal block？如果是，它是否屬於憲章明列例外？

若答案是否定的，不能把卡住視為「正常限制」。正確處理順序是：

1. 先確認是否能回 broker ticket：execute now、compose/batch into shared write window、enqueue with position。
2. 若現有 CLI 只回 `blocked` / `refused` / `*_REQUIRED` 但沒有可執行 ticket 或 queue position，標記為 INV-ATM-008 charter debt。
3. 若該 charter debt 會阻止本卡繼續，先回寫 ATM bug backlog，並判斷是否需要插單修框架，不要用手動 bypass 把資料污染掉。
4. 若可以在本卡 scope 內修，必須採泛用 ticket / state-machine / adapter 方式；不得 hard-code 某個 actor、task id、queue name 或錯誤字串。
5. 若只是降級排隊，也要記錄為 fallback，不得把 queue-first 誤寫成 2.1 主線；2.1 主線是 compose-first，queue 是不可合併時的安全退路。

這個檢查要寫進每張卡的 opening data-driven decision 或 close summary，至少用一句話交代：「本卡是否新增、移除或碰到 shared-write gate；是否符合 INV-ATM-008；若不符合，backlog / stop rule 是什麼」。

因此 2.1 不應被縮回「排隊優先」。正確階梯是：

1. 無交集：parallel-safe 直接寫。
2. 有物理交集但內容/語義可判定不相交：compose-parallel。
3. 有交集且可合併：composer + steward / transactional publish。
4. 無法安全合併：queue ticket，head release 後立即續跑。
5. 真正硬拒：同卡、多重 owner、不可復原或明確 owner-ruled exception。

## 6. 建議完成順序

### Phase A：交接後第一輪整理

目的：避免新對話群一上來就把 planning draft、target release residue、0205/0207 scope 混在一起。

1. 在 target repo 跑：

   ```powershell
   git status --short
   node atm.mjs next --json
   node atm.mjs tasks status --task ATM-GOV-0196 --json
   node atm.mjs tasks status --task ATM-GOV-0204 --json
   ```

2. 在 planning repo 跑：

   ```powershell
   git -C C:/Users/User/3KLife status --short
   ```

3. 先審核 v2.1 草案與 0207–0214 卡片是否完整、是否符合 owner 最新裁示。
4. 若草案合理，提交 planning amendment；若還有歧義，先補 planning 文件，不進 target implementation。

### Phase B：優先完成 0205

0205 是接下來所有儀表資料的地基。Owner 已明確建議 0196 後優先做 0205。

0205 目標：

- 建立 canonical telemetry observation interface。
- 讓 gate telemetry、evidence commandRuns、validator lifecycle、runner-sync/incremental build、broker queue/outcome、test-runner timing 走同一套可擴充介面。
- 支援 adapter / inheritance / extension，不要到處手寫 timing field。
- 不改 rollout threshold、不刪 gate、不重寫歷史 evidence。

0205 開工前要消費：

- 0196 sealed summary
- 0204 parser repair evidence
- 目前已知 bug：validator duration/timing、runner build timing、release residue、runner-sync queue-head required command 等

0205 close 前應至少證明：

- 有一個 canonical event / observation interface contract。
- 至少 2–3 個既有 producer 轉接到 interface，或明確用 adapter 包起。
- close evidence 產出 task telemetry summary。
- raw log 留 runtime / gitignored，tracked history 只留 compact digest。

### Phase C：0207 / 0208 / 0209 先於 0206 live-enable

0206 matcher 會讓 overlap 偵測更準，但若 broker 還是 terminal block，單獨上線會讓系統更卡。因此：

- 0206 可以先做 shadow repair。
- 0206 不得 live-enable 到會增加 terminal block 的路徑，除非 0211 ticket state machine 已接好。
- 0206 的 output 不該只是 boolean；必須保留 matched resource set / structured overlap evidence，否則 compose 下游拿不到資訊。

建議先做：

1. 0207：broker transaction authority / linearizable state
   - 解 registry / broker queue / shared state 的 CAS / atomic write / linearizable 問題。
   - 100 隊長場景下，不能 read-modify-write 掉資料。
2. 0208：content-anchored boundary substrate
   - 不要用絕對行號當主要 boundary 原語。
   - 優先 content anchor / hunk context / AST path / symbol path。
   - 絕對 line range 只能當 diagnostic snapshot，不可當 compose 判定核心。
3. 0209：versioned read/write sets
   - write intent 要有 structured overlap evidence。
   - read-set / write-set 要可版本化、可 revalidate。
   - compose 後不能只做 textual rebase，還要判斷推理依據是否 stale。

### Phase D：0210–0214 建立 compose-first 並行主線

建議順序：

1. 0210：parallel task start / isolated proposal lanes
   - 讓不同任務卡平行 start / claim。
   - 同卡唯一 owner 保留。
   - claim 不應因 CID / scope overlap bare block；改成 proposal lane / ticket / adjudication。
2. 0211：compose-first broker ticket state machine
   - verdict union 新增 compose / queued ticket。
   - blocked 收窄為硬拒。
   - fairness / anti-starvation 是一級驗收條件，不是 telemetry 附註。
3. 0212：transactional bounded composer
   - publish 必須可 rollback、可重播、無 silent overwrite。
   - 形式目標是 serializability：compose tree 等價於某個合法 serial order。
4. 0213：CID and read-set semantic revalidation
   - CID conflict 不應粗暴 hard block。
   - rename/delete、delete/modify、same atom semantic conflict 必須進 adjudication。
   - read-set 與已 publish write-set 相交時，提案要 revalidate。
5. 0214：shared delivery saga
   - 修 shared commit 先更新 HEAD 再判 blocker 的 P0 saga 順序缺陷。
   - runner-sync / release mirrors / git commit shared write window 要 exactly-once / crash-safe。

### Phase E：回來完成 M3/M4 觀測與實測

在 compose-first substrate 有基本契約後，再做：

1. 0197：runtime telemetry boundary
2. 0198：true resumable plan executor
3. 0199：broker telemetry / correctness adjudication
4. 0200：validator lifecycle / tiering
5. 0201：runner incremental dogfood
6. 0202：real paired A/B v4
7. 0203：first-layer UX contracts

原因：如果先做 0199/0202，broker admission 語義仍錯，得到的數據只能證明「被拒絕」，不能證明 ATM 的平行開發目標。

## 7. 每張卡固定流程

每張卡都照這個節奏：

1. 讀計畫與卡片。
2. 用 `node atm.mjs next --prompt ... --json` 路由。
3. 若 task card 尚未 target-import：

   ```powershell
   node atm.mjs tasks import --from "C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/tasks/<CARD>.task.md" --write --json
   ```

4. claim 前清 actor identity 並設定新 actor。
5. claim 後讀 `evidence.nextAction.playbook`。
6. 開工前讀前序 sealed summary，填寫 data-driven decision：
   - consumed summaries
   - missing data
   - assumption changes
   - stop rule
7. 實作要走 generalized fix：
   - 不 hard-code 個別數字、字串、task id、檔名，除非有記錄證據說通用方法不可行。
   - data-shaped behavior 優先 schema / registry / config / observed counters / compact digest。
8. validators：
   - focused test
   - typecheck
   - validate:cli 或 task card 指定 command
   - 若修改 runner / release / broker shared write，需 frozen runner build + frozen smoke。
9. evidence run 要確保 duration / timing 有被記錄。
10. close 前掃 telemetry：
    - raw runtime logs 是否在 `.atm/runtime/**` 或 gitignored log store
    - tracked history 是否只有 compact digest
    - task summary 是否含 window / watermark / counters / duration / missingTelemetry / sourceAvailability
11. 用 ATM git wrapper commit。
12. taskflow close。
13. push。
14. 若出現新 bug / friction / optimization，先用 backlog skill 回寫，不要只口頭記。

## 8. 每卡儀表檢查清單

每張卡 close 前至少檢查：

- 是否有 `atm.gateTelemetry.v1` 或 canonical successor 的 runtime event。
- 是否有 commandRun duration / startedAt / finishedAt。
- validator timing 是否進 canonical interface。
- broker / runner / git / evidence / taskflow 操作是否有 correlation id：
  - taskId
  - actorId
  - laneSessionId
  - runId
  - commit sha / build digest / queue ticket id
- raw log 是否沒有進 git tracked history。
- tracked evidence 是否有 compact digest / sourceAvailability / missingTelemetry。
- 如果缺資料，只能標 `observability-missing` 或 `source: unavailable`，不能當作 0 latency / 0 failure / success。

## 9. 已知 P0 / P1 風險與應回寫/追蹤事項

以下問題在前一輪已被觀察或討論，下一位隊長要確認 backlog 是否已有正式記錄；沒有就補：

- `.atm/history/tasks/ATM-GOV-0196.json` 曾被 validator / cleanup 弄不見：P0，必須泛用修復 protected ledger deletion / recovery。
- runner sync 需要 queue-head reservation 時曾回 `ATM_RUNNER_SYNC_QUEUE_HEAD_REQUIRED`，且 required command 指向不存在的 `ATM-FRAMEWORK-TEMP-*` task：P0/P1，這是 INV-ATM-008 shared write ticket UX / deadlock 問題。
- build guidance 應自動帶 actor identity：長線 UX backlog。
- evidence run 曾缺 validator duration/timing：已要求插單，0205 應吸收。
- framework temp claim / quickfix 路徑不像一般 ATM governance 那樣走 skill -> tools -> CLI 的 friendly AI path：應有 SKL 系列或既有技能路線卡處理。
- template/fixture 的 INV-ATM-006 文字與 live charter 曾有歷史差異：要確認已同步。
- release artifacts dirty residue 不應被任務 close 偷塞；需要 runner-sync / release-artifact governance 路線。

## 10. v2.1 論文/證據主張

0202 最後不能只做 serial vs treatment。v2.1 應包含四臂對照：

1. serial ATM
2. queue-only ATM
3. compose-first ATM
4. traditional git branch + merge baseline

需要規模維度：

- 2 / 4 / 8+ 並發寫者，若可行再往 16 / 32 / 100 壓測。
- 指標不是「compose 是 O(1)」這種過度簡化，而是 serialization depth 從 N 降到一個 broker publish window；總時間接近 parallel creation max + composition cost。

論文主張與卡片：

- 原子化提供 ownership substrate；0208/0209 建構可判定 boundary evidence。
- 0212 證明 transactional composer 的 serializability / rollback / no silent overwrite。
- 0202 證明 compose-first 相對 queue / serial / git branch merge 的 makespan 與 correctness。
- 0199 / 0205 證明 governance gate 本身不是主要瓶頸。

## 11. 下一位隊長的建議第一個 prompt

可以直接在新對話群貼：

```text
你是 ATM 併行開發隊長。請先閱讀：
1. C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/ATM-GOV-2.0-2.1-captain-handoff-2026-07-20.md
2. C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan.md
3. C:/Users/User/3KLife/docs/ai_atomic_framework/governance-optimization/end-to-end-auto-batch-performance-plan-v2.md
4. C:/Users/User/AI-Atomic-Framework/README.md
5. C:/Users/User/AI-Atomic-Framework/AGENTS.md

請不要先實作；先 preflight 兩個 repo 的 git status、ATM next、0196/0204 task status、planning draft 狀態，然後提出接手計畫。接著依計畫從 0205 或必要的 planning amendment 開始治理。
```

## 12. keep-memory checklist

- confirmed pitfall + fix：有。PowerShell 不支援 bash heredoc；Windows 文件 IO 應用 Node UTF-8 helper，避免 PowerShell content command 作為 authoring/comparison 基礎。
- major closure snapshot：有。0204 已 close 並 push；0196/0204 done，0197–0203/0205–0214 planned。
- human feedback：有。Owner 明確要求 compose-first 優先於 queue；2.1 必須以 INV-ATM-008 的全局平行治理為核心，不可退回排隊優先。
- invalidated note：有。先前「atom map 已有 sourceRange，可直接接線」的假設被推翻；現況是 atom map 只有 path→atom ownership，content boundary evidence 需要從 0208/0209 建構。

本交接已把這些內容寫入正式 handoff；若下一位隊長要寫 keep-memory，請只補「操作直覺」，不要重複 backlog / task card 已記錄的正式事項。
