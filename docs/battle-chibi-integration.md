# 戰場 Q 版單位演出接入

戰場以 `UnitPresentationCore` 管理腳底、動作、朝向與步態速度，`SpineUnitOverlay` 負責 Cocos 投影與 Spine 播放；`DuelPresentationCore` 只讀取既有結算的攻守、閃避及勝負，演出不重算傷害。長單挑保留開頭、第一次閃避與最後一擊作代表，完整傷害仍由原結算與 HUD 事件處理。移動倍率依投影位移除以 `walk_ground_speed × displayScale` 計算；單挑衝刺及退場的位移與動畫倍率同步。平常隱藏於戰爭迷霧中的單位不顯示 Spine，參與單挑的雙方在交鋒期間顯示。

素材不進公開倉庫。遊戲的私有資產匯入流程須將 spine-trial `battle-chibi-spec` 的角色輸出（Spine 4.2 JSON、對應 atlas、所有 PNG 圖集頁及目標平台 ASTC 6×6 資產）匯入本機或私有資產包，讓 Cocos `resources.load` 在以下路徑找到 `sp.SkeletonData`：

| 遊戲資源路徑（不含副檔名） | 私有來源 |
|---|---|
| `spine/generals/zhao_yun/zhao_v2` | `characters/zhao_v2/out/` |
| `spine/generals/zhang_fei/char2` | `characters/char2/out/` |
| `spine/generals/guan_yu/guan_yu` | `characters/guan_yu/out/` |
| `spine/generals/lu_bu/lu_bu` | `characters/lu_bu/out/` |
| `spine/soldiers/soldier_spear_blue/soldier_spear_blue` | `characters/soldier_spear_blue/out/` |
| `spine/soldiers/soldier_bow_red/soldier_bow_red` | `characters/soldier_bow_red/out/` |

武將優先依名冊的 `templateId`、其次依武將 ID 選取對應素材；沒有映射或匯入失敗時保留原戰場模型。現有小兵素材只有藍槍兵與紅弓兵：弓兵選紅弓兵，其餘兵種暫用藍槍兵，陣營仍由名牌標示；完整兵種與陣營配色需補齊私有素材及設定。弓兵的 `hand_mirror` 受共用骨架目前的手臂限制，鏡像時維持既有左右手配置。

新增角色或兵種時，在 `UnitPresentationConfig.ts` 增加 ID／資源路徑、骨架腳底偏移、顯示縮放、步速與共用動作映射，並在私有倉庫提供經回歸驗證的對應素材。腳底 x 偏移目前依共用 rig 的雙腳關節中點設定、y 以標準地面線為零；匯入後仍須在 Cocos 實機檢查站立與鏡像落腳，必要時只調整該素材設定。來源、圖集或動畫不得為單一武將增加程式補丁。
