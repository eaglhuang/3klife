<!-- doc_id: doc_index_1036 -->
# 名士預言與傭兵：有界原碼驗證包

固定來源：eaglhuang/3klife @ `96a83124094d3b2485bfb749ef37d567ad834559`。

- 38 個 deterministic probe 的觀察符合預期；其中 **14 個刻意重現缺陷或待決邊界**。這不是 38 項產品驗收通過，也不是 G10/G11 完整驗收。
- 原專案無任何修改。未啟動遊戲、未交易、未操作帳號、未碰實際存檔。
- 43 個來源檔的 Git blob 與 SHA-256 已固定；11 個模組直接載入原檔，17 個以移除 import/export 宣告的隔離 wrapper 執行，19 個 caller 方法逐字抽取並保存行號與本文雜湊。
- 主要閱讀：`名士與傭兵驗證報告.md`、`probes/results.json`、`coverage.json`、`NOT_RUN.json`。
- `source-references.json` 提供固定 commit 與原始行號連結。

## 重跑

需求：Python 3、Node.js 24（本次 v24.22.1）；不需 npm install、網路、Cocos 或原 repo checkout。

```bash
python verify_package.py --rerun
# 單獨跑 probe
node probes/run.mjs
# 重現原始模組在 Node 原生載入的限制，不是正式測試套件
node --experimental-loader ./probes/ts-resolver.mjs ./probes/native-imports.mjs
```

從任意 cwd 執行絕對路徑的 `verify_package.py --rerun` 也可。交付白名單排除首次組裝腳本、raw fetch、metadata暫存、scratch與工作記錄。解壓後驗證不依賴兄弟目錄或原始工作區。

## Harness 邊界

`probes/harness.mjs` 不改 evidence。純模組原碼僅移除 import/export 模組宣告並用 Node 內建 TypeScript transform 擦除型別；注入的已載入依賴均來自本包 exact source。GameSession/Lobby 使用「原方法文字依固定行界抽取」，不是 AST 解析整個類別；只執行列出的原方法，不執行 constructor、bootstrap 或整個場景。`extraction-receipts.json` 保留逐字原方法本文及起迄行；verifier 逐一與 evidence 重新比對。

測試替身：記憶體 roster、僅含本次欄位的 snapshot、save 成功/拒絕 fixture、事件收集器、空 prophecy keyword dictionary、關係結義紀錄 stub、Cocos host shell。這些替身均不是產品存檔、UI、完整事件匯流排或關係系統。保存、存檔失敗與重試 probes 證明原 caller 的記憶體變更順序；不代表真實持久化已驗證。

`native-imports.json` 明列未改原檔時的 type/value import、parameter property 與缺少 runtime dependency 錯誤。沒有把這些 NOT_RUN 改寫成產品 PASS。

## 交付追溯

`probes/case-traces.json` 逐案記錄原碼呼叫順序、檔案、函式/方法與精確行號；19個抽取方法另帶本文SHA。追蹤包在函式外圍，不改原方法本文，也不蒐集輸入值。它不是完整call graph，未跨過未執行的Cocos/儲存替身。`extraction-receipts.json` 每個wrapper另列正式import的注入／略過情形與來源；略過依賴不代表其功能已測。M09 trace可對照addGenerals/enrollGenerals被呼叫但save未呼叫；M19/M20 trace連到原面板與Lobby方法。

`compiler-metadata.json` 固定本次Node 24.22.1與內建Amaro 1.1.11；沒有外掛或vendored compiler。`DELIVERY_WHITELIST.json` 是最終白名單，`ARTIFACT_SHA256.json` 是可攜manifest。
