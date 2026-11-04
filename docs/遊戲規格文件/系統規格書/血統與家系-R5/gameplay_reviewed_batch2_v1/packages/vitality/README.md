<!-- doc_id: doc_index_1039 -->
# G07 有界玩法證據包

固定 `eaglhuang/3klife@96a83124094d3b2485bfb749ef37d567ad834559`。唯讀產品研究，沒有修改產品碼。

- 先讀 `REPORT.md`：發現、正常路徑、注入邊界及未驗事項。
- `coverage-matrix.json`：每個probe的範圍、類別、結果與trace。
- `probes/results.json`：全部觀測、逐案原函式/方法trace、AST行號/位元範圍與hash。
- `SOURCE_MANIFEST.json`：34份固定commit來源與Git blob/SHA-256。
- `ARTIFACT_SHA256.json`：交付白名單檔案hash（自身除外）。

## 重播

需要 Python 3 與 Node.js（此包實測 v24.22.1）。TypeScript 5.9.3 compiler、license及來源說明已附，無需 npm install 或網路。

```sh
bash run.sh
```

此命令先驗來源與compiler，後執行probe並重寫 `probes/results.json`、stdout/stderr。成功須 exit code0、40/40斷言通過。某些斷言就是缺口的特徵，不代表產品正確或完整驗收。

## 封裝與限制

正式ZIP僅含 `PACKAGE_FILES.txt` 白名單，不含抓取中間檔、prepare腳本、scratch、其他worker證據或產品repo。ZIP可解壓至任意路徑重播。AST方法抽取並非完整原模組建構；具體fixture/stub見報告及runner。沒有Cocos或真實save，沒有執行正式整機E2E或原產品測試套件。
