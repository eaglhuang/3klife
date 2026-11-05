<!-- doc_id: doc_spec_0300 -->
# 原出生 → 原20季增齡 → 開獎／宿命 → 育成入場

## 結論

固定 `f4eca8189223b1cd7e4f4457019ddac73c46a9be`，4 個有界群組通過。這次沒有手改 newborn 年齡、宿命、職業或時鐘來越過入場條件。原結緣 confirm 建立的 age 0 子嗣，經原初始時鐘與20次完整 GameSession.advanceSeason，成為 age 5、開獎、選宿命、原 Flow 入學；各關鍵點原 save／全新 GameSession.load 接得上。

此為既有自然出生實作（BondingSetupController.confirm → BreedingService.breed）的實際產物，非 synthetic child。實作在 conceived 當下建立 newborn，母方 pregnancySeasonsLeft=4；本包沒有另造「等待孕期後才出生」規則，也不是玩家從新帳號取得父母／教官的完整端到端流程。

沒有觀察到這條有字典受控正常鏈的接線斷裂。新增無字典分支證實同一保存子嗣的開獎建議會因資源前置不同而改變，見 BN04。不代表公式正式定案、所有 gameplay 已驗，或真 Cocos 宿主已驗收。

## BN01：出生、20季、邊界存讀

- 起點使用原 GameClock 初始值：第1年春、elapsed=0、Governance。
- catalog 父曹操／母甄姬經原 confirm：child-cao-cao-zhen-ji-1、age=0、Mystery、全部5個 inherited genes locked。父母扣壽命後 age=30.5。
- 每次走精確原 LobbyScene._onClickAdvanceSeason AST 方法，再走完整原 GameSession class 的 advanceSeason。不是只抽 age += 0.25，也沒跳過 advanceSeason 其他 statement。
- 每季都 assert age=i/4、elapsed=i，保存全部20個時鐘／child／nurture／eligibility／candidates 快照。
- 第19季：age=4.75，Mystery、fate absent、全部 genes locked，原 checkStart 同時含 child-underage／not-unveiled，且不在 Flow candidates。
- 第20季：age=5，第6年春，elapsed=20、Nurture；Unveiled、unveiledSeason=20、fate 未選。原 general-unveiled 事件恰1次，該 child 成長階段事件恰1次。
- 原 revealStats 補入 STR/INT/LEA/POL/CHA/LUK 六個 dualLayerStats，base/current=45/84/54/82/91/80，revelationLevel 全 EXACT。入學前無 prowess layer 注入。
- 原 factor dictionary 有明確接到 GameSession.setFactorDictionary，開獎 recommendation 為 factors 來源（martial=8、civil=4、Warrior）。不是僅把字典給 breeding getter。
- 解鎖依實際 discoveryLevel<=1，而非直接按顏色判斷。gene_bravery、gene_strategy、gene_command 解鎖；gene_vitality（20）及 gene_destiny（45）仍鎖定。gene_strategy 是 catalog green、discoveryLevel=1；此處只記錄原運算，不自行裁定規格。
- 新 Session 讀回點：出生後0歲、第19季4.75歲、第20季5歲。每次確認新 roster 初始空、新 graph 未載入，再原 load，比對完整 createSnapshot 深相等。

## BN02：拒絕控制與正常入場

- 5歲開獎但未選宿命：原 checkStart 恰為 fate-pending。以真原 NurtureError 類型和精確訊息驗證原 startNurture 拒絕；完整 snapshot 不變、storage events delta=0、入學令2→2。
- 原 Flow.chooseFate('accept') → 原 UnveilingService.choose → 原 save，再全新 Session.load；choice=accept、growthModifier=1。afterChoice 是入學前即取樣的快照。
- 無教官控制：同一已選宿命的 fresh session，loadMentorCards 回空；原 Flow.startNurture 返回提示、沒有新 session、沒有保存、入學令2→2。
- 正常控制：同一 child 不變，改由明示人工前置提供1張 mentor card；原 Flow.startNurture → NurtureService.startWithCards/start，round=0、status=active、1位 mentor、入學令2→1，child 仍5歲。
- 入場後再全新 Session.load，完整 snapshot 與 NurtureSession 深相等；checkStart 恰為 already-nurturing。
- 「每季2張」為原程式 DEFAULT_ADMISSIONS_PER_SEASON 暫定值，本包不批准其正式數值。

## BN03：隔離延續，事件一次性

從入學後真正已保存的 payload 複製到另一個全新原 MemoryStorageAdapter，再原 GameSession.load。只在這個獨立分支推到第21季（5.25歲），不是再推21季。原流程轉為 Governance；unveiledSeason仍20、六維 layer 不變、沒有再次發出開獎事件，再存讀一致。主鏈維持 age=5，沒有被分支改動。

## BN04：同一4.75歲存檔，fresh-load 無字典的對照

