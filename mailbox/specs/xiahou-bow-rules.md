# 夏侯淵弓箭使用規則（戰場專家 11/25 定案，spine-trial 照此製作）

> 定案說明：下文【建議】項目全部採用為定案值；唯一例外——放箭改由動畫事件 arrow_release 觸發需戰場程式配合，由戰場專家另開小卡處理，spine-trial 先照 0.72 秒放箭幀＋事件名製作即可。


標記：【規格】＝有明文；【建議】＝建議，待戰場專家確認。不改五路對撞核心規則。

## 0. 已確定的前提
- 夏侯淵武器 = bow，依據「立繪 v2：長弓，背箭袋」，信心高。【規格】assets/resources/data/general-weapon-rules.json:105-110
- 武將武器為 bow 時，攻擊會飛箭（ArrowShotView），與弓兵相同。【規格】assets/scripts/battle/views/UnitRenderer.ts:1532
- 規格書中查無夏侯淵專屬弓箭動作規範，下列時序多為建議值。

## (a) 持弓姿勢
- 左右手：【建議】左手握弓（前手、弓身向目標），右手搭弦拉弦。戰場為 3/4 側面，面向右（我方）時左手在前。
- 現有弓兵骨架：弦與搭箭點是固定關節，鏡像時 `hand_mirror` 受手臂限制，維持既有左右手配置，不能鏡像換手。【規格】docs/battle-chibi-integration.md:38；docs/battle-chibi-troop-art-commission.md:16
- 待機：【建議】弓垂於身側，左手持弓中段（握把），弓弦朝前，箭袋背在身後（斜背右肩，箭羽露出右肩後上方）。
- 移動：【建議】弓不離手，左手持弓斜置身前，不上弦拉；跑動只輕晃，不讓弓揮動遮住臉。
- 攻擊：左手前伸持弓、右手拉弦至嘴角／下頜，雙手動作同時完成，前手（左手）不可離弓。風格比照槍突刺「雙手握、肘後拉、全伸、命中頓格，前手不可離桿」。【規格】docs/battle-chibi-cavalry-shield-art-spec.md:72

## (b) 拉弓與放箭時機
規格有的：
- 弓兵箭矢飛行 0.35 秒，命中小爆在放箭後 0.35 秒（ARROW_HIT_DELAY_SEC 與 flightSec 必須一致，有測試檢查）。【規格】assets/scripts/battle/shared/AttackShotStyle.ts:35-36；assets/scripts/battle/shared/AttackVfxMapping.ts:23
- 箭矢 Sprite 96×24，直線飛行，朝目標轉角。【規格】AttackVfxMapping.ts:23；ArrowShotView.ts:39
- 弓兵 duel_attack 時長 1.2 秒（槍兵 1.0）。【規格】assets/scripts/battle/shared/UnitPresentationConfig.ts:177
- 武將 Spine 攻擊 clip 目前 1.2 秒（attack_spear）、施法 cast 2 秒。【規格】UnitPresentationConfig.ts:121-135
- 箭矢音效 weapon.mp3（proj_arrow）。【規格】assets/scripts/core/config/vfx-block-registry.ts:130
- 蓄力（放大招前）0.4 秒，使用 playGeneralCharge。【規格】memory 裁決 11/18；UnitRenderer.ts:1515

建議（待戰場專家確認），以 1.2 秒 attack_bow 為準：
| 段落 | 時間 | 內容 |
|---|---|---|
| 前搖（取箭、搭弦、開弓） | 0.00–0.60 | 右手從箭袋取箭，搭弦，左手前伸，右手拉滿 |
| 滿弓停頓 | 0.60–0.72 | 瞄準頓格 |
| 放箭（命中判定幀／箭矢出手幀） | 0.72 | 弦鬆，箭矢從 arrow_nock 出手；此刻觸發 ArrowShotView.shoot |
| 後搖（收勢） | 0.72–1.20（約 0.48 秒） | 弓臂輕震、右手收回、回待機姿勢 |
- 箭落點傷害顯示：放箭後 0.35 秒（箭到目標）才算命中，與現有 ARROW_HIT_DELAY_SEC 一致，不另加延遲。
- 目前程式在「攻擊開始」就呼叫 shoot（UnitRenderer.ts:1532、1562），不等 0.72 秒；若要與動畫對齊，建議在動畫 0.72 秒用事件（spine event `arrow_release`）觸發，或程式端延遲 0.72 秒再 shoot。屬戰場程式改動，待戰場專家確認。
- 命中頓格：命中小爆時目標受擊，不對射手動畫停格；射手只在滿弓處停 0.12 秒。【建議】

