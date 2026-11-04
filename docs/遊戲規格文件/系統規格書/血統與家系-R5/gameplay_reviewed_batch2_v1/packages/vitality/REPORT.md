<!-- doc_id: doc_spec_0297 -->
# G07 精力、疲勞、恢復與加速卡：有界玩法驗證

版本：`eaglhuang/3klife@96a83124094d3b2485bfb749ef37d567ad834559`。日期：2026-11-04 UTC。

## 結論

40 個有界 probe 全數符合所寫斷言，其中包含成功重現的缺口、相容性行為與規格分歧。**PASS 不等於玩法驗收通過**。沒有啟動 Cocos、完整 GameSession / BattleSkillDispatcher、真實存檔服務或 UI，也沒有修改產品碼。

本包驗到：疲勞/培育兩條曲線、休息與訓練失敗成本、男女上限、戰場 gate、補藥的原 session 方法與純 controller、重傷壽命、加速卡與許願原 session 方法、沙漠原回合 phase、奧義原 dispatcher 方法、回復 resolver、戰後扣費與季回復/待產凍結 helper。

## 需要關注的發現

### F1：補藥存檔失敗時，記憶體已扣藥與回復，沒有回滾

- 原 `GameSession.usePillOnGeneral` L898–912：先改 `_inventory`、名冊及發 `InventoryChanged`，再 `await save()`。
- G07-15 注入拒絕的 save：精力 20→70、藥 2→1、事件 1 次，Promise 拒絕後仍保留。純 `VitalityPillController.use` 同樣往外 reject，**沒有證據說它會顯示成功，也沒有證據說資料已寫入磁碟**。
- G07-16 注入未完成的 save，直接並行兩次 controller 呼叫，精力 0→100、藥 2→0、兩次 save 都開始。這證明這兩層沒有 in-flight guard；實機按鈕是否可達、重複操作政策未驗證，不定性為已發生的玩家重扣事故。
- 建議後續確認失敗回復/重試策略與 UI 防連點，並以真實 storage 失敗測試驗收。

### F2：沒有 maxVitality 的資料會把目前精力當上限

- 原補藥方法 L901 及 `BattleRoster.maxVitalityOf` L120–122 都使用 `maxVitality ?? vitality ?? genderDefault`。
- G07-14：男性 `{vitality:20}`、沒有 max，雖男性預設上限為 120，補藥仍回 `vitality-full`，不扣藥。
- G07-40：相同資料的季回復也停在 20，沒有補出 max。
- 這是確定的 fixture 行為；實際載入/遷移是否容許該 shape、是否刻意維持舊上限，仍待驗，不直接稱為正式存檔 bug。

### F3：對酒當歌在精力已滿時仍可生效並花掉精力

- `BattleSkillProfiles` L194–201 的 battle skill 是 `cao-cao-revelry`，回復上限的 20%。canonical ultimate `ult-cao-cao-4` 在本版本資料中成本為 **8%**，不是 20%。
- G07-34/35 連用真實 profile、原 resolver、原 dispatcher/build-context/loader 查價方法及版本綁定 JSON：滿值 100→回復封頂100→扣8→92，並登記本場已使用。
- 這是目前規則的確定行為；沒有找到「滿值必須拒絕奧義」的已裁定要求，故列行為確認/可用性決策，不宣稱規格違反。補元散則明確有滿值不扣的規則。
- 本路徑回復的是 `state.getGeneral(faction)`；沒有執行完整多武將/全軍場景。

### F4：重傷直接扣1年，沒有壽命下界

- G07-18～20：HP ratio ≤25% 算重傷（包含負值）；非有限 ratio 不算。輸入不被原地改寫。
- `applyWarInjury` L18–20 直接做 `resolveMaxLifespan - 1`；`resolveMaxLifespan` 接受任何有限壽命數字。
- fixture 壽命1，重傷兩次後為 -1，之後仍解析為 -1。已閱的壽命規格未給本扣減的最低值，故是需要政策的邊界/資料風險，非已證明違反某個最低歲數。
- 原 `GameSession.recordBattle` L3863–3867 確有接 `applyWarInjury`。本包只靜態核對這一接線，沒有執行整個結算方法，也沒重跑季老化或血統公式。

### F5：FORM02 與目前培育使用的失敗率並非同一條曲線

- FORM02：70%→0、50%→12.5%、30%→35%、0→99%；非有限輸入直接回0。70%與30%的相鄰區間存在跳變。
- Nurture：vigor70→1%、50→8%、30→15%、0→60%。G07-03 比較原函式；G07-05 執行原 `executeRound`，vigor70且隨機0時確實失敗，再扣15精力。
- `PROG-2-1268` frontmatter 正式記載「尚未接戰鬥呼叫端」，中段形狀待企劃確認；`NurtureSystem` 明確呼叫自有 `trainingFailureRate`。結論是不同計算路徑/規格需收斂，**不是用搜尋缺結果宣稱整個 repository 沒接線**。

