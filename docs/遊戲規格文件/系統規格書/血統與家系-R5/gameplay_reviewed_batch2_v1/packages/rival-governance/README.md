<!-- doc_id: doc_index_1037 -->
# G23 他國治理、外交與盛衰：有界驗證包

- Repository: eaglhuang/3klife
- Immutable commit: `96a83124094d3b2485bfb749ef37d567ad834559`
- 狀態：**45 個原函式／原 caller 方法切片的觀察斷言通過；整域驗收 NOT_RUN**。
- 先讀 `他國治理外交與盛衰報告.md`，機器可讀關係見 `claim_matrix.json`、`coverage.json`。
- `SOURCE_MANIFEST.json` 核對 63 份原始來源 Git blob SHA-1、SHA-256。16 份 G23 候選原碼完整讀過；此數不包含未完整讀過的支援依賴與 GameSession/Lobby 大檔。
- `probes/run.mjs` 直接匯入原 TypeScript 模組；GameSession/Lobby 的 14 個原方法以 TypeScript AST 取原文 slice，hash 及起迄位置在 `probes/results.json`，原 slice 在 `probes/extracted/`。
- TS 5.9.3 compiler 與 Apache-2.0 license 放在 `probes/vendor/`，只在記憶體轉譯；沒有編輯產品來源、呼叫付費 provider、改真遊戲狀態、推送或部署。

## 重跑

需求：Node.js 24（本次 v24.22.1）、Python 3。無安裝、無網路、無其他工作目錄依賴。

```sh
python /absolute/path/to/package/verify_package.py --run
```

或在包目錄：

```sh
python verify_package.py
node --loader ./probes/ts-resolver.mjs ./probes/run.mjs
```

`--run` 先核 hash、slice 及封包來源，再以臨時結果檔重跑，保留已交付結果。直接執行 run.mjs 會重寫本包的 results.json 與相同 extracted slices。Node loader 的 ExperimentalWarning 不是產品失敗。沒有型別檢查、正式 repo 測試套件、真存讀檔、Cocos/UI/E2E 或伺服器測試。
