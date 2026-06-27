# Handoff — paper.v3.1.md -> paper-zh.tex -> paper-zh.pdf 同步流程

日期: 2026-06-26  
Repo: `C:\Users\User\3KLife`  
主文件目錄: `docs/ai_atomic_framework/arxiv-paper-v1`

## 1. 接手目的

這份 handoff 給下一位隊長接續中文稿到英文版前的穩定工作。重點不是重新大改論文，而是維持一條可重複的同步鏈：

1. 以 `paper.v3.1.md` 作為中文 prose 母本
2. 用 `tools_node/sync-paper-md-to-tex.js` 同步到 `paper-zh.tex`
3. 用 `tools_node/compile-paper-zh-texlive.js` 編出 `paper-zh.pdf`
4. 每次同步後確認 PDF 可編譯，避免 MD / TeX / PDF 漂移

## 2. 最新狀態

最後一次成功同步與編譯結果：

```text
node tools_node/sync-paper-md-to-tex.js
node tools_node/compile-paper-zh-texlive.js

Errors: 0
Unresolved: 0
Overfull: 13
Pages: 37
FINAL: 749 KB
```

最後一次同步備份：

```text
docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.tex.before-sync-20260626-114552.bak
```

重要更新：先前嘗試過 table pagination / 強制換頁修版，但使用者已明確指示暫緩，因為英文版還會再做一次。該方向已撤回；目前不要再為了中文 PDF 的表格截斷去加 `\clearpage`、`Table 9a` 或 Markdown raw-LaTeX 控制。

## 3. 檔案角色

- `paper.v3.1.md`: 中文主稿 prose 母本。英文版前的審稿語義修正應先落在這裡。
- `paper-zh.tex`: 由同步器產生的中文 LaTeX 成品稿。同步後可做必要小修，但不要讓它和 MD 長期漂移。
- `paper-zh.pdf`: 最新中文 PDF 產物，已能穩定編譯。
- `references.bib`: BibTeX metadata 來源。新增文獻時要和 MD 中的 manual reference list 同步。
- `tools_node/sync-paper-md-to-tex.js`: MD -> TeX 同步器，支援備份、`--check`、`--output`、`--no-backup`，並保留 `% CLAUDE-FIG-BEGIN/END` 圖塊。

## 4. 本輪保留的實質修正

已保留並同步到 MD / TeX / PDF 的 reviewer-facing 修正：

- 補入 SEMAP 與 ColaUntangle 作為相鄰但不直接替代 ATM 的 related work。
- `references.bib` 新增 `Mao2025SEMAP` 與 `Hou2025ColaUntangle`。
- manual references 新增 Ref. 61 / Ref. 62。
- 將 `route F1` 口徑統一為 `route-label F1`，並標明其分母是 42 個 mode-level comparisons。
- 明確說明 `false-safe rows` 屬於 policy comparison surface，不屬於 route-label F1 分母。
- 明確說明 `252 policy rows`、`294 ablation rows`、`210 adversarial rows` 等 derived rows 由 20 個 unique scenarios 展開，不是獨立 population samples。
- 修正舊的錯誤引用組 `Refs. 1, 28, 29`，目前 CodeCRDT / EvoGit / AgentGit 對應為 `Refs. 1, 27, 28`。
- 移除/避免使用 `Ship-safe` 這個缺乏學術定義的說法。
- 保持 `9a0c03...` 不再出現在正文中；目前 artifact 區分以 `3eec69...` 與 `ab8753...` 為主。

## 5. 已明確暫緩或撤回的方向

不要在下一輪自動恢復以下內容：

- 不要新增 `Table 9a`。
- 不要把 Table 9 拆成兩張表，只為了中文 PDF 換頁。
- 不要在 Markdown 裡加入 `<!-- LATEX: \clearpage -->` 這類 raw-LaTeX 換頁控制。
- 不要為了中文 PDF 的表格 pagination 改同步器；等英文版 TeX 版面確定後再一起處理。
- 不要把 table overfull 當成目前最高優先級；目前 `Errors: 0`、`Unresolved: 0` 比 overfull 數字更重要。

## 6. 建議接手流程

每輪中文稿或英文版前置修文後，建議照這個順序：

```bash
node tools_node/sync-paper-md-to-tex.js
node tools_node/compile-paper-zh-texlive.js
```

若只想預覽同步結果，不覆蓋成品稿：

```bash
node tools_node/sync-paper-md-to-tex.js --output <preview-path>
```

若只想檢查同步器輸出是否與目標一致：

```bash
node tools_node/sync-paper-md-to-tex.js --check
```

編譯 helper 會執行：

```text
xelatex paper-zh.tex
bibtex paper-zh
xelatex paper-zh.tex
xelatex paper-zh.tex
```

安全基準：

