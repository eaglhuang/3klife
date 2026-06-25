# Handoff — paper.v3.1.md -> paper-zh.tex -> paper-zh.pdf 同步流程

日期: 2026-06-26  
Repo: `C:\Users\User\3KLife`  
主文件目錄: `docs/ai_atomic_framework/arxiv-paper-v1`

## 1. 這份交接文件的目的

本文件提供下一個對話群一條可直接接手的論文同步路徑，重點不是「如何重寫論文」，而是：

1. `paper.v3.1.md` 的文字如何安全同步到 `paper-zh.tex`
2. 哪些步驟可以自動化，哪些步驟目前仍建議人工控管
3. 最後如何穩定編到 `paper-zh.pdf`
4. 哪些已知風險不能忽略

---

## 2. 目前檔案角色分工

- `paper.v3.1.md`
  - 中文主稿的工作母本
  - 章節內容、Abstract、§2/§3/§4/§5/Appendix 的主要 prose 修訂先在這裡做

- `paper-zh.tex`
  - 中文 LaTeX 成品稿
  - 已有大量人工調過的版面細節
  - **表格格式、圖、字型、字級、間距都不能隨便重生**

- `references.bib`
  - BibTeX 來源
  - 新增或修正 reference metadata 時，這裡與 `paper-zh.tex` 的 `\cite` / `\nocite` 需一致

- `paper-zh.pdf`
  - 最終編譯產物

---

## 3. 這次交接前的實際狀態

目前已確認：

- `paper.v3.1.md` 已做過一輪 v3.1 prose 修補
- `paper-zh.tex` 已用同步腳本自 `paper.v3.1.md` 正式重建一次
- `paper-zh.tex` 可成功編譯
- 最新驗證編譯結果為：
  - `Errors: 0`
  - `Unresolved: 0`
  - `Overfull: 14`
  - `Pages: 38`
  - `FINAL: 752.9 KB`

最後一次成功編譯時間點就是本次交接前。

另外，這次正式同步前已自動備份舊稿：

- `paper-zh.tex.before-sync-20260626-011747.bak`

---

## 4. MD -> TeX -> PDF 的完整實際流程

### Step A. 先改 `paper.v3.1.md`

建議所有章節級 prose 修文先在：

- `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md`

先完成，原因是：

- 這份檔案比較容易做段落級審稿與邏輯檢查
- reviewer-facing prose 問題先在 MD 收斂，比直接在 TeX 內改安全
- TeX 端還背著版面保護，不適合先大改

### Step B. 不要直接整份重生 `paper-zh.tex`

repo 內有一個同步腳本：

- `tools_node/sync-paper-md-to-tex.js`

它現在的定位應該理解成：

- 單向同步器：以 `paper.v3.1.md` 為文字真源，重建 `paper-zh.tex`
- 但仍需理解它是「文字同步器」，不是「完整版面保真器」

原因有三個：

1. `paper-zh.tex` 已做過大量人工版面調整
2. 表格、圖、caption、字型、字級、間距都有人工保護
3. 目前同步腳本雖已補強到可正式重建，但 Markdown -> LaTeX 仍不等於逐像素保真排版系統

因此，**正確做法是以 MD 為 prose 真源，用腳本重建 `paper-zh.tex`，但每次重建前都先備份，重建後一定重新編譯驗證。**

### Step C. 定點同步到 `paper-zh.tex`

目前建議同步順序已更新為：

1. 先修改 `paper.v3.1.md`
2. 跑同步腳本重建 `paper-zh.tex`
3. 立刻編譯 `paper-zh.pdf`
4. 檢查是否有新增的排版破壞或編譯錯誤

腳本已補進幾個關鍵保護：

- 預設寫檔前自動備份
- `--check` 只檢查、不寫檔
- `--output <path>` 可先產生 preview
- 支援 block quote 與 `$$...$$` 數學式的較安全轉換

若重建後發現特定區塊版面不理想，再回到 `paper-zh.tex` 做小範圍人工修整；但母本文字仍應維持以 `paper.v3.1.md` 為準。

這一步的核心原則：

- `paper.v3.1.md` 管邏輯與文字
- `paper-zh.tex` 管成品與排版

### Step D. 必要時同步 bibliography

若 MD 修文時涉及 citation metadata 更新，需同步檢查：

- `references.bib`
- `paper-zh.tex` 內是否真的有對應 `\cite{...}`
- 若要強制把 bib 全印出，確認 `\nocite{*}` 還在

