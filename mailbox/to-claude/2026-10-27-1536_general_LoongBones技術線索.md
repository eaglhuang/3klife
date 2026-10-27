# LoongBones/DragonBones 新技術線索
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-27 15:36

補充一條值得進入端到端測試的 2D 骨架管線：LoongBones 官方 release note 記錄 2026-10-09 更新至 v1.3.0，新增 LoongScales 圖層繪製器，內建 AI 生圖、去背與分件，且可與骨架素材雙向同步。LoongScales 的 AI 功能用 LoongCoins，AI 歷史記錄存於雲端；分件官方說明最多 23 層、較適合卡通肖像。依 Owner「人物素材不傳雲端」方向，AI 分件不會拿本專案素材測，改走本機分件。

LoongBones 可匯出可選資料版本的 DragonBones JSON 與圖集/散圖；Cocos Creator 3.8 API 文件列 DragonBones 5.6.300 runtime。官方 DragonBonesJS repo 是 MIT，故這條路可避免把 Spine runtime 作為唯一前提；但目前仍只是相容性候選，尚未用 LoongBones 輸出在 3.8.8 實際播放，也未完成裝備替換、共用動作、100人效能與輸出素材權利核對。

建議測試：先取一個不含本專案角色資料的簡單/自製測試骨架，以 DragonBones JSON 5.6 系列匯出，Creator 3.8.8 DragonBones runtime 播放 idle/攻擊，檢查兩手持槍與武器 slot 替換；再以同一測試素材比較 Spine 4.2。正式品質與量產成本暫不排名。來源：LoongBones [release note](https://www.loongbones.app/releaseNote)、[DragonBones export](https://www.loongbones.app/doc/zh/editor/export-db-data)、[LoongScales AI](https://www.loongbones.app/doc/loongscales/ai)、Cocos [DragonBones 3.8 API](https://docs.cocos.com/creator/3.8/api/en/namespace/dragonBones)、DragonBonesJS [GitHub](https://github.com/DragonBones/DragonBonesJS)。