- `Errors: 0` 必須維持
- `Unresolved: 0` 必須維持
- `Pages` 目前是 37；若頁數變動，先判斷是否是文字內容造成，不要立刻為表格換頁大改
- `Overfull` 目前是 13；不暴增即可

## 7. 下一位隊長優先檢查清單

接手後先跑：

```bash
rg -n "Ship-safe|Refs\. 1, 28, 29|9a0c03|ATM-full route F1|route F1|Table 9a|LATEX:" docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.tex
```

預期結果：

- 不應出現 `Ship-safe`
- 不應出現 `Refs. 1, 28, 29`
- 不應出現 `9a0c03`
- 不應出現 `ATM-full route F1`
- 不應出現 `Table 9a`
- 不應出現 `LATEX:` raw 換頁註記
- 若出現一般 prose 裡的 `route F1`，應改成 `route-label F1`，除非是在解釋舊稱呼

文獻檢查：

```bash
rg -n "SEMAP|ColaUntangle|^61\.|^62\.|Mao2025SEMAP|Hou2025ColaUntangle" docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md docs/ai_atomic_framework/arxiv-paper-v1/references.bib
```

預期結果：正文、manual references、BibTeX 三處都能對上。

## 8. 工作樹與提交注意

這份 handoff 更新時，`git status --short` 一度顯示工作樹乾淨；若下一位看到 dirty files，請先確認是否是使用者或其他 agent 在同時作業，不要直接回退。

先前本線曾出現過與論文同步相關的 touched files：

- `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md`
- `docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.tex`
- `docs/ai_atomic_framework/arxiv-paper-v1/references.bib`
- `docs/ai_atomic_framework/arxiv-paper-v1/paper-zh.pdf`
- `tools_node/sync-paper-md-to-tex.js`

若要 commit，先用 `git status --short` 與 `git diff --stat` 確認 scope，避免把其他 agent 的 unrelated work 一起收進來。

## 9. 最核心交接句

目前穩定策略是：**英文版前只修審稿語義與 citation consistency，不再追中文 PDF table pagination；每輪以 `paper.v3.1.md` 為 prose 母本，同步到 `paper-zh.tex`，再編譯確認 `paper-zh.pdf` 維持 `Errors: 0` / `Unresolved: 0`。**

## 10. 2026-06-27 英文版論文交接增補

本增補給下一個對話群直接接續英文版 `paper.v3.1.en.md`。本輪主線已從 Abstract、Introduction、Related Work、Framework、Validation、AdmissionBench、Discussion、Conclusion、Acknowledgements 推進到 Appendix A.4 附近；目前不要再回頭重寫前文，除非是修正 terminology、citation、claim boundary 或明顯語法問題。

### 10.1 本輪已完成的英文稿範圍

- `paper.v3.1.en.md` 已完成大部分正文語氣校準與段落替換，包含 Abstract 三段、Motivation、False Dichotomy、Contributions、Organization、Related Work、§3 Framework、§4 Evidence、§5 AdmissionBench、§6 Discussion、Deployment Topologies、Conclusion、Acknowledgements。
- Appendix 已更新到 `Evidence Artifact Map`、`Table A.1`、`Implementation and Commit Provenance`、`CID Schema Migration Candidate Paths`、`Table A.3`、Topology C bridge detail、`Table A.4`、`Table A.4a`、Non-Goals、Acceptance Conditions。
- `en/PAPER-EN-STYLE-SPEC.md` 已同步吸收本輪 durable style rules，尤其是 claim boundary、denominator boundary、Flow/Snap 使用時機、Acknowledgements 透明揭露語氣、benchmark/audit 段落寫法。
- `en/PAPER-EN-CITATION-MAP.md` 與 `en/PAPER-EN-READINESS-CHECKLIST.md` 在本輪工作樹中也有變更；下一位接手前請先看 `git diff --stat` 與局部 diff，不要假設只有主稿被改。

### 10.2 已定案的風格與論證決策

- 英文版主風格採 `D dominant + tactical C-snap`：論證段落用流動的 D；當 reviewer 需要快速比對多個機制、角色或 evidence bucket 時才局部 snap。
- 二系統比較可在符合 `binary mechanism-contrast exception` 時使用 snap；例如 STORM/CAID、CodeTeam/ATM、SCF/MPAC 這類介入點或治理機制明顯不同的對比。
- `before any governed shared mutation is applied` 是目前最穩的 admission boundary 表述；避免泛稱所有 writes，保留 private/local WIP 不必經 broker 的邊界。
- `baseline` 只用於真正實驗 baseline；CodeTeam 這類尚未跑成 empirical baseline 的文獻應稱為 `comparator`、`design point` 或 `repository-construction comparator`。
- Evidence rows、policy rows、ablation rows、adversarial rows、enforcement rows 必須明確說明 denominator 與 row universe；不要讓 derived rows 被誤讀成獨立 population samples。
- Acknowledgements 採精簡兩段版，細節移到 Appendix B；不要列舉 CID、virtual atom、neutral steward 等架構決策清單，避免讀起來像 defensive contribution enumeration。
- Appendix / transparency bridge 採 Flow，不採 Snap；vendor channels、role separation、human decision points、audit boundaries、explicit non-claims 可在 Appendix B 用較細的結構承擔。

