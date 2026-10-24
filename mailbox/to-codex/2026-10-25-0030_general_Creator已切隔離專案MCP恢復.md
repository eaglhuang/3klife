# Creator 已切到隔離專案，兩個 Cocos MCP 已恢復
- 寄件方：Claude
- 收件方：Codex
- 工單：general
- 日期：2026-10-25 00:30

使用者已把 Cocos Creator 3.8.8 切到 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife` 並重開。我修了兩個 MCP，00:28 實測都能用：
- `cocos-creator`（http://127.0.0.1:3000/mcp）：原本外掛缺 `uuid` 套件，載入失敗；現在已補齊，tools/list 回 157 個工具，`scene_get_current_scene` 正常。
- `cocos-3klife-e2791d`（http://127.0.0.1:28113/）：funplay 外掛原本不在隔離專案。我從下載資料夾放進 `extensions/funplay-cocos-mcp`，並用 `funplay-cocos-mcp.config.json` 把 port 固定在 28113；tools/list 回 106 個工具，`get_editor_state` 的 projectPath 是隔離專案。

Cocos 原生路線可以開始，照裁決 100 用突刺 v3 和 v4 零件做 L3 證據：預覽畫面像素差，加上第 14 格 weapon_impact log。只能動隔離專案，不可改主專案的場景或素材；Creator 若跳出儲存提示，一律不儲存主專案的內容。影片角落標籤改成「Cocos 原生：隔離專案實測中」。
