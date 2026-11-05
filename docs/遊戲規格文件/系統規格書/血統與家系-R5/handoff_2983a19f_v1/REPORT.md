<!-- doc_id: doc_spec_0301 -->
# 3KLife 最新版血統與出生驗證

固定版本：`2983a19f676e7a18c1a95aaccf34b62ce8a298fa`，master 於本輪開始查得的 HEAD，提交時間 2026-11-05 13:55:58 UTC（#1736）。
來源：https://github.com/eaglhuang/3klife/commit/2983a19f676e7a18c1a95aaccf34b62ce8a298fa

## 結論

已抓新版並繼續執行，不再用早上版本推斷「尚未實作」。新版已有 EP 五錨點、戰後 EP、多樣性 D、外戚純化與譜牒密考，並接進結緣／出生／部分存讀流程。然而「功能已存在」和「符合正式規格」仍必須分開。

- 原生 tests/run-cli.ts：**6,213 passed、0 failed、3 skipped**，exit 0。使用原有 cc 與 tsconfig test stubs；未關閉此命令的型別檢查。
- `tsc --project tsconfig.test.json --noEmit`：exit 0，無診斷輸出。這是 test project 型別檢查，不是 Cocos build。
- 額外獨立 probe：5 組成功執行；其中 1 組成功重現規格不符，不能把 probe PASS 誤讀成規格 PASS。
- **確認規格不符：外戚純化不是 m-only。** 以 random=0、原 3★因子輸入，實際變 4★。程式明寫暫以 30% ★+1 替代上限 m。G3 §E #2 要求只提高當胎 m、不改抽星機率，現行行為不符合。
- 尚未完成 Cocos 畫面／真實瀏覽器存檔／完整遊玩生命週期驗收，不應宣告整個血統功能驗收通過。

## 逐項覆核

### 血統、近親與 h
BloodFatigue 轉移與風險公式仍正確：h3 外婚成 h2，當胎病弱 1%；再近婚成 h3，病弱 32%。獨立 probe 重跑此序列；原生 BloodFatigue 測試亦涵蓋 breed 的出生資料與病弱旗標。

ClanMarriageRule 已新增父系同宗封鎖，但檔案明列僅檢查現有 3 代 14 席，而不是完整 4 代規格；同姓但無可查父系共祖不封鎖，母系至親另擋。BloodlineGraph 的 commonAncestors 可以指定 depth 4，不能因此把 ClanMarriageRule 或 D 的 14 席資料宣稱為完整 28 席治理。

isInbredPair 仍將缺譜查不到共祖視作外婚，缺資料不等於證明完整無共祖。此處是邊界／規格風險，不主張已重現正式遊戲的完整繞過。

### EP
EpLegacyBonus 已採 0/25/50/75/95 五錨點，先插值分布再抽樣，EP≥95 封頂。獨立測試 0..100 的機率和、均值單調性與封頂均通過。EP86 與 EP76 的單維 bonus 期望差 1.125，五維合計 bonus 差 5.625；這是目前 0..100 屬性尺度的 bonus，不是完整子代 P 的直接量測，不能直接拿它與規格 P 單位相減認定 bug。

createChild 對五維各加一次抽樣 bonus，運氣不加，父母有效 EP 取平均、一般上限 100；這些仍是程式註明的尺度與暫定取法，不是精確有理數模型的完整移植。

CareerEp 已接戰後結算：勝仗 +1、新里程碑 +5、最高 100，參戰名冊與結算項目都有更新；未參戰不增加，里程碑不重發。原生 8 案通過。以上權重程式標記暫定；不據此宣稱升官與名望所有路徑均接齊。

### 多樣性 D
DiversityFactor 與 createChild 接線已存在。原生 6 案通過：雙重表親 0、一般表親 .5、再從表親 .875、無共祖 1、折減五維 bonus、D 不新增 RNG 呼叫。

公式採祖輩 .14／曾祖 .07 的加權重疊，並明確標記暫定。實際只折減 EP bonus（四捨五入後加回），不是把全部先天五維乘 D。缺譜與空譜 D=1 已獨立實跑確認，應與完整祖譜的外婚證據分帳。

