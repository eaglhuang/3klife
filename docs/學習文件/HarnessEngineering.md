<!-- doc_id: doc_other_0023 -->
# Harness Engineering 中文學習版與 3KProject 參考手冊

> 來源文章：Birgitta Böckeler, 「Harness engineering for coding agent users」, Martin Fowler 網站, 2026-04-02。
> 本文件是中文學習版、教學整理與 3KProject 對照手冊，不是原文逐字翻譯，也不取代原文閱讀。需要引用原作者論述時，請連回原文。

---

## 0. 一句話總結

Harness Engineering 是把「模型以外的一切控制系統」工程化：在 Coding Agent 動手前，用 guides 降低它走歪的機率；在它動手後，用 sensors 讓它自己修正；在人類介入時，把注意力放到最需要判斷、取捨與組織記憶的地方。

對 3KProject 來說，Harness Engineering 不是一個抽象名詞，而是一套可落地的日常工作法：`keep.summary`、硬規則入口、任務卡、task lock、compute gate、encoding guard、context budget、handoff 摘要卡、UI contract validation、runtime smoke check，這些全部都是外部 Harness 的一部分。

---

## 1. 原文脈絡與閱讀方式

原文討論的問題是：Coding Agent 能產生大量程式碼，但我們怎麼建立足夠信任，讓它在更少人工監督下仍能交付可靠結果？

它提出的核心心智模型是：

- `Agent = Model + Harness`。
- Coding Agent 自身已有內建 Harness，例如 system prompt、檢索機制、編排流程。
- 使用者仍需要為自己的 codebase 建立 outer harness。
- 好的 outer harness 不是單純加提示詞，而是 guides、sensors、自我修正 loop 與人類 steering 的組合。

讀這篇文章時，不要把 Harness 理解成單一工具。它更像是一整套工程控制系統。就像 Unity 專案裡，單一 Component 再強，也仍需要 Scene lifecycle、Prefab contract、Editor tooling、CI、測試與人工審查共同維持品質。

---

## 2. Harness 的三層上下文

原文提醒我們，Harness 這個詞太寬，所以要先界定 bounded context。

| 層級 | 說明 | 3KProject 對照 |
|---|---|---|
| Model | 模型本體，例如 LLM 的推理與生成能力 | Copilot / Claude / 其他模型能力 |
| Builder Harness | Agent 產品內建的 system prompt、檢索、工具調度 | IDE Agent、Claude Code、Copilot Chat 的內建行為 |
| User Harness | 使用者為特定專案建立的外部韁繩 | `AGENTS.md`、`.github/instructions/`、任務卡、compute gate、UI 驗證器 |

3KProject 能真正掌控的是第三層：User Harness。這一層不是要求模型變聰明，而是讓模型進入一個比較不容易出錯、出錯後比較容易被拉回來的環境。

---

## 3. 第一條主軸：Feedforward 與 Feedback

Harness 的第一個拆法是時間點。

| 類型 | 中文 | 發生時機 | 目的 | 例子 |
|---|---|---|---|---|
| Guides | 前饋引導 | Agent 動手前 | 提高第一次就做對的機率 | instructions、rules、how-to、task card、architecture docs |
| Sensors | 回饋感測 | Agent 動手後 | 觀測結果並幫助自我修正 | tests、linters、type checks、logs、browser smoke、AI review |

只有 guides 沒有 sensors，Agent 會知道規則，但不知道自己有沒有遵守。只有 sensors 沒有 guides，Agent 會一直撞牆再修。好的 Harness 要兩者都有。

3KProject 的對照：

- Guides：`docs/keep.summary.md`、`AGENTS.md`、`.github/copilot-instructions.md`、skills、任務卡、UI spec、模組邊界規則。
- Sensors：`compute-gate.js`、`check-encoding-touched.js`、`validate-ui-specs.js`、runtime smoke、browser QA、Cocos log reader。
- Loop：失敗訊息要能直接回灌給 Agent，變成下一輪 prompt 的一部分。

---

## 4. 第二條主軸：Computational 與 Inferential

Harness 的第二個拆法是執行方式。

| 類型 | 中文 | 特性 | 適合用途 | 風險 |
|---|---|---|---|---|
| Computational | 計算型 | 快、便宜、確定性高、CPU 可跑 | type check、schema validation、lint、structural tests、encoding check | 只能攔可形式化的問題 |
| Inferential | 推論型 | 能處理語意、較慢、較貴、非確定性 | AI code review、語意差異判讀、架構審查、需求理解 | 不適合當每次變更必跑的唯一品質來源 |

最重要的原則：能用計算型方式判定的事，就不要交給 LLM 猜。

3KProject 的日常排序應該是：

