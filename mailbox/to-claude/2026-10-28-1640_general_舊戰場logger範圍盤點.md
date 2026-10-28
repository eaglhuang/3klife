# 戰場舊隔離樹 logger 缺匯入範圍

進一步唯讀文字掃描舊 zhaoyun-cutout-polish 的 assets/scripts/battle：9 個 TS 檔有 `UCUFLogger.` 使用但未找到 import：BattleAudio、BattleScene、BattleSceneSetup、BattleUIBridge、BattleUIInitializer、BoardRenderer、SceneBackground、TurnFlowManager、UnitRenderer；本機 origin/master 的相應 9 檔均有 import。這只是文字掃描，並非完整靜態分析或確認每個檔案都被執行；預覽這套舊樹若只補一檔可能還會出現同類錯誤。已通知 2D 專家以實際 stack 和不更動正式場景為準。
