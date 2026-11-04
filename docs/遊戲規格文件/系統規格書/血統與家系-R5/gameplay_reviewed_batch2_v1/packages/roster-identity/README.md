<!-- doc_id: doc_index_1038 -->
# G02 武將名冊與同名版本 / G14 重複名將轉生與分流

固定來源：eaglhuang/3klife @ 96a83124094d3b2485bfb749ef37d567ad834559。驗證日期 2026-11-04 UTC。

本包含 60 份經 Git blob SHA-1 與 SHA-256 核對的原始檔、44 個獨立 deterministic probes、27 個原文 AST 節點切片及其 offset/行號/hash。沒有修改產品 repo、沒有對外遊戲操作，也沒有重跑轉蛋機率或家系公式驗證。

## 先讀

- `名冊與重複流轉報告.md`：結果、反例、規格/暫定差異與未完成驗收。
- `coverage.json`：G02、G14、有限 G01 邊界的 machine-readable 狀態。
- `probes/results.json`：每個 probe 的觀察、分類與結果。
- `probes/execution-scope.json`：24 個完整載入模組、抽取範圍、所有 fixture 與 NOT_RUN 邊界。
- `SOURCE_MANIFEST.json`：固定 commit 原檔來源與完整性。
- `probes/extractions.json`、`probes/extracted/`：原始 AST 節點原文與對應來源。

44/44 PASS 只表示「這 44 項觀察重現」，包含 10 多項反例及限制，不代表功能驗收 PASS。G01、G02、G14 全域驗收均為 NOT_RUN。

## 重播

不需 npm install 或網路。需要 Node.js 及 Python 3。本次使用 Node.js v24.22.1；隨附 TypeScript 5.9.3 編譯器與 Apache-2.0 授權。

```sh
python verify_package.py
node probes/run.mjs
python verify_package.py --run-probes
```

`run.mjs` 以 TypeScript 5.9.3 `transpileModule` 在記憶體中轉為 CommonJS，再放進隔離 vm。沒有改寫原檔或函式 body。runner 只會覆寫自身 `probes/results.json`、`probes/extractions.json`、`probes/execution-scope.json` 與相同原文切片，不會接觸包外檔案或網路。`verify_package.py --run-probes` 比對重播前後結果與 artifact hashes。

## 方法與限制

- 原完整模組直接載入，runtime 相依以相同來源檔遞迴解析；完整載入不等於模組每個分支都測到。
- 大型 GameSession、Lobby、BattleRoster、SortieDeploy、DestinyPool 僅執行指定完整方法/函式/arrow property，抽取採 TS AST，保留原文 offset、行號及 SHA-256。不是整模組 E2E。
- BattleRoster 使用原始 `dead`、`Mystery` 常數與 VitalityCap 函式。TacticRandomization 使用原始 SortieDeploy 對照表。MentorSupportSchema 使用原始 NURTURE_TOTAL_ROUNDS 常數。
- cc localStorage 是記憶體 Map。logger 只收警告。Session 事件、日誌、save、startNewGame 是紀錄型 fixture；特定測試會注入 save/儲存/主將設定失敗。尤其 startNewGame 只記呼叫，不代表整個世界重設已測。
- 未測 Cocos、正式 UI 點擊/中斷/取消/重開、真正 PlayerSaveService 遷移鏈、伺服器、支付、正式英靈卡資料選擇。
- `probes/ts-resolver.mjs` 是從已封包原樣帶入的備用 ES module loader；本次使用 run.mjs 內的 CommonJS vm loader，未使用該備用 loader。
- 沒有把搜尋結果作版本證據。所有新增原檔均以固定 commit fetch_file 取得；舊封包拷貝均按原 manifest 驗 Git blob 與 SHA-256。沒有帶入原工具回應 snapshots/scratch。
