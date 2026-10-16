# PROG-2-0139 大廳側欄跨卡片重疊修復

## 修復

PR483 將 HUD 加高至 504，造成選卡區重疊；原始跨卡測試與新增二維幾何檢查均可重現。這次保留 320 寬側欄，將八個入口排成兩欄四列、按鈕 144×44，HUD 高度改為 312。選卡卡片 top444、高232；主將卡片 top688、高276；三卡間距各12，最下緣964，底部導覽列從988開始。英靈仍在沙盤下方。

只修改三份 layout JSON；沒有改按鈕綁定、遊戲規則、字級或現有 BondingSetup 跨卡斷言。

## 驗證

- 原版新增幾何檢查：FAIL，SeasonHudCard overlaps DeckSelectCard。
- 修正版二維幾何：三卡在1920×1080畫布內、互不重疊；HUD所有子控制項在卡內且不重疊；八個按鈕至少44×44；英靈位於沙盤下方；三卡與底部導覽列不重疊。
- 完整 headless：2447 通過、3 略過、0 失敗，保留原有 BondingSetup 檢查。另以原生 evidence run 執行完整命令，exitCode0。
- 標準閘門：保存其他卡的 ATM 修復殘留後9/9通過，隨即恢復全部原變更並保留stash。
- UI strict 驗證通過；snapshot仍有既有+255／~19差異，沒有覆寫全專案baseline。此次HUD的right錨點改為固定欄寬與left，屬預期結構變更。
- 獨立 Cocos Web：build/web-sidebar-0139，基底c816a323ef3246fa855a886f8798f687d64b71bf加本次三份未提交layout變更。HUD編譯時／驗證後SHA256：ce1c743a3e1213ea540afa1b629082ea3905ab14e5b6948bf0f26045761306c0。
- Web實際量測1920×1080及1280×720：三卡與GameplayNavigation均可見、在視窗內且互不重疊，八個入口均在HUD內；兩種比例皆以實際滑鼠開啟並關閉英靈圖鑑。瀏覽器錯誤0，flow completed:true。
- 初次截圖有開發版效能統計遮住側欄，原始圖片／觀察保留artifacts/0139-with-debug-overlay。只呼叫引擎profiler.hideStats關閉除錯覆蓋層後重跑，沒有修改正式遊戲程式或資料。桌面面板裁切先看125px，為辨識文字升至250px，文字與卡片間距正常。
- 編碼檢查通過。編譯生成的226份未追蹤meta與五份字型meta、settings information異動已清除或還原。

## 交接

本目錄保存檢查腳本、二維幾何、兩種比例的實際量測、裁切圖與Web報告。完整原始截圖與診斷另存artifacts/0139-diagnostics；完整命令輸出保留artifacts/0139-*.log。

此卡只修復側欄重疊與入口可點擊；完整0131的真實培育入口與0132的有資料／多語／捲動情境仍未驗收。須依前置PR順序審查，不把本卡通過當作整個專案完成。