## 已證實的主要正常路徑

- 培育休息基本40～60、紅因子增加回復、上限100。訓練失敗仍扣體力；受傷跳過回合不扣。此包未驗教官增益或成功訓練傷害/TP公式。
- 戰前 `checkDeployable` 精力29不准出戰，30可；戰內 >50% 允許奧義，10%～50% 仍允許種子戰法，<10% 擋種子戰法。basic helper 永遠允許，完整普攻/移動 caller 未跑。
- 奧義僅 applied 後扣費及記本場使用；無目標、撤退鎖、精力 gate 阻擋不扣；重播已使用奧義不扣。
- 補元散+50、高級+100封頂；滿值拒絕且不扣、缺物或查無武將不改狀態；成功使用 await一次save。
- 沙漠已接 `BattleController` L1231–1259：雙方回合皆傳地形精力 callback；原 `BattleTileEffectPhase` L173–182 取同陣營存活單位的最大 drain，主將只扣一次，S=2，其餘級=4，夾0。不是未接，也不是多部隊相加。
- 加速卡每張2小時，剩餘時間ceil決定實耗、整數卡數floor、庫存限制；許願領取只發一次。直接 `applySpeedCards(NaN)` 可污染時間，但正式 `speedUpWish` 經 `speedCardsNeeded` 擋下，不能把 helper 異常當正式 caller 已暴露。
- 許願開始/加速/領取三個 session 方法明寫不自動save，本包也驗到0次；上游是否負責保存未驗，故不稱「許願必定遺失」。
- 戰後依 supplied battle vitality 再扣30；ongoing不扣。季回復本季出戰10%、待命30%，封頂且死者不回。`holdPregnancyVigor` 覆蓋待產武將回復，與原 GameSession L3385–3386 呼叫順序一致。

## 方法與證據界線

- 34份來源都固定同一 commit，`SOURCE_MANIFEST.json` 記錄 Git blob SHA-1、SHA-256、位元組及原始 URL。重新利用的已封資料先重新驗 blob；沒有借其他進行中的工作資料。
- 直接 import 完整純模組：AccelerateCard、DesertVitality、FatigueFailureRate、VitalityBattleGate/Cap/Pill、WarInjury、WishPool、PlayerInventory、GeneralAging、VitalityPillController、VitalityRestoreSkillResolver、BattleSkillProfiles及必要依賴。
- 避免載入 Cocos/全 session 的部分以 TypeScript 5.9.3 AST 擷取**未改字的完整原函式/方法**，以明示 fixture 及注入依賴運行。`probes/results.json` 記 source UTF-16範圍、行號、method/body hash、AST原文相等驗證，並逐案記實際呼叫trace。非完整原模組初始化，非整機E2E。
- Nurture：教官成功率stub為0（fixtures無教官），rollMentorSlots空、synergy無、回合事件無。只主張休息、失敗與skip分支，成功訓練/教官/事件未驗。
- Dispatcher：天氣與戰法條件放行、combo無、祖靈不追加、withUltimateAttack原樣；多數案例executor回controlled結果。G07-34～36用原回復resolver；除回復/查單位外的execution context callbacks未觸發。真實奧義成本使用原loader查詢函式與本版canonical JSON。
- Tile phase：formation/morale/tally及火格掠奪/落石副作用stub；無tile hazard、無DOT、無死亡單位待處理；只主張實際執行的沙漠分支。
- BattleRoster：trial傭兵stub為false、里程碑stub為空、沒有performance/seasonId；只主張該分支精力/出戰標記。出戰資格的子嗣判斷stub為false，只測成年一般武將精力門檻。
- 所有 save 都是可控制stub。未跑原產品test suite、型別檢查、完整建構、真實storage/重開遊戲、UI按鈕狀態、戰鬥畫面、版本以外的main，也不推斷其他caller不存在。

## 下一步驗收

1. 真實存檔 adapter 注入失敗，確認補藥與戰後結算的交易/回滾政策。
2. 實際載入只有 vitality 沒有 maxVitality 的存檔，確認遷移政策。
3. 真實UI重複點擊/保存中關閉再開，以及補藥失敗提示。
4. 玩法/數值決策：兩條疲勞曲線的適用範圍、滿精力回復奧義是否允許、戰傷壽命下界。
5. 完整 BattleController→戰內精力→recordBattle→save→reload，許願上游save擁有者及待產跨季全鏈路。

來源可直接由manifest的固定commit URL查閱；本報告行號全部對應包內同版來源。
