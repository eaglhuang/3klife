<!-- doc_id: doc_other_1328 -->

# ATM 測試缺口矩陣與未來優化計畫書

## Purpose

這份文件整理 ATM 目前已經覆蓋的測試與治理能力、仍然存在的測試盲區，以及未來應補上的 validator 或 test 類型。

核心判斷很簡單：ATM 不應該宣稱自己憑空保證所有語意正確；ATM 應該把原子的健康檢查變成可重複、可外掛、可留下 evidence 的治理流程。

## Current Position

ATM 目前已經覆蓋一批重要基礎：

- 任務路由、scope、lock、evidence、closure 的治理流程。
- atomic spec 與 task/evidence schema 的結構檢查。
- `execution.validation.commands` 的委派式 validator 執行。
- atom map 的 legacy/map equivalence fixture。
- edge contract、fingerprint、propagation 相關檢查入口。
- validator profile、doctor、CI 層級的遠端檢查。

但這些還不是完整測試系統。它們能降低 AI 修改風險，尤其適合小而明確的 atom；可是對副作用、consumer 語意、狀態競態、外部依賴、效能退化等問題，仍需要專門 test runner 或 host project 自己提供 fixture。

2026-06-29 補充：`TASK-AAO-0048` 與 `TASK-AAO-0049` 已把 TestRunnerPlugin 與 default atom health gates 推進到可用基礎，但後續不能讓 `validators`、`atm test`、語言 adapter static checks 各自形成平行路線。下一步應建立統一 `test catalog` 作為測試選擇單一來源，將測試能力分成 `validators` 與 `integration-tests`，兩者都使用 `quick / standard / full` 量級，由任務卡、修改範圍、語言 adapter、project plugin 與 evidence freshness 決定要跑哪一組。

## Eval Loop Direction

Evaluation and Optimization Loops 對 ATM 有明確幫助，但正確定位不是把 ATM 變成完整的 LLMOps、prompt optimizer 或模型評估平台。

ATM 應該吸收的是「可重放、可比較、可留下 evidence 的評估迴圈」：讓每次 AI 修改原子代碼後，不只留下傳統 validator 結果，也能留下語意品質、成本、延遲、資料集版本、評分器版本與人類回饋的結構化證據。這會讓 ATM 從「只證明流程沒有繞過」前進到「可追蹤 atom 產出品質是否變好或退步」。

這個方向應維持三個邊界：

- ATM core 定義 evidence contract、plugin hook、report schema 與 governance gates，不內建單一 vendor 的 observability 平台。
- LLM-as-judge 可作為 advisory 或 gated evaluator，但必須記錄 judge prompt/model/version、rubric、dataset version 與 human calibration evidence，不能直接當成無條件真相。
- 任何 production trace 或使用者回饋進入測試資料集前，必須有隱私、授權、去識別化與取樣規則；ATM 只記錄可審計 evidence，不鼓勵把原始敏感資料塞進 closure packet。

最適合 ATM 的第一個 Eval Loop 不是泛用 dashboard，而是 cross-agent review signature：當第一個 AI Agent 產生或修改 atom 後，由第二個、第三個不同來源的 AI Agent 以只讀 reviewer 身分檢查 atom spec、diff、測試 evidence、scope、consumer contract 與 rollback 風險，並留下可審計簽章。這等同於把 pair programming / peer review 放進 ATM evidence chain。

若 repo 同時具備多種可識別 AI Agent 或模型來源，ATM 可以支援 progressive signatures：

- single signature：一位獨立 reviewer 對 atom closure 做 advisory 或 blocking review。
- dual signature：兩位不同來源 reviewer 交叉檢查，適合高風險 atom 或 shared surface。
- quorum signature：三位以上 reviewer 依 policy 要求 `2-of-3` 或 Captain/human tie-break，適合核心治理、release、security 或 sandbox 相關 atom。
- early review：author agent 開始產生 patch 後，reviewer 可在 diff 草稿、測試結果或 closure 前先提出 warning，讓 author 在收尾前修正，而不是等到最後才退回。

## Testing Gap Matrix

