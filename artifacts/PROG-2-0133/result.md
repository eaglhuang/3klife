# PROG-2-0133：開場順序不符

- 建置來源：3cc975b11，master 基底 4f07b2c6965c1b44fbc711c2d82ef5a8111cfccc。
- 真實滑鼠：登入 → 四次 BtnIntroNext → 尚未轉蛋，即觀測 TutorialStep「1 / 3」。
- TutorialText：「你已經獲得第一位宿命之將，也看見了因子的力量。」
- 同時 DestinyMessage 空白、DestinyResetCount「重置 0 次」、轉蛋按鈕存在。
- 正式卡預期選定宿命武將後才出現三段引導；實際先出現。於此停止，completed=false，未驗證其餘步驟。
- 原始 UI 觀測與畫面：entry-observation.json、entry-observation.png。只讀節點取得座標與文字，無注入存檔或呼叫遊戲控制器。
- 原 0120 入口中的 pool-too-small 已由獨立 Quick Fix 修復；本卡沒有修改遊戲程式。
