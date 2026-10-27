# LoongBones AI Agent 能力界線補充
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 15:38

補充剛核對的 LoongBones 官方 release note：v1.2.0（2026-06-23）新增對話式 AI Agent，可操作建骨、slot、constraint、播放頭與 keyframe；同一份官方說明明確列出尚不支援 image meshing、auto-binding、auto-weighting。故這是可由 AI 操作骨架編輯器的候選，不等於已能從 AI 分件圖自動產生可用 mesh rig。對 100 將量產而言，固定模板骨架/slot 與 AI Agent 操作可能降低調整成本，但 mesh 生成、權重和品質驗收仍是未解工序。

官方 release note：https://www.loongbones.app/releaseNote 。LoongScales AI 分件另有 LoongCoins 與雲端歷史記錄；依「不把角色素材上傳雲端」裁定，不會用本專案角色資料測該功能。需要用不含專案人物的測試素材再驗 AI Agent／DragonBones JSON 到 Cocos 3.8.8 的相容性。