- BN01 在第19季原 advanceSeason 保存完成後直接讀出原 Memory 主key payload，存為 saved-at-19.json；不是手造child，也沒有改寫其中年齡、stats、genes、clock或fate。
- 複製此payload到新 Memory，fresh environment 明確不呼叫 GameSession.setFactorDictionary。原 GameSession.load／ServiceLoader postLoadHook 執行後，session.factorDictionary 仍 undefined。這個選項同步讓 breeding getter 無字典，但分支不再執行繁殖。
- 原 Lobby handler／完整原 advanceSeason 推到第20季、5歲、Nurture，正常開獎一次。但 recommendation 走 stats fallback：STR+LEA=45+54=99、INT+POL=84+82=166，推薦 Scholar。
- BN01 有字典支線則走 factors：martial=8、civil=4，推薦 Warrior。比較完整child，唯一差異為 fate.recommended；六維揭露、gene locks、年齡與身分都相同。
- 無字典分支原save後再fresh load且仍不提供字典，完整snapshot一致，Scholar保留。整個BN04的setFactorDictionary執行次數為0。
- 這證明正常鏈「每次 fresh environment 都人工重載字典」是有實際影響的前置，不是可省略的敘述細節。原 ServiceLoader.initialize／postLoadHook 未載入字典；loadFactorDictionary:260–267 才呼叫 session setter，prepareBreeding:274起會等待它。這些完整資源啟動方法本輪沒有執行，無法由這個受控分支斷言正式玩家必然走哪一條啟動路徑，也不自行定義為產品bug或改設計。

## 精確接線與人工前置

執行完整原 BondingSetupController、BreedingService、NurtureFlowController、NurtureService、UnveilingService、PlayerSaveService、MemoryStorageAdapter 及原 GameSession class AST（建構子與全部方法原樣）。原 ServiceLoader breeding initializer、postLoadHook statement、nurture initializer／port binding、unveiling initializer，及原 Lobby flow constructor、季度 handler、seasonText 都以 AST 精確選取、記錄來源 offset/hash。

人工前置／host ports：
- 父母從封存 generals.json 取得，fixture 覆蓋 age=30、maxLifespan=80、vitality=maxVitality=200；原 normalizeRosterRoles 後放入原 default InMemoryRosterStore。不是新帳號獲取父母流程。
- person registry、historical pairs、factor dictionary 以本機封存表載入；用原建表函式及原 session setter。BN01–BN03每次建立fresh environment都人工再接字典；BN04明確不接。不是完整 ServiceLoader.initialize 資源啟動。
- 提供一張 synthetic owned MentorCard，generalSnapshot 取 catalog 曹操、ep_snapshot=50、stars=0。未執行教官取得、退休或 Legacy holdings 實體存讀。支援 catalog 空、ultimate definitions 空；好友借用未使用。
- Session constructor seed=1；Math.random=0.25、Date固定、timer為測試 host。原 seeded RNG 流與存讀保留；未驗不同種子分布。
- UI-open/event/text/i18n/support/mentor ports 是替身。原 Lobby handler 沒有刪除分支；season report UI 僅收 payload，不載入真正視窗。錯誤 logger port 遇失敗即拋出，避免誤吞錯誤成 PASS。
- 方法觀測 wrappers 先額外掛上 resolve/reject 觀測 handler，再回傳原 promise（run.mjs 的 return r），保留 this/arguments，不修改原結果。因為額外掛了拒絕觀測 handler，本包不是宿主未處理拒絕行為的驗證。原 ServiceLoader／Lobby 整檔沒有執行，只有列明的精確 AST 節點。
- 原 Session default lifecycle port 未設，未執行真退休／死亡搬移流程。低齡父母與child的這條鏈無死亡；不是完整季度所有分支涵蓋。

## 版本、證據與未執行

185個來源 = 178個完整載入module + 3個AST來源檔 + 4個data JSON。185個來源由可信 eff5c260 完整15580檔 Git tree manifest，加固定 f4 單一父提交完整7檔變更與空第二頁驗證。沿用已觀測的21:13:18–21:13:29 UTC master=f4收據，未追新head。使用的 GameSession、Lobby、RivalNations、RivalRulerLines 為 f4 原文；其他來源透過完整變更路徑排除證明沿用。provenance 中 RivalPlayerEvents 原文收據僅為版本證據，本輪沒有執行該 lazy import。

`results/results.json` 包含邊界與每季快照、兩個拒絕控制、正常 admission、單季延續與無字典分支；saved-at-19.json是BN01第19季原已保存payload；BN04直接使用該payload的記憶體副本，sourcePayloadSha256與封存JSON位元組對照，不聲稱另一次從檔案讀入；`events.json` 保存原 Session 全事件／payload；`storage-writes.json` 是主鏈原 Memory set 的 before/written key 觀測（不是磁碟寫入）；`runtime-trace.json`、`module-call-trace.json`、`method-source-receipts.json`、`extractions.json` 區分實際呼叫與原文來源。`execution-scope.json` 明列替身與 NOT_RUN。

NOT_RUN：真 Cocos/browser／完整UI mount與輸入派送、完整 ServiceLoader 啟動、真 localStorage/磁碟/伺服器、跨程序重啟、PlayerRosterService Map codec、退休取得教官、正常鏈後續36回合畢業與Stats consumer（前包已做另一個synthetic-child案例，不能說本child已畢業）、完整suite/typecheck/build/lint、正式公式規格裁定。沒有產品程式修改、push、merge、CI/settings改動、依賴安裝或對外發布。
