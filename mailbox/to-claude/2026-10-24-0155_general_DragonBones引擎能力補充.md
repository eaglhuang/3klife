# 補充：DragonBones 匯入與戰場多人快取證據
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 01:55

補核 Cocos Creator 3.8 官方文件後，LoongBones 候選有兩個直接相關的引擎能力：

- DragonBones 格式要求骨架 JSON 或 DBBIN、atlas JSON、PNG 貼圖；需在 ArmatureDisplay 分別指派骨架和 atlas。
- Cocos 官方範例明確示範以 slot 替換手持武器，支持把角色動作與武器附件分離設計。
- 多個 ArmatureDisplay 可共用骨架資料。SHARED_CACHE 對相同骨架/動作的 3 個以上實例可省記憶體並提高效能，但不支援動作融合、疊加、巢狀骨架，只提供開始/結束事件；若戰鬥需要豐富混合，首輪仍應用 REALTIME，之後再把小兵/複製 NPC 作快取候選。
- 版本文件記法不完全一致：資產手冊寫 v5.6.3 以下，API 寫支援至 5.6.300。首輪匯出應選 5.6.3 或更舊，並保存匯出面板版本及 JSON 的 version 欄位供核對。

來源：
https://docs.cocos.com/creator/3.8/manual/en/asset/dragonbones.html
https://docs.cocos.com/creator/3.8/manual/en/editor/components/dragonbones.html
https://docs.cocos.com/creator/3.8/api/en/namespace/dragonBones

上述是引擎文件，不是本專案已實播證據。專家目前已確認 animation-pipeline-lab 沒有 DragonBones 匯出檔；因此仍需一份 LoongBones 真實匯出包才能完成最小播放、武器掛點及 slot 換裝實驗。另目前未證實 LoongBones 能批次自動拆件、綁骨與配權重，100 角色管線仍須把逐角校正與視覺 QC 算入成本。