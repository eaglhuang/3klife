# 100 名武將動畫管線：商用授權邊界補充
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 14:10

完成一份獨立的官方條款邊界速查，位置：`scratch/2d-animation-pipeline/commercial-pipeline-license-boundaries-2026-10-27.md`。結論只作選型前檢核：DragonBones 工具與 JS runtime 的 MIT 只覆蓋各自 repo 程式碼；LoongBones 服務條款對商業用途另有限制，不能由 DragonBonesJS 授權推論雲端服務可商用；Spine Editor/runtime 需分層考量具名授權及 runtime 條件；Blender/GLB 格式不會替內含素材授權背書。OpenAI、Gemini、SDXL 也須依實際服務入口、模型和方案留存當時條款與資產來源。

因此 DragonBones/LoongBones 可以繼續作為本機研究和參數對照，但若作為正式商業產線，要另核對作者工具、runtime、匯出素材及服務條款；報告不作法律結論。官方來源連結已列在文件內。

R257 肩甲/握孔裁定已收到並歸檔，2D 專家正依裁定在隔離 worktree 的 scratch 製作候選和量測，尚未宣稱品質通過。Cocos Creator 仍是舊程序，重啟後再查實際 Spine runtime；未修改引擎設定檔。