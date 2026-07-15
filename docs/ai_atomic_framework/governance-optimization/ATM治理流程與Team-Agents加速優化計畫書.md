---
doc_id: doc_other_1453
owner: atm-core
status: active
version: 1.3.0
planning_repo: 3KLife
target_repo: AI-Atomic-Framework
closure_authority: target_repo
baseline_commit: ccee5466fa0f82c5e7c86df650b650eb40acf420
baseline_date: 2026-07-14
related_charter: .atm/charter/atomic-charter.md
related_principles: .atm/charter/atm-first-principles.md
---

# ATM 治理流程與 Team Agents 加速優化計畫書

## 0. 文件定位與裁決

本文件是 ATM 治理效能優化的中文權威計畫，規劃與任務卡存放在 3KLife；程式實作、正式 ledger、evidence、close、commit 與 release 的權威仍在 `AI-Atomic-Framework`。

本計畫不把治理步驟視為目的。ATM 只應保護必要的不變量，並以可量測方式證明治理沒有拖慢交付。第一波先修今天已經發生且可量化的浪費，再為 Team Agents 平行寫入鋪路：

1. 先保護 release 與其他 Captain 的工作內容。
2. 再把 seal、commit、close、claim release 與 publication 收成可復原交易。
3. 讓驗證 receipt 可安全重用，停止重複驗證。
4. 通過 Pre-Team Foundation Gate 後，才啟用 shadow-first Team 寫入。
5. 最後才用 obligation map、動態 Team controller 與 Batch 整合追求規模化加速。

`Charter v2.1.0`、ATM 第一性原理及其 machine-readable invariants 是最高指導原則。本文件負責落地路徑，不創造第二套 waiver authority。`2.1.0` 是在既有 `2.0.0` 上納入 Schedule A 的 additive amendment，沒有移除原 invariants。

## 1. 第一性原理與量化目標

### 1.1 只保護四個治理不變量

1. Agent 不會把不屬於自己的檔案帶入交付。
2. 交付內容通過真正必要的驗證。
3. 證據精準對應最後交付內容，且由 ATM wrapper 自動產生。
4. 同一分支只由單一 closer 依序 commit 與 push。

### 1.2 Scope 可以擴充，但不可偷偷擴充

Captain 可在執行中核准 scope expansion。每次擴充都必須產生新 epoch，重新計算 ownership、衝突、必要驗證與 receipt 失效範圍。已由其他 worker 修改的同一檔案不做飛行中 ownership 移交，只能排隊或交由 composer 處理。

### 1.3 驗證必須是必要集合

必要驗證由變更路徑、風險分類、公共契約與歷史失敗推導，不以固定全量 suite 取代判斷。第一階段採可人工審核的 path-to-validator 映射與保守失效；full-suite canary 作非阻塞安全網。命中率穩定且具 import graph 或 fs-trace 後，才縮到 symbol-level。

### 1.4 證據必須小、自動、不可自報

canonical receipt 只能由 ATM validator wrapper 產生並寫入 content-addressed storage。Agent 只能引用 receipt ID。Receipt 至少綁定 validator、command、environment、base SHA、payload digest、scope digest 與 wrapper provenance。

### 1.5 一般治理成本上限

同一工作負載下，ATM 相對無 ATM 的**實際貨幣成本**與端到端時間，兩者都不得超過 `1.10`；穩態目標為 `1.05` 以下。Token 數必須保留為容量、上下文膨脹與異常診斷指標，但不同廠商、模型、快取與訂閱方案的 token 單價不同，不得再把 raw token ratio 當成跨模型的主要經濟結論。超標即為產品缺陷，必須產生可追蹤的成本事件，而不是把成本歸因給使用者。

### 1.6 Team Agents 加速門檻

Team 模式相對單 Agent 的 production/default 門檻為 `teamCostRatio <= 0.80`、`teamTimeRatio <= 0.75`、品質不退步且 repair/residue 不增加；preferred route 目標為成本 `<= 0.75`、時間 `<= 0.65`；成本與時間都 `<= 0.50` 保留為突破目標，不再冒充所有工作負載的最低合格線。任一 production gate 不達標時自動縮編，必要時退回單 Agent；同時記錄原因、瓶頸分類與後續最佳化實驗，不能只降級後遺忘。

### 1.6.1 真實貨幣成本是主要經濟指標

ATM 同時保存三種金額，且不得混用：

- `incrementalCashCost`：本次工作實際新增的帳單、點數或超額費用。
- `fullyLoadedCashCost`：增量費用加上按明示政策攤提的月租、席次、工具、sandbox 與雲端成本。
- `listPriceEquivalentCost`：依官方公開標準牌價換算的比較值，只供跨實驗正規化，不得冒充實際帳單。

Canonical 計價優先序為：供應商回傳的 charged amount/credits；其次為供應商真實 usage 乘上版本化價格快照；只有估算 usage 時一律標示 `cost-measurement-incomplete`，不得作升級依據。原幣金額必須保留；跨幣別比較另綁定版本化 FX snapshot。

