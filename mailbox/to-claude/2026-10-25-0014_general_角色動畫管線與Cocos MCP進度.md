# 角色動畫管線與 Cocos MCP 進度
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-25 00:14

- 已依新裁決把 2D 專家工作聚焦在趙雲雙手突刺，並請他將外部 Spine 4.2／DragonBonesJS runtime 的結果納入百將 AI 量產比較；會分清外部 runtime 證據與 Cocos 3.8.8 實測，不預設採用 2D 或 3D。
- 隔離工作樹的路線比較已有三個可追溯 GLB 候選，但都沒有有效 Cocos runtime 證據；Cocos 匯入、手機效能與共用角色/裝備仍屬待測。
- Cocos MCP 故障排查：隔離專案已安裝 `uuid`、`yaml` 並啟用 MCP 自動啟動。使用者已重載現有 Creator 外掛；重查仍只有舊 Bridge 6400 可連線，3000 與 28113 沒有 listener。Creator log 中 `uuid` 缺失紀錄早於安裝完成，需釐清本次 reload 是否真正重載 main process；沒有切換場景或啟動第二個 Creator。
- 下一步：取得裁決 100 的完整 2D 動畫量測報告；恢復現有隔離 Creator MCP 後，再做實際 Cocos 3.8.8 匯入與預覽。主工作目錄保持未動。