### 結緣預覽與密考
BondingSetupController 已接父母 EP 說明、h 風險、D 折減提示、可純化共祖。精確 D 由密考顯示，未密考只給提示；PedigreeProbe 原生 8 案通過，包含扣券一次、同對不重收、券不足不記錄與 controller 文案。

密考、隱藏血脈、單維細箱是目前的部分實作。PedigreeProbe 明列 m1/m2 尚無資料、單維因子星數及上限 m 未做，細箱採現有尺度寬 5。此輪沒有視覺截圖或 Cocos 點擊證據，controller 測試不能代替畫面驗收。

### 出生與存讀
出生原生測試已包含 D 加成、純化、h 與因子路徑；但它們大多用固定 RNG／建構資料，不能代表自然遊玩多代發生率。

獨立 probe 使用原始 GameSession、PlayerSaveService、MemoryStorageAdapter，將 roster 的 EP=76、bloodFatigue=2，以及已密考配對記錄存檔，再以新 GameSession 讀回，三者保留。原生 CustomGoldFactor 另有退休／存讀後字典名稱保留測試且本輪通過。

此證據只是記憶體適配器成功路徑；真實瀏覽器儲存、寫入失敗、斷電／崩潰、重入與跨版本舊檔遷移未獨立覆核。不把它宣稱為實際 storage E2E。

## 證據與重跑

- `results/cli.log`、`cli.exit`：原生 CLI 完整輸出。
- `results/tsc.log`、`tsc.exit`：test project tsc。
- `probe.cjs`、`results/probe.json`：額外 5 組檢查；此 probe 使用 transpileOnly，不能拿它當型別檢查。
- `entries.json`：本輪 3,934 個固定 SHA blob 身分；203 檔重新取得，其餘以 bytes 的 Git blob SHA 驗證後復用。
- `receipts/`：固定 SHA 的 root/subtrees 與 203 檔 connector 原始回覆。最初全 repo recursive tree transport closed；改抓固定 SHA 子樹成功且均未 truncated。
- `results/source-verification.json`：3,934 檔零不符；tests/scripts/server/tools_node 也無來源清單外舊檔。

完整 CLI 使用已安裝的舊驗證環境 node_modules，未安裝新套件。package-lock.json 在兩版相同。ZIP 是證據與固定來源集合，不是完整 Git checkout 或已安裝依賴的獨立工程。要完整重跑，請使用上述 SHA 的完整 checkout 和相符依賴，再執行：

工具版本：Node v24.22.1、TypeScript 5.9.3、ts-node 10.9.2。已比對依賴清單 9,473 個檔案，SHA-256 零差異，見 DEPENDENCY_MANIFEST.json 與 results/dependency-verification.json。

    ./node_modules/.bin/ts-node -r ./tests/register-cc-test-stub.js -r ./tests/register-tsconfig-test-paths.js --project tsconfig.test.json tests/run-cli.ts
    ./node_modules/.bin/tsc --project tsconfig.test.json --noEmit

額外 probe 的 source 目錄需具備相符 node_modules；執行 `node probe.cjs`。

## 未做／限制

3 個 CLI skipped 為 Cocos UINodePool acquire/release/clear；未跑 Cocos Editor、正式 build、npm test wrapper、CI、遊戲部署頁面或真實 browser storage。

快照不是 Git repo。ATM next/guide 可讀取路由；actor adopt 因 git config --local 需要 Git checkout 而失敗並回滾。未以其他手段偽造身份、接任務卡、修產品、提交、推送或改權限。此輪定位為隔離來源驗證，不是正式產品任務卡驗收。

## 本地 AI 下一步（不是修改授權）

1. 優先處理 m-only 與直接升星矛盾，補驗收先鎖住「星數不因純化直接改變」，不要只更新測試去配合現在替代實作。
2. 明定 14／28 祖位、缺譜判定、D 的計算範圍與暫定尺度，再補完整資料／缺失資料交叉案例。
3. 用真實 Cocos 流程確認預覽、出生提示、密考與存讀；補出生前後存檔與失敗回復。完成後以精確 SHA 重跑，勿把本輪 6,213 通過套到後續提交。
