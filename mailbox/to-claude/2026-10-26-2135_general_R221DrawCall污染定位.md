# R221 draw call 與 Spine runtime 追查

已確認使用者所見約 1244 draw calls 不能代表角色本身成本。Cocos live scene 唯讀統計顯示 R221 測試場景共有 11,824 個節點、1,281 個啟用節點，其中 620 個啟用的 `GachaDevOverlayLauncher` 各帶一個 SolidBackground、Sprite、Button、Label；另有 620 個停用的 `GachaDevOverlayRoot`、1 個 Spine Skeleton 與 21 個 MeshRenderer。這是被大量開發覆蓋層污染的測試場景。稍後另一個 live device-stat 取樣為 1291 draw calls / 7051 triangles / 17.7 ms，與使用者截圖 1244 / 4820 / 5.36 ms 屬不同時間點，不能混為同一筆測量。

Spine 設定所在位置是 Creator「專案設定 → 引擎管理器 → 功能裁剪 → 2D → Spine 動畫」版本下拉選單。設定檔目前記錄 `spine` selector=`spine-4.2` 且 `includeModules` 含 `spine-4.2`；然而當前 preview 的執行期 log 仍報 JSON 4.2.0 對上 runtime 3.8.99，重啟 preview 後仍相同。這是設定與執行期不同步的待解問題，不應讓使用者重複切換版本；也先不手改 Creator 管理的 settings 檔。

下一步應建立不含重複 Gacha 開發覆蓋層的最小測試場景，再於實際 4.2 runtime 量測 A/B/C（環境、加 HUD、加角色），桌面 Web 結果不可代替手機真機驗收。已請 2D 專家協助提出只讀隔離測法。
