# PROG-2-0138 鎖定培育事件列顯示修復

## 修復範圍

依 0131 第 3 步，未解鎖的培育事件列只顯示星等提示。toMentorCardLayoutState 僅在 events 頁且 row.locked 時將顯示名稱映射為空字串；事件資料、星等門檻、支援效果頁所有效果名稱、小插曲均不變。沒有改 UI 尺寸、版面或 0131 原始證據。

## 驗證

- 新增兩個回歸案例：★0／★2／★5 的事件內容與鎖頭、支援效果與小插曲不受影響。
- 原版新增測試失敗：Expected empty string, got 戰法2。修正版 MentorCardTabs 全部 10 案通過；原生命令證據已登錄，exitCode 0。
- 全套 headless：原版新增測試後 2445 通過／2 失敗／3 略過；修正版 2446 通過／1 失敗／3 略過。剩餘 BondingSetup 的 HUD 與選卡區重疊是前置 PR483 的版面問題，未混入本卡修改。PR483 已轉回草稿並補上此失敗。
- 標準閘門：保存既有 ATM 修復與 0133 殘留後，精確檔案 scope 下 9/9 通過，隨即恢復全部原變更並保留 stash。第一次傳目錄給舊版鎖工具觸發 EISDIR，改用明列檔案後正常上鎖；失敗診斷保留。
- UI strict 驗證通過；全專案 snapshot 仍有既有 +255／~19 差異，未覆寫 baseline。localhost:7456 refresh 沒有可用的既有 Editor，使用獨立 CLI Web 編譯。
- 編譯輸出 build/web-mentor-0138，基底 HEAD 2846fb56885672ab5616ef51358e22401b1fd701，包含本次尚未提交的一行程式修復。編譯時 MentorCardTabs.ts SHA256：92cbf58f905609074cd7e9d5a4dfcb9e986516e4e8fdb5eab8c061fa0bc5ec36。
- Web 真實指標：登入、序章、宿命抽選、教學，再依 0131 允許的除錯入口開啟 ★2 測試卡；實際點擊事件／小插曲頁、關閉、重開。鎖定事件列名稱空白，★3～★5 提示保留；支援效果鎖定列仍有名稱。瀏覽器錯誤 0，頁籤與重開檢查通過。
- 畫面裁切後先看 125px，文字不足辨識再看 250px，可見未解鎖事件列只剩右側星等提示。
- 文字編碼檢查通過；Cocos 建置產生的未追蹤 meta、五份字型 meta 與 settings information 異動已清除或還原。

## 限制與交接

這是 0138 顯示修復，沒有宣告完整 0131 通過：真實培育訓練入口的有／無教官情境仍待驗收。mentor-observation.json 的 completed:false 保留此限制；steps1to5Passed 僅代表除錯入口的局部驗證。

正式證據位於本目錄；未提交的完整截圖與診斷保存 artifacts/0138-diagnostics。原始完整 headless、標準閘門與建置輸出亦保留 artifacts/0138-*.log。

下一步另卡修復 HUD 跨區塊重疊，重跑完整測試後再處理前置 PR 合併與 0131 全卡驗收。
