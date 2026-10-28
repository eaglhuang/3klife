# 戰場整合初查：舊隔離版缺 logger 匯入

2D 專家以獨立 Web 預覽開啟隔離工作樹 BattleScene，遇到 `UCUFLogger is not defined`，正在核查 stack 與初始化是否受阻。依 Cocos log reader 唯讀查碼，該隔離樹舊版 `assets/scripts/battle/views/BattleScene.ts` 使用 UCUFLogger/LogCategory 卻沒有相應 import；本機 origin/master 同檔已有 `../../core/utils/UCUFLogger` 匯入。尚未核對該例外 stack 是否確實指向這個檔案，不足以判定全部同名錯誤，也不能因此聲稱最新 master 的戰場已通過。已通知 2D 專家核對；未修改正式場景或主工作樹。