標準換算式為 `usageCost = Σ(billableQuantity_i / priceUnit_i * rate_i) + Σ(fixedCharge_j)`；其中 billable dimensions 至少涵蓋 input、output、cache read、cache write/creation、reasoning、server-side tool/search/code execution、request/session、priority/fast/batch tier、retry，以及供應商實際計費的 failed/cancelled call。`fullyLoadedCashCost = incrementalCashCost + allocatedSubscriptionOrSeatCost + sandboxOrCloudCost + otherToolCost`。任何缺少適用 rate dimension 的 receipt 都不得以零補值。

### 1.6.2 共用標準 token 定價表

ATM framework 維護 canonical `model-standard-token-prices.json`，供所有 Captain、Agent、Batch 與 benchmark 共用。每筆至少包含 `providerId`、`modelId`、`billingProduct`、`planId`、`region`、`serviceTier`、`currency`、input/output/cache read/cache write 單價、固定費與工具費、`effectiveAt`、`retrievedAt`、官方 `sourceUrl`、`sourceHash` 與 catalog version。

價格版本不可被原地覆寫。官方來源抓取器只產生候選 snapshot、欄位差異與解析警告，經 schema、來源 allowlist、異常門檻及治理審核後才升為 canonical。自訂合約、折扣與訂閱席次分開套用，不得改寫標準牌價；訂閱制 Agent Bot 也不得被算成免費，必須同時呈現實際增量／超額成本與席次攤提後的 fully-loaded cost。

首批官方來源 registry：

| Provider/Product | 官方來源 |
|---|---|
| OpenAI API / Codex | `https://developers.openai.com/api/docs/models`、`https://help.openai.com/en/articles/20001106` |
| Anthropic Claude API | `https://platform.claude.com/docs/en/about-claude/pricing` |
| Google Gemini API | `https://ai.google.dev/gemini-api/docs/pricing` |
| Microsoft Azure OpenAI | `https://azure.microsoft.com/en-us/pricing/details/azure-openai/` |
| GitHub Copilot Agent plans | `https://github.com/features/copilot/plans` |

### 1.6.3 角色是能力，不必是一個昂貴 Agent

Captain、worker、reviewer、validator 是能力角色，不要求一角一個獨立 Agent。Scheduler 應先折疊可由同一執行者完成的角色；需要獨立性或真平行時才開新 Agent。Inventory、讀檔、局部實作、格式檢查與固定 validator 優先選用通過能力門檻的便宜模型或非模型工具；只有高風險裁決、跨模組推理與 final close 才按需升級模型。

### 1.7 只在結構可平行時開 Team

事前不用不可靠的工時猜測。滿足「互斥檔案群至少兩組，且關鍵路徑沒有共享 barrel、lockfile、共用型別或唯一外部資源」才開 write workers。Inventory、line-count、map consistency、post-report verification 等工作優先使用唯讀 internal sidecar。

### 1.8 原子行數上限是中央參數

新拆出的 atom、map、腳本與支援模組預設不得超過 600 行。上限由 `atomization.maxLines` 統一解析，repository 可調小；調大必須使用有期限、有理由的 waiver。大型 facade 在行為 freeze 後分批抽取，不以盲目切檔破壞語意。

## 2. 現行程式基線

### 2.1 基準版本

- Target repo：`C:\Users\User\AI-Atomic-Framework`
- Branch：`main`
- Baseline：`ccee5466fa0f82c5e7c86df650b650eb40acf420`
- Runner：frozen `node atm.mjs`
- 實作驗證：需要 source-first 時使用 `node atm.dev.mjs`

### 2.2 已具備且應重用的能力

- close-window lock、branch commit queue 與 task-scoped temporary index bundle。
- Batch queue、checkpoint、原始碼中的 `deliver-and-close` 路徑。
- validator wrapper、receipt/cache、resume/status 與 closure packet taxonomy。
- Team roster、provider、wave、report 與 admission benchmark 骨架。
- Broker intent、CAS、queue primitives 與 active-work radar。
- residue status/reconcile、release cleanup、runner source-drift evidence。
- RFT atom map、line-budget validator 與 CLI `--max-lines`。
- Charter integrity、integration manifest hash 與 doctor 檢查骨架。

這些能力表示本計畫不是重寫 ATM，而是把已存在但分散的機制收成少數可證明的不變量。

### 2.3 仍存在的核心缺口

- close、commit、claim release、receipt publication 仍跨多個可中斷步驟。
- 多 Captain 共用 branch/index 時仍可能需要人工處理 foreign staged state。
- runner sync 與 release mirror 對 foreign non-release WIP 的防護不足。
- canonical receipt 尚未完整綁定 final payload，且重用 fingerprint 過度依賴 mtime。
- Broker registry persistence 仍有直接覆寫 JSON 的路徑。
- Team execute 主路徑仍偏序列，worker report 可包含自述證據。
- shadow workspace、ContributionManifest、composer 與 obligation map 尚未落地。
- provider bridges 尚未保存完整 billable usage，缺少共用標準定價表、實際帳單／點數換算與版本化 cost receipt。
- paired ATM/no-ATM 與 Team/Single 的真實貨幣成本、token 診斷與時間基線尚未建立。
- 原子行數限制尚未由單一中央設定驅動。

### 2.4 評估報告的事實修正

評估方向成立，但執行時以目前 HEAD 為準：