1. 先跑便宜且確定的 computational sensors。
2. 再把失敗訊息回灌給 Agent 自修。
3. 對語意模糊或架構取捨問題，再請強模型或人類介入。
4. 不要把所有品質判斷都包成「請你 review 一下」。

---

## 5. Steering Loop：人類不是被移除，而是負責調校 Harness

原文強調，人類的工作不是每一行都手動檢查，而是持續改善 Harness。每當某種錯誤重複出現，人類就要問：

- 這是 guide 不夠清楚嗎？
- 這是 sensor 不夠早、不夠便宜、不夠精準嗎？
- 這個失敗能否改成自動檢查？
- 這個錯誤訊息能否寫得更適合 Agent 讀？
- 這個規則是否應該搬到更前面的入口？

3KProject 的例子：`task-lock` 一開始若只存在於深層文件，就會被 Agent 跳過。正確修補不是抱怨 Agent 沒讀文件，而是把硬規則搬到 Copilot、Codex、Claude Code、Antigravity 都會讀到的入口，並在 `keep.summary` 中保留可執行指令。

---

## 6. Timing：把品質往左移

原文借用了持續整合與持續交付的經驗：越早發現問題，修正越便宜。Harness 的 feedback sensors 應該依照成本與重要性分佈在生命週期中。

| 時間點 | 適合放什麼 | 3KProject 對照 |
|---|---|---|
| 動手前 | guides、task card、architecture docs、hard rules | `keep.summary`、task card、entry hard rules |
| 修改中 | 快速 computational sensors | TS syntax、encoding、lint-like rules、局部 UI spec check |
| commit 前 | 更完整的 deterministic gate | standard compute gate、encoding touched、contract validation |
| integration 後 | 昂貴檢查與更大範圍 review | browser QA、screenshot regression、AI architecture review |
| 持續監控 | 漂移偵測與 runtime signal | dead code scan、coverage quality、log anomaly、SLO trend |

原則不是「所有檢查都每次跑」，而是「便宜的放越左越好，昂貴的放在更稀疏但關鍵的節點」。

---

## 7. 三大治理類別

### 7.1 Maintainability Harness

維護性 Harness 管的是內部品質：重複碼、複雜度、測試覆蓋、型別健康、命名一致性、死碼、過度工程化。

3KProject 可對應：

- `check-encoding-touched.js`
- `check-eslint-rules.js`
- `compute-gate.js --profile quick`
- dead code / deprecated refs 掃描
- task card notes 格式檢查

### 7.2 Architecture Fitness Harness

架構適配 Harness 管的是系統形狀：模組邊界、依賴方向、效能基線、可觀測性、API 品質、資料契約。

3KProject 可對應：

- `check-import-boundaries.js`
- Interface-first Bridge 規則
- `shared/interfaces/` 作為跨模組契約
- `validate-ui-specs.js --strict`
- runtime state registry 檢查

### 7.3 Behaviour Harness

行為 Harness 管的是功能是否真的符合需求。這也是最難的一類，因為 AI 生成的測試通過，不代表功能真的對。

3KProject 可對應：

- Approved fixtures
- browser smoke
- Cocos preview QA
- screenshot regression
- 人類驗收與核心流程手測
- 可回放 runtime profile 或 battle fixture

---

## 8. Harnessability：可韁繩性

不是每個 codebase 都同樣容易被 Harness 管住。可韁繩性高的專案通常有：

- 強型別或清楚 schema。
- 明確模組邊界。
- 可重跑的測試與 fixture。
- 清楚的任務卡與輸入/輸出契約。
- 穩定的專案拓撲。
- 良好的工具入口與腳本。

3KProject 應該持續提升可韁繩性：新增功能時，同步補 spec、fixture、validation command、task card、handoff 格式，而不是等功能完成後才補文件。

---

## 9. Ambient Affordances：讓環境本身更適合 Agent

原文提到的 ambient affordances，可以理解為「環境本身提供給 Agent 的可讀性、可導航性、可操作性」。

3KProject 的 ambient affordances 包含：

- 清楚的資料夾邊界：`assets/`、`docs/`、`tools_node/`、`server/`。
- doc-id registry 讓文件可定位。
- task card 讓工作可追蹤。
- `keep.summary` 降低入場成本。
- skills 把常見流程包成可重複工作法。
- validation scripts 讓錯誤訊號可回灌。

這些不是裝飾，而是讓 Agent 不必猜路的地圖。

---

## 10. Harness Templates 與 Ashby 定律

原文提出，企業常見服務拓撲未來可能演化成 Harness templates：每種拓撲都有一組 guides + sensors。

Ashby 定律提醒我們：控制系統要有足夠 variety 才能管住被控制系統。反過來說，如果我們能把專案拓撲收斂，Harness 就比較容易完整。

3KProject 可採用的模板化方向：