### Step E. 用 Node helper 編譯 PDF

目前最穩的做法不是手打一長串 shell，而是直接跑：

```bash
node tools_node/sync-paper-md-to-tex.js
node tools_node/compile-paper-zh-texlive.js
```

這支 helper 會在論文目錄內自動執行：

```text
xelatex paper-zh.tex
bibtex paper-zh
xelatex paper-zh.tex
xelatex paper-zh.tex
```

它同時會：

- 自動把 `C:\texlive\2026\bin\windows` 放進 PATH
- 輸出每一步最後一行訊息
- 產生 `compile-node-01-xelatex.out` 到 `compile-node-04-xelatex.out`
- 最後整理 `Errors / Unresolved / Overfull / Pages / PDF size`

### Step F. 看編譯輸出是否仍在安全範圍

這輪交接前的安全基準是：

- `Errors: 0`
- `Unresolved: 0`
- `Pages: 38`

`Overfull` 目前不是本輪主修目標，只需記錄是否暴增。

---

## 5. 等價的底層編譯鏈

如果下一群不用 helper，而要直接理解底層流程，實際編譯鏈就是：

```text
xelatex -> bibtex -> xelatex -> xelatex
```

使用的 TeX Live 路徑是：

- `C:\texlive\2026\bin\windows`

這和使用者先前提供的編譯方式是一致的；只是目前 repo 已有 Node helper，直接用 helper 比較不容易漏步驟。

---

## 6. 為什麼不要把同步流程理解成「MD 一鍵轉 PDF」

這點非常重要。

目前這條鏈不是：

- `paper.v3.1.md` 全自動、無損、可逆地轉成 `paper-zh.tex`

而是：

- `paper.v3.1.md` 提供 prose 真源
- `paper-zh.tex` 是由同步腳本重建、再經編譯驗證的成品稿
- `sync-paper-md-to-tex.js` 已可正式使用，但仍需備份與編譯驗證護欄

也就是說，**最後能穩定出 PDF 的關鍵，不是盲目重建，而是「先備份、再重建、再編譯驗證」的受控同步。**

---

## 7. 這輪已知風險與注意事項

### 7.1 千萬不要破壞 `paper-zh.tex` 的版面保護

不可隨意動：

- 表格欄寬
- `longtable` / `tabular` 結構
- zebra striping
- 字型設定
- 字級
- section spacing
- 圖與 caption 格式

### 7.2 `sync-paper-md-to-tex.js` 不應直接覆蓋成品稿

這條規則已更新。

現在可以直接用它重建 `paper-zh.tex`，但前提是：

- 每次重建前都要備份
- 重建後都要重新編譯
- 若發現特殊版面區塊退化，優先修同步器，不要默默讓 MD / TeX 再次漂移

### 7.3 encoding guard 有一個已知假陽性來源

本輪針對 touched files 跑 encoding 檢查時，失敗不是主稿造成，而是：

- `paper.v3.1.corrupted-backup-20260625.md`

這份 backup 檔有 UTF-8 BOM，因此會讓 touched-scan 報錯。  
但主工作檔：

- `paper.v3.1.md`
- `paper-zh.tex`
- `references.bib`

本身是可用的。

### 7.4 `paper-zh.tex` 目前屬於需要保守操作的成品

從內容可見它仍混有手工排版與轉寫結果；但在本次交接時點，正式策略已改為：

- `paper.v3.1.md` 為唯一文字母本
- `paper-zh.tex` 由同步腳本重建
- 版面異常優先修同步器或做小範圍 TeX 補丁

---

## 8. 下一群接手的建議順序

1. 先以 `paper.v3.1.md` 為主，完成 reviewer-facing prose 修文
2. 每輪修文後直接跑：
   - `node tools_node/sync-paper-md-to-tex.js`
3. 每輪同步後跑：
   - `node tools_node/compile-paper-zh-texlive.js`
4. 先確認自動備份檔已產生
5. 只要 `Errors: 0`、`Unresolved: 0`，就先不要為了小型 overfull 去重整版
5. 若 citation 或 appendix anchor 有變，再補 `references.bib`

---

## 9. 本次交接最核心的一句話

**真正穩定的流程現在是：先在 `paper.v3.1.md` 收斂 prose，接著用 `sync-paper-md-to-tex.js` 自動重建 `paper-zh.tex`，而且每次重建前自動備份，最後再用 Node helper 跑 `xelatex -> bibtex -> xelatex -> xelatex` 產出 `paper-zh.pdf`。**
