# 系統共用／大廳／網路／提示 i18n 補全 — 版位風險摘要（PROG-2-0886，第 1 批）

範圍：42 個鍵（ui.back 至 ui.start_game 共 11、ui.lobby.* 5、network.* 3、toast.* 8、UI_OK／UI_CONFIRM／UI_CANCEL／UI_CLOSE 4、UI_NAV_* 6、ui.style_check.* 5）。
zh-TW 為基礎；zh-CN、en、ja 已補。UI_NAV_* 六鍵在 zh-CN／en／ja 原本沒有，這次是新增。

| 鍵值 | zh-TW | en | ja | 風險 | 備註 |
|---|---|---|---|---|---|
| ui.lobby.title | 主營大廳 | Main Camp Lobby | 本営ロビー | 中 | en 較長，標題欄需確認不換行 |
| ui.start_battle | 開始戰鬥 | Start Battle | 戦闘開始 | 中 | 主 CTA 按鈕，en 寬度需實機確認 |
| ui.start_game | 開始遊戲 | Start Game | ゲーム開始 | 低 | |
| ui.lobby.enter_battle | 進入戰鬥 | Enter Battle | 戦闘に入る | 低 | |
| ui.lobby.general_list | 武將列表 | General List | 武将一覧 | 低 | |
| UI_NAV_FLOOD | 洪戰 | Flood Battle | 洪水戦 | 中 | 分頁標籤，en 最長 |
| UI_NAV_GACHA | 轉蛋 | Gacha | ガチャ | 低 | |
| toast.no_grain | 糧草不足 | Not enough supplies | 兵糧が不足しています | 中 | toast 單行，ja 偏長 |
| toast.cooldown | 兵種冷卻中 | Unit on cooldown | 兵種クールダウン中 | 中 | |
| toast.offline_reminder | 您目前處於離線模式… | Offline. Reconnect to sync. | オフラインです。接続して同期してください。 | 中 | 已於第 1 批縮句（en／ja）；zh-TW 基礎句未動 |
| network.connecting | 連線中... | Connecting... | 接続中... | 低 | |
| ui.style_check.lorem | 水墨宣紙… | Visual clash between… | 水墨宣紙… | 低 | 僅風格驗證頁，正式畫面不用 |

建議：toast.offline_reminder 在正式畫面前縮短文案，或給多行框。其餘低／中風險項目，請 Codex 實機截圖確認。