- `ATM-BUG-2026-07-12-126`、`-159`、`2026-07-13-171/172/175` 已有目前程式實作，應做回歸與 backlog 狀態校正，不重做功能。
- 部分完成且仍需收口：`2026-07-12-127/134/147`、`2026-07-13-161/162`。
- 目前缺席且需新實作：`2026-07-12-160`、`2026-07-14-183/184`。
- 已 fixed 的 `2026-07-12-128/129/130/131/132/133/135/161`、`2026-07-13-159/160/168/180/181`、`2026-07-14-182/185` 只作 regression reference。

### 2.5 RFT 現況

`TASK-RFT-0020..0025` 六卡的程式交付已完成，新增的 25 個 TypeScript 檔都低於 600 行，最高 243 行。但六卡全部發生 `repair-closure`，而 `0020`、`0021`、`0024` 的 durable direction lock 仍為 active。因此可宣稱「拆分交付完成」，不可宣稱「closeout 已乾淨且可重播」。

### 2.6 目前優先原子化候選

以下由 Node.js 直接量測 source，不含 `dist` 產物：

| 行數 | 檔案 | 建議 |
|---:|---|---|
| 6,250 | `packages/cli/src/commands/team.ts` | 先 freeze Team contract，再抽 admission、scheduler、report、controller |
| 5,785 | `packages/cli/src/commands/next.ts` | 先 freeze route evidence，再抽 intent、policy、presenter |
| 5,270 | `scripts/validate-team-agents.ts` | 優先拆 test harness 與 scenario fixture |
| 4,377 | `packages/cli/src/commands/git-governance.ts` | foundation 完成後拆 index ownership 與 transaction |
| 4,219 | `packages/cli/src/commands/tasks/legacy-impl.ts` | 先封住 legacy contract，再拆 lifecycle |
| 3,473 | `packages/cli/src/commands/framework-development/closure-packet-schema.ts` | 拆 schema、normalizer、diagnostics |
| 3,009 | `scripts/validators/task-ledger/suite-impl.ts` | 拆規則群與 fixture runner |
| 2,983 | `packages/cli/src/commands/evidence/bundle-io.ts` | receipt contract 穩定後拆 store/reuse policy |
| 2,751 | `packages/cli/src/commands/hook/pre-commit.ts` | index isolation 穩定後拆 classifier/presenter |
| 2,038 | `scripts/validate-cli.ts` | 拆 command family suites |

原子化排序不得早於行為修復。`git-governance.ts`、`pre-commit.ts`、`bundle-io.ts` 會先被 foundation 卡改變，若現在先大拆，會放大 merge 與驗證成本。

## 3. 目標資料流

### 3.1 單 Agent 與 Captain close

```text
claim/scope epoch
  -> change set
  -> obligation projection
  -> wrapper validation receipts
  -> sealed payload bundle
  -> temporary index assembly
  -> one delivery commit
  -> idempotent publication/claim release/queue advance
```

Commit 是唯一真相。Runtime receipt 與 publication record 是可由 commit trailer 及 payload/evidence digest 重建的 projection。

### 3.2 Team 採 shadow-first 寫入

```text
captain base SHA
  -> disjoint work groups
  -> per-worker ephemeral shadow workspace
  -> wrapper validation
  -> immutable ContributionManifest
  -> barrier conflict/admission check
  -> composite snapshot validation
  -> single closer seal-and-commit
```

Worker 不共寫 live worktree。Lease 降級成排程提示，避免重複工作；真正正確性在 barrier 以 base、path、hash、scope epoch 與 manifest 衝突檢查保證。Scope expansion 在 worker shadow 內可以快速進行，但未經 Captain 核准的檔案不會被 composer 接納。

### 3.3 為何不採共享 live worktree 驗證

共享樹上的 focused validation 會看到其他 worker 的半成品，可能產生假陽性或假陰性。把這種結果簽成 canonical receipt 會直接破壞「證據對應交付內容」。因此 worker 的正式驗證只對 `base + own overlay` 執行，最終 composite 再於 barrier 驗證一次跨 contribution 契約。

## 4. 五個 Hard Gates

### Gate 1：Contribution 合法

- base SHA、scope epoch、paths 與 blob hashes 可驗證。
- 同一路徑的多份 contribution 一律拒絕自動組裝。
- 未核准 scope expansion 不進 final payload。

### Gate 2：Payload 完整

- final payload 只能來自明列的 manifests 與 canonical governance artifacts。
- foreign dirty、release mirror、root-drop residue 不得被隱式吸入。
- temporary index 的內容與 sealed payload digest 一致。

### Gate 3：必要驗證成立

- 每個 obligation 都有 wrapper 產生且未失效的 receipt。
- receipt 綁定相同 base、payload、scope、validator 與環境。
- 保守失效時寧可重跑，不靜默放行。

### Gate 4：Evidence 可追溯

- Agent 無 canonical receipt 寫入權限。
- commit trailer 綁定 payload digest 與 evidence digest。
- canary 綁定確切 sealed commit SHA 與 mapping version。

### Gate 5：單一 closer

- 同一 branch 只有一個具 TTL 與診斷資訊的 closer mutex。
- commit/push 經 branch queue 排序。
- crash 後可判定 active 或 closed，不存在需人工猜測的第三狀態。

## 5. Phase 0：基線、權威與低風險止血

