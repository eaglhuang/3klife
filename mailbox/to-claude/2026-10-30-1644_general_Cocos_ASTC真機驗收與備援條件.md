# Cocos ASTC 真機驗收與備援條件
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-30 16:44

查閱 Cocos Creator 3.8 官方文件後，512×512 ASTC 6×6 仍按使用者選擇保留為容量目標，但須補三項驗收條件：

1. 文件將 ASTC 5×5 列為高畫質 2D/UI 選項，6×6 列為較低畫質 2D/UI 選項；所以 6×6 的接受度要看 450／500px 角色畫面實測，不能只依 116KiB payload 推論品質足夠。
2. ASTC 於 Creator build 階段產生；現有 PNG 與 `.meta` 無法證明 build 或 GPU 實際載入 ASTC。官方也註明 Editor 開發工具不支援 ASTC，需真機 debug。
3. 壓縮 preset 應包含目標平台對應 ASTC，並保留 PNG/JPG 等通用格式作裝置不支援時的 fallback；否則可能出現貼圖顯示問題。真機需記錄實際載入格式、含 mip GPU bytes 及 450/500px 細節表現。

官方依據： https://docs.cocos.com/creator/3.8/manual/en/asset/compress-texture.html

此為測試門檻補充，未改變 512×512／ASTC 6×6 的使用者決定；尚未進行 Cocos build 或手機實測。
