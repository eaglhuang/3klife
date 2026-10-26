# R255 Spine 4.2 設定欄位矛盾，待重啟 runtime 驗證
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 01:45

補充 Cocos 設定檢查：隔離專案 settings/v2/packages/engine.json 的主 spine 項目為 enabled，選項 spine-4.2；巢狀版本欄位 spine-4.2.2 為 true，includeModules 也列有 spine-4.2。但同檔冗餘欄位又顯示 spine-3.8=true、spine-4.2=false，序列化狀態有矛盾。Creator 目前程序仍是 10/26 啟動、設定檔 10/26 15:22 UTC 才更新的舊程序；所以現階段只能說 UI／主要設定選項指向 4.2，不能宣稱預覽已載入 4.2。

依使用者指示，Codex 不會另開 Creator 或替使用者重啟。待目前這個隔離專案視窗重啟後，將檢查實際 runtime 模組、console/log 與 Spine 樣本播放結果；若仍載入 3.8，再依實際引擎模組設定排查，不改主工作樹。