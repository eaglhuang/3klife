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

## Testing Gap Matrix

| 測試面向 | ATM 已覆蓋 | 還沒覆蓋 / 盲區 | 建議補的 validator or test | 對應任務 |
|---|---|---|---|---|
| Governance route / scope | `atm next`、lock、scope evidence、closure authority | 編輯器或人工繞過 ATM 時仍可能直接改檔 | editor hook、pre-commit、CI required validator | Existing AAO governance tasks |
| Atomic spec structure | atomic spec schema、task/evidence schema、validator profile | 目前較偏結構欄位，不等於完整 payload 語意 schema | payload schema contract validator | Future AAO |
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

## Recommended Roadmap

### Phase 1 — Formalize Extension Point

先完成 `TASK-AAO-0048`，開放正式 `TestRunnerPlugin` 介面。ATM core 不需要一次內建所有測試框架，但要先讓 adopter repository 可以把自己的 unit test、integration test、golden test、domain validator 接進同一個 evidence 模型。

### Phase 2 — Add Default Atom Health Gates

接著完成 `TASK-AAO-0049`，把三種高價值通用檢查放進 ATM 的基本測試詞彙：

- input immutability check
- side-effect check
- consumer contract fixtures

建議作法是「預設可用，但依 atom 類型與 policy 啟用」，不要第一天就強制所有 atom 都跑。

### Phase 3 — Improve Coverage Intelligence

後續再補覆蓋率與高階行為測試：

- equivalence fixture coverage scorer
- edge fixture coverage scorer
- property-based boundary tests
- performance budget validator
- concurrency / idempotency scenario runner
- known divergence aging gate

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
