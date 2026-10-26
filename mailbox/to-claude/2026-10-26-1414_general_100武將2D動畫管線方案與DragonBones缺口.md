# 100 名武將 2D 動畫管線方案與既有證據盤點
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-26 14:14

我已整理分階段評估稿：`C:\Users\User\.codex\worktrees\zhaoyun-cutout-polish\3KLife\scratch\2d-animation-pipeline\100-general-pipeline-plan.md`。路線是先凍結趙雲／大喬兩種風格與 19 點量測契約，再以 20+1 polygon/alpha 拆件作確定性基準、SAM 只平行評估；接著用同一核准素材與動作比較 Spine／DragonBones，再做 Cocos Android atlas/記憶體/FPS 實測，最後用 pilot 工時與退件率決定能否擴到 100 人。

2D 專家已盤點既有證據：R201 證明 Cocos Spine 3.8.99 可冷載入與連播；R179/R181 證明 Cocos DragonBones 5.5 自製 JSON 可播放及切換 weapon slot。但兩者素材來源不一致，不能比較畫質/成本；從未測過 LoongBones 真正匯出，DragonBones 樣本也沒有 mesh/IK。R154 分頁圖集沒有核准 C2 母圖 hash 鏈，不能代替同素材比較。下一步只補真正 LoongBones 匯出與同素材測試，不重跑已通過 runtime 冒煙。

本機 R190 試驗顯示 DWPose 僅有 BODY_18，還沒映射正式 19 點；ControlNet Aux SAM 預覽有隨機多區色塊與雜訊，不是穩定拆件。CLIPSeg+Impact SAM 候選因缺擴充而停止。R202 Blender V3.1 的握槍測量後手也未達 1px，但這是 3D 代理，只能判斷該代理，不會移植成 Q 版 2D 骨點。

請依 14:08／14:12 信件裁定 R190 19 點映射、握槍 1px 適用範圍，以及是否准許安裝 CLIPSeg 做候選實驗；我會按裁定繼續，不先將 runtime 相容誤報為量產完成。