| 測試面向 | ATM 已覆蓋 | 還沒覆蓋 / 盲區 | 建議補的 validator or test | 對應任務 |
|---|---|---|---|---|
| Governance route / scope | `atm next`、lock、scope evidence、closure authority | 編輯器或人工繞過 ATM 時仍可能直接改檔 | editor hook、pre-commit、CI required validator | Existing AAO governance tasks |
| Atomic spec structure | atomic spec schema、task/evidence schema、validator profile | 目前較偏結構欄位，不等於完整 payload 語意 schema | payload schema contract validator | Future AAO |
| Test selection governance | `validators`、`atm test`、language adapter static checks 都已有局部入口 | 缺少單一 catalog 管理 capability、family、tier、scope、dedupe key，導致 standard/full 容易累積成上百支重覆測試 | unified test catalog + task-scoped selector + dedupe/performance report | New AAO after `TASK-AAO-0048`/`TASK-AAO-0049` |
| Language static checks | JS/TS、Python、C# adapter 可宣告 fast/default/all static check | 尚未納入統一測試選擇；最後關頭可能被 typecheck/lint 擋下，且容易與前面局部檢查重跑 | map fast/default/all static checks to validator quick/standard/full with evidence freshness | New AAO after test catalog |
| Delegated validation commands | `execution.validation.commands` 可執行 host validator | 沒有正式 `TestRunnerPlugin` 介面，host test 整合不夠標準化 | `TestRunnerPlugin` SDK + plugin report schema | TASK-AAO-0048 |
| Map equivalence | legacy/map fixture 可比對輸出等價 | fixture 不完整時仍會漏；副作用不一定被比較 | equivalence coverage scorer + side-effect fixture | TASK-AAO-0049 / Future AAO |
| Edge contracts | 有 edge contract 入口與 map 測試參數 | 邊界案例需要人工維護，缺少覆蓋率衡量 | edge fixture coverage validator、boundary/property tests | Future AAO |
| Input immutability | atom spec 可描述 mutation policy 類資訊 | 尚未穩定自動檢查「輸入被偷改」 | input snapshot / deep clone immutability gate | TASK-AAO-0049 |
| Side effects | evidence 可記錄 artifacts、commands、結果 | 檔案、事件、DB、cache、network 等副作用未必可比較 | fake adapter / sandbox side-effect assertion | TASK-AAO-0049 |
| Consumer contract | atom map 與 propagation 可描述上下游關係 | caller 真正期待的錯誤碼、null 語意、排序、相容性不一定在 schema 裡 | consumer contract fixtures / golden examples | TASK-AAO-0049 |
| Performance regression | 可透過 host command 委派測試 | 沒有預設 baseline、threshold、趨勢比較 | performance budget validator | Future AAO |
| Concurrency / retry / idempotency | 目前主要靠 host tests | 競態、重試、重入、重複提交風險不易由 schema 看出 | scenario runner、idempotency fixtures | Future AAO |
| Time / random / external state | 可由 host validator 自行控制 | 不固定時間、亂數、外部服務狀態會造成測試不穩 | deterministic harness adapters | Future AAO |
| Known divergences | equivalence 可接受已知差異 | waiver 或 known divergence 若不老化，可能變成永久漏洞 | divergence aging / review gate | Future AAO |
| Observability contract | evidence 有基本 command/report | log、metric、trace 是否符合運維需求不一定被驗證 | observability contract fixtures | Future AAO |
| Cross-agent review signature | task/evidence 可記錄人類或代理回報 | 不同 AI Agent 對同一 atom 的獨立 review、簽章、反對理由與 quorum policy 尚未是一等 evidence | cross-agent review signature schema + reviewer independence policy | Future AAO after `TASK-AAO-0048`/`TASK-AAO-0049` |
| Early review feedback | AI 目前多在完成後才跑 validator / closure | 第二 reviewer 無法在 author 還在寫時提早對 diff、scope drift、missing tests 發出 warning | draft diff review channel + advisory warning report | Future AAO |
| Eval loop evidence | evidence 可記錄 validator 與 command 結果 | AI 產出品質、token 成本、latency、dataset version、evaluator version 尚未是一等 evidence | eval loop report schema + experiment/evaluator evidence adapter | Future AAO after `TASK-AAO-0048`/`TASK-AAO-0049` |
| Feedback-to-fixture loop | task / evidence / handoff 可保存人類回報 | 失敗案例、使用者回饋、review annotation 尚未自動沉澱成 replayable fixtures | trace feedback import + redaction + fixture promotion workflow | Future AAO |
| Evaluator governance | 可透過 host validator 委派外部評估 | LLM-as-judge 會有 criteria drift、judge drift 與人類偏好不一致問題 | judge calibration gate + rubric versioning + human label alignment report | Future AAO |

## Recommended Roadmap

### Phase 1 — Formalize Extension Point

