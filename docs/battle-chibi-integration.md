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
| `spine/soldiers/soldier_spear_red/soldier_spear_red` | 由藍槍兵圖集換色產生 |
| `spine/soldiers/soldier_bow_blue/soldier_bow_blue` | 由紅弓兵圖集換色產生 |

匯入指令（spine-trial 需與本專案同層，或以 `SPINE_TRIAL_DIR` 指定；來源為其 `origin/battle-chibi-spec` 分支）：

```bash
node tools_node/battle-chibi/import-battle-chibi.js --write
python tools_node/battle-chibi/recolor_soldier.py soldier_spear_blue soldier_spear_red 215 2
python tools_node/battle-chibi/recolor_soldier.py soldier_bow_red soldier_bow_blue 356 215 9 6 0.62
```

匯入名單不寫在程式裡（PROG-2-9362）：來源分支的 `characters/` 底下有哪些角色就匯入哪些。名稱以 `soldier_` 開頭的整份匯入到 `spine/soldiers/<名稱>/`；其餘視為武將，遊戲內已有骨架就只併入共用動作，沒有骨架就整份匯入到 `spine/generals/<名稱>/`。例外寫在 `tools_node/battle-chibi/import-config.json`（來源名與遊戲內資料夾名不同的對應、不匯入的名單、要併入的動作）。

新兵種或新武將還沒進來源分支時，可以放進本機投遞目錄再匯入，每個角色一個資料夾，內含 `<名稱>.json`、`<名稱>.atlas` 與圖集列出的每一張圖：

```bash
node tools_node/battle-chibi/import-battle-chibi.js --write --inbox <投遞目錄> --only soldier_cavalry_blue
```

不加 `--write` 是試跑，只列出會做什麼。新的小兵外觀匯入後，還要在 `assets/scripts/battle/shared/UnitPresentationConfig.ts` 的 `SOLDIER_ART` 加一行兵種對應才會上場；藍紅兩色只到一色時，用 `recolor_soldier.py` 換色補另一色。

匯入工具會把六個共用戰場動作（`dash_in`／`retreat`／`duel_attack`／`hit`／`dodge`／`fall`）併入既有武將骨架；任一動作缺漏時 `SpineUnitOverlay` 會整隻退回舊 3D 模型，所以更新武將骨架後務必重跑。

武將優先依名冊的 `templateId`、其次依武將 ID 選取對應素材；沒有映射或匯入失敗時保留原戰場模型。小兵依陣營配色：我方藍、敵方紅；弓兵用弓兵素材，其餘兵種暫用槍兵素材。騎兵、盾兵等專屬外型需補齊私有素材及設定。弓兵的 `hand_mirror` 受共用骨架目前的手臂限制，鏡像時維持既有左右手配置。

新增角色或兵種時，在 `UnitPresentationConfig.ts` 增加 ID／資源路徑、骨架腳底偏移、顯示縮放、步速與共用動作映射，並在私有倉庫提供經回歸驗證的對應素材。腳底 x 偏移目前依共用 rig 的雙腳關節中點設定、y 以標準地面線為零；匯入後仍須在 Cocos 實機檢查站立與鏡像落腳，必要時只調整該素材設定。來源、圖集或動畫不得為單一武將增加程式補丁。
