[![Robert C. Martin (Uncle Bob) - IT-KONEKT](https://images.openai.com/static-rsc-4/1W2t1feM3x6pEk5hmFSERFEjW8px3ovMYkHu7CApplyasdue4f-YC1hAqH7BfmD8SBf_FPtMjQJeUfn5U5dXYhu7J_Yo2WMy46KJPU2IzqdS3ekBO5lAJ7Zqp-ujteV1RqjEDXtYvubRAZXWosairXOQm8XCTivDeIxonDLn3gY?purpose=inline)](https://itkonekt.com/2018/12/17/robert-c-martin-uncle-bob/?utm_source=chatgpt.com)

# Uncle Bob 在 AI 時代真正提出的是什麼？

Uncle Bob（Robert C. Martin）近期的核心主張，不是單純的「AI 寫程式，人類不用看」，而是：

> **把人類從逐行檢查程式碼，提升到設計規格、架構約束、測試預言機與品質准入門檻。**

2026 年 4 月，他表示自己不再逐行審查 Agent 產生的程式碼，而是檢查測試覆蓋率、依賴結構、循環複雜度、模組大小與變異測試等指標。5 月，他進一步說明，每次 check-in 前都會執行一組工具，讓 AI 根據 coverage、CRAP、mutation testing、acceptance-test mutation 等結果持續改善程式碼。到了 7 月，他把這套做法描述為用單元測試、Gherkin、QA、品質指標及變異測試所構成的「極端約束」或品質障礙賽。([X (formerly Twitter)][1])

需要先釐清：這目前比較像是 Uncle Bob 公開分享的工程方向，而不是一份已完成、具有統一公式與官方門檻的「AI 品質標準」。其中不少細節仍要由實際團隊自行定義。

---

# 一、品質審查從「看程式碼」改成「驗證證據」

傳統 Code Review 通常是：

```text
工程師寫程式
    ↓
另一位工程師閱讀 Diff
    ↓
人工判斷是否可合併
```

Uncle Bob 所描述的 AI 工作方式更接近：

```text
人類定義需求、架構與品質規則
    ↓
Agent 產生程式碼與測試
    ↓
自動化工具執行品質障礙賽
    ↓
失敗結果回饋給 Agent 修正
    ↓
全部通過後才允許 Check-in
```

他也提到讓 Agent 建立依賴檢查工具，以 UML 方式呈現架構、逐層查看模組依賴，並找出 dependency cycle；同時必須定期清除 Agent context，並用確定性工具阻擋幻覺造成的錯誤。([X (formerly Twitter)][2])

這代表人類的工作並沒有消失，而是從：

```text
這一行程式碼寫得好不好？
```

轉移為：

```text
需求是否正確？
測試預言機是否可信？
架構邊界是否不可繞過？
品質證據是否足以接受這次修改？
```

---

# 二、Uncle Bob 提出的主要測試與品質指標

可以將他的做法拆成四層。

| 層次    | 要回答的問題               | 主要工具                                                |
| ----- | -------------------- | --------------------------------------------------- |
| 行為正確性 | 程式是否完成預期功能？          | Unit、Acceptance、Gherkin、Property Tests              |
| 測試有效性 | 測試真的能抓到錯誤嗎？          | Coverage、Mutation Testing                           |
| 程式結構  | 程式是否過度複雜、難以修改？       | Cyclomatic Complexity、CRAP、Module Size              |
| 架構完整性 | Agent 是否破壞依賴方向或模組邊界？ | Dependency Rules、Cycle Detection、Architecture Tests |

這些指標不能簡化成單一分數。100% coverage 不應抵銷一個非法依賴，良好的 CRAP 分數也不能抵銷 acceptance test 失敗。

---

## 1. Unit Test：驗證局部行為

Uncle Bob 將 Unit Test 定位為程式設計師用來確認 production code 是否符合預期的測試；Acceptance Test 則是業務端確認系統是否符合商業需求的測試。Integration/System Test 應主要驗證資料庫、網路、框架與系統邊界的連接，而不是重複測試所有商業規則。([Clean Coder Blog][3])

AI 時代的 Unit Test 應聚焦在：

* 每一個條件判斷與錯誤分支。
* 邊界值與不變量。
* 狀態轉換。
* 失敗與復原行為。
* 非法輸入的拒絕條件。

例如：

```text
Given：訂單尚未付款
When：呼叫出貨
Then：拒絕出貨，且訂單狀態不能改變
```

真正重要的不是測試數量，而是測試是否形成可信的行為預言機。

### AI 時代的特殊風險

同一個 Agent 同時寫 production code 和 unit test，可能讓兩者共享相同誤解：

```text
Agent 誤解需求
    ├─ 寫出錯誤實作
    └─ 寫出能讓錯誤實作通過的測試
```

因此重要規則或 acceptance criteria 最好來自獨立來源，例如：

* 人類撰寫的業務範例。
* 獨立 Validator Agent。
* 既有 reference implementation。
* 可數學描述的 invariant。
* Production telemetry 或歷史 golden data。

---

## 2. Acceptance Test 與 Gherkin：證明「做對了事情」

Unit Test 回答「程式是否照設計運作」，Acceptance Test 回答「這是不是業務真正需要的行為」。

Gherkin 常用：

```gherkin
Scenario: 已付款訂單才能出貨
  Given 訂單狀態為 Paid
  And 庫存數量充足
  When 系統執行出貨
  Then 訂單狀態應變為 Shipped
  And 庫存應減少一件
  And 應產生一筆不可重複的出貨紀錄
```

一個好的 Acceptance Test 至少要同時驗證：

1. 外部可觀察結果。
2. 重要狀態改變。
3. 不應發生的副作用。
4. 重複執行、失敗重試或併發時的結果。

不能只寫：

```gherkin
Then API 應回傳 200
```

因為 HTTP 200 並不能證明資料正確、交易完整或副作用只發生一次。

---

## 3. Test Coverage：告訴你「執行過哪裡」，不是「驗證了什麼」

常見 coverage 包含：

```text
Line Coverage   = 執行過的程式行數 / 可執行行數
Branch Coverage = 執行過的分支結果 / 全部分支結果
```

Uncle Bob 長期主張 coverage 應趨近完整，但也明確提醒：coverage 只能證明程式碼曾被執行，不能證明測試包含有效 assertion。把測試中的 assertion 全部刪掉，coverage 甚至可能完全不變。([Clean Coder Blog][4])

因此 AI 專案不應只設：

```text
Repository line coverage ≥ 80%
```

更好的方式是採用 **Changed-Code Coverage Ratchet**：

```text
本次新增或修改的 Line Coverage ≥ 95%
本次新增或修改的 Branch Coverage ≥ 90%
整體 Coverage 不得下降
關鍵金流、權限、資料刪除分支必須 100% 覆蓋
```

上述百分比是可採用的起始政策，不是 Uncle Bob 公布的統一門檻。

### AI 可能如何「作弊」

Agent 很容易透過以下方式提高 coverage，卻沒有增加可信度：

* 寫只有執行、沒有 assertion 的測試。
* 大量使用 `assert true`。
* 對所有輸出建立無意義 snapshot。
* Mock 掉真正需要驗證的核心行為。
* 將未測試程式碼加入 coverage exclusion。
* 刪除難以測試的分支。

因此 Coverage 配置、排除清單及最低門檻不能由 Writer Agent任意修改。

---

## 4. Mutation Testing：測試「測試是否真的有力量」

Mutation Testing 會對 production code 做小幅語義變更，例如：

```text
>  改為 >=
== 改為 !=
&& 改為 ||
移除一次方法呼叫
把 true 改成 false
把 +1 改成 -1
```

然後重新執行測試：

```text
測試失敗 → mutant 被 killed，代表測試有辨識能力
測試仍通過 → mutant survived，代表測試可能太弱
```

Uncle Bob 將 mutation testing 視為判斷測試是否真正保護程式語義的重要手段，而不只是確認程式碼被執行。([Clean Coder Blog][4])

常見計算方式為：

[
MutationScore =
\frac{Killed\ Mutants}
{Generated\ Mutants - Invalid\ Mutants - Equivalent\ Mutants}
\times 100%
]

其中最麻煩的是 **Equivalent Mutant**：程式雖被修改，但語義實際上沒有改變，因此任何測試都不可能殺死它。

### 實際工程策略

不建議每次 commit 都對整個大型系統執行完整 mutation testing，成本可能太高。較合理的分層方式是：

```text
每次 PR：
只變異 changed methods、changed branches

每日 Nightly：
變異本次迭代相關模組

Release 前：
變異付款、權限、資料完整性等關鍵模組
```

可採用的起始門檻：

```text
一般 changed code mutation score ≥ 80%
關鍵模組 ≥ 90%
關鍵分支不得存在未處理的 surviving mutant
Mutation score 不得低於既有 baseline
```

Mutation score 不應單獨使用，因為 Agent 也可能透過新增大量低價值測試殺死簡單 mutant，卻仍遺漏需求層級錯誤。

---

## 5. Cyclomatic Complexity：衡量獨立控制路徑數

McCabe Cyclomatic Complexity 是以控制流程圖為基礎的複雜度指標，常見形式為：

[
M = E - N + 2P
]

對單一連通函式，也常近似理解為：

```text
Cyclomatic Complexity ≈ 判斷節點數 + 1
```

它反映函式中線性獨立路徑的數量，亦可用來推估 basis-path testing 至少需要涵蓋多少種路徑。([IEEE Xplore][5])

例如：

```csharp
if (isPaid)
{
    if (hasStock)
    {
        Ship();
    }
}
```

至少包含：

* 未付款。
* 已付款但無庫存。
* 已付款且有庫存。

### 可落地的起始門檻

| Complexity | 建議處理        |
| ---------: | ----------- |
|       1–10 | 一般可接受       |
|      11–15 | 警告，要求說明     |
|        >15 | 阻擋新增或要求重構   |
|        >25 | 高風險 hotspot |

這些數字是治理政策範例，不是 Uncle Bob 在近期貼文中規定的官方標準。

Cyclomatic Complexity 的限制是，它只能看控制流程，不能判斷：

* 命名是否清楚。
* 需求是否正確。
* API 是否容易誤用。
* 併發語義是否安全。
* 一個低 complexity 函式是否依賴二十個外部模組。

---

## 6. CRAP：把複雜度與測試覆蓋率結合

CRAP 指標由 Alberto Savoia 提出，Uncle Bob 在近期 AI 工作流程中明確列出 CRAP analysis，但公式本身並不是 Uncle Bob 發明的。([Google Testing Blog][6])

常見公式為：

[
CRAP(m) =
comp(m)^2
\times
\left(1-\frac{cov(m)}{100}\right)^3
+
comp(m)
]

其中：

* `comp(m)`：方法的 cyclomatic complexity。
* `cov(m)`：測試覆蓋率百分比。

假設 complexity 為 10：

| Coverage | CRAP |
| -------: | ---: |
|       0% |  110 |
|      50% | 22.5 |
|      80% | 10.8 |
|     100% |   10 |

它表達了一個重要概念：

> 複雜程式不一定完全不可接受，但複雜又沒有測試保護的程式非常危險。

歷史上常以 CRAP 30 左右作為警戒線，但這來自 CRAP 指標的原始工具與實務慣例，不是 Uncle Bob 為 AI Agent 制定的官方門檻。

較合理的政策是：

```text
禁止新增 CRAP > 30 的方法
Changed methods 的 CRAP 不得惡化
既有高 CRAP hotspot 每次修改都必須改善
關鍵模組目標 CRAP < 15
```

---

## 7. Dependency Structure：防止 Agent 偷偷破壞架構

這可能是 Uncle Bob AI 品質框架中最重要、但最容易被忽略的一項。

測試全部通過，不代表架構沒有被破壞。例如 Agent 可能為了快速完成任務，讓：

```text
Domain → Database
Domain → UI Framework
Core → Infrastructure
低層模組 → 高層模組
```

因此應把架構規則寫成機器可執行的檢查：

```text
Domain 不得依賴 Infrastructure
Application 不得直接引用 UI
Core 不得引用第三方 SDK
模組依賴圖不得存在 cycle
跨模組呼叫必須經由公開介面
```

Uncle Bob 提到自己讓 Agent 建立依賴分析工具，能顯示 UML、模組關係與 dependency cycle，顯示他所說的「品質指標」不只是 coverage 百分比，也包含架構拓撲是否符合設計。([X (formerly Twitter)][2])

應追蹤的指標包括：

```text
Forbidden dependency count = 0
Dependency cycle count = 0
跨層直接引用數 = 0
新增外部依賴數
模組 fan-in / fan-out
公開 API 擴張幅度
```

這類項目應採用 hard blocker，不能使用平均分數抵銷。

---

## 8. Module Size：不是單純限制檔案行數

Uncle Bob 列出 module sizes，但沒有提供所有語言通用的數字。

在 AI 時代，Module Size 至少應包含：

* Function length。
* Class length。
* Source file length。
* Public API 數量。
* 模組依賴數。
* 單次 Diff 範圍。
* 模組內責任數量。

結合你的 `<300 lines` 原則，可以採用：

```text
一般 source file ≤ 300 LOC
單一 method ≤ 40–60 LOC
單一 PR 不得同時跨越過多架構層
超過門檻必須提出不可拆分理由
自動生成檔案另行排除，但不可人工編輯
```

真正的目的不是追求短檔案，而是限制 Agent 一次能製造的認知範圍與修改爆炸半徑。

---

# 三、Property Test 與 Torture Test 為何特別適合 AI

Uncle Bob 在 2026 年的貼文中也列出 property tests、torture tests、QA tests 等測試形式。Property-Based Testing 的經典做法是定義永遠成立的性質，再自動產生大量輸入尋找反例，而不是只撰寫幾個固定 example。([Tufts Computer Science][7])

例如金額轉換：

```text
Property：
Decode(Encode(x)) == x
```

排序：

```text
Property：
排序後元素數量不變
排序後每個元素仍然存在
連續元素必須符合 a[i] <= a[i+1]
Sort(Sort(x)) == Sort(x)
```

交易：

```text
Property：
無論重試多少次，同一個 idempotency key 只能扣款一次
```

相較於讓 Agent 自行猜測十個 example，property test 更接近不可被輕易迎合的外部約束。

Torture Test 則應涵蓋：

* 大量隨機操作序列。
* 併發與競態條件。
* 重複請求。
* 中途斷線。
* 資源不足。
* 異常重啟。
* 順序顛倒。
* 長時間執行。
* 最大與最小輸入。

---

# 四、「Acceptance Test Mutation」目前仍有語義模糊處

Uncle Bob 在貼文中列出 `acceptance test mutations`，但該貼文沒有進一步定義演算法。([X (formerly Twitter)][8])

至少可能有兩種解讀。

## 解讀 A：用 Acceptance Test 殺 Production Mutant

例如把：

```text
付款成功才可出貨
```

變異成：

```text
付款失敗也可出貨
```

然後檢查 acceptance suite 是否能發現。

可以定義：

[
AcceptanceMutationScore =
\frac{被 Acceptance Tests 殺死的業務層 Mutants}
{所有非等價業務層 Mutants}
]

這是目前最安全、最容易落地的解讀。

## 解讀 B：直接變異 Acceptance Specification

例如：

```gherkin
Then 庫存應減少 1
```

變成：

```gherkin
Then 庫存不必改變
```

或者：

* 刪除一個 `Then`。
* 將 `>` 改成 `>=`。
* 將「不得重複扣款」改成「可以重複扣款」。
* 放寬允許誤差。
* 移除錯誤情境。

再檢查其他 invariant、property model 或業務規則是否能拒絕這個變異。

這比較像「測試規格本身的變異測試」，值得研究，但不能直接斷言這就是 Uncle Bob 唯一指定的意思。實作時最好將兩種分數分開，不要混成一個 mutation score。

---

# 五、完整的 AI 品質障礙賽應該如何設計

依照 Uncle Bob 的方向，加上實務上必要的補強，可以建立以下流水線：

```text
Gate 0：規格與治理檔案保護
    ↓
Gate 1：編譯、型別、Lint、快速 Unit Tests
    ↓
Gate 2：Changed Coverage、Complexity、CRAP、Module Size
    ↓
Gate 3：Dependency Rules、Cycle Detection
    ↓
Gate 4：Acceptance、Gherkin、Contract、Property Tests
    ↓
Gate 5：Mutation、Fuzz、Concurrency、Torture Tests
    ↓
Gate 6：Security、Performance、Memory、Resilience
    ↓
Gate 7：Evidence Packet 與 Steward Closure
```

不同 Gate 應採取不同判定模式。

## Hard Blocker

任何一項失敗都不能合併：

```text
Acceptance Test failure
Forbidden dependency > 0
Dependency cycle > 0
Critical security finding > 0
Data migration verification failure
關鍵 invariant failure
治理檔案遭 Writer 修改
```

## Ratchet Metric

不一定要求一步達到完美，但不得惡化：

```text
Coverage
Mutation score
CRAP
Complexity hotspot
Module size
Test duration
Duplicated code
```

## Trend Metric

需要長期觀察：

```text
Escaped defect rate
Flaky test rate
平均 Agent 修正次數
Gate bypass 次數
Quarantine test 存放時間
Production rollback rate
```

---

# 六、建議的 AI 品質儀表板

不建議建立一個總分，例如「Quality Score = 87」。

因為總分容易出現：

```text
Coverage 很高
    +
Documentation 很完整
    +
Critical security vulnerability
    =
總分仍然及格
```

更合理的是採用不可互相抵銷的品質向量：

[
Q =
\langle
Behavior,\ TestStrength,\ Structure,\ Architecture,\ Security,\ Operations,\ Governance
\rangle
]

| 維度            | 建議指標                                                     |
| ------------- | -------------------------------------------------------- |
| Behavior      | Acceptance pass、Property pass、Invariant pass             |
| Test Strength | Branch coverage、Mutation score、Surviving mutants         |
| Structure     | CC、CRAP、Module size、Duplication                          |
| Architecture  | Forbidden edges、Cycles、API expansion                     |
| Security      | Critical/High findings、權限測試、秘密洩漏                         |
| Operations    | p95/p99 latency、Memory、Error rate、Recovery               |
| Governance    | Gate bypass、Flaky tests、Waiver age、Evidence completeness |

每個維度都有自己的最低門檻，不以平均值判定。

---

# 七、最重要的治理補強：Agent 不能控制自己的考卷

這是我認為 Uncle Bob 方向要真正落地時，必須增加的關鍵原則：

> **Writer Agent 不得同時擁有修改實作、降低門檻、刪除測試及批准結果的權限。**

至少要保護：

```text
Acceptance criteria
Golden fixtures
Quality thresholds
Coverage exclusions
Mutation exclusions
Architecture dependency rules
Security rules
Baseline files
CI workflow
Waiver records
```

否則 Agent 很容易進行「合法化失敗」：

```text
測試失敗
→ 不修 production code
→ 改測試期待值
→ 測試通過
```

正確權限模型應是：

```text
Writer：
可以修改允許範圍內的 production code

Test Generator：
可以提出測試，但不能降低既有 oracle

Validator：
執行不可修改的確定性工具

Reviewer：
檢查需求、模型、風險與 surviving evidence

Steward：
確認證據完整後才允許 close/check-in
```

---

# 八、與 ATM 多 Agent 治理框架的關係

Uncle Bob 的品質障礙賽與你的 ATM 並不是競爭關係，而是處理不同時間點。

```text
ATM Admission Gate：
這個 Agent 現在是否可以寫這個區域？

Uncle Bob Quality Gauntlet：
這次寫入產生的候選變更是否足以被接受？
```

兩者結合後：

```text
T0  Task Card / Intent / Evidence Contract
T1  ATM Pre-write Admission
T2  Agent WriteTransaction
T3  Deterministic Quality Gauntlet
T4  Independent Validation
T5  Neutral Steward Closure
T6  Commit / Merge
```

對應關係可以整理為：

| ATM 元件             | AI 品質障礙賽                          |
| ------------------ | --------------------------------- |
| Task Card          | Acceptance criteria               |
| Allowed Files      | Writer 修改邊界                       |
| Forbidden Rules    | 不可修改的測試與配置                        |
| Seven-layer Gate   | 寫入前衝突與風險判定                        |
| Evidence Contract  | Coverage、Mutation、Architecture 結果 |
| Validator Envelope | 工具版本、命令、輸出與 baseline              |
| Neutral Steward    | 最終 check-in 權限                    |

這也補足了 Uncle Bob 近期主張中較少談到的部分：**誰能修改品質規則，以及如何防止 Agent 同時控制實作與驗證。**

---

# 九、應如何正確理解「人類不用看 AI 程式碼」

最危險的解讀是：

```text
測試綠燈
= 程式一定正確
= 人類完全不必理解系統
```

更合理的解讀是：

```text
低風險、可逆、證據完整的修改
→ 可減少逐行人工審查

高風險、不可逆或預言機不可靠的修改
→ 仍需人類進行風險導向審查
```

以下領域不適合只靠一般 coverage、CRAP 與 mutation score：

* 身分驗證與授權。
* 金流與帳務。
* 資料刪除和 migration。
* 密碼學。
* 多執行緒與分散式一致性。
* 安全性與隱私。
* 不可逆的外部操作。
* 法規或人身安全相關系統。

人類不一定要閱讀每一行程式碼，但必須理解：

```text
系統承諾了什麼
哪些狀態不可發生
失敗時如何復原
驗證證據是否獨立
工具是否可能被繞過
```

---

# 結論

Uncle Bob 在 AI 時代提出的，實際上是一種**由程式碼審查轉向證據審查**的工程模式：

```text
人類負責：
意圖、需求、架構、約束、測試預言機、風險與最終否決權

AI Agent 負責：
產生程式碼、產生候選測試、根據工具結果反覆修正

確定性工具負責：
執行測試、度量結構、驗證架構、產生不可偽造的品質證據
```

其中最有價值的不是某一個 coverage 或 CRAP 數字，而是形成這個閉環：

```text
生成
→ 量測
→ 失敗
→ 自動修正
→ 再量測
→ 獨立驗證
→ 證據完整才准入
```

對 ATM 而言，最適合的定位是：

> **ATM 管理寫入前的合法性；Uncle Bob 式 Quality Gauntlet 管理寫入後、提交前的可接受性。**

兩者合併後，才會形成完整的 AI Agent 軟體治理鏈，而不是只相信「測試綠燈」或只依賴人工閱讀大量 AI 產生的程式碼。

[1]: https://x.com/unclebobmartin/status/2044114698451476492?lang=en&utm_source=chatgpt.com "Uncle Bob Martin on X"
[2]: https://x.com/unclebobmartin/status/2081338367829033169?utm_source=chatgpt.com "I had my agents built a little dependency checking tool. ..."
[3]: https://blog.cleancoder.com/uncle-bob/2017/05/05/TestDefinitions.html "Clean Coder Blog"
[4]: https://blog.cleancoder.com/uncle-bob/2016/06/10/MutationTesting.html "Clean Coder Blog"
[5]: https://ieeexplore.ieee.org/document/1702388/?utm_source=chatgpt.com "A Complexity Measure | IEEE Journals & Magazine"
[6]: https://testing.googleblog.com/2011/02/this-code-is-crap.html?utm_source=chatgpt.com "This Code is CRAP"
[7]: https://www.cs.tufts.edu/~nr/cs257/archive/john-hughes/quick.pdf?utm_source=chatgpt.com "A Lightweight Tool for Random Testing of Haskell Programs"
[8]: https://x.com/unclebobmartin/status/2056714428259700829?ref_src=twsrc%5Etfw&utm_source=chatgpt.com "@tonyaldon Before every check-in, I run a suite of tools that ..."