對應卡：`ATM-GOV-0124`、`ATM-GOV-0125`、`ATM-GOV-0126`、`ATM-GOV-0132`、`ATM-GOV-0133`、`ATM-GOV-0134`、`ATM-GOV-0143`、`ATM-GOV-0144`、`TASK-RFT-0026`。

### 建置

- 把 Charter、第一性原理、machine-readable invariants 收成 content-bound authority bundle。
- 建立版本化 canonical `model-standard-token-prices.json`、provider billable-usage adapter 與 cost receipt；標準牌價、自訂合約與訂閱攤提分層保存。
- 建 paired benchmark，固定 base、輸出、provider/model/plan、價格快照、cache 與 validators。
- 建官方定價來源 allowlist 與定期 refresh crawler；crawler 只產生候選 diff，不直接覆寫 canonical catalog。
- Claim/close 對外部規劃來源加上 repo identity、card path、planning commit SHA、content digest 與 amendment epoch。
- Governance hotfiles 改成 shard/item source，並保留既有 Markdown path 的 generated compatibility projection。
- 指標納入 queue wait、retry、repair、discarded work、真實貨幣成本、token 診斷與端到端時間。
- 補 Batch `deliver-and-close` help、summary-first hook failure 與安全 recovery command。
- 提供 framework taskflow opener，消除 planning repo 無法安全開卡的產品缺口。
- 建立中央 `atomization.maxLines`，預設 600，可調小。

### 驗收

- benchmark 只能 shadow measurement，不改 Git 或 task state。
- provider 真實 billable usage 與可追溯價格快照才可作 promotion 分母，估算值不得宣稱達標。
- 標準定價 catalog 可由所有 Agent 共用，且任一數值都能追到官方 URL、來源 hash、有效時間與 catalog version。
- crawler 遇到頁面結構改變、幣別／單位不明或價格異常跳動時 fail closed，保留上一版 canonical catalog 並開 incident。
- Planning-source drift 會被 claim/close 拒絕，除非存在 governed amendment。
- Hotfile projection 可重建且不破壞既有 reader。
- framework task authoring 不需 placeholder ledger、手改 runtime 或 emergency overwrite。
- 所有新 atom/map/script 在 birth 時檢查中央行數上限。

## 6. Phase 1：Release Safety、Index Isolation 與 Seal-and-Commit

對應卡：`ATM-GOV-0127`、`ATM-GOV-0128`、`ATM-GOV-0129`、`ATM-GOV-0130`。

### 建置

- release steward lane 在任何 build/sync mutation 前檢查 foreign non-release WIP。
- ordinary card 不得自動 stage `release/**`，validation-only build 必須恢復自己產生的 release tree。
- dry-run、wrapper、hook 使用同一 ownership classifier。
- 完整 foreign bundle 可在 index lease 下 park/restore，partial-staged blob 必須 byte-identical。
- close transaction 先組裝 closed ledger、events、evidence 與 payload，再以 temporary index commit。
- commit 成功後，publication、claim release 與 queue advance 皆可冪等重播。

### Crash 一致性矩陣

每個步驟後 kill process：mutex、assembly、validation、index、commit、publication receipt、claim release、queue advance。重啟後必須自動收斂為：

1. Commit 前失敗：工作仍 active，bundle 可安全丟棄或重建。
2. Commit 後失敗：由 commit trailer 重建 publication 並完成 release，不產生第二個 delivery commit。

`repair-closure` 只保留給 migration 或 emergency，不得成為正常 close 路徑。

## 7. Phase 2：Content-addressed Receipt 重用

對應卡：`ATM-GOV-0131`。

### 建置

- Wrapper 直接寫入 receipt store，Agent 只能引用。
- 先以 package/目錄為保守失效粒度。
- 正規化 Windows path、CRLF 與 formatter output 後再計算 digest。
- pre-commit、close、Batch 共用同一 receipt，不重跑相同 validator。

### 驗收

- 同 payload、同 obligation 可命中重用。
- scope 內任一檔案改變即 cache miss。
- receipt 竄改、wrapper provenance 不符或環境不相容時 fail closed。
- cache miss 只造成重跑，不降低 gate。

## 8. Pre-Team Foundation Gate

外部 write workers 只有在下列三個整合測試全部通過後才能啟用：

1. 兩位 Captain 共用同一 repository，一位 close 時另一位持有 staged 與 unstaged work；全程不需人工 unstage、stash、restore 或 index surgery。
2. delivery commit 後立即 kill，重啟能發布並 reconcile 同一 commit，不產生第二個 delivery 或例行 `repair-closure`。
3. runner sync 不覆蓋 foreign non-release WIP，ordinary close 也不吸入 release mirror。

若任一項失敗，Team write lane 保持關閉；唯讀 internal sidecar 仍可使用。

## 9. Phase 3：Shadow-first Team Scheduler

對應卡：`ATM-GOV-0135`、`ATM-GOV-0136`。

### 啟動條件

- 互斥檔案群至少兩組。
- 沒有共享瓶頸檔阻塞關鍵路徑。
- Broker/admission 可為每組建立一致的 base SHA 與 scope epoch。
- Pre-Team Foundation Gate 全綠。

### 建置

