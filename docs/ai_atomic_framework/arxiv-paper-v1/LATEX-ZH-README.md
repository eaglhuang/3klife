# 中文 LaTeX / PDF 工作流

這份 README 只說明 `paper.v3.1.md`、`paper-zh.tex`、`paper-zh.pdf` 之間的實際工作流。

## 目前角色分工

- `paper.v3.1.md`
  - 中文論文的文字母本
  - reviewer-facing prose、章節邏輯、敘事修文先改這份

- `paper-zh.tex`
  - 中文 LaTeX 成品稿
  - 由同步腳本自 MD 重建
  - 重建後再經編譯驗證

- `references.bib`
  - BibTeX 資料庫
  - 同步腳本會補齊必要 bib entry

- `paper-zh.pdf`
  - 最終編譯產物

## 標準流程

### 1. 先修改 MD 母本

先改：

- `docs/ai_atomic_framework/arxiv-paper-v1/paper.v3.1.md`

### 2. 用腳本重建 TeX

直接跑：

```bash
node tools_node/sync-paper-md-to-tex.js
```

這支腳本目前支援：

- 預設寫檔前自動備份舊的 `paper-zh.tex`
- `--check`：只檢查，不寫檔
- `--output <path>`：先輸出 preview
- `--backup <path>`：指定備份路徑
- `--no-backup`：明確要求才跳過備份

預設備份檔格式類似：

```text
paper-zh.tex.before-sync-YYYYMMDD-HHMMSS.bak
```

### 3. 編譯 PDF

同步後直接跑：

```bash
node tools_node/compile-paper-zh-texlive.js
```

這支 helper 會自動執行：

```text
xelatex -> bibtex -> xelatex -> xelatex
```

## 目前建議

- 把 `paper.v3.1.md` 當唯一文字真源
- 不要再手動維護一份獨立的 TeX prose 版本
- 每次同步前都保留備份
- 每次同步後都重新編譯
- 若重建後版面有局部退化，優先修同步器或做小範圍 TeX 補丁，不要讓 MD / TeX 再次漂移

## 成功基準

目前安全基準是：

- `Errors: 0`
- `Unresolved: 0`
- `Pages: 38`

`Overfull` 暫時只記錄，不以本輪為版面重整目標。

## 補充

若要看完整交接說明，請讀：

- `docs/ai_atomic_framework/arxiv-paper-v1/HANDOFF-2026-06-26-md-to-pdf-sync.md`