## (c) 與一般弓兵動畫的關係
- 一般弓兵共用 attack_bow（char.json attack_class = bow，duel_attack 依此指向）。【規格】tools_node/battle-chibi/soldier_rig_attack_class.patch:15-23；docs/battle-chibi-troop-design.md:43
- 武將 Spine 與小兵骨架為兩套：武將用 spine-trial 管線，動作名走對照表（attack_spear／cast／hit／dodge／fall）。【規格】UnitPresentationConfig.ts:111-135
- 建議：夏侯淵專屬一套 attack_bow（動作名沿用 `attack_bow`，與小兵一致，缺動作時退回通用攻擊。SpineGeneralOverlay 缺分動作退回通用攻擊，PROG-2-9400 已實作）。【建議】
- 普攻：播 attack_bow，放一支箭，同弓兵視覺語言但幅度更大（武將輪廓放大）。
- 武將技／奧義：【建議】沿用 cast clip（施法 2 秒）：蓄力 0.4 秒（拉弓聚氣）→ 放箭（一箭或多箭）；多箭時每支間隔 0.1 秒、同一 clip 內重複出手事件；奧義演出走漫畫式演出，不在本 clip 內處理。
- 不得使用「連弩」外觀，連弩手是另一個兵種（需橫持弩，尚在美術待辦）。【規格】docs/battle-chibi-troop-art-commission.md:14-16

## (d) 骨架掛點需求
規格沒有為武將命名這些 bone，以下為建議名稱，沿用小兵骨架的 `weapon`／`arm_n`／`arm_f` 風格。【建議】
| 用途 | bone | slot |
|---|---|---|
| 弓（左手持，前手） | `weapon`（掛在 `arm_f`／前手末端） | `weapon_bow` |
| 弦／搭箭點（固定關節） | `nock`（弓上，握點右 36 像素內 ±6） | — |
| 拉弦手（右手） | `arm_n` 末端 `hand_draw` | — |
| 箭矢（搭在弦上的那一支） | `arrow_nock`（隨 nock，放箭後隱藏） | `arrow_held` |
| 箭矢出手點（世界座標發射點） | `arrow_muzzle`（弓前端箭頭位置）；程式取其世界座標當 shoot 的 fromX/fromY | — |
| 箭袋 | `quiver`（掛在 torso，斜背右肩） | `quiver_back`（置於身體之後層）；箭羽 `quiver_fletch` |
| 放箭事件 | animation event `arrow_release`（0.72 秒）、`bow_draw`（開弓音效） | — |
- 弓、箭袋分開貼圖層，弓在身體前層、箭袋在身體後層。
- 弓弦若要變形，用 mesh／路徑，或兩段 `string_top`、`string_bot` 骨，拉滿時往 `hand_draw` 收攏。
- 現有弦與搭箭點是固定關節，不隨動作變形，已知限制。【規格】docs/battle-chibi-troop-art-commission.md:16
- 目前程式發射點是攻擊者節點位置（UnitRenderer.ts:1557），沒讀 bone；若採 `arrow_muzzle` 需戰場專家改程式。

## 待戰場專家確認清單
1. 放箭觸發由動畫事件還是程式延遲。
2. 武將技／奧義是否沿用 cast，或另設 attack_bow_skill。
3. 弓放箭時序 0.72 秒／後搖 0.48 秒是否可行。
4. bone／slot 命名與 `arrow_muzzle` 取座標。

---
## 修訂（11/26 戰場專家）
實測評估：放箭延後到 0.72 秒會讓受擊閃白、傷害跳字、受擊音一起延後到 1.07 秒，等於改傷害總時長與回合節奏，故**不採用程式延遲放箭**。
改採：命中時刻維持放箭後 0.35 秒；動畫「前搖＋放箭幀」提前，放箭幀（arrow_release）定在約 0.15～0.20 秒（快速開弓），之後 0.35 秒箭到、後搖補滿 1.2 秒。程式端放箭觸發時機維持現狀（攻擊開始＋arrow_release 事件，可選），不改傷害節奏。spine-trial 請依此製作 attack_bow：前搖 0.00–0.15 取箭搭弦、0.15–0.20 滿弓、0.20 放箭、其餘後搖。
