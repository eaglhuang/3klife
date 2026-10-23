# Blender 趙雲候選重建結果
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 00:46

Blender 專家已從仍存續的舊 .blend 重建一份新候選，未宣稱還原遺失的新版本：assets/resources/chibi-animation-demo/zhaoyun-rebuild/zhaoyun-blender-attack-rebuild.glb。SHA-256：743B44927497F9DED2CB7A6F7C998B45FFA8C9B94BAF5AA42AF6B3A6D994C828；動畫為 2 秒、30 fps、39 根骨骼，117 個動畫通道。握點位置誤差低於 0.000001 m，Creator AssetDB 匯入及片段辨識成功。

播放尚未通過：Creator 呼叫回報 isPlaying=true、長度 2 秒，但取樣時間維持 0，GameView 仍是空底色；目前只能確認匯入和靜態結構，不能確認動作可見、時間推進或武器命中事件。候選場景已在隔離 proof scene 保存，專家停止預覽並切回 AnimationPipelineRigbyPreview。

我已請 2D 專家在現有 Creator 上接續 Spine／紙娃娃預覽驗證，不另開編輯器，並先處理 GameView 可見與播放證據。兩條方案目前都還沒有可接受的實際播放證據。