- 每位 worker 在 ephemeral shadow workspace 寫入與驗證。
- Worker 輸出 immutable `ContributionManifest`：base、scope epoch、files、hashes、receipt IDs、toolchain digest。
- Scheduler 先折疊不需獨立性的角色，再為每個 work group 選擇符合能力、風險與資料政策的最低預估 fully-loaded cost 模型。
- 每個 worker 只收到必要的 `ContextManifest`；共用穩定前綴優先使用供應商 prompt cache，避免重送整份計畫與歷史。
- Admission 在啟動前綁定 provider/model/plan、價格 catalog version、單 worker 與整批 spending ceiling；執行中以實際 usage 更新 stop-loss projection。
- Scheduler 必須輸出 `TeamRosterFingerprint`：role graph、executor collapse decision、provider/model/plan、pricing catalog version、ContextManifest hash、prompt-cache policy、fan-out cap 與 quota probe digest。沒有 fingerprint 的 Team run 只能診斷，不能升級為 production/default 證據。
- 支援 DAG streaming 派工：Captain 可先建立可回滾 reservation graph，無依賴且無共享瓶頸的 work group 可逐個 activation，不必等待完整 Team plan 全部完成；任何 activation 都必須綁定 base SHA、scope epoch、ContextManifest hash 與 spending ceiling。
- 每個 contribution 可選擇 clean-context reviewer lane。Reviewer 只讀 base、ContributionManifest、diff、必要依賴、acceptance 與 reviewer-specific ContextManifest，不讀 worker 對話歷史；review receipt 與 validator receipt 分開保存，並在 composer 前進入 barrier 判斷。
- Composer 在 barrier 組裝 composite snapshot；同路徑衝突拒絕自動合併。
- 跨 contribution 的型別、barrel、lockfile、公共 schema 驗證在 composite 層執行。

Serial Team 執行、估算 usage、缺價格快照或漏列訂閱／工具成本的樣本只能診斷，不能證明 Team 達到 production 門檻。

## 10. Phase 4：Unified Admission 與 Broker Transaction

對應卡：`ATM-GOV-0137`、`ATM-GOV-0138`。

### 建置

- 所有 claim、scope expansion、lease hint、close 與 release intent 先經同一 admission projection。
- Projection 一次判斷 active claims、foreign dirty/index state、release ownership、scope overlap 與 queue position。
- Team projection 必須在啟動前輸出 bounded fan-out 決策：最大 worker 數、每 provider quota/rate-limit probe、單 worker 與整批 spending ceiling、預估 queue wait、降級路徑與 stop-loss threshold。
- Broker registry 寫入採 temp file、fsync、atomic rename 或等價 transaction。
- CAS failure 回傳可重試原因，不留下半份 intent 或壞 JSON。

即使 shadow-first 讓 lease 變薄，Broker 原子性仍保護排程與 canonical state，不可用 last-writer-wins。

## 11. Phase 5：Validation Obligation Map 與 Canary

條件卡：`ATM-GOV-0139`。

### 第一階段

- 從現有 closure packet validator taxonomy 產生粗粒度 path-to-validator mapping。
- 規則必須可人工審核、可版本化、可解釋。
- 每個 sealed commit 或每 N 個 commit，在乾淨 checkout 跑 full-suite canary。
- Canary 固定 commit SHA、mapping version 與 toolchain digest。

### 第二階段

- 用 canary failure 建立 mapping-gap incident，自動回饋規則。
- 有 import graph 或 fs-trace 後才縮小 read-set。
- symbol-level 最小覆蓋只有在歷史命中率與漏失率達標後才可進 blocking gate。

## 12. Phase 6：Team Efficiency Controller

條件卡：`ATM-GOV-0140`。

Controller 使用 rolling window 比較 Team 與 Single 的配對 workload：

- `teamCostRatio = Team fully-loaded cash cost / Single fully-loaded cash cost`
- `teamTimeRatio = Team end-to-end time / Single end-to-end time`
- `teamTokenRatio` 保留作上下文膨脹、快取失效與路由診斷，不作跨模型主要升級門檻。
- `TeamRosterFingerprint` 必須作為比較 key；不同 provider/model mix、role collapse、ContextManifest、prompt cache policy、fan-out cap 或 catalog version 不得混算成同一 paired sample。
- 成本 `<= 0.80`、時間 `<= 0.75` 且品質不退步：可進 production/default 候選。
- 成本 `<= 0.75`、時間 `<= 0.65`：可列 preferred route。
- 成本與時間皆 `<= 0.50`：列為 breakthrough，不要求每類工作先達此值才獲得任何 Team 收益。
- 任一 production 門檻超標：縮編一級或改用更便宜的合格模型／角色折疊。
- 連續超標或正確性 gate 失敗：退回單 Agent。

每次退化都建立 `TeamEfficiencyIncident`，至少記錄：共享檔瓶頸、queue wait、validator 重跑、scope churn、worker retry、discarded contribution、provider latency、serial execution、index contention。Incident 必須連到下一個最佳化假設與實驗結果。

## 13. Phase 7：Batch Mode 整合

條件卡：`ATM-GOV-0141`。

