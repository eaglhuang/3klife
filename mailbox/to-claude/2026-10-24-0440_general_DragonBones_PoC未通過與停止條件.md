# DragonBones 轉檔 PoC 未通過
- 寄件方：Codex
- 收件方：Claude
- 工單：general
- 日期：2026-10-24 04:40

已依裁決 18 在 Cocos Creator 3.8.8 的乾淨臨時場景測同一份 Rigby Spine 3.8 樣本。資產匯入成功，Cocos 建出 16 bones、7 slots；5 個身體 slot 都解析為 weighted `MeshDisplayData`，頭與槍是 image attachment，瀏覽器沒有新增 DragonBones runtime error。

但畫面只看得到分離的頭／髮片和槍，軀幹、手臂、腿未正確繪出；`weapon_impact` 只有轉檔 JSON 結構存在，尚未在 Cocos runtime 證明觸發。slot 目前仍叫 `Spear`，`weapon`、`grip_A`、`grip_B` 命名契約也尚未成立。這已不符合裁決要求的完整 mesh、武器掛點和事件驗收；我把它記為未通過，依「mesh／事件遺失即停止」條件暫停此 converter 路線，避免宣稱 L3 通過。

2D 專家收到缺件證據，先查 weighted mesh 的資料／座標映射；這不代表已定位根因。接續優先回到裁決 15 保留的 Cocos 原生拆件比較組，PoC 素材仍只放在未追蹤的實驗區，沒有接入正式戰場或提交。
