# Handoff — paper.v3.1 v0.2 敘事整併與投稿語氣潤稿

日期: 2026-06-25  
Repo: `C:\Users\User\3KLife`  
主檔案: `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md`  
最新安全提交: `d9885639dca93f6e5cf2beb235e8523c7e9bd903`  
提交訊息: `Revise ATM paper v3.1 for v0.2 benchmark narrative`

## 1. 這一輪已完成什麼

本輪已把論文主敘事從「偏 v0.1 smoke-only」推進為「保留 v0.1 baseline，新增 v0.2 作為 paper-facing 主結果」的正式寫法，且已提交一個安全錨點，避免後續再遇到檔案損壞時沒有可回退版本。

已完成的核心改寫如下：

1. `Abstract`
已改成明確引用 v0.1 baseline + v0.2 paper profile 的雙層證據鏈，並寫入 20 scenarios / 42 comparisons / 0 expectation failures / 0 unresolved rows / ATM-full route F1 = 1.000 / 252 policy rows / 294 ablation rows / 210 adversarial rows / 4 enforcement rows。

2. `§4`
章名已改成 `Validation, Evidence, and Benchmark Alignment`，不再把 benchmark 排除在 validation 之外，而是明確說明 AdmissionBench 是 validation evidence stack 的 benchmark-facing 展開。

3. `§5`
章名已改成 `AdmissionBench Results and Limitations`，並把這一章改寫成正式承接 §4 的結果鏈，而不是額外補充材料。

4. `§5.1`
已改成 `ATM-AdmissionBench：由 v0.1 Baseline 到 v0.2 Paper-Facing Result`，明確區分：
- v0.1 = frozen baseline substrate / audit anchor
- v0.2 = 正文採信的 main result / ablation / enforcement summary

5. `Table 18 / 19 / 20`
已加入導讀句，讓讀者知道：
- Table 18 是 baseline vs paper profile 的角色分工
- Table 19 是 v0.2 主結果摘要
- Table 20 是把結果重新投影回研究問題

6. `§5.2`
role-separated audit evidence 已保留，並清楚寫出 label-retained blind audit 邊界與 anti-leakage property。

7. `§5.3`
已從 roadmap 式語氣改成 `Results, Ablation, and Remaining Research Questions`，把 v0.2 已回答到哪裡、尚未回答到哪裡講清楚。

8. `Threats to Validity / Appendix / Reproducibility`
已補進「審稿人如何查核數據」的說法，並把 `generator-manifest.json`、`summary.json`、`paper-tables.md`、artifact hash manifest 納入可追溯敘事。

## 2. 目前檔案中的關鍵錨點

以下段落已可視為目前正文中的穩定錨點：

- `paper.v3.1.md:15`
  `Abstract（摘要）`

- `paper.v3.1.md:599`
  `## 4. Validation, Evidence, and Benchmark Alignment（驗證、證據與基準對齊）`

- `paper.v3.1.md:843`
  `## 5. AdmissionBench Results and Limitations（AdmissionBench 結果與限制）`

- `paper.v3.1.md:847`
  `### 5.1 ATM-AdmissionBench：由 v0.1 Baseline 到 v0.2 Paper-Facing Result`

- `paper.v3.1.md:1018`
  `## A.1 Evidence Artifact Map`

- `paper.v3.1.md:1247`
  supplementary archive 八類材料說明，已包含 baseline + paper-profile artifacts 的可查核敘事

## 3. 這一輪特別重要的修復紀錄

本檔曾在前面回合發生過內容損壞，因此本次交接必須保留以下背景：

1. `paper.v3.1.md` 曾被意外破壞。
2. 使用者明確禁止直接 `git restore` 回 HEAD，因為當時尚未有安全提交。
3. 已先備份損壞版至：
   `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.corrupted-backup-20260625.md`
4. 隨後從較舊但乾淨的來源恢復，再重新套用本輪改寫。
5. 現在已經有安全 commit `d9885639...`，之後若再壞掉，優先從這個提交點回看，不要再回到更早的混亂狀態。

## 4. 已驗證事項

1. 檔案目前 UTF-8 正常，沒有新的中文亂碼。
2. `npm run check:encoding:touched -- --files docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md` 已通過。
3. 提交 `d9885639dca93f6e5cf2beb235e8523c7e9bd903` 已成功落地。

## 5. 下一個對話群最值得直接接手的工作

建議下一步不要再回去碰 ATM repo cleanup，也不要再碰前面那條 benchmark repair / worktree 故障路線；本線目前最有價值的是把論文收成 ready-to-submit 狀態。

建議優先順序如下：

1. `Abstract / Conclusion` 再做一輪正式投稿語氣整修
目標不是改數字，而是讓摘要與結論更像 arXiv / conference paper 的 final prose。

2. 章首過渡句與表格導言再做一輪一致化
目前已經補了一輪，但還可以再進一步把 `§1 -> §4 -> §5 -> Appendix` 的語氣收得更像投稿稿，而不是 handoff 後多次拼接的版本。

3. 檢查全文是否仍殘留 v0.1-only 語氣
重點掃描：
- `Results`
- `Ablation`
- `Threats to Validity`
- `Reproducibility`
- `Supplementary`

4. 若要準備投稿版
可另外產出一份「reviewer cross-check guide」，把本文提到的 artifact 對照表整理成審稿人友善版本。

## 6. 明確不要做的事

1. 不要把 v0.1 全部替換掉。
正確敘事是：
- 保留 v0.1 作為 baseline / audit anchor
- 以 v0.2 作為主結果

2. 不要把 benchmark 寫成獨立於 validation 之外的新證據。
目前論文已經改成：
- `§4` = 證據面與邊界
- `§5` = benchmark-facing results / ablation / limitations

3. 不要直接覆蓋或刪掉 `paper.v3.1.corrupted-backup-20260625.md`
那份備份目前仍有調查價值。

4. 不要順手把 repo 其他髒檔一起提交。
目前 repo 仍有大量與本任務無直接關係的 modified / untracked 檔案。

## 7. 目前 repo 狀態提醒

除了 `paper.v3.1.md` 已提交外，repo 仍存在其他非本任務變更，例如：

- `.atm/catalog/registry/actors.json`
- `docs/ai_atomic_framework/CID-Conflict-Run-Log.md`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-index.json`
- `docs/ai_atomic_framework/broker-collision-evidence/broker-run-report.md`
- 多個 `arxiv-paper-v1/` 下的 LaTeX 輸出與暫存檔

因此下一位接手者若要繼續提交，請務必只 stage 明確範圍，不要使用會把整個工作樹一起捲進去的操作。

## 8. 建議接手起手式

下一個對話群建議先做這三步：

1. 先讀：
   `docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-25-paper-v3.1-v02-polish.md`

2. 再看：
   `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md`

3. 先以 `d9885639dca93f6e5cf2beb235e8523c7e9bd903` 為安全錨點，從 Abstract / Conclusion / chapter transitions 做局部潤稿，不要大範圍重構。

## 9. 一句話交棒

目前論文已從 v0.1-only 敘事，成功收斂為「v0.1 baseline + v0.2 main result」的可投稿主線，且已有安全提交；下一棒的重點不是再救檔，而是把全文語氣收成更像正式投稿稿。