- Batch queue head 才能進 seal-and-commit。
- checkpoint 綁定 transaction 捕捉的 old head，不在事後猜測。
- Queue head 的 deliverable、task ledger、evidence 與 events 同一 payload commit。
- 下一張卡只有在 publication/release/advance 全部完成後可見。
- Batch 可重用相同 receipt 與 Team contribution，但不建立第二套 close 語意。
- Batch 成本以整個 sealed batch 的 fully-loaded cash cost 聚合，分開報告 queue-head latency、batch makespan 與 throughput；不得用 throughput 改善冒充單卡 latency 改善。

## 14. Phase 8：Release Publication 完成化

對應卡：`ATM-GOV-0142`。

Release safety 在 Phase 1 已先止血，本階段補齊 publication 產品化：

- 唯一 release steward、sealed source SHA、build manifest 與 artifact digest。
- validation-only、source delivery、release publication 三條 lane 明確分流。
- Runner sync 不得用 ordinary governance close 隱式完成。
- Release artifact ownership 與其他 Captain 的 source ownership 可診斷、可排隊。

## 15. Phase 9：RFT 行為 freeze 後原子化

條件卡：`TASK-RFT-0027`、`TASK-RFT-0028`。

### Wave A：關鍵流程

- `git-governance.ts`
- `pre-commit.ts`
- `bundle-io.ts`
- `closure-packet-schema.ts`

前提是 Phase 1/2 行為與回歸 fixture 已 freeze。抽取時 atom/map/script 每檔不得超過中央 `atomization.maxLines`。

### Wave B：Team 與 Router

- `team.ts`
- `next.ts`
- `validate-team-agents.ts`

前提是 shadow scheduler、admission、receipt 與 Team controller contract 穩定。先建立 map、owner、public surface fixture，再按互斥檔案群拆卡。

### Wave C：Legacy 與測試 harness

- `tasks/legacy-impl.ts`
- `task-ledger/suite-impl.ts`
- `validate-cli.ts`

只做行為等價抽取，不在同一卡順便改 public contract。

## 16. 任務排程與依賴

計畫採多工作流並行，只有三個 rollout gate 需要序列化：Canonical Close Cutover、Team Write Enablement、Team Promotion/Scale。Runtime 的五個 Hard Gate 是交易不變量，不是專案排程關卡。

### 16.1 已建立的任務卡

| 順序 | Task ID | 目的 | 依賴 | 備註 |
|---:|---|---|---|---|
| 1 | `ATM-GOV-0124` | Charter/第一性原理 authority bundle | 無 | 最高原則落地 |
| 2 | `ATM-GOV-0125` | Captain quick wins/provider preflight | 無 | 可立即止血 |
| 3 | `ATM-GOV-0143` | provider usage、標準定價表與真實成本核算 | 無 | 所有經濟比較的資料地基 |
| 4 | `ATM-GOV-0144` | 官方定價 refresh crawler | `ATM-GOV-0143` | 候選更新，不直接覆寫 canonical |
| 5 | `ATM-GOV-0126` | paired monetary cost/time baseline | `ATM-GOV-0143` | 並行量測，不阻塞安全修復 |
| 6 | `ATM-GOV-0127` | release steward safety | 無 | 不等待 baseline |
| 7 | `ATM-GOV-0128` | serialization/index convergence | 無 | 不等待 baseline |
| 8 | `ATM-GOV-0132` | framework taskflow opener | `ATM-GOV-0124` | 含 ID family drift 防呆 |
| 9 | `ATM-GOV-0133` | planning-source seal | 無 | close transaction 前置 |
| 10 | `ATM-GOV-0134` | governance hotfile sharding | 無 | 支援物理檔案分工 |
| 11 | `TASK-RFT-0026` | 中央原子行數上限 | `ATM-GOV-0124` | 預設 600，可調小 |
| 12 | `ATM-GOV-0129` | seal-and-commit transaction | `ATM-GOV-0127`, `ATM-GOV-0128`, `ATM-GOV-0133` | Canonical Close Cutover Gate |
| 13 | `ATM-GOV-0130` | crash/residue recovery | `ATM-GOV-0129` | commit 為唯一真相 |
| 14 | `ATM-GOV-0131` | validation receipt reuse | `ATM-GOV-0129` | wrapper-only receipt |
| 15 | `ATM-GOV-0135` | shadow-first Team scheduler | `ATM-GOV-0126`, `ATM-GOV-0129`, `ATM-GOV-0130`, `ATM-GOV-0131`, `ATM-GOV-0134` | Team Write Enablement Gate |
| 16 | `ATM-GOV-0136` | contribution composer | `ATM-GOV-0135` | barrier 組裝 final tree |
| 17 | `ATM-GOV-0137` | Team admission projection | `ATM-GOV-0126`, `ATM-GOV-0135` | 結構性與經濟性 admission |
| 18 | `ATM-GOV-0138` | Broker registry transaction | `ATM-GOV-0137` | shadow-first 後變薄 |
| 19 | `ATM-GOV-0139` | obligation map/canary | `ATM-GOV-0131` | sealed commit canary |
| 20 | `ATM-GOV-0140` | Team efficiency controller | `ATM-GOV-0126`, `ATM-GOV-0137` | 真實成本、時間與品質門檻 |
| 21 | `ATM-GOV-0141` | Batch integration | `ATM-GOV-0129`, `ATM-GOV-0140` | queue head only |
| 22 | `ATM-GOV-0142` | release publication steward | `ATM-GOV-0127`, `ATM-GOV-0129` | Phase 8 補 owner |
| 23 | `TASK-RFT-0027` | 大型 module 原子化 rollout | `TASK-RFT-0026` | behavior freeze 後拆卡 |
| 24 | `TASK-RFT-0028` | Team governance dogfood | `ATM-GOV-0136`, `ATM-GOV-0140` | 達標才推廣 |

