<!-- doc_id: doc_spec_0298 -->
# 原生出征 → 零領地 → 滅亡 → 保存／讀回

固定版本：106f053db7b7d7af8d800722158c4a35bb65d3aa。無追逐新 HEAD、產品修改、推送、安裝、真實瀏覽器或本機操作。

## 結論

NF01 正常、NF02 第12季主存寫入前拒絕，兩組 PASS。這是「明確初始持有名冊 fixture」下的原生消費鏈，不代表實際抽卡取得名冊，也不是完整 Cocos 開機／點擊測試。

- 使用原始 generals catalog 的曹操、關羽、趙雲，經原 enrollGenerals 與預設 InMemoryRosterStore 入冊。未修改戰鬥數值，透過原 rivalBattleSquad 選出陣容。
- 自然推進0→11季，呂布仍1地、9684兵。呼叫原 _mountRivalDiplomacy 註冊的選國及 Campaign handler，一次勝利使其1→0地、9684→6779兵、atWar false→true，fallen 尚未標示。原 LocalGachaService 金幣100→891，新增一筆 AUTO_RESOLVE 戰鬥快照。
- 自然推進12季，原他國成長仍先執行，呂布6779→7318兵；原 RivalPlayerEvents 將零地勢力標為 fallen true，atWar true→false。allied 原本已false，campaign也設false，本輪只證明仍false，沒有證明true→false解除同盟。
- 第12季同時執行原南蠻襲擊：先恢復／成長至糧3731、兵3000，再扣373糧、150兵，留下3358糧、2850兵。保留了第6季襲擊及所有原自然恢復流程。

12只是選定的觀測點；實作以零領地判定滅亡，不是每12季排程。來源明示此條件為暫定，並非使用者新裁定。訊息雖寫「殘餘武將流入各地傭兵市場」，原檔註解明示這項轉移尚未接線；本輪沒有驗成真實傭兵轉移。

## 兩次 campaign 保存不是相同 payload

原序列為 grantCurrency → wallet寫回／第一次save啟動 → recordRivalCampaign → setRivals／第二次save啟動。記錄實際儲存呼叫，不把兩次保存視為原子交易。

- 第一次主存：金891、呂布仍1地、沒有戰鬥快照。
- 第二次主存：金891、呂布0地且6779兵、atWar true、1筆戰鬥快照。
- 實際記憶體adapter執行順序：兩次backup attempt、兩次backup commit、兩次primary attempt、兩次primary commit。最後主存及全新 GameSession／LocalGachaService 讀回等於campaign完成後的狀態。
- 沒有在campaign中注入故障；不據此宣稱並行I/O、崩潰或所有儲存實作均安全。完整參數、payload與事件順序見 results/results.json。

## 正常與故障續行

NF01：第12季保存成功後才發 SeasonAdvanced。原Officer HUD通知listener依原start先後順序先註冊，Rival Diplomacy listener後註冊；滅亡及南蠻通知被消費且發送SHOW_TOAST。fresh load讀到第12季、fallen true、atWar false、金891、糧3358、兵2850，通知佇列空。

NF02：只在第12季主存set前拒絕。live已到12季，滅亡和資源扣減已完成，兩則通知留在live；主存仍第11季campaign完成狀態，backup同為第11季。沒有SeasonAdvanced，Lobby記一次失敗並發「推進季度失敗」。

- 全新load還原11季、0地但尚未fallen、atWar true、金891、糧3581、兵3000，沒有持久化通知。複製原adapter鍵值以隔離分支後再自然推進12季，重新產生滅亡及襲擊，正確發送兩則通知，保存及再次fresh load吻合。
- 原live實例再次推進到13季，不會回到12季。無新滅亡／襲擊，兵自然補回3000、糧3508；原兩則待發通知在13季成功保存後送出，保存及全新load吻合。這是延後通知，不是12季交易回滾或原季重試。

## 手動輸入與執行界線

唯一初始資料：選上述三位catalog將領並設age20/maxLifespan100/vitality100/maxVitality100，避免無關壽命死亡；food2003/cityTroops1007、wallet gold100/gems0/tickets0；全部他國relation -90/resources.gold0，刪除初始proposal。沒有改任何領地、fallen、allied或atWar。原世界、招募、軍力成長、恢復、存讀、事件模組保留。

初始seed137，GameSession RNG0.99抑制無關來犯，Lobby Math.random0.25；固定Date為2026-11-04T00:00:00Z。其後沒有調整鐘、旗標或領地。captured host僅接原按鈕，不模擬真Node；refresh為記錄port。UI.open只記錄原季度報告要求，不是真實報告面板。i18n採key fallback。未使用自造陣容、戰鬥或結算公式。

原GameSession完整class AST、LocalGacha初始化/save、原EventSystem、ServiceLoader原setEventEmitter語句、原Rival mount、Officer HUD精確notice-registration call均執行。非完整ServiceLoader／Lobby boot。來源211檔，實際full-module載入153檔，精確AST片段另列execution-scope/extractions；不把同包全部來源視為已執行。

## 與既有證據的關係

舊G23（96a8312）已記錄人工零兵零地fixture可重複campaign得金，當時wallet/save是替身。本輪沒有重做刷金、未宣稱修復守門缺口；新增的是catalog名冊實際戰勝至「仍有兵的零地」、原wallet兩次保存差異、下一季滅亡與真實MemoryStorage fresh-load鏈。未測落敗campaign或fallen後重複campaign。

保留的prior-birth-coverage證據證明舊出生批次已呼叫 RivalPlayerEvents 22次（BN01 20、BN03 1、BN04 1），不是「從未執行」。那不等同本輪滅亡鏈或背叛覆蓋。

WARLORD／RAIDER被proposeAlliance拒絕，而玩家盟友背叛只由WARLORD觸發；本輪不人工製造盟友來宣稱自然可達背叛，也沒有將任何暫定調校值升格為產品決策。

## 重播與來源

python verify.py：驗package seal、完整eff Git tree、f4七路徑bridge、四個線性commit與27路徑compare、固定HEAD觀測收據、211來源hash、TypeScript5.9.3編譯器hash、AST片段，並在全新外部目錄實際重跑兩組，逐檔比對輸出。

source manifest與provenance沿用已證明的原始closure，未改產品來源。驗證器不需網路、父包、第三方套件安裝或原checkout；只需既有Python3與Node。未聲稱真實磁碟持久性、主機崩潰安全、完整UI、背叛、同盟解除或機率平衡覆蓋。
