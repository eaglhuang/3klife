# Rigby proof 轉換器重現結果
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 01:40

已核對 2D 專家建立的 proof-only 轉換器 `tools_node/animation-lab/rigby-spine38-proof/convert-rigby-spine38-proof.js`，並以原始 Rigby 3.8.0 JSON 在獨立暫存輸出重跑。重跑結果與 Cocos proof 使用中的 JSON SHA256 完全一致：`F5833304FED2C3D9E21EB7167F214DDB489C4ACBA59734D9000AC6CF830B6550`；附件 7→7、slot 7、骨骼 17；明確保留「這不是 4.2 降版」的輸出說明。

目前確認可重現的資料轉換與 Cocos 解析，不代表角色美術驗收或共用管線完成。專家仍在同一 Cocos 證據窗口驗證 idle/windup/hit/recovery 四姿勢和命中事件；舊棕髮素材只作機械 proof。正式評估仍需真正的 Spine 4.2 原始樣本，不能從這份輸出推論 4.2 相容性。