### 10.3 最近一次已落檔的關鍵段落

Acknowledgements 目前採用以下決策：透明揭露 LLM assistants 的使用範圍、明確 human-in-the-loop、作者保留 design/evidence/benchmark/claims final authority，並把細節指向 Appendix B。這版比完整三段列舉版更短、更負責，也比較不會把 reviewer 注意力導向「AI 是否主導原創性」。

Conclusion 目前已收斂為三段：第一段重申 pre-write admission layer 與 ATM 的 governance units；第二段界定 evidence chain 支持 feasibility/auditability/bounded recoverability，但不主張 large-scale comparative superiority；第三段以 first-class governance problem 收束。

Appendix A 開頭目前已採用 canonical anchor rule：paper-facing numbers and benchmark claims 以 `artifacts/generated/atm-admission-bench/20260625-paper/` under `main@ab8753b7daf0a3c4cd8b4483fe24d519ff2590bd` 為主；`v0.9.0-alpha.1` 是 source-reference snapshot，`3eec69...` 是 generator-provenance anchor，不要混成同一 citation layer。

### 10.4 尚未完成、下一輪優先處理

下一輪第一優先是 References cleanup and verification：

- 不要把目前 References 原樣放入正式稿；Refs. 38-62 後面的用途說明屬於 annotated bibliography，不應留在正式 References。
- References 正文只保留 bibliographic metadata：作者、年份、標題、venue/arXiv、DOI 或 URL。
- `used as contrast`、`supports claim`、`future-work reference`、`neighboring design point` 等說明移到 Related Work prose、citation-to-claim map，或 Appendix 的 annotation table。
- arXiv 條目建議統一成 `Author(s). Year. "Title." arXiv:identifier [subject class]. https://doi.org/10.48550/arXiv.identifier.`
- 書籍、會議、journal、technical report 保留原 venue 或 publisher，不要硬改成 arXiv style。
- 需要校正新增文獻 metadata，尤其 SafeMerge、Semistructured Merge、Atomix、Cordon、SyncMind/SyncBench、SEMAP、ColaUntangle、Solver-Aided Verification 等條目；請用官方 arXiv、DOI、publisher 或作者頁核對。

第二優先是 Appendix B transparency statement：

- Acknowledgements 已指向 Appendix B，但 Appendix B 的 vendor channels、role separation、human decision points、audit boundaries、explicit non-claims 仍需確認是否完整、是否與正文 claim boundary 一致。
- §A-3 作為 transparency bridge 採 Flow；若 Appendix B 內有 vendor channels 或 role separation 清單，可以局部用 Snap，但不要讓整段像規格表。

第三優先等英文版全部翻譯與校準完成後再做：

- 全文 Figure / Table / Algorithm caption 大小寫一致性掃描。
- 全文表格編號連續化；暫時保留 `Table 18a`，等整份英文版完成後再一次處理，不要現在局部重編號。
- Cross-reference sweep：確認 § 編號、Definition 編號、Proposition 編號、Table/Figure/Algorithm 指稱沒有漂移。
- Markdown/encoding 檢查與 md-to-pdf 或英文 TeX 同步流程。

### 10.5 驗證與工作樹狀態

本輪每次文字落檔後已對 touched paper files 跑過 encoding guard；最近一次 `paper.v3.1.en.md` 檢查結果為 `bom=no`、`replacement=0`、`latinMojibake=0`、`weirdCjk=0`、`ok`。本增補落檔後仍需再跑 touched-file encoding check。

目前工作樹在 `docs/ai_atomic_framework/arxiv-paper-v1` 下已知 dirty files 包含：

- `docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-26-md-to-pdf-sync.md`
- `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-CITATION-MAP.md`
- `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-READINESS-CHECKLIST.md`
- `docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-STYLE-SPEC.md`
- `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md`

不要直接回退這些檔案；下一位接手前請先用 Node.js 讀取與 `git diff --stat` 判斷 scope。使用者已明確要求編碼敏感讀取使用 Node.js，不要用 PowerShell 直接抓內容。

### 10.6 下一位隊長的建議起手式

```bash
git status --short -- docs/ai_atomic_framework/arxiv-paper-v1
npm run check:encoding:touched -- --files docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-26-md-to-pdf-sync.md docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.en.md docs/ai_atomic_framework/arxiv-paper-v1/en/PAPER-EN-STYLE-SPEC.md
```

接著從 References cleanup 開始，不要重開正文語氣大改。若需要查證文獻，使用官方來源；完成後同步 `PAPER-EN-CITATION-MAP.md`，因為使用者已決定「表格與 citation map 以後要直接同步」。
