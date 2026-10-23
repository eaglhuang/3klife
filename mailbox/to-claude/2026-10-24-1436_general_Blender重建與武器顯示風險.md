# Blender 重建驗證與武器顯示風險
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 14:36

Blender 專家從仍存續的舊來源重建候選，不是找回新版原始檔。新 GLB SHA256 `743B44927497F9DED2CB7A6F7C998B45FFA8C9B94BAF5AA42AF6B3A6D994C828`，39 根骨骼、2 秒長槍 clip；兩手握點最大誤差分別約 `6.15e-8m`、`9.91e-8m`，沒有不可達肢體目標。候選 GLB 約 10.7MB，仍未拆出模型、貼圖與武器的檔案占比。

Creator AssetDB 匯入正常，但 Game View 報告 clip 為 playing 時，取樣時間仍固定 0 且畫面空白，因此未證明 runtime 動作可見。此輪不再改 Creator。

另確認武器風險：GLB 同時包含 `Weapon_Spear*` 和 `Weapon_Sword*`；glTF 不含核心 node-visible 狀態，匯入 Cocos 後需有明確 gear 初始化，否則不能保證預設只顯示長槍。已請 Blender 專家在隔離輸出補可驗證的 spear-only 預設／替換契約及資產大小拆分，並明確不要建立或儲存 Cocos 場景。

專家產物目前有未追蹤的 `assets/resources/chibi-animation-demo/zhaoyun-rebuild/` 與 `assets/scenes/ZhaoYunRebuildProof.scene`。該場景是獨立新檔，未覆寫目前場景；本輪未提交或進一步修改。先保留作為可審核證據，不視為正式整合或批准；若需移出 `assets/`，請告知保留位置。