| 模板 | 內建 Guides | 內建 Sensors |
|---|---|---|
| 新 UI Screen | UI spec scaffold、component sizing table、skin family rules | `validate-ui-specs`、browser QA、screenshot regression |
| 新資料管線 | source-grounded rule、artifact contract、review loop | schema validation、progress report、runtime export smoke |
| 新 battle module | interface-first bridge、fixture policy | import boundary、battle smoke、approved fixtures |
| 新 Agent task | task card template、lock rule、handoff template | compute gate、encoding touched、turn usage report |

---

## 11. 人類在 AI 協作中的角色

原文最重要的提醒之一：Harness 不應該以完全排除人類為目標。好的 Harness 是把人類注意力導向最有價值的位置。

人類仍然要負責：

- 定義什麼叫「好」。
- 判斷哪些技術債是可接受的業務取捨。
- 決定哪些規則是 load-bearing，哪些只是習慣。
- 保留組織記憶與產品方向。
- 對語意模糊、架構取捨、風格品味做最後裁決。
- 持續把重複錯誤轉成 guides 或 sensors。

Agent 沒有社會責任感，不知道 commit 上掛的是誰的名字，也不會自然理解團隊文化。Harness 是把人類的隱性經驗外顯化，但它不能完全取代人類判斷。

3KProject 的分工應該是：

- Agent：執行局部任務、生成草案、修正 deterministic error、整理文件。
- 工具：負責確定性檢查與可重跑驗證。
- 人類：負責目標、價值、風險、取捨、例外批准、最終接受標準。

---

## 12. 3KProject 的 Harness 聖經原則

### 原則 1：硬規則要放在必經入口

如果某條規則是 P0，就不能只藏在深層文件。它必須出現在 Agent 第一眼會看到的入口：`AGENTS.md`、`CLAUDE.md`、`.github/copilot-instructions.md`、共享 collaboration instructions、`keep.summary`。

### 原則 2：能計算就不要交給模型猜

型別、schema、命名、模組邊界、encoding、JSON 結構、fixture 對比，都應該優先工具化。

### 原則 3：錯誤訊息也是 prompt

好的 sensor 不只說 fail，還要讓 Agent 看懂：哪個檔案、哪個規則、為什麼錯、下一步怎麼修。

### 原則 4：Handoff 要縮小下一輪上下文

交接不是把所有背景塞給下一位，而是告訴下一位該看哪 1 到 3 個檔案，哪些結論已定，哪些背景不要重讀。

### 原則 5：人類不要做機器擅長的事

人類不應該反覆手動檢查格式、schema 或低階錯誤。人類應該把注意力放在語意、價值、取捨與產品方向。

### 原則 6：每次重複錯誤都是補 Harness 的訊號

同一類錯誤出現第二次，就應該問：要補 guide、補 sensor、補 fixture、還是補入口硬規則？

---

## 13. 日常檢查清單

### 開工前

- [ ] 讀 `docs/keep.summary.md`。
- [ ] 確認是否是任務卡工作；若是，先 `task-lock.js check` + `lock`。
- [ ] 確認本輪只讀必要檔案。
- [ ] 確認是否需要 context budget guard。
- [ ] 確認本輪的 validation command。

### 工作中

- [ ] 一次只改當前 slice。
- [ ] 修改後先跑最便宜的 deterministic check。
- [ ] 遇到失敗先修根因，不先刪功能或降級。
- [ ] 若規則不足，記錄要補 guide 還是 sensor。

### 收工前

- [ ] 跑 encoding touched。
- [ ] 跑對應 validation。
- [ ] 寫 changedFiles / decisions / blockers / nextAction。
- [ ] 若有鎖卡，解鎖或明確寫 blocker。
- [ ] 若新增文件，確認 doc_id 與索引。

---

## 14. 給 3KProject 的落地模板

```text
Task: <task-id>
Goal: <一句話目標>
Read:
- <必要檔案 1>
- <必要檔案 2>
- <必要檔案 3>
Guides:
- <本輪必守規則>
Sensors:
- <本輪要跑的驗證命令>
Known:
- <已知結論 1>
- <已知結論 2>
Need:
- <下一步 1>
Avoid:
- <不要重讀或不要碰的範圍>
Human decision needed:
- <需要人類裁決的語意/產品/風險問題，若無則寫 none>
```

---

## 15. 結論

Harness Engineering 的重點不是把 AI Agent 管死，而是替它建一個可導航、可驗證、可修正的工作環境。對 3KProject 來說，這套方法已經不是外部文章裡的概念，而是正在變成專案本身的操作系統。

最後的判斷準則是：如果一件事能被明確規則、資料契約、工具腳本或 fixture 捕捉，就應該被寫進 Harness；如果一件事需要價值判斷、取捨、品味或組織記憶，就應該保留給人類。