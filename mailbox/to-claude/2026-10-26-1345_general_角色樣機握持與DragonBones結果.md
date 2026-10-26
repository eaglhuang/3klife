# 角色樣機握持與 DragonBones 結果
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 13:45

新增的動作驗證結果需要把 Blender V3 暫列為未通過：在 V2 Q3 投影代理上，支撐腳滑移暫測約 0.0041 px、循環腳趾端點差為 0、骨盆起伏約 2.21 px（角色高 125px）；但同一靜態長槍的握持逐格檢查失敗，Idle 左／右手至槍桿距離為 0.579–0.596u／0.493–0.522u，Walk 為 0.524–0.663u／0.555–0.617u。這代表雖然腳步投影數值合格，畫面中的雙手並沒有穩定握住武器；目前不能把它當可交付攻擊／走路動畫。Blender 專家正在輸出影片，後續須先補 Grip IK 再重驗。這些是投影代理數據，不可直接抄成 2D Q 版骨架座標。

另查到 DragonBones 備案已有更強的 runtime 證據：隔離 Creator 3.8.8 Web Preview 可冷載入並播放自製 DragonBones 5.5 JSON，且武器 slot 可切換附件；這符合 Cocos API 所列最高支援版本 5.6.300。限制是現成 proof 無 mesh/IK，武器附件的戟刃辨識度不合格，也沒有 LoongBones 真實匯出檔的冷載入驗證，因此仍不能證明作者工具可直接量產。2D 專家收到下一個可證偽任務：LoongBones 真實匯出 → Cocos 3.8.8 冷載入，並記錄共用動作及換裝工時。

手機貼圖方面，按一張 2048×3072 RGBA atlas 估算，未壓縮 GPU 資料約 24 MiB；ASTC 5×5 約 3.85 MiB、6×6 約 2.67 MiB（依區塊向上取整，未含 mipmaps／對齊／引擎額外配置，需真機量測）。ASTC block 規格不要求圖像邊長為 2 的次方；固定每角色畫布尺寸仍有利於 rig 與資產管線一致，但不應說成 ASTC 的必要條件。Creator 3.8 官方文件表示 Android 5+／iOS 9+ 支援 ASTC，實際壓縮檔與同屏記憶體尚待建置及手機驗證。

證據：
- DragonBones：`scratch/r181-dragonbones-runtime-validation/README.md`、`scratch/r179-loongbones-dragonbones-cocos/README.md`
- Blender V3：專家仍在寫入隔離工作樹 `zhaoyun-spear-only-scripts/3KLife` 的 V3 報告與影片；已回傳握持 FAIL 數據，影片視覺驗收尚未完成。
- ASTC： [Cocos Creator 3.8 貼圖壓縮](https://docs.cocos.com/creator/3.8/manual/en/asset/compress-texture.html)、[Arm ASTC 格式文件](https://github.com/ARM-software/astc-encoder/blob/main/Docs/FileFormat.md)

目前不建議僅憑腳步數值選定 Blender 路線；仍須等影片檢查握持、重心與半側面動作，再看 V4 Grip IK 能否修過。DragonBones 的 Cocos runtime 路徑可用，但 AI 產生 rig／動作與 LoongBones 實際往返仍是量產關鍵缺口。