### 16.2 三個序列化 rollout gate

1. **Canonical Close Cutover**：`ATM-GOV-0127`、`ATM-GOV-0128`、`ATM-GOV-0133` 完成後，`ATM-GOV-0129` 先 shadow mode 對照舊 close，通過才升 canonical。
2. **Team Write Enablement**：`ATM-GOV-0143`、`ATM-GOV-0126`、`ATM-GOV-0129`、`ATM-GOV-0130`、`ATM-GOV-0131`、`ATM-GOV-0134` 通過後，才允許 shadow-first write workers。
3. **Team Promotion/Scale**：`ATM-GOV-0140` 證明 Team 達到相應 workload class 的真實成本、時間與品質門檻後，才擴編或設為預設；否則自動縮編並記錄優化原因。

### 16.3 依賴裁決

- `ATM-GOV-0126` paired baseline 是 promotion gate，不是 release/index 安全修復的硬依賴。
- `ATM-GOV-0143` 是成本結論的硬依賴；`ATM-GOV-0144` 只降低長期維護成本，不阻塞第一版人工審核的價格 catalog。
- `ATM-GOV-0127` 與 `ATM-GOV-0128` 可立即開始，因為它們修的是已知安全洞。
- `ATM-GOV-0133` 必須在 `ATM-GOV-0129` canonical cutover 前完成，否則 close transaction 仍無法證明 3KLife planning source 未 drift。
- `ATM-GOV-0134` 必須在 Team write 前完成，否則多 agent 仍會競爭同一個 governance hotfile。
- RFT 拆檔只在行為 freeze 後推進，且所有新 atom/map/script 受中央 max-lines 參數約束。

### 16.4 2026-07-15 target ledger sync

- AI-Atomic-Framework target ledger now marks ATM-GOV-0124 through ATM-GOV-0144 and TASK-RFT-0026 through TASK-RFT-0028 as done.
- Recheck confirms the previously reported framework-side gaps are closed: close transaction mutex, kill-after-target crash recovery, payload-digest receipt reuse, Broker registry atomic write, Team shadow workspace provider, Team composer/scheduler wiring, and RFT validator atomization rollout.
- TASK-RFT-0027 acceptance now verifies that scripts/validate-team-agents.ts is below the 600-line bound and that extracted Team validator atoms also stay below the bound, instead of expecting the old oversized harness to remain oversized.
- TASK-RFT-0028 / Team promotion still requires real paired cost, time, and quality samples; incomplete provider usage or billing evidence remains measurement-incomplete and promotion-ineligible.

## 17. Backlog 對照與不重做原則

| 主題 | Backlog rows | 處理方式 |
|---|---|---|
| claim/index parity | `07-12-127/134`、`07-13-161/162` | `ATM-GOV-0128` 收口與 E2E 回歸 |
| seal/commit residue | `07-12-126/147`、`07-14-182` | `ATM-GOV-0129/0130`；126/182 只回歸 |
| framework opener | `07-12-160` | `ATM-GOV-0132` 新實作 |
| runner/release safety | `07-14-183/184` | `ATM-GOV-0127` 新實作 |
| composer/index historical regression | `07-12-135` | `ATM-GOV-0136` 回歸 |
| active-work/radar | `07-13-175` | `ATM-GOV-0125` 驗證並校正狀態 |
| release/residue fixed rows | `07-13-171/172` | regression，不重做 |
| planning source drift | `07-12-119` | `ATM-GOV-0133` 新實作 |
| provider preflight | `07-11-100` | `ATM-GOV-0125` quick win |
| provider usage / monetary accounting | 尚無完整 canonical 實作 | `ATM-GOV-0143/0144` 新實作 |
| governance hotfiles | backlog/shared registry contention | `ATM-GOV-0134` 新實作 |

卡片 close 時必須同步校正 backlog stale status，避免已完成的功能被下一輪誤排。

## 18. 度量、升級與停止規則

### 18.1 每張卡都要量

- incremental、fully-loaded 與 list-price-equivalent cash cost，含原幣、FX snapshot、catalog version 與 allocation policy。
- provider/model/plan、input/output/cache/reasoning/tool billable usage、retries 與 subscription/credit consumption。
- TeamRosterFingerprint：角色圖、executor collapse、provider/model/plan、catalog version、ContextManifest hash、prompt cache policy、fan-out cap、quota probe digest。
- useful work tokens、governance tokens、total tokens，作容量與異常診斷。
- active execution、queue wait、validation、repair 與端到端時間。
- validator run/reuse 次數、cache hit/miss 原因。
- repair-closure、manual recovery、residue 與 discarded work 次數。
- worker 數、有效 contribution 數與衝突數。

### 18.2 升級條件