先完成 `TASK-AAO-0048`，開放正式 `TestRunnerPlugin` 介面。ATM core 不需要一次內建所有測試框架，但要先讓 adopter repository 可以把自己的 unit test、integration test、golden test、domain validator 接進同一個 evidence 模型。

### Phase 2 — Add Default Atom Health Gates

接著完成 `TASK-AAO-0049`，把三種高價值通用檢查放進 ATM 的基本測試詞彙：

- input immutability check
- side-effect check
- consumer contract fixtures

建議作法是「預設可用，但依 atom 類型與 policy 啟用」，不要第一天就強制所有 atom 都跑。

### Phase 2.5 — Unify Test Selection Catalog

在 `TASK-AAO-0048` 與 `TASK-AAO-0049` 之後，先補一個測試治理銜接層，避免 validator catalog、integration test runner、語言 adapter static checks 變成三套路線。

此階段目標不是新增更多 profile，而是建立單一 `test catalog`，讓 ATM 能依任務卡與修改範圍選出必要測試：

- `capability=validator`：schema、contract、governance、language-static、release trust、adapter parity 等檢查。
- `capability=integration-test`：atom/spec runtime、map integration、propagation、edge contract、frontend/domain、host plugin tests。
- `tier=quick/standard/full`：ATM 對外唯一量級語言；語言 adapter 內部的 `fast/default/allStaticCheck` 對映到這三個 tier。
- `scope=task-local/global-advisory/release-blocking/diagnostic`：收編現有 taxonomy，不再在 `validate.ts` 另維護硬編 gate 清單。
- `dedupeKeys`：避免同一語言 static check、同一 adapter parity、同一 integration fixture 在 closeout 前被重覆執行。
- `costBudgetMs` 與 performance report：慢項輸出 `optimizationCandidates` 與 backlog hint，預設不阻擋，除非 entry 明確標為 blocking performance gate。

Candidate task seeds:

| Candidate task seed | Depends | Goal | Target surface |
|---|---|---|---|
| Unified test catalog and selector | `TASK-AAO-0048`, `TASK-AAO-0049` | 建立 catalog entry schema，統一管理 `key/family/capability/tier/scope/dedupeKeys/costBudgetMs`，讓 validators 與 integration-tests 從同一資料源選取 | `scripts/test-catalog.config.json`、`scripts/lib/test-catalog.ts`、`scripts/run-validators.ts` |
| Task testPlan contract | Unified test catalog and selector | 在 task card / ledger 中保留 `testPlan.validators` 與 `testPlan.integrationTests`，並向後相容既有 `validators` 欄位 | `packages/cli/src/commands/tasks.ts`、`packages/cli/src/commands/next.ts`、task card templates |
| Language static catalog bridge | Unified test catalog and selector | 將 JS/TS、Python、C# adapter 的 `fast/default/allStaticCheck` 投影成 `language-static` validator entries，支援缺工具時回報 diagnostic/not_applicable | language adapter packages、`packages/cli/src/commands/validate.ts`、`scripts/validate-language-static-check-contract.ts` |
| Evidence-driven test execution | Task testPlan contract | 讓 `evidence run --capability validator|integration-test --tier quick|standard|full` 與 `taskflow close --auto-evidence` 使用同一 selector，避免 closeout 階段臨時猜 validator | `packages/cli/src/commands/evidence.ts`、`packages/cli/src/commands/taskflow.ts` |
| Test performance and duplicate detector | Unified test catalog and selector | 每次 catalog-based run 輸出 slowestEntries、budgetViolations、familyHotspots、duplicateDedupeKeys、optimizationCandidates | `scripts/run-validators.ts`、`packages/core/src/manager/test-runner.ts`、governance backlog |

### Phase 3 — Improve Coverage Intelligence

後續再補覆蓋率與高階行為測試：

- equivalence fixture coverage scorer
- edge fixture coverage scorer
- property-based boundary tests
- catalog-based performance budget validator
- concurrency / idempotency scenario runner
- known divergence aging gate

### Phase 4 — Add Eval Loop Evidence

在 `TASK-AAO-0048` 與 `TASK-AAO-0049` 之後，再把 LLM Evaluation / Observability 的成熟做法接成 ATM 的 evidence 擴充層。

這一階段不應該要求 ATM core 內建所有評估工具，而是讓 adopter repository 可以把 Braintrust、Ragas、LangSmith、Phoenix、OpenAI Evals、custom judge 或本地 deterministic scorer 的結果轉成一致的 ATM report。

