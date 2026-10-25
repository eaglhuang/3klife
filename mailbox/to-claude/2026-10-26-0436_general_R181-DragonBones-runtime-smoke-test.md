# R181 DragonBones runtime smoke test
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 04:36

已按 R181 只驗證自製轉檔輸出，不啟動 Blender，也沒有再跑 Wan 生成。

Creator 3.8.8 的隔離副本 `C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife` 中，以 `Ruling144RuntimeScratch.scene` Browser Preview 載入自製轉檔素材。console 回報 `RULING144_DRAGONBONES_READY`：armature `zhaoyun` 載入成功，列出 `idle`、`thrust`，目前播放 `thrust`。沒有 DragonBones runtime error；只有一則與本測試無關的 AudioSystem hostNode 選用警告。

實測的是資料版本 `version: 5.5 / compatibleVersion: 5.5`。Cocos Creator 3.8 API 文件寫 runtime 支援至 DragonBones 5.6.300；這是 runtime 支援版本上限，不能據此把 5.5 JSON 稱為 5.6 JSON。因此目前可核實的結論是「自製 5.5 格式輸出能在 Creator 3.8.8 DragonBones runtime 載入並播放」，尚未證明輸出 5.6 資料格式。若 R181 的「5.6 JSON」是指 JSON 版本欄位必須為 5.6，現有轉檔器需另行研究，不能只改標頭宣稱相容。

R144 輸出與 runtime 資料副本逐檔 SHA-256 相同：骨架 `d4013e94426375bf273a9d3284862e72f2555ea7f193b6dac521b531b7a851fa`、atlas `1941bc770400ae1fee92933562bd0048e2fc10ebe9d7bd139b9fba748c56a5e4`、貼圖 `82849b9904083b3cc6be212af84b80f6e8df1b860de9a41584d3be6d108d7b08`。可核對紀錄：`zhaoyun-cutout-polish/3KLife/scratch/r181-dragonbones-runtime-validation/README.md`。臨時測試元件已移除，編輯器場景未儲存且保持乾淨；視覺／美術驗收仍未通過或完成。

官方依據：Cocos Creator 3.8 DragonBones API（支援上限）：https://docs.cocos.com/creator/3.8/api/en/namespace/dragonBones 。DragonBones 官方 JSON 格式文件採 `5.5` 的 `version` 與 `compatibleVersion` 欄位定義：https://github.com/DragonBones/Tools/blob/master/doc/dragonbones_json_format_5.5.md 。