- 一般 ATM：actual monetary cost/time ratio 皆 `<= 1.10`，穩態朝 `<= 1.05`。
- Team production/default：fully-loaded cost ratio `<= 0.80`、time ratio `<= 0.75`、品質不退步且 repair/residue 不增加。
- Team preferred：cost ratio `<= 0.75`、time ratio `<= 0.65`；cost/time 雙 `<= 0.50` 為 breakthrough 目標。
- Raw token ratio 不作跨模型硬經濟門檻，但必須保留並對異常膨脹 reason-code。
- 正確性 Hard Gates 必須 100% 通過，不能用速度交換。
- 只有真實平行、真實 provider billable usage、版本化價格快照、相同輸出契約的配對樣本可作升級依據。

### 18.3 停止與回退

- 找不到兩組互斥 work group：單 Agent。
- shared bottleneck 在關鍵路徑：單 Agent或一 writer 加唯讀 sidecars。
- receipt/canary 不可信：重跑保守 validator。
- foundation Gate 任一失敗：禁止 Team write。
- fan-out cap、quota probe、roster fingerprint 或 ContextManifest hash 缺失：只允許診斷，不得升 production/default。
- 預估或實際成本已不可能達到門檻：立即 stop-loss、縮編或換用更便宜的合格模型，並建立 incident。
- 價格快照過期、來源無法驗證或成本欄位不完整：只允許 bounded experiment，不得升 production/default。

## 19. 遷移策略

1. 先量 baseline，不先切換 canonical path。
2. Phase 1 用 shadow mode 與舊 close 路徑並跑真卡，比對 payload、ledger、events、evidence 與 commit trailer。
3. Parity 與 crash matrix 全綠後才切換 canonical close。
4. 舊 path 保留短期 feature flag 回退，但不得產生兩套同時可寫 canonical state 的路徑。
5. Receipt reuse、Team、Batch 依序切換，每階段都有 fail-closed fallback。

## 20. 完成定義

本計畫不是「所有 phase 都有程式」就完成，而是同時達成：

- 正常 close 不再依賴 `repair-closure`。
- 兩位 Captain 共存不需人工 index 操作，也不互相吸入檔案。
- crash 後可由 commit truth 自動收斂。
- 必要驗證可解釋、receipt 可重用、canary 可定位漏映射。
- Team 真實配對樣本達到 production/default 的 fully-loaded cost、時間與品質門檻；雙 50% 作突破目標，不達標時會縮編並持續留下可操作的最佳化原因。
- 一般 ATM 的實際貨幣成本與時間不高於無 ATM 的 10%，穩態落在 5% 內；token 數保留為診斷而非跨模型價格替身。
- 所有成本結論可追到 provider usage、canonical 定價 catalog 或實際帳單／點數 receipt；訂閱 Agent Bot 不被錯算為零成本。
- 所有新 atom、map、script 與支援模組遵守可設定的 600 行上限。

在量測尚未完成前，這些數字必須標示為 `measurement-incomplete`，不得以設計意圖冒充已達成結果。

### 20.1 2026-07-15 acceptance sync

- Framework-side focused recheck passed: pre-team-foundation-gate, commit-bundle-assembly, taskflow-close-crash-matrix, team-shadow-workspace, team-agents-dogfood, governance-cost-bench, broker-registry-transaction, validation-receipt-reuse, and rft-atomization-rollout.
- Worktree cleanliness plus ATM residue/audit/doctor checks remain required before and after closeout commits. If later real Team promotion samples are incomplete, record the gap in backlog and do not treat measurement-incomplete as production/default success.

### 20.2 2026-07-15 follow-up: team.ts atomization

- New follow-up card: `TASK-RFT-0029` owns the remaining oversized `packages/cli/src/commands/team.ts` surface.
- Design pattern: Strangler Facade + Command Handler Registry + Policy/Receipt modules. This keeps the CLI behavior stable while extracting one bounded command or policy atom at a time.
- Target: reduce `team.ts` and every new Team command support module to 600 lines or fewer, with a dedicated line-budget regression.
- This is atomization work only; Team production/default promotion still requires real paired cost/time/quality evidence.
## 2026-07-15 follow-up: >2000-line giant module split wave

After TASK-RFT-0029 established the Team command strangler facade, the next governance wave targets every non-release source file that still exceeds 2,000 lines in `AI-Atomic-Framework`.

Queue order:

1. `TASK-RFT-0030` - extract `packages/cli/src/commands/team-legacy.ts` command paths.
2. `TASK-RFT-0031` - extract `packages/cli/src/commands/next.ts` route resolution.
3. `TASK-RFT-0032` - extract `packages/cli/src/commands/git-governance.ts` commit and push guards.
4. `TASK-RFT-0033` - extract `packages/cli/src/commands/tasks/legacy-impl.ts` command modules.
5. `TASK-RFT-0034` - split `packages/cli/src/commands/framework-development/closure-packet-schema.ts`.
6. `TASK-RFT-0035` - split `scripts/validators/task-ledger/suite-impl.ts`.
7. `TASK-RFT-0036` - split `packages/cli/src/commands/evidence/bundle-io.ts`.
8. `TASK-RFT-0037` - split `packages/cli/src/commands/hook/pre-commit.ts`.

Each task must be imported, claimed, validated, closed, committed, and pushed independently. During implementation, workflow friction and high-return governance improvements should be routed through the ATM bug and optimization backlog before any opportunistic fix is made.