優先順序建議如下：

| Candidate task seed | Depends | Goal | Target surface |
|---|---|---|---|
| Cross-agent review signature contract | `TASK-AAO-0048`, `TASK-AAO-0049` | 定義 author/reviewer agent identity、model/source、reviewed diff hash、rubric、verdict、blocking/advisory outcome 與 signedAt | `schemas/test-report.schema.json`、`schemas/governance/closure-packet.schema.json`、`packages/cli/src/commands/test.ts` |
| Multi-signature quorum policy | Cross-agent review signature contract | 讓 repo policy 可要求 single/dual/quorum signatures，並支援 reviewer disagreement 交由 Captain 或 human review 裁決 | `schemas/governance/closure-packet.schema.json`、`packages/cli/src/commands/evidence.ts`、`docs/ADAPTER_GUIDE.md` |
| Early cross-agent review channel | Cross-agent review signature contract | 讓 reviewer 在 author patch 完成前以只讀方式檢查 draft diff、scope drift、missing tests 與 rollback 風險並留下 warning evidence | `packages/cli/src/commands/test.ts`、`packages/cli/src/commands/evidence.ts`、`scripts/validate-test-runner.ts` |
| Eval loop report evidence contract | `TASK-AAO-0048`, `TASK-AAO-0049` | 定義 eval score、cost、latency、dataset version、evaluator version、judge metadata 與 advisory/blocking outcome 的 report schema | `schemas/test-report.schema.json`、`schemas/governance/closure-packet.schema.json`、`packages/core/src/manager/test-runner.ts` |
| Trace feedback to fixture promotion | Eval loop report evidence contract | 將 failure trace、human review、production feedback 經 redaction 後轉成 replayable fixture seed | `packages/cli/src/commands/evidence.ts`、`packages/cli/src/commands/test.ts`、`docs/ADAPTER_GUIDE.md` |
| LLM judge calibration governance | Eval loop report evidence contract | 要求 LLM-as-judge 記錄 rubric、judge model、prompt version、sample human labels 與 criteria drift 風險 | `schemas/test-report.schema.json`、`docs/ADAPTER_GUIDE.md`、`scripts/validate-test-runner.ts` |
| Cost-quality regression budget | Eval loop report evidence contract | 讓 token、latency、cost 與 quality score 可設定 threshold，避免品質提升以不可接受成本換來 | `packages/core/src/test-runner/**`、`packages/cli/src/commands/test.ts`、`scripts/validate-test-runner.ts` |
| Optional observability adapter bridge | Eval loop report evidence contract | 提供 OpenTelemetry/OpenInference-style trace metadata 匯入/匯出，但保持 vendor-neutral | `packages/plugin-sdk/src/test-runner.ts`、`docs/ADAPTER_GUIDE.md` |

## Default Basic Test Recommendation

副作用檢查、input 不可變檢查、consumer contract fixtures 都值得進入 ATM 的基本測試能力，但不應該一開始就全域強制。

建議策略：

| Atom 類型 | 預設建議 |
|---|---|
| Pure transform atom | 啟用 input immutability、schema/equivalence、edge fixtures |
| I/O atom | 啟用 side-effect fixtures、error contract、rollback expectation |
| Public output atom | 啟用 consumer contract fixtures、golden examples |
| Atom map / orchestration atom | 啟用 equivalence、propagation、consumer contract、side-effect summary |
| Experimental atom | 可先 advisory，不阻擋 merge，但必須留下 evidence |

## Product Message

ATM 的真正價值不是「它不用測試就能保證一切正確」。

ATM 的價值是：它把 AI 修改後最容易漏掉的驗證點拆成小而明確的 gates，讓每個 atom 都能留下可檢查、可重跑、可外掛的健康證據。

延伸到 Eval Loop 後，ATM 的價值也不是「自動判斷所有 AI 產出都高品質」。更精準的說法是：ATM 讓品質評估本身變成治理證據，讓團隊能看見某次 atom 修改在 correctness、consumer contract、side effect、latency、token cost 與 human feedback 上是改善、退步，還是尚無足夠證據。

Cross-agent review signature 是這個方向中最貼近 ATM 的監督者模型：一個 AI 產生 atom，另一個 AI 簽認或提出異議；高風險 atom 可以要求第二、第三簽章。簽章不是取代測試，而是把獨立審查、盲點突破與 disagreement resolution 變成 closure 前可重放的治理證據。